import { GroundsService } from './grounds.service';

/**
 * DECISION 77 ON THE CHECK-IN'S OWN PAGE (GET /grounds/:id), AS EACH PERSON READS IT (2 October 2026).
 *
 * Rukia runs "Sales team, Q3" and checks in; Amani checks in; Faraji Odhiambo is on it and an admin has
 * not let him in. Rukia and Amani answered session 1, and Amani has started session 2. Juma is an admin.
 *
 * Before: the header read "Session 1 of 12." with "Session 2 has started for some people, while session
 * 1 is still open.", held back by a man who cannot check in, and nothing said he was waiting to be let in.
 */
function pageFor(viewer: string, opts: { role?: 'MEMBER' | 'ADMIN'; peers?: boolean; held?: boolean; declined?: boolean } = {}) {
  const held = opts.held ?? true;
  const participants = [
    { id: 'pRukia', userId: 'userRukia', email: 'rukia@example.test', partyType: 'INITIATOR', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Rukia', lastName: 'Otieno', awaitingOrgApproval: false }, createdAt: new Date('2026-08-31') },
    { id: 'pAmani', userId: 'userAmani', email: 'amani@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Amani', lastName: 'Wekesa', awaitingOrgApproval: false }, createdAt: new Date('2026-09-01') },
    { id: 'pFaraji', userId: 'userFaraji', email: 'faraji@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Faraji', lastName: 'Odhiambo', awaitingOrgApproval: held }, createdAt: new Date('2026-09-02') },
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'userRukia', createdAt: new Date(), scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY',
    peersVisibleToEachOther: opts.peers ?? true, timelineDays: 84, restrictExternalVisibility: false,
    participants,
    checkIns: [
      { id: 'c1r', participantId: 'pRukia', sessionNumber: 1, status: 'COMPLETED' },
      { id: 'c1a', participantId: 'pAmani', sessionNumber: 1, status: 'COMPLETED' },
      { id: 'c1f', participantId: 'pFaraji', sessionNumber: 1, status: 'NOT_STARTED' },
      /* Amani has started session 2. It was Rukia's own session 2 before 30 October 2026: the page's clock now is the board's, the
         team's (decision 133, the lead checks in when she chooses; this-sessions-count.ts), so a lead's own early start does not move
         it. The point of this spec is unchanged: somebody not let in does not hold the team's session back. */
      { id: 'c2r', participantId: 'pRukia', sessionNumber: 2, status: 'NOT_STARTED' },
      { id: 'c2a', participantId: 'pAmani', sessionNumber: 2, status: 'IN_PROGRESS' },
    ],
    resolution: null, patternDetections: [], report: null,
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: {
      findUnique: jest.fn(async () => ({ role: opts.role ?? 'MEMBER', organizationId: 'org1' })),
      findMany: jest.fn(async () => [{ id: 'userJuma', firstName: 'Juma', lastName: 'Mwangi' }]),
    },
    membershipRequest: { findMany: async () => (opts.declined ? [{ userId: 'userFaraji', status: 'DECLINED', decidedByUserId: 'userJuma', decidedAt: new Date('2026-09-29') }] : []) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    checkIn: { aggregate: async () => ({ _max: { sessionNumber: 1 } }), findMany: async () => [], count: async () => 0 },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, undefined)
    .get('g1', 'org1', viewer) as Promise<any>;
}

describe('decision 77 on the check-in page: the header is not held back by somebody not let in', () => {
  it.each([['Rukia, who runs it', 'userRukia', 'MEMBER'], ['Amani, who checks in', 'userAmani', 'MEMBER'], ['Juma, an admin', 'userJuma', 'ADMIN']] as const)(
    '%s reads "Check-in 2 of 12." with nothing about check-in 1 still being open',
    async (_who, viewer, role) => {
      const res = await pageFor(viewer, { role });
      expect(res.sessionClock.says).toBe('Check-in 2 of 12.');
    },
  );

  /* Changed 22 November 2026 (Hafsah, "Yes, move it on"): session 2 has begun, so once he is let in the team is still on session 2 and
     his session 1 is one he missed. Before, it read "Check-in 1 of 12." with session 2 "started for some people". */
  it('once he is let in, the team is still on session 2', async () => {
    const res = await pageFor('userRukia', { held: false });
    expect(res.sessionClock.says).toBe('Check-in 2 of 12.');
    expect(res.waitingToBeLetIn).toBeNull();
  });
});

describe('decision 77 on the check-in page: who is waiting to be let in, per reader', () => {
  it('Rukia, who runs it, reads "Faraji Odhiambo is waiting to be let in."', async () => {
    expect((await pageFor('userRukia')).waitingToBeLetIn).toBe('Faraji Odhiambo is waiting to be let in.');
  });

  it('Juma, an admin, reads the same', async () => {
    expect((await pageFor('userJuma', { role: 'ADMIN' })).waitingToBeLetIn).toBe('Faraji Odhiambo is waiting to be let in.');
  });

  /* Changed by decision 93, row 4. This pinned "Amani, who checks in, reads nothing about it", the restriction Hafsah removed. */
  it('Amani, who checks in, reads that Faraji is waiting where people are named to each other, and only a count where they are not', async () => {
    const seen = await pageFor('userAmani');
    expect(seen.waitingToBeLetIn).toBe('Faraji Odhiambo is waiting to be let in.');
    const hidden = await pageFor('userAmani', { peers: false });
    expect(hidden.waitingToBeLetIn).toBe('1 person is waiting to be let in.');
    expect(JSON.stringify(hidden)).not.toContain('Faraji');
  });

  it('declined by an admin: Rukia and Juma read "Faraji Odhiambo was not let in.", Amani reads nothing about it', async () => {
    expect((await pageFor('userRukia', { declined: true })).waitingToBeLetIn).toBe('Faraji Odhiambo was not let in.');
    expect((await pageFor('userJuma', { role: 'ADMIN', declined: true })).waitingToBeLetIn).toBe('Faraji Odhiambo was not let in.');
    const amani = await pageFor('userAmani', { declined: true });
    expect(amani.waitingToBeLetIn).toBeNull();
    expect(JSON.stringify(amani)).not.toContain('not let in');
  });

  it('each row says whether that person is let in yet', async () => {
    const res = await pageFor('userRukia');
    expect(Object.fromEntries(res.participants.map((p: any) => [p.id, p.notLetInYet]))).toEqual({ pRukia: false, pAmani: false, pFaraji: true });
  });
});
