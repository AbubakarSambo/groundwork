import { GroundsService } from './grounds.service';

/**
 * "THE SHARED REPORT COMPARES TWO ACCOUNTS... IT WILL BUILD ONCE SOMEBODY IS ADDED" - THE SAME
 * BUG AS `aTeamReportComes`, ON A DIFFERENT SENTENCE (U.8 fifth review).
 *
 * GroundParticipantPage's Report tab decided whether to show that notice from
 * `whoIsInRound(ground.participants, sessionNumber, scenario).length < 2` - `ground.participants`
 * again being the array a check-in that hides peers from each other reduces to the reader's own row
 * alone. A real team of four read the "not enough people yet" notice for ever.
 *
 * `atLeastTwoInThisRound` is read off the RAW participants, with the same rule the client's
 * `countsInRound` uses: a managing-only lead counts in round one (unless the scenario is one where
 * the lead only asks - TEAM_UPDATES, DISCOVERY), and never after.
 */
function serviceFor(opts: {
  peersVisible: boolean | null;
  scenario?: string;
  reportReleased?: boolean;
  participants: { managingOnly?: boolean }[];
}) {
  const participants = opts.participants.map((p, i) => ({
    id: `p${i}`, userId: `user${i}`, email: `p${i}@example.test`,
    partyType: i === 0 ? 'INITIATOR' : 'PARTICIPANT', roleAsDescribed: null,
    managingOnly: !!p.managingOnly,
    user: { firstName: `Person${i}`, lastName: 'Surname' }, createdAt: new Date('2026-09-01'),
  }));
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'user0', createdAt: new Date(),
    scenario: opts.scenario ?? 'NEW_HIRE',
    peersVisibleToEachOther: opts.peersVisible, timelineDays: null, restrictExternalVisibility: true,
    participants,
    checkIns: participants.map((p) => ({ id: `c-${p.id}`, participantId: p.id, sessionNumber: 1, status: 'NOT_STARTED' })),
    resolution: null, patternDetections: [],
    report: opts.reportReleased ? { id: 'r1', releasedAt: new Date(), sharedPicture: null, theOpening: null, createdAt: new Date(), agreements: [], divergences: [], sharedAs: null } : null,
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    checkIn: {
      aggregate: async () => ({ _max: { sessionNumber: 1 } }),
      findMany: async () => [], count: async () => 0,
    },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, undefined);
}

describe('atLeastTwoInThisRound, on a check-in that hides everyone else from each other', () => {
  it('is true for a real team, even though this reader is handed only her own row', async () => {
    const res: any = await serviceFor({
      peersVisible: false,
      participants: [{}, {}, {}, {}],
    }).get('g1', 'org1', 'user1');
    expect(res.participants.map((p: any) => p.id)).toEqual(['p1']);
    expect(res.atLeastTwoInThisRound).toBe(true);
  });

  it('is false for a genuinely solo check-in', async () => {
    const res: any = await serviceFor({ peersVisible: false, participants: [{}] }).get('g1', 'org1', 'user0');
    expect(res.atLeastTwoInThisRound).toBe(false);
  });

  it('a managing-only lead still counts in round one, same as the client\'s own rule', async () => {
    const res: any = await serviceFor({
      peersVisible: false,
      participants: [{ managingOnly: true }, {}], // managing-only lead + one participant
    }).get('g1', 'org1', 'user1');
    expect(res.atLeastTwoInThisRound).toBe(true);
  });

  it('but not on a "lead only asks" scenario, where a managing-only lead never answers', async () => {
    const res: any = await serviceFor({
      peersVisible: false,
      scenario: 'TEAM_UPDATES',
      participants: [{ managingOnly: true }, {}],
    }).get('g1', 'org1', 'user1');
    expect(res.atLeastTwoInThisRound).toBe(false);
  });

  it('stays true even once the report has released, when sessionProgress is no longer computed', async () => {
    const res: any = await serviceFor({
      peersVisible: false,
      reportReleased: true,
      participants: [{}, {}, {}],
    }).get('g1', 'org1', 'user1');
    expect(res.atLeastTwoInThisRound).toBe(true);
  });
});
