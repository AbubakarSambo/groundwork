import { whatThisSessionHolds } from './what-this-session-holds';

/**
 * (Final check, 9 October.) A member of the anchor's check-in read, on the board's quick read, "2 targets are set, and none of them has a
 * number to measure from" over a page that listed no target: the lead's aims are the lead's alone in that check-in (decision 96, item 8),
 * and the ground read serves a member none. The tile counts what the member may read.
 */
const OBJECTIVES = [
  { id: 'o1', name: 'The team understands that write-offs come out of the same money as their raises.', count: 0, target: null, ownerParticipantId: null, setByParticipantId: 'p-lead', isADecisionAboutAPerson: false },
  { id: 'o2', name: 'The team flags slow stock early and pushes the old stock out first.', count: 0, target: null, ownerParticipantId: null, setByParticipantId: 'p-lead', isADecisionAboutAPerson: false },
];
const prismaFor = (ground: Record<string, unknown>) => ({
  checkIn: { findMany: async () => [] },
  groundDependency: { findMany: async () => [] },
  groundObjective: { findMany: async () => OBJECTIVES },
  groundObjectiveSnapshot: { findMany: async () => [] },
  personObjective: { findMany: async () => [] },
  recordEntry: { findMany: async () => [] },
  ground: { findUnique: async () => ({ whoSeesTargets: 'THEIR_OWN', peersVisibleToEachOther: true, participants: [], ...ground }) },
}) as any;

describe('the quick read counts the targets this reader may read', () => {
  it('a member of the anchor\'s check-in is counted none, as the page lists none', async () => {
    const held = await whatThisSessionHolds(prismaFor({ startedFrom: 'anchor', scenario: 'HELP_TEAM_UNDERSTAND' }), 'g1', 1, { participantId: 'p-kito', isLead: false, runsIt: false });
    expect(held.targetsSet).toBe(0);
    expect(held.targetsWithANumber).toBe(0);
  });
  it('the lead of it is counted both', async () => {
    const held = await whatThisSessionHolds(prismaFor({ startedFrom: 'anchor', scenario: 'HELP_TEAM_UNDERSTAND' }), 'g1', 1, { participantId: 'p-lead', isLead: true, runsIt: true });
    expect(held.targetsSet).toBe(2);
  });
  it('a member of an ordinary check-in is counted both, as before', async () => {
    const held = await whatThisSessionHolds(prismaFor({ startedFrom: null, scenario: 'GOAL_ALIGNMENT' }), 'g1', 1, { participantId: 'p-kito', isLead: false, runsIt: false });
    expect(held.targetsSet).toBe(2);
  });
});
