import { GroundsService } from './grounds.service';

/**
 * THE LEAD'S FIRST NAME, TO A PARTICIPANT WHOSE CHECK-IN HIDES EVERYONE ELSE (U.8 fourth review).
 *
 * On a hidden check-in, `participants` in the response holds only the reader's own row - correctly,
 * that is the peer rule doing its job. But three screens ("Rukia knows who is here", "Rukia also
 * answers a check-in" on the end card and the Done page) had looked the lead up IN that same
 * filtered `participants` array, so on exactly the check-ins the peer rule protects, the lookup
 * found nobody and fell back to "Your lead". `leadFirstName` and `leadAnswersToo` are read off the
 * RAW participants before the peer filter runs, so they survive it - the real row shape Amani gets
 * is only her own participant row, plus these two fields, never a lead row inside `participants`.
 */
function serviceFor(opts: { peersVisible: boolean | null; leadManagingOnly?: boolean }) {
  const participants = [
    { id: 'pAmani', userId: 'userAmani', email: 'amani@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, user: { firstName: 'Amani', lastName: 'Juma' }, createdAt: new Date('2026-09-01') },
    {
      id: 'pLead', userId: opts.leadManagingOnly ? null : 'userRukia', email: 'rukia@example.test', partyType: 'INITIATOR', roleAsDescribed: null,
      managingOnly: !!opts.leadManagingOnly,
      user: { firstName: 'Rukia', lastName: 'Otieno' }, createdAt: new Date('2026-08-31'),
    },
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: opts.leadManagingOnly ? null : 'userRukia', createdAt: new Date(), scenario: 'NEW_HIRE',
    peersVisibleToEachOther: opts.peersVisible, timelineDays: null, restrictExternalVisibility: true,
    participants,
    checkIns: [{ id: 'cAmani', participantId: 'pAmani', sessionNumber: 1, status: 'NOT_STARTED' }],
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

describe('Amani, a participant on a check-in that hides everyone else from each other', () => {
  it('gets only her own row on participants, never a lead row to search', async () => {
    const res: any = await serviceFor({ peersVisible: false }).get('g1', 'org1', 'userAmani');
    expect(res.peersVisibleEffective).toBe(false);
    expect(res.participants.map((p: any) => p.id)).toEqual(['pAmani']);
  });

  it('still gets the lead\'s first name, and nothing else about her, at the top level', async () => {
    const res: any = await serviceFor({ peersVisible: false }).get('g1', 'org1', 'userAmani');
    expect(res.leadFirstName).toBe('Rukia');
    expect(res.leadAnswersToo).toBe(true);
    // Nothing else about the lead rides along on this field - no email, no id, no lastName.
    expect(JSON.stringify(res.leadFirstName)).not.toMatch(/Otieno|rukia@|userRukia/);
  });

  it('and leadAnswersToo is false when the lead only manages, not a party who answers', async () => {
    const res: any = await serviceFor({ peersVisible: false, leadManagingOnly: true }).get('g1', 'org1', 'userAmani');
    expect(res.leadFirstName).toBe('Rukia');
    expect(res.leadAnswersToo).toBe(false);
  });

  it('the lead herself still gets both fields, and still sees everyone on participants', async () => {
    const res: any = await serviceFor({ peersVisible: false }).get('g1', 'org1', 'userRukia');
    expect(res.leadFirstName).toBe('Rukia');
    expect(res.participants.map((p: any) => p.id).sort()).toEqual(['pAmani', 'pLead']);
  });

  it('on a check-in where peers are shown, the fields are sent just the same', async () => {
    const res: any = await serviceFor({ peersVisible: true }).get('g1', 'org1', 'userAmani');
    expect(res.leadFirstName).toBe('Rukia');
    expect(res.leadAnswersToo).toBe(true);
  });
});

/**
 * ONLY THE FIRST WORD (U.8 fifth review). Signup stores "Your name" whole as `firstName`
 * (AuthPage.tsx, auth.service.ts), so a lead who typed "Rukia Otieno" has that whole string sitting
 * in `user.firstName`. `leadFirstName` is meant to be, and say it is, her FIRST name alone.
 */
function serviceForWholeName(leadWholeName: string) {
  const participants = [
    { id: 'pAmani', userId: 'userAmani', email: 'amani@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, user: { firstName: 'Amani', lastName: 'Juma' }, createdAt: new Date('2026-09-01') },
    {
      id: 'pLead', userId: 'userLead', email: 'lead@example.test', partyType: 'INITIATOR', roleAsDescribed: null,
      managingOnly: false, user: { firstName: leadWholeName, lastName: '' }, createdAt: new Date('2026-08-31'),
    },
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'userLead', createdAt: new Date(), scenario: 'NEW_HIRE',
    peersVisibleToEachOther: false, timelineDays: null, restrictExternalVisibility: true,
    participants,
    checkIns: [{ id: 'cAmani', participantId: 'pAmani', sessionNumber: 1, status: 'NOT_STARTED' }],
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

describe('leadFirstName holds only the first word, whatever signup stored', () => {
  it('trims a whole name typed at signup down to its first word', async () => {
    const res: any = await serviceForWholeName('Rukia Otieno').get('g1', 'org1', 'userAmani');
    expect(res.leadFirstName).toBe('Rukia');
    expect(JSON.stringify(res.leadFirstName)).not.toMatch(/Otieno/);
  });

  it('leaves an already-single first name untouched', async () => {
    const res: any = await serviceForWholeName('Rukia').get('g1', 'org1', 'userAmani');
    expect(res.leadFirstName).toBe('Rukia');
  });

  it('is null, not an empty string, when there is nothing to trim', async () => {
    const res: any = await serviceForWholeName('   ').get('g1', 'org1', 'userAmani');
    expect(res.leadFirstName).toBeNull();
  });
});
