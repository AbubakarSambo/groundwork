import { GroundsService } from './grounds.service';

/**
 * WHAT THIS CHECK-IN IS FOR: WHAT EACH READER IS SENT, AND WHOSE WORDS IT IS (U.7 review).
 *
 * The Context page told Wanjiru "Your words, from setup. Everyone reads this before they answer."
 * over her own words, while Aisha was shown a different text, the short read Groundwork writes from
 * the brief. Now whoever runs the check-in is also sent what the people in it read, and the page is
 * told whether that is the lead's own words and who last changed it, so it says only what is true.
 */
const WANJIRU = 'u-wanjiru';
const AISHA = 'u-aisha';
const OTIENO = 'u-otieno';
const HER_WORDS = 'Twenty-five water pumps this quarter. I want to see what actually moved each week.';
const TOLD = 'This check-in follows the water pump sales this quarter.';

function getAs(userId: string, over: any = {}) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: WANJIRU, createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN',
    brief: HER_WORDS, toldToParticipants: TOLD, groundAuditLog: null,
    participants: [
      { id: 'p-w', userId: WANJIRU, email: 'w@x.test', partyType: 'INITIATOR', roleAsDescribed: null, createdAt: new Date(), user: { firstName: 'Wanjiru', lastName: 'Mwangi' } },
      { id: 'p-a', userId: AISHA, email: 'a@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null, createdAt: new Date(), user: { firstName: 'Aisha', lastName: 'Otieno' } },
    ],
    checkIns: [], resolution: null, patternDetections: [], objectives: [],
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
    ...over,
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: {
      findUnique: jest.fn(async (a: any) => {
        if (a?.select?.firstName) return { firstName: a.where.id === OTIENO ? 'Otieno' : 'Wanjiru' };
        return { role: userId === OTIENO ? 'ADMIN' : 'MEMBER', organizationId: 'org1' };
      }),
    },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g1', 'org1', userId) as Promise<any>;
}

describe('what this check-in is for, as each reader is sent it', () => {
  it('Wanjiru gets her own words to rewrite, and what her people read, which is not her words', async () => {
    const got = await getAs(WANJIRU);
    expect(got.brief).toBe(HER_WORDS);
    expect(got.briefAsEveryoneReadsIt).toBe(TOLD);
    expect(got.briefIsTheLeadsOwnWords).toBe(false);
    expect(got.briefChangedBy).toBeNull();
  });

  it('where nothing was rewritten, what everyone reads is her own words', async () => {
    const got = await getAs(WANJIRU, { toldToParticipants: null, brief: 'Twenty-five water pumps this quarter.' });
    expect(got.briefAsEveryoneReadsIt).toBe('Twenty-five water pumps this quarter.');
    expect(got.briefIsTheLeadsOwnWords).toBe(true);
  });

  it('Aisha gets only what everyone reads, and not who changed it', async () => {
    const got = await getAs(AISHA, { groundAuditLog: { timeline: [], contextNotes: [], briefChangedBy: { userId: OTIENO, at: '2026-09-26T10:00:00Z' } } });
    expect(got.brief).toBe(TOLD);
    expect(JSON.stringify(got)).not.toContain('I want to see what actually moved');
    expect(got.briefAsEveryoneReadsIt).toBeUndefined();
    expect(got.briefChangedBy).toBeUndefined();
    expect(got.groundAuditLog).toBeUndefined();
    expect(JSON.stringify(got)).not.toContain(OTIENO);
  });

  it('where Otieno rewrote it, Wanjiru is told it was Otieno, and it is not called her words', async () => {
    const audit = { groundAuditLog: { timeline: [], contextNotes: [], briefChangedBy: { userId: OTIENO, at: '2026-09-26T10:00:00Z' } }, toldToParticipants: null };
    const hers = await getAs(WANJIRU, audit);
    expect(hers.briefChangedBy).toEqual({ firstName: 'Otieno', isYou: false, isTheLead: false });
    expect(hers.briefIsTheLeadsOwnWords).toBe(false);
    const his = await getAs(OTIENO, audit);
    expect(his.briefChangedBy).toEqual({ firstName: 'Otieno', isYou: true, isTheLead: false });
  });
});

describe('rewriting it records who did', () => {
  function makeService(viewer: any) {
    const g = { id: 'g1', organizationId: 'org1', initiatorId: WANJIRU, label: 'Sales', timelineDays: 90, timelineWeeks: 13, cadence: 'WEEKLY', mode: 'SHARED', brief: HER_WORDS, groundAuditLog: null };
    const updated = jest.fn(async (args: any) => ({ ...g, ...args.data }));
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => g), update: updated },
      groundParticipant: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      user: { findUnique: jest.fn(async () => viewer) },
      checkIn: { findFirst: jest.fn(async () => null) },
    };
    return { service: new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any), updated };
  }

  it('an admin who rewrites it is recorded as having changed it', async () => {
    const { service, updated } = makeService({ role: 'ADMIN', organizationId: 'org1' });
    await service.updateTimeline('g1', OTIENO, { brief: 'Sell 25 water pumps this quarter.' });
    const log = updated.mock.calls[0][0].data.groundAuditLog;
    expect(log.briefChangedBy.userId).toBe(OTIENO);
  });

  it('saving the same words again records nothing', async () => {
    const { service, updated } = makeService({ role: 'MEMBER', organizationId: 'org1' });
    await service.updateTimeline('g1', WANJIRU, { brief: HER_WORDS });
    expect(updated.mock.calls[0][0].data.groundAuditLog.briefChangedBy).toBeUndefined();
  });
});
