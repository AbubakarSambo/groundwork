import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theirRosterEntries, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { inTheLeadsTeam } from './a-leads-team';
import { mayApproveFor, whoApprovesFor } from './who-approves';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { aLeaveRequest } from './a-request-in-words';

/** The words the server says when it refuses, in plain full sentences. */
export const LEAVE_REFUSED = {
  notOn: 'The leave suite is not switched on.',
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  notInIt: 'Only people in this organisation can ask for leave here.',
  notFound: 'That request was not found.',
  notYours: 'Only the person who approves this request can decide it.',
  alreadyDecided: 'This request has already been decided.',
  badDates: 'Give a first and a last day, with the last day on or after the first.',
  badStandIn: 'The stand-in has to be somebody else in this organisation.',
};

export interface Reader { userId: string; organizationId: string }

/** A day as a person reads it, with no time of day: "2026-10-01". */
export type Day = string;

export interface Waiting {
  id: string;
  name: string;
  startsOn: Day;
  endsOn: Day;
  /** Working days this request takes. */
  days: number;
  /** Days left this year before this request, when the organisation has said how many each person has. */
  daysLeft: number | null;
  /** The department the overlap is counted in, or null when the directory gives none. */
  team: string | null;
  /** The first names of others in the same team already off on any of those days. */
  alsoOff: string[];
  standIn: string | null;
  /** Whether this reader is the one who approves it. */
  mayDecide: boolean;
}

export interface Off { id: string; name: string; startsOn: Day; endsOn: Day; kind: 'annual' }

export interface MyLeave {
  perYear: number | null;
  daysLeft: number | null;
  requests: { id: string; startsOn: Day; endsOn: Day; days: number; status: 'waiting' | 'approved' | 'declined'; standIn: string | null }[];
}

type Row = {
  id: string; organizationId: string; userId: string; startsOn: Date; endsOn: Date; kind: string;
  standInUserId: string | null; status: string; decidedById: string | null; decidedAt: Date | null;
};

const DAY = 86_400_000;
const dayOf = (d: Date): Day => d.toISOString().slice(0, 10);
const atMidnight = (d: Day): Date => new Date(`${d}T00:00:00.000Z`);

/** Monday to Friday between two days, both counted. Public holidays are not known here. */
export function workingDays(from: Date, to: Date): number {
  let n = 0;
  for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
    const w = new Date(t).getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Working days of a request that fall in one calendar year. */
function workingDaysIn(year: number, from: Date, to: Date): number {
  const start = new Date(Math.max(from.getTime(), Date.UTC(year, 0, 1)));
  const end = new Date(Math.min(to.getTime(), Date.UTC(year, 11, 31)));
  return end < start ? 0 : workingDays(start, end);
}

const overlaps = (a: { startsOn: Date; endsOn: Date }, b: { startsOn: Date; endsOn: Date }) =>
  a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;

/**
 * THE LEAVE BOARD (E2, #/suite/leave, U.17). Who reads what is decided here, never on the screen:
 *   - nobody, while the leave suite is off;
 *   - an admin reads every request waiting and everybody off in the next two weeks;
 *   - a lead reads only their own team's (a-leads-team.ts): what is waiting, with the days left and
 *     who else in the team is off those days, which is only what is needed to decide, and who in the
 *     team is off in the next two weeks;
 *   - each person reads only their own requests and their own days left (`mine`);
 *   - a colleague reads nothing of anybody else's leave, and nobody reads a reason, because none is
 *     kept.
 * WHO DECIDES follows the admin's answer when they switched the suite on: "Their manager" is the
 * person's manager in the directory, when that manager is a lead or an admin here; otherwise, and for
 * "An admin", any admin. Nobody decides their own. Nothing here reaches a check-in or its report.
 */
@Injectable()
export class LeaveBoardService {
  constructor(
    private readonly prisma: PrismaService,
    /* Tells the approver, and then the person, on WhatsApp (decision 82, item 1). Optional so a test built by hand still runs. */
    @Optional() private readonly told?: ARequestToldOnWhatsApp,
  ) {}

  async board(reader: Reader, today = new Date()): Promise<{ waiting: Waiting[]; off: Off[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException(LEAVE_REFUSED.onlyAdminsAndLeads);

    const rows = (await this.prisma.leaveRequest.findMany({
      where: { organizationId: reader.organizationId, status: { in: ['waiting', 'approved'] } },
      orderBy: { startsOn: 'asc' },
    })) as Row[];
    const people = await this.directory(reader.organizationId, rows);
    const names = await this.names(rows);

    const inScope = role === 'ADMIN'
      ? (_userId: string) => true
      : await this.theLeadsTeam(reader, people);

    const approved = rows.filter((r) => r.status === 'approved');
    const waiting: Waiting[] = [];
    for (const r of rows.filter((x) => x.status === 'waiting' && x.userId !== reader.userId && inScope(x.userId))) {
      const team = people.get(r.userId)?.department?.trim() || null;
      const alsoOff = team
        ? approved.filter((a) => a.userId !== r.userId && people.get(a.userId)?.department?.trim() === team && overlaps(a, r))
            .map((a) => names.get(a.userId)?.first).filter((n): n is string => !!n)
        : [];
      waiting.push({
        id: r.id,
        name: names.get(r.userId)?.full ?? '',
        startsOn: dayOf(r.startsOn),
        endsOn: dayOf(r.endsOn),
        days: workingDays(r.startsOn, r.endsOn),
        daysLeft: this.daysLeft(answers.perYear, approved.filter((a) => a.userId === r.userId), r.startsOn.getUTCFullYear()),
        team,
        alsoOff: [...new Set(alsoOff)],
        standIn: r.standInUserId ? names.get(r.standInUserId)?.full ?? null : null,
        mayDecide: await this.mayDecide(reader, role, r, people),
      });
    }

    const from = atMidnight(dayOf(today));
    const to = new Date(from.getTime() + 13 * DAY);
    const off: Off[] = approved
      .filter((r) => inScope(r.userId) || r.userId === reader.userId)
      .filter((r) => overlaps(r, { startsOn: from, endsOn: to }))
      .map((r) => ({ id: r.id, name: names.get(r.userId)?.full ?? '', startsOn: dayOf(r.startsOn), endsOn: dayOf(r.endsOn), kind: 'annual' as const }));

    return { waiting: waiting.filter((w) => w.name), off: off.filter((o) => o.name) };
  }

  /** Each person's own requests and days left. Nobody else's. */
  async mine(reader: Reader, today = new Date()): Promise<MyLeave> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!role || role === 'GUEST') throw new ForbiddenException(LEAVE_REFUSED.notInIt);
    const rows = (await this.prisma.leaveRequest.findMany({
      where: { organizationId: reader.organizationId, userId: reader.userId },
      orderBy: { startsOn: 'desc' },
    })) as Row[];
    const names = await this.names(rows);
    return {
      perYear: answers.perYear,
      daysLeft: this.daysLeft(answers.perYear, rows.filter((r) => r.status === 'approved'), today.getUTCFullYear()),
      requests: rows.map((r) => ({
        id: r.id,
        startsOn: dayOf(r.startsOn),
        endsOn: dayOf(r.endsOn),
        days: workingDays(r.startsOn, r.endsOn),
        status: (r.status as 'waiting' | 'approved' | 'declined'),
        standIn: r.standInUserId ? names.get(r.standInUserId)?.full ?? null : null,
      })),
    };
  }

  /** The approver decides. Only while it is waiting. */
  async decide(reader: Reader, id: string, outcome: 'approved' | 'declined') {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } })) as Row | null;
    if (!row || row.organizationId !== reader.organizationId) throw new NotFoundException(LEAVE_REFUSED.notFound);
    const people = await this.directory(reader.organizationId, [row]);
    if (!(await this.mayDecide(reader, role, row, people))) throw new ForbiddenException(LEAVE_REFUSED.notYours);
    if (row.status !== 'waiting') throw new BadRequestException(LEAVE_REFUSED.alreadyDecided);
    await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: outcome, decidedById: reader.userId, decidedAt: new Date() },
    });
    await this.tellThePerson(row, outcome, reader.userId);
    return this.board(reader);
  }

  /** The person who asked is told what was decided, on WhatsApp (decision 82, item 1). True when it went. */
  async tellThePerson(row: { id: string; organizationId: string; userId: string; startsOn: Date; endsOn: Date }, outcome: 'approved' | 'declined', deciderUserId: string): Promise<boolean> {
    if (!this.told) return false;
    const first = await this.told.firstNameOf(row.userId);
    return this.told.decided(row.organizationId, aLeaveRequest(row.id, row.userId, first, dayOf(row.startsOn), dayOf(row.endsOn)), outcome, deciderUserId).catch(() => false);
  }

  /**
   * A request for time off, as the engine will record it once the person has confirmed it
   * (docs/requests-to-engine.md, request 21). There is no route for it: nobody fills in a form.
   */
  async ask(organizationId: string, userId: string, input: { startsOn: Day; endsOn: Day; standInUserId?: string | null }) {
    await this.suiteAnswers(organizationId);
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(LEAVE_REFUSED.notInIt);
    const ok = /^\d{4}-\d{2}-\d{2}$/;
    if (!ok.test(input.startsOn ?? '') || !ok.test(input.endsOn ?? '')) throw new BadRequestException(LEAVE_REFUSED.badDates);
    const startsOn = atMidnight(input.startsOn);
    const endsOn = atMidnight(input.endsOn);
    if (Number.isNaN(startsOn.getTime()) || Number.isNaN(endsOn.getTime()) || endsOn < startsOn) throw new BadRequestException(LEAVE_REFUSED.badDates);
    const standIn = input.standInUserId ?? null;
    if (standIn) {
      const theirs = await this.roleOf({ userId: standIn, organizationId });
      if (standIn === userId || !theirs || theirs === 'GUEST') throw new BadRequestException(LEAVE_REFUSED.badStandIn);
    }
    const created = await this.prisma.leaveRequest.create({
      data: { organizationId, userId, startsOn, endsOn, standInUserId: standIn },
      select: { id: true },
    });
    /* The one who approves is told on WhatsApp too (decision 82, item 1). */
    if (this.told && created?.id) {
      const who = await whoApprovesFor(this.prisma, { organizationId, personUserId: userId }).catch(() => ({ kind: 'admin' as const }));
      const first = await this.told.firstNameOf(userId);
      await this.told.waiting(organizationId, await this.told.approversOf(organizationId, who, userId), aLeaveRequest(created.id, userId, first, input.startsOn, input.endsOn)).catch(() => undefined);
    }
    return created;
  }

  // ---------------------------------------------------------------------------------------------

  private daysLeft(perYear: number | null, approved: Row[], year: number): number | null {
    if (perYear == null) return null;
    const used = approved.reduce((n, r) => n + workingDaysIn(year, r.startsOn, r.endsOn), 0);
    return Math.max(0, perYear - used);
  }

  private mayDecide(reader: Reader, role: string | null, r: Row, people: Map<string, any>): Promise<boolean> {
    return mayApproveFor(this.prisma, {
      organizationId: r.organizationId, readerId: reader.userId, readerRole: role, personUserId: r.userId,
      managerExternalId: people.get(r.userId)?.managerExternalId ?? null,
    });
  }

  private async theLeadsTeam(reader: Reader, people: Map<string, { externalId: string; department: string | null; managerExternalId: string | null }>) {
    const me = await theirRosterEntry(this.prisma, reader.organizationId, reader.userId, { externalId: true, department: true });
    return (userId: string) => {
      const p = people.get(userId);
      return !!me && !!p && inTheLeadsTeam(me, p);
    };
  }

  private async suiteAnswers(organizationId: string): Promise<{ perYear: number | null; approver: string | null }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'leave' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(LEAVE_REFUSED.notOn);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return {
      perYear: typeof a.days === 'number' ? a.days : null,
      approver: typeof a.approver === 'string' ? a.approver : null,
    };
  }

  private async roleOf(reader: Reader): Promise<string | null> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  /** The directory entry of each person a request is about, by user id. */
  private async directory(organizationId: string, rows: Row[]) {
    /* Linked entries, and entries matched to their sign-in by address (a-roster-entry-and-its-sign-in.ts). */
    const ps = await theirRosterEntries(this.prisma, organizationId, rows.map((r) => r.userId), { externalId: true, department: true, managerExternalId: true });
    return new Map([...ps].map(([userId, p]) => [userId, { externalId: p.externalId as string, department: p.department as string | null, managerExternalId: p.managerExternalId as string | null }]));
  }

  /** First and full names, for the people and the stand-ins on these requests. Never an address. */
  private async names(rows: Row[]) {
    const ids = [...new Set(rows.flatMap((r) => [r.userId, r.standInUserId]).filter((x): x is string => !!x))];
    const us = ids.length
      ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    return new Map(us.map((u) => [u.id, {
      first: u.firstName?.trim() || '',
      full: [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
    }]));
  }
}
