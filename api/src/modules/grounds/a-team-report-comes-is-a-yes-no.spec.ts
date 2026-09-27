import { GroundsService } from './grounds.service';

/**
 * "TWO REPORTS COME FROM THIS" - THE ANSWER SURVIVES THE PEER FILTER TOO (U.8 fifth review).
 *
 * The Done page decided whether to show "Two reports come from this" and the team's report card
 * from `howManyAnswer(ground) > 1`, which counted `ground.participants` - the exact array a check-in
 * that hides peers from each other reduces to the reader's own row alone. A participant there read
 * "Your own report" and no team card at all, whatever the true size of the team, because the array
 * she was handed always looked like a check-in of one.
 *
 * `aTeamReportComes` is read off the RAW participants, before that filter runs, and sent as a plain
 * yes/no - never a count, so a hidden check-in cannot learn its own size from this field either.
 */
function serviceFor(opts: { peersVisible: boolean | null; participants: { managingOnly?: boolean }[] }) {
  const participants = opts.participants.map((p, i) => ({
    id: `p${i}`, userId: `user${i}`, email: `p${i}@example.test`,
    partyType: i === 0 ? 'INITIATOR' : 'PARTICIPANT', roleAsDescribed: null,
    managingOnly: !!p.managingOnly,
    user: { firstName: `Person${i}`, lastName: 'Surname' }, createdAt: new Date('2026-09-01'),
  }));
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'user0', createdAt: new Date(), scenario: 'NEW_HIRE',
    peersVisibleToEachOther: opts.peersVisible, timelineDays: null, restrictExternalVisibility: true,
    participants,
    checkIns: participants.map((p, i) => ({ id: `c${i}`, participantId: p.id, sessionNumber: 1, status: 'NOT_STARTED' })),
    resolution: null, patternDetections: [], report: null,
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    checkIn: { aggregate: async () => ({ _max: { sessionNumber: 1 } }), findMany: async () => [], count: async () => 0 },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, undefined);
}

describe('aTeamReportComes, on a check-in that hides everyone else from each other', () => {
  it('is true for a real team, even though this reader is handed only her own row', async () => {
    const res: any = await serviceFor({
      peersVisible: false,
      participants: [{}, {}, {}, {}], // lead + 3 participants
    }).get('g1', 'org1', 'user1');
    expect(res.participants.map((p: any) => p.id)).toEqual(['p1']); // only her own row
    expect(res.aTeamReportComes).toBe(true);
  });

  it('is false for a genuinely solo check-in', async () => {
    const res: any = await serviceFor({
      peersVisible: false,
      participants: [{}], // lead alone, nobody else
    }).get('g1', 'org1', 'user0');
    expect(res.aTeamReportComes).toBe(false);
  });

  it('does not count a managing-only lead as a second party', async () => {
    const res: any = await serviceFor({
      peersVisible: false,
      participants: [{ managingOnly: true }, {}], // managing-only lead + one participant
    }).get('g1', 'org1', 'user1');
    expect(res.aTeamReportComes).toBe(false);
  });

  it('is a boolean, never the actual count, even in the raw response', async () => {
    const res: any = await serviceFor({
      peersVisible: false,
      participants: [{}, {}, {}, {}],
    }).get('g1', 'org1', 'user1');
    expect(typeof res.aTeamReportComes).toBe('boolean');
    expect(JSON.stringify(res)).not.toMatch(/"aTeamReportComes":\s*[0-9]/);
  });

  it('is sent just the same when peers are visible to each other', async () => {
    const res: any = await serviceFor({
      peersVisible: true,
      participants: [{}, {}],
    }).get('g1', 'org1', 'user1');
    expect(res.aTeamReportComes).toBe(true);
  });
});
