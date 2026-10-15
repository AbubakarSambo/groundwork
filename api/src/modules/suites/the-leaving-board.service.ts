import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';

/** The words the server says when it refuses, in plain full sentences. */
export const LEAVING_REFUSED = {
  notOn: thisSuiteIsOff('The suite for when someone leaves'),
  onlyAnAdmin: 'Only an admin can open this board.',
  /** Said to somebody who may not add to or change the list. Reading and changing are different sentences (request 181 item 5). */
  onlyAnAdminChanges: 'Only an admin can change this list.',
  notFound: 'That list was not found.',
  noSuchPerson: 'Choose somebody in your organisation.',
  badDay: 'Give their last day.',
  alreadyStarted: 'There is already a list for that person and that day.',
  noSuchStep: 'There is no step with that name.',
  badOwner: 'The owner has to be somebody in your organisation.',
};

export const STEPS = ['handover', 'equipment', 'access', 'pay'] as const;
export type StepKey = (typeof STEPS)[number];

export interface Reader { userId: string; organizationId: string }
type Day = string;

export interface AList {
  id: string;
  name: string;
  firstName: string;
  lastDay: Day;
  done: number;
  of: number;
  steps: { step: StepKey; ownerId: string | null; ownerName: string | null; done: boolean }[];
  /** What the product's own handover recorded: who took over, and when. Never what was in it. */
  handover: { to: string; on: Day } | null;
}

export interface LeavingBoard {
  lists: AList[];
  /** Departures the product already recorded, with no list yet. */
  departures: { personId: string; name: string; departedOn: Day }[];
  /** Who may be named as leaving: the directory. */
  people: { id: string; name: string }[];
  /** Who may own a step: the organisation's own people, never a guest. */
  owners: { id: string; name: string }[];
  /** The engine's signs that a team is under strain, for a team and never a named person. */
  strain: { team: string; says: string }[];
}

const DAY = 86_400_000;
const dayOf = (d: Date): Day => d.toISOString().slice(0, 10);

type Person = { externalId: string; linkedUserId: string | null; displayName: string | null; givenName: string | null; familyName: string | null; managerExternalId: string | null };

/**
 * WHEN SOMEONE LEAVES (E5, #/suite/leaving, U.17). ADMINS ONLY, decided here: a lead, the person
 * leaving, a colleague and a guest are refused, whatever the screen shows.
 *
 * IT ADDS TO THE PRODUCT'S HANDOVER AND DEPARTURES AND CHANGES NEITHER. It reads, and never writes:
 *   - `DepartureRecord`, to offer a list for somebody who has already left;
 *   - `RoleAssignment`, to say who took over and when. The handover brief itself is never read, so
 *     nothing of what anybody said can travel through this board.
 * Its own tables hold the list, each step's owner, and done or not.
 *
 * "Signs a team is under strain" is the engine's (request 24): served for a team, and dropped if it
 * names anybody in the directory. Nothing here reaches a check-in or its report; a test scans for it.
 */
@Injectable()
export class LeavingBoardService {
  constructor(private readonly prisma: PrismaService) {}

  async board(reader: Reader, today = new Date()): Promise<LeavingBoard> {
    await this.admitAdmin(reader);
    const org = reader.organizationId;
    const directory = await this.directory(org);
    const owners = await this.owners(org);
    const ownerName = new Map(owners.map((o) => [o.id, o.name]));

    const lists = await this.prisma.leavingChecklist.findMany({
      where: { organizationId: org, lastDay: { gte: new Date(today.getTime() - 90 * DAY) } },
      include: { steps: true },
      orderBy: { lastDay: 'asc' },
    });
    const out: AList[] = [];
    for (const l of lists) {
      const p = directory.get(l.personExternalId);
      if (!p) continue;
      const steps = STEPS.map((k) => {
        const s = l.steps.find((x) => x.step === k);
        return { step: k, ownerId: s?.ownerUserId ?? null, ownerName: s?.ownerUserId ? ownerName.get(s.ownerUserId) ?? null : null, done: !!s?.doneAt };
      });
      out.push({
        id: l.id, name: this.nameOf(p), firstName: this.firstOf(p), lastDay: dayOf(l.lastDay),
        done: steps.filter((s) => s.done).length, of: steps.length, steps,
        handover: await this.handoverFor(org, l.personExternalId, directory),
      });
    }

    const recorded = await this.prisma.departureRecord.findMany({
      where: { organizationId: org, departedAt: { gte: new Date(today.getTime() - 60 * DAY) } },
      select: { personExternalId: true, departedAt: true },
      orderBy: { departedAt: 'desc' },
    });
    const listed = new Set(lists.map((l) => l.personExternalId));
    const departures = recorded
      .filter((r) => !listed.has(r.personExternalId) && directory.has(r.personExternalId))
      .map((r) => ({ personId: r.personExternalId, name: this.nameOf(directory.get(r.personExternalId)!), departedOn: dayOf(r.departedAt) }));

    const signs = await this.prisma.teamStrainSign.findMany({
      where: { organizationId: org, createdAt: { gte: new Date(today.getTime() - 60 * DAY) } },
      orderBy: { createdAt: 'desc' },
      select: { team: true, says: true },
    });
    const names = [...directory.values()].flatMap((p) => [this.nameOf(p), p.givenName ?? '', p.familyName ?? ''])
      .map((n) => n.trim()).filter((n) => n.length >= 3);
    const strain = signs.filter((s) => s.says.trim() && !names.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s.says)));

    return {
      lists: out,
      departures,
      people: [...directory.values()].map((p) => ({ id: p.externalId, name: this.nameOf(p) })).filter((p) => p.name).sort((a, b) => a.name.localeCompare(b.name)),
      owners,
      strain: strain.map((s) => ({ team: s.team, says: s.says.trim() })),
    };
  }

  /** An admin starts the list for somebody's last day. Each step gets the owner the admin named when switching the suite on. */
  async start(reader: Reader, input: { personId?: string; lastDay?: string }, today = new Date()) {
    const answers = await this.admitAdmin(reader, true);
    const org = reader.organizationId;
    const directory = await this.directory(org);
    const p = input.personId ? directory.get(input.personId) : undefined;
    if (!p) throw new BadRequestException(LEAVING_REFUSED.noSuchPerson);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.lastDay ?? '')) throw new BadRequestException(LEAVING_REFUSED.badDay);
    const lastDay = new Date(`${input.lastDay}T00:00:00.000Z`);
    if (Number.isNaN(lastDay.getTime())) throw new BadRequestException(LEAVING_REFUSED.badDay);
    const exists = await this.prisma.leavingChecklist.findUnique({
      where: { organizationId_personExternalId_lastDay: { organizationId: org, personExternalId: p.externalId, lastDay } },
      select: { id: true },
    });
    if (exists) throw new BadRequestException(LEAVING_REFUSED.alreadyStarted);

    const owners = new Set((await this.owners(org)).map((o) => o.id));
    const manager = p.managerExternalId ? directory.get(p.managerExternalId)?.linkedUserId ?? null : null;
    const keeper = await this.equipmentKeeper(org);
    const pick = (id: string | null) => (id && owners.has(id) && id !== p.linkedUserId ? id : null);
    const ownerOf: Record<StepKey, string | null> = {
      handover: pick(manager), equipment: pick(keeper), access: pick(answers.access), pay: pick(answers.pay),
    };
    await this.prisma.leavingChecklist.create({
      data: {
        organizationId: org, personExternalId: p.externalId, lastDay, startedById: reader.userId,
        steps: { create: STEPS.map((step) => ({ step, ownerUserId: ownerOf[step] })) },
      },
    });
    return this.board(reader, today);
  }

  /** An admin names a step's owner, or marks it done or not done. */
  async step(reader: Reader, id: string, step: string, input: { ownerUserId?: string | null; done?: boolean }, today = new Date()) {
    await this.admitAdmin(reader, true);
    const list = await this.prisma.leavingChecklist.findUnique({ where: { id }, select: { id: true, organizationId: true, personExternalId: true } });
    if (!list || list.organizationId !== reader.organizationId) throw new NotFoundException(LEAVING_REFUSED.notFound);
    if (!(STEPS as readonly string[]).includes(step)) throw new BadRequestException(LEAVING_REFUSED.noSuchStep);
    const data: Record<string, unknown> = {};
    if (input.ownerUserId !== undefined) {
      if (input.ownerUserId !== null) {
        const owners = new Set((await this.owners(reader.organizationId)).map((o) => o.id));
        const leaver = (await this.directory(reader.organizationId)).get(list.personExternalId)?.linkedUserId ?? null;
        if (!owners.has(input.ownerUserId) || input.ownerUserId === leaver) throw new BadRequestException(LEAVING_REFUSED.badOwner);
      }
      data.ownerUserId = input.ownerUserId;
    }
    if (input.done !== undefined) {
      data.doneAt = input.done ? new Date() : null;
      data.doneById = input.done ? reader.userId : null;
    }
    await this.prisma.leavingStep.upsert({
      where: { checklistId_step: { checklistId: list.id, step } },
      create: { checklistId: list.id, step, ...data },
      update: data,
    });
    return this.board(reader, today);
  }

  // ---------------------------------------------------------------------------------------------

  /** Who took over from the person, as the product's own handover recorded it. The brief is not read. */
  private async handoverFor(organizationId: string, personExternalId: string, directory: Map<string, Person>) {
    const theirs = await this.prisma.roleAssignment.findMany({
      where: { organizationId, personExternalId },
      select: { id: true },
    });
    if (!theirs.length) return null;
    const next = await this.prisma.roleAssignment.findFirst({
      where: { organizationId, predecessorAssignmentId: { in: theirs.map((a) => a.id) }, handoverReadyAt: { not: null } },
      select: { personExternalId: true, handoverReadyAt: true },
      orderBy: { handoverReadyAt: 'desc' },
    });
    const to = next ? directory.get(next.personExternalId) : null;
    return next?.handoverReadyAt && to ? { to: this.nameOf(to), on: dayOf(next.handoverReadyAt) } : null;
  }

  private async admitAdmin(reader: Reader, toChange = false): Promise<{ access: string | null; pay: string | null }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'leaving' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(LEAVING_REFUSED.notOn);
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    if (m?.role !== 'ADMIN') throw new ForbiddenException(toChange ? LEAVING_REFUSED.onlyAnAdminChanges : LEAVING_REFUSED.onlyAnAdmin);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return { access: typeof a.access === 'string' ? a.access : null, pay: typeof a.pay === 'string' ? a.pay : null };
  }

  /** Whoever the admin named for equipment, if the equipment suite has been switched on at some point. */
  private async equipmentKeeper(organizationId: string): Promise<string | null> {
    const s = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'equipment' } },
      select: { answers: true },
    });
    const k = (s?.answers as Record<string, unknown> | undefined)?.keeper;
    return typeof k === 'string' ? k : null;
  }

  private async directory(organizationId: string): Promise<Map<string, Person>> {
    const ps = await this.prisma.person.findMany({
      where: { organizationId },
      select: { externalId: true, linkedUserId: true, displayName: true, givenName: true, familyName: true, managerExternalId: true },
    });
    return new Map(ps.map((p) => [p.externalId, p]));
  }

  /** The organisation's own people, by name, never a guest and never an address. */
  private async owners(organizationId: string): Promise<{ id: string; name: string }[]> {
    const ms = await this.prisma.organizationMembership.findMany({
      where: { organizationId, role: { not: 'GUEST' } },
      select: { userId: true, user: { select: { firstName: true, lastName: true } } },
    });
    return ms.map((m) => ({ id: m.userId, name: [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() }))
      .filter((o) => o.name).sort((a, b) => a.name.localeCompare(b.name));
  }

  private nameOf(p: Person): string {
    return p.displayName?.trim() || [p.givenName, p.familyName].filter(Boolean).join(' ').trim();
  }

  private firstOf(p: Person): string {
    return p.givenName?.trim() || this.nameOf(p).split(/\s+/)[0] || '';
  }
}
