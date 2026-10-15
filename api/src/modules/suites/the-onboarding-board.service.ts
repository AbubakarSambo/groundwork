import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';
import { stillOnboarding } from '../grounds/still-finding-their-feet';
import { inTheLeadsTeam } from './a-leads-team';

/** The words the server says when it refuses, in plain full sentences. */
export const BOARD_REFUSED = {
  notOn: thisSuiteIsOff('The onboarding suite'),
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
};

export interface Reader { userId: string; organizationId: string }

export interface NewPerson {
  /** The person's id in the organisation's directory. */
  id: string;
  name: string;
  firstName: string;
  startedAt: string | null;
  done: number;
  of: number;
  steps: { name: string; description: string | null; optional: boolean; state: 'to do' | 'done' | 'not needed'; doneAt: string | null }[];
}

/**
 * THE ONBOARDING BOARD (E1, #/suite/onboard, U.17). Built only from what the product already keeps:
 * the steps for each role (onboarding tracks and gates), who holds which role and since when (role
 * assignments), and where each person has got to (onboarding statuses). Nothing new is stored.
 *
 * WHO READS IT, decided here and never on the screen:
 *   - only while an admin has the onboarding suite switched on; otherwise nobody;
 *   - an admin: everybody still being set up;
 *   - a lead: only the new people in their own team, which is a new person whose directory entry
 *     names the lead as their manager, or shares the lead's department (a blank department is
 *     nobody's);
 *   - everybody else, the new person included, is refused. Their own steps reach them through their
 *     own record, never through this board.
 *
 * WHAT IT NEVER HOLDS: "Something nobody has shown them yet", because it would be built from the new
 * person's questions to Ask Groundwork, which are private always (docs/morning-report-ui.md, item
 * 28.9). No label on anybody, no count against anybody: getting set up is kept apart from work
 * (decisions rule 9), and this board is read-only, so nobody ticks off a new person's own to-do for
 * them.
 */
@Injectable()
export class OnboardingBoardService {
  constructor(private readonly prisma: PrismaService) {}

  async forReader(reader: Reader, now = new Date()): Promise<{ people: NewPerson[] }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'onboard' } },
      select: { isOn: true },
    });
    if (!suite?.isOn) throw new NotFoundException(BOARD_REFUSED.notOn);

    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    if (m?.role !== 'ADMIN' && m?.role !== 'LEAD') throw new ForbiddenException(BOARD_REFUSED.onlyAdminsAndLeads);

    const everyone = await this.everyoneBeingSetUp(reader.organizationId, now);
    if (m.role === 'ADMIN') return { people: everyone };

    const me = await this.prisma.person.findFirst({
      where: { organizationId: reader.organizationId, linkedUserId: reader.userId, active: true },
      select: { externalId: true, department: true },
    });
    if (!me) return { people: [] };
    const theirs = await this.prisma.person.findMany({
      where: { organizationId: reader.organizationId, externalId: { in: everyone.map((p) => p.id) } },
      select: { externalId: true, department: true, managerExternalId: true },
    });
    const mine = new Set(theirs.filter((p) => inTheLeadsTeam(me, p)).map((p) => p.externalId));
    return { people: everyone.filter((p) => mine.has(p.id)) };
  }

  /** Everybody still inside their window: a role with steps, a required step still open, not past the backstop. */
  private async everyoneBeingSetUp(organizationId: string, now: Date): Promise<NewPerson[]> {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { organizationId, endedAt: null },
      select: { personExternalId: true, roleName: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    });
    if (!assignments.length) return [];
    const tracks = await this.prisma.onboardingTrack.findMany({
      where: { organizationId },
      include: { gates: { orderBy: { ordinal: 'asc' } } },
    });
    const byRole = new Map(tracks.map((t) => [t.roleName, t]));
    const statuses = await this.prisma.onboardingStatus.findMany({
      where: { organizationId },
      select: { personExternalId: true, gateId: true, state: true, completedAt: true },
    });
    const directory = await this.prisma.person.findMany({
      where: { organizationId, externalId: { in: [...new Set(assignments.map((a) => a.personExternalId))] }, active: true },
      select: { externalId: true, displayName: true, givenName: true, familyName: true },
    });
    const named = new Map(directory.map((p) => [p.externalId, p]));

    const out: NewPerson[] = [];
    const seen = new Set<string>();
    for (const a of assignments) {
      /* The newest live assignment wins, as the ordering above makes sure. */
      if (seen.has(a.personExternalId)) continue;
      seen.add(a.personExternalId);
      const track = byRole.get(a.roleName);
      const who = named.get(a.personExternalId);
      if (!track || !who) continue;
      const theirs = new Map(statuses.filter((s) => s.personExternalId === a.personExternalId).map((s) => [s.gateId, s]));
      const steps = track.gates.map((g) => {
        const s = theirs.get(g.id);
        const state = s?.state === 'DONE' ? 'done' : s?.state === 'WAIVED' ? 'not needed' : 'to do';
        return {
          name: g.name,
          description: g.description?.trim() || null,
          optional: !g.required,
          state: state as NewPerson['steps'][number]['state'],
          doneAt: state === 'done' && s?.completedAt ? s.completedAt.toISOString() : null,
        };
      });
      const open = steps.map((s) => ({ required: !s.optional, closed: s.state !== 'to do' }));
      if (!stillOnboarding(open, a.startedAt, now)) continue;
      const firstName = who.givenName?.trim() || who.displayName?.trim().split(/\s+/)[0] || '';
      const name = who.displayName?.trim() || [who.givenName, who.familyName].filter(Boolean).join(' ').trim();
      if (!name) continue;
      out.push({
        id: a.personExternalId,
        name,
        firstName: firstName || name,
        startedAt: a.startedAt ? a.startedAt.toISOString() : null,
        done: steps.filter((s) => s.state !== 'to do').length,
        of: steps.length,
        steps,
      });
    }
    return out;
  }
}
