import { whatThisSessionHolds } from './what-this-session-holds';

/**
 * A BLOCKER FROM SESSION ONE IS NOT A BLOCKER IN SESSION TWELVE.
 *
 * The report read every dependency on the ground - no session, no clearedAt - under a heading that
 * said "this session". Movement was `count - prevCount` with prevCount defaulting to zero, so an
 * objective never edited reported its whole lifetime as this session's movement.
 */
function aPrisma(o: { checkIns: { id: string }[]; deps: any[]; objectives: any[]; snapshots: Record<number, { objectiveId: string; count: number }[]> }) {
  return {
    checkIn: { findMany: jest.fn(async () => o.checkIns) },
    recordEntry: { findMany: jest.fn(async () => []) },
    groundDependency: {
      findMany: jest.fn(async ({ where }: any) => {
        expect(where.clearedAt).toBeNull();
        expect(where.sourceCheckInId.in).toEqual(o.checkIns.map((c) => c.id));
        return o.deps;
      }),
    },
    groundObjective: { findMany: jest.fn(async () => o.objectives) },
    groundObjectiveSnapshot: { findMany: jest.fn(async ({ where }: any) => o.snapshots[where.sessionNumber] ?? []) },
  } as any;
}

const LEAD = { participantId: null, isLead: true };

describe('what this session holds', () => {
  it('counts only dependencies raised by this session\'s check-ins, and not self-blocks', async () => {
    const prisma = aPrisma({
      checkIns: [{ id: 'ci-12' }],
      deps: [
        { status: 'BLOCKING', fromParticipantId: 'a', onParticipantId: 'b' },
        { status: 'WAITING', fromParticipantId: 'a', onParticipantId: 'c' },
        { status: 'BLOCKING', fromParticipantId: 'a', onParticipantId: 'a' },
      ],
      objectives: [], snapshots: {},
    });
    const r = await whatThisSessionHolds(prisma, 'g', 12, LEAD);
    expect(r.blocked).toBe(1);
    expect(r.waiting).toBe(1);
  });

  it('B-103: counts the people who are waiting, not their waits, because the tile reads "N people are waiting on somebody else"', async () => {
    const one = await whatThisSessionHolds(aPrisma({
      checkIns: [{ id: 'ci-1' }],
      deps: [
        { status: 'WAITING', fromParticipantId: 'halima', onParticipantId: null, what: 'the shop numbers' },
        { status: 'WAITING', fromParticipantId: 'halima', onParticipantId: null, what: 'the complaint list' },
      ],
      objectives: [], snapshots: {},
    }), 'g', 1, LEAD);
    expect(one.waiting).toBe(1);
    const two = await whatThisSessionHolds(aPrisma({
      checkIns: [{ id: 'ci-1' }],
      deps: [
        { status: 'WAITING', fromParticipantId: 'halima', onParticipantId: null, what: 'the shop numbers' },
        { status: 'WAITING', fromParticipantId: 'juma', onParticipantId: null, what: 'the complaint list' },
      ],
      objectives: [], snapshots: {},
    }), 'g', 1, LEAD);
    expect(two.waiting).toBe(2);
  });

  it('a session with no check-ins has nothing raised in it, and does not ask the dependency table', async () => {
    const prisma = aPrisma({ checkIns: [], deps: [{ status: 'BLOCKING', fromParticipantId: 'a', onParticipantId: 'b' }], objectives: [], snapshots: {} });
    const r = await whatThisSessionHolds(prisma, 'g', 3, LEAD);
    expect(r.blocked).toBe(0);
    expect(prisma.groundDependency.findMany).not.toHaveBeenCalled();
  });

  it('movement is the difference between two snapshots, and unknown with only one', async () => {
    const objectives = [{ id: 'o1', count: 10 }];
    const none = await whatThisSessionHolds(aPrisma({ checkIns: [], deps: [], objectives, snapshots: {} }), 'g', 1, LEAD);
    expect(none.movedOnTargets).toBeNull();
    const first = await whatThisSessionHolds(aPrisma({ checkIns: [], deps: [], objectives, snapshots: {} }), 'g', 2, LEAD);
    expect(first.movedOnTargets).toBeNull();
    const known = await whatThisSessionHolds(aPrisma({ checkIns: [], deps: [], objectives, snapshots: { 1: [{ objectiveId: 'o1', count: 6 }] } }), 'g', 2, LEAD);
    expect(known.movedOnTargets).toBe(4);
    const closed = await whatThisSessionHolds(aPrisma({ checkIns: [], deps: [], objectives, snapshots: { 1: [{ objectiveId: 'o1', count: 6 }], 2: [{ objectiveId: 'o1', count: 8 }] } }), 'g', 2, LEAD);
    expect(closed.movedOnTargets).toBe(2);
  });
});
