import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { GateState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { stillOnboarding, whatIsLeft, sayWhatIsLeft } from './still-finding-their-feet';

/**
 * THE GATES SOMEBODY NEW TO A ROLE HAS TO GET THROUGH.
 *
 * Configured per role by the organisation, because what a new engineer owes in week one is not what
 * a new head of partnerships owes, and a single global checklist would be wrong for both.
 *
 * Statuses are created LAZILY - a person has a status row for a gate once something has happened to
 * it, and an absent row means PENDING. Pre-creating a row for every person against every gate would
 * mean a new gate added next year silently marks everybody who joined before it as behind.
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async defineTrack(
    organizationId: string,
    roleName: string,
    name: string,
    gates: { key: string; name: string; description?: string; required?: boolean }[],
  ) {
    if (!roleName?.trim() || !name?.trim()) throw new BadRequestException('A track needs a role and a name.');
    if (!gates?.length) throw new BadRequestException('A track with no gates asks nothing of anybody.');

    const keys = gates.map((g) => g.key);
    if (new Set(keys).size !== keys.length) {
      /* Two gates with one key would make marking one done ambiguous, and the unique index would
         reject the second anyway - so say which, rather than surfacing a constraint violation. */
      throw new BadRequestException('Two gates share a key. Each has to be distinct within a track.');
    }

    const track = await this.prisma.onboardingTrack.upsert({
      where: { organizationId_roleName: { organizationId, roleName } },
      create: { organizationId, roleName, name },
      update: { name },
    });

    /*
     * Gates are replaced rather than merged, but statuses are NOT touched. A key that survives the
     * rewrite keeps its history through the `(trackId, key)` unique index; a key that disappears
     * takes its statuses with it by cascade, which is right - a gate the organisation removed is
     * not a gate anybody is still behind on.
     */
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.onboardingGate.findMany({ where: { trackId: track.id }, select: { key: true } });
      const gone = existing.map((e) => e.key).filter((k) => !keys.includes(k));
      if (gone.length) await tx.onboardingGate.deleteMany({ where: { trackId: track.id, key: { in: gone } } });
      for (const [i, g] of gates.entries()) {
        await tx.onboardingGate.upsert({
          where: { trackId_key: { trackId: track.id, key: g.key } },
          create: { trackId: track.id, key: g.key, name: g.name, description: g.description ?? null,
            ordinal: i, required: g.required ?? true },
          update: { name: g.name, description: g.description ?? null, ordinal: i, required: g.required ?? true },
        });
      }
    });

    return this.trackFor(organizationId, roleName);
  }

  async trackFor(organizationId: string, roleName: string) {
    return this.prisma.onboardingTrack.findUnique({
      where: { organizationId_roleName: { organizationId, roleName } },
      include: { gates: { orderBy: { ordinal: 'asc' } } },
    });
  }

  /**
   * Where one person has got to, and what is left.
   *
   * The role comes from their live assignment rather than being passed in, so a caller cannot ask
   * about somebody against a role they do not hold.
   */
  async statusFor(organizationId: string, personExternalId: string) {
    const assignment = await this.prisma.roleAssignment.findFirst({
      where: { organizationId, personExternalId, endedAt: null },
      orderBy: { startedAt: 'desc' },
      select: { roleName: true, startedAt: true },
    });
    if (!assignment) {
      return { roleName: null, startedAt: null, gates: [], left: [], stillOnboarding: false,
        why: 'They do not hold a role here, so there is nothing they are onboarding into.' };
    }

    const track = await this.trackFor(organizationId, assignment.roleName);
    if (!track) {
      return { roleName: assignment.roleName, startedAt: assignment.startedAt, gates: [], left: [],
        stillOnboarding: false,
        why: `No onboarding track is set up for ${assignment.roleName}, so nothing has been asked of them.` };
    }

    const statuses = await this.prisma.onboardingStatus.findMany({
      where: { organizationId, personExternalId, gateId: { in: track.gates.map((g) => g.id) } },
    });
    const byGate = new Map(statuses.map((s) => [s.gateId, s]));

    const gates = track.gates.map((g) => {
      const s = byGate.get(g.id);
      const state = s?.state ?? GateState.PENDING;
      return {
        key: g.key, name: g.name, description: g.description, ordinal: g.ordinal, required: g.required,
        state,
        /* WAIVED closes the gate for the window and stays distinct from DONE, so "did they actually
           do it" remains answerable later. */
        closed: state === GateState.DONE || state === GateState.WAIVED,
        completedAt: s?.completedAt ?? null,
        evidenceRef: s?.evidenceRef ?? null,
      };
    });

    const left = whatIsLeft(gates);
    return {
      roleName: assignment.roleName,
      startedAt: assignment.startedAt,
      gates,
      left,
      stillOnboarding: stillOnboarding(gates, assignment.startedAt, new Date()),
      says: sayWhatIsLeft(left, assignment.roleName),
    };
  }

  async mark(
    organizationId: string,
    personExternalId: string,
    gateKey: string,
    state: GateState,
    evidenceRef?: string,
  ) {
    const assignment = await this.prisma.roleAssignment.findFirst({
      where: { organizationId, personExternalId, endedAt: null },
      orderBy: { startedAt: 'desc' },
      select: { roleName: true },
    });
    if (!assignment) throw new NotFoundException('They do not hold a role here.');

    const gate = await this.prisma.onboardingGate.findFirst({
      where: { key: gateKey, track: { organizationId, roleName: assignment.roleName } },
      select: { id: true },
    });
    if (!gate) throw new NotFoundException(`No gate "${gateKey}" on the track for ${assignment.roleName}.`);

    /*
     * The unique row is the idempotency guard rather than a look-then-write: marking the same gate
     * done twice is a normal thing for an integration to do, and it must not create two rows or
     * move the completion date the second time.
     */
    const closed = state === GateState.DONE || state === GateState.WAIVED;
    return this.prisma.onboardingStatus.upsert({
      where: { personExternalId_gateId: { personExternalId, gateId: gate.id } },
      create: { organizationId, personExternalId, gateId: gate.id, state,
        completedAt: closed ? new Date() : null, evidenceRef: evidenceRef ?? null },
      update: {
        state,
        /* Keep the first completion date. Re-marking something done did not un-do and re-do it. */
        ...(closed ? {} : { completedAt: null }),
        ...(evidenceRef ? { evidenceRef } : {}),
      },
    });
  }

  /** Everybody currently inside their window, for the detectors to leave alone. */
  async whoIsStillOnboarding(organizationId: string): Promise<Set<string>> {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { organizationId, endedAt: null },
      select: { personExternalId: true, roleName: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    });
    if (!assignments.length) return new Set();

    const tracks = await this.prisma.onboardingTrack.findMany({
      where: { organizationId },
      include: { gates: { select: { id: true, required: true } } },
    });
    const byRole = new Map(tracks.map((t) => [t.roleName, t]));

    const statuses = await this.prisma.onboardingStatus.findMany({
      where: { organizationId },
      select: { personExternalId: true, gateId: true, state: true },
    });
    const closedFor = new Map<string, Set<string>>();
    for (const s of statuses) {
      if (s.state === GateState.PENDING) continue;
      const set = closedFor.get(s.personExternalId) ?? new Set<string>();
      set.add(s.gateId);
      closedFor.set(s.personExternalId, set);
    }

    const now = new Date();
    const out = new Set<string>();
    const seen = new Set<string>();
    for (const a of assignments) {
      /* The newest live assignment wins, which the ordering above guarantees. */
      if (seen.has(a.personExternalId)) continue;
      seen.add(a.personExternalId);
      const track = byRole.get(a.roleName);
      if (!track) continue;
      const closed = closedFor.get(a.personExternalId) ?? new Set<string>();
      const gates = track.gates.map((g) => ({ required: g.required, closed: closed.has(g.id) }));
      if (stillOnboarding(gates, a.startedAt, now)) out.add(a.personExternalId);
    }
    return out;
  }
}
