import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';
import { labelsForParties, namesVisibleTo, viewerLabelOf, withNames } from '../reports/party-labels';
import { whatTheyMayRead } from '../grounds/who-may-read-this-check-in';

/** The words the server says when it refuses, in plain full sentences. */
export const ROLES_REFUSED = {
  notOn: thisSuiteIsOff('The role map suite'),
  onlyAnAdmin: 'Only an admin can open this board.',
};

export interface Reader { userId: string; organizationId: string }

export interface ARole {
  name: string;
  /** What it owns: from the role interview once the engine writes it, else the role's own description. */
  owns: string | null;
  /** Who holds it now, by name. Empty is "Nobody". */
  heldBy: string[];
}

export interface RoleMap {
  roles: ARole[];
  /** Each role nobody holds, with why it matters once the engine has written it. */
  nobody: { name: string; why: string | null }[];
}

type Person = { externalId: string; displayName: string | null; givenName: string | null; familyName: string | null; title: string | null };

const keyOf = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * THE ROLE MAP (E6, #/suite/roles, U.17). ADMINS ONLY, decided here: a lead, a member and a guest are
 * refused, whatever the screen shows, and nobody reads it while the suite is off.
 *
 * IT IS BUILT FROM WHAT THE PRODUCT ALREADY KNOWS AND CHANGES NONE OF IT. It reads, and never writes:
 *   - `Role`, the roles the organisation's own systems gave, with their description;
 *   - `RoleAssignment`, who holds which role now (ended ones are left out);
 *   - `Person.title`, each person's job in the staff directory, which is "your teams and people".
 * The same role named twice with different capitals is one role. A role that nobody holds is "a job
 * nobody owns". Nobody can be given a role here: roles and who holds them come from the
 * organisation's own systems, and they feed the handover and the onboarding window (item 28).
 *
 * The role interview is the engine's (request 25). Its answers fill in "What it owns" when present,
 * and the engine's sentence on why a job nobody owns matters sits under it. Nothing about how anybody
 * works, no rating and no label is read or served, and nothing here reaches a check-in or its report.
 */
@Injectable()
export class RoleMapService {
  constructor(private readonly prisma: PrismaService) {}

  async board(reader: Reader): Promise<RoleMap> {
    await this.admitAdmin(reader);
    const org = reader.organizationId;

    const [roles, assignments, people, answers, notes] = await Promise.all([
      this.prisma.role.findMany({ where: { organizationId: org }, select: { key: true, name: true, description: true }, orderBy: { name: 'asc' } }),
      this.prisma.roleAssignment.findMany({ where: { organizationId: org, endedAt: null }, select: { personExternalId: true, roleName: true } }),
      this.prisma.person.findMany({
        where: { organizationId: org, active: true },
        select: { externalId: true, displayName: true, givenName: true, familyName: true, title: true },
      }) as Promise<Person[]>,
      /* Only what the person agreed to show: an interview they said yes to, or a first-check-in reading they said yes to. What they said in a check-in stays theirs until then. */
      this.prisma.roleInterviewAnswer.findMany({ where: { organizationId: org, OR: [{ source: 'interview' }, { sharedAt: { not: null } }] }, select: { roleName: true, owns: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.roleGapNote.findMany({ where: { organizationId: org }, select: { roleName: true, says: true, groundId: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    const byId = new Map(people.map((p) => [p.externalId, p]));

    /* One row per role, in the order: the organisation's roles by name, then any other name in use. */
    const rows = new Map<string, { name: string; description: string | null; holders: Set<string> }>();
    const row = (name: string, description: string | null = null) => {
      const k = keyOf(name);
      if (!k) return null;
      if (!rows.has(k)) rows.set(k, { name: name.trim(), description, holders: new Set() });
      return rows.get(k)!;
    };
    for (const r of roles) {
      const it = row(r.name, r.description?.trim() || null);
      /* An assignment may name a role by its key or by its name; both are the same row. */
      if (it && keyOf(r.key) !== keyOf(r.name) && !rows.has(keyOf(r.key))) rows.set(keyOf(r.key), it);
    }
    for (const a of assignments) if (byId.has(a.personExternalId)) row(a.roleName)?.holders.add(a.personExternalId);
    for (const p of people) if (p.title?.trim()) row(p.title)?.holders.add(p.externalId);

    const ownsOf = new Map<string, string>();
    for (const a of answers) if (a.owns?.trim() && !ownsOf.has(keyOf(a.roleName))) ownsOf.set(keyOf(a.roleName), a.owns.trim());
    const whyOf = new Map<string, string>();
    for (const n of notes as any[]) {
      if (!n.says.trim() || whyOf.has(keyOf(n.roleName))) continue;
      const said = await this.withTheNamesThisReaderMayRead(reader, n.says.trim(), n.groundId ?? null);
      if (said) whyOf.set(keyOf(n.roleName), said);
    }

    const seen = new Set<object>();
    const out: ARole[] = [];
    for (const [k, r] of rows) {
      if (seen.has(r)) continue;
      seen.add(r);
      out.push({
        name: r.name,
        owns: ownsOf.get(k) ?? ownsOf.get(keyOf(r.name)) ?? r.description,
        heldBy: [...r.holders].map((id) => this.nameOf(byId.get(id)!)).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      });
    }
    return {
      roles: out,
      nobody: out.filter((r) => r.heldBy.length === 0).map((r) => ({ name: r.name, why: whyOf.get(keyOf(r.name)) ?? null })),
    };
  }

  // ---------------------------------------------------------------------------------------------

  private async admitAdmin(reader: Reader): Promise<void> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'roles' } },
      select: { isOn: true },
    });
    if (!suite?.isOn) throw new NotFoundException(ROLES_REFUSED.notOn);
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    if (m?.role !== 'ADMIN') throw new ForbiddenException(ROLES_REFUSED.onlyAnAdmin);
  }

  /**
   * THE NAME GOES BACK IN HERE, AND ONLY HERE. A note the engine wrote from a check-in holds that
   * check-in's label for the person ("participant A"), never a name. It is served only when this
   * reader may open that check-in (the same rule the list of check-ins applies), with the names they
   * may see swapped in through the wrapper reports use. A sentence that would still carry a label
   * once the names are in is not served at all: a missing sentence, never a placeholder or a name
   * this reader may not have. A note that names no check-in was written by hand and is served as it is.
   */
  private async withTheNamesThisReaderMayRead(reader: Reader, says: string, groundId: string | null): Promise<string | null> {
    if (!groundId) return says;
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId: reader.organizationId },
      select: {
        organizationId: true, scenario: true, initiatorId: true, createdByUserId: true, peersVisibleToEachOther: true,
        participants: { select: { id: true, userId: true, partyType: true, roleAsDescribed: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!ground) return null;
    const viewer = { userId: reader.userId, role: 'ADMIN', organizationId: reader.organizationId };
    if (!whatTheyMayRead(reader.userId, viewer, { ...ground, participants: ground.participants.map((p) => ({ userId: p.userId })) })) return null;
    const me = ground.participants.find((p) => p.userId === reader.userId)?.id ?? null;
    const visible = namesVisibleTo(me, ground.participants as any, ground.peersVisibleToEachOther ?? undefined);
    const named = withNames(says, visible, labelsForParties(ground.participants as any).values(), { viewerLabel: viewerLabelOf(me, ground.participants as any) });
    return /\bparticipant [A-Z]+\b|\bthe initiator\b/i.test(named) ? null : named;
  }

  private nameOf(p: Person): string {
    return p.displayName?.trim() || [p.givenName, p.familyName].filter(Boolean).join(' ').trim();
  }
}
