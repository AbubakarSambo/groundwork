import { GroundsService } from './grounds.service';

/**
 * THE CHECK-IN'S OWN READ, AS A PARTICIPANT, BEFORE AND AFTER THE REPORT IS RELEASED (U.5 review).
 *
 * Found by the review: as a participant, GET /grounds/:id returned report.sharedPicture while
 * releasedAt was still null, the lead's whole account of the team ("... Miriam is responsible for
 * closing 4 sales ..."). A participant never reads the team's report before it is shared with them.
 * And where people are not named to each other, the session rows of hidden colleagues stay out too.
 */
const PICTURE = 'The lead reports 18 sales. Blair is responsible for closing 4 sales.';

function serviceFor(opts: { released: boolean; peersVisible: boolean | null; viewerRole?: string }) {
  const participants = [
    { id: 'pA', userId: 'userA', email: 'ada@example.test', partyType: 'PARTICIPANT', user: { firstName: 'Ada', lastName: 'L' }, createdAt: new Date() },
    { id: 'pB', userId: 'userB', email: 'blair@example.test', partyType: 'PARTICIPANT', user: { firstName: 'Blair', lastName: 'K' }, createdAt: new Date() },
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'userLead', createdAt: new Date(), scenario: 'OKR_ALIGNMENT',
    peersVisibleToEachOther: opts.peersVisible, timelineDays: null, restrictExternalVisibility: true,
    participants,
    checkIns: [
      { id: 'cA', participantId: 'pA', sessionNumber: 1, status: 'COMPLETED' },
      { id: 'cB', participantId: 'pB', sessionNumber: 1, status: 'NOT_STARTED' },
    ],
    resolution: null, patternDetections: [],
    report: {
      id: 'r1', releasedAt: opts.released ? new Date() : null, sharedPicture: PICTURE, theOpening: 'Sales are ahead.',
      createdAt: new Date(), agreements: [{ text: 'agreed thing' }], divergences: [{ text: 'a difference between Ada and Blair' }],
    },
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: opts.viewerRole ?? 'MEMBER', organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    /* For the session progress the read works out while the report is not yet released. */
    checkIn: { aggregate: async () => ({ _max: { sessionNumber: 1 } }), findMany: async () => [], count: async () => 0 },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any);
}

describe('the report on the check-in read, as a participant', () => {
  it('before it is released: none of its text, and no agreements or differences', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: true }).get('g1', 'org1', 'userA');
    expect(res.report).toEqual({ id: 'r1', releasedAt: null, createdAt: expect.any(Date) });
    expect(JSON.stringify(res)).not.toContain('responsible for closing');
    expect(JSON.stringify(res)).not.toContain('a difference between');
  });

  it('once it is released: the shared picture and the opening, still never the raw differences', async () => {
    const res: any = await serviceFor({ released: true, peersVisible: true }).get('g1', 'org1', 'userA');
    expect(res.report.sharedPicture).toBe(PICTURE);
    expect(res.report.theOpening).toBe('Sales are ahead.');
    expect(res.report.divergences).toBeUndefined();
    expect(res.report.agreements).toBeUndefined();
  });

  it('the lead who runs it still reads the report before it is released', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: true }).get('g1', 'org1', 'userLead');
    expect(res.report.sharedPicture).toBe(PICTURE);
  });

  it('and so does an admin of the organisation', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: true, viewerRole: 'ADMIN' }).get('g1', 'org1', 'userAdmin');
    expect(res.report.sharedPicture).toBe(PICTURE);
  });
});

describe('the session rows on the check-in read, where people are not named to each other', () => {
  it('a participant gets only their own', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: false }).get('g1', 'org1', 'userA');
    expect(res.peersVisibleEffective).toBe(false);
    expect(res.participants.map((p: any) => p.id)).toEqual(['pA']);
    expect(res.checkIns.map((c: any) => c.id)).toEqual(['cA']);
  });

  it('the lead still sees everyone', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: false }).get('g1', 'org1', 'userLead');
    expect(res.checkIns.map((c: any) => c.id)).toEqual(['cA', 'cB']);
  });
});
