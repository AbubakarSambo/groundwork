import { GroundsService } from './grounds.service';
import { WHY_THE_PERSON_REVIEWED_IS_NOT_TOLD } from '../reports/peers-are-named';

/**
 * DECISION 17 ON THE CHECK-IN PAGE, AS EACH PERSON READS IT (1 October 2026).
 *
 * On a recognition round the lead, Rukia, switched "people see each other" on. Amani is the person
 * the round is about; Chidi was added after her to give a view. Decision 17: Amani is never told who
 * else gave a view. The lead's switch still works for everybody else, so Chidi reads who is on it.
 *
 * Before this, the page asked the rule without saying who was reading, so it hid everybody from
 * everybody, Chidi included, and told the lead her own switch was off.
 */
function serviceFor(scenario: string, viewerRole: 'MEMBER' | 'ADMIN' = 'MEMBER') {
  const participants = [
    { id: 'pLead', userId: 'userRukia', email: 'rukia@example.test', partyType: 'INITIATOR', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Rukia', lastName: 'Otieno' }, createdAt: new Date('2026-08-31') },
    { id: 'pAmani', userId: 'userAmani', email: 'amani@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Amani', lastName: 'Juma' }, createdAt: new Date('2026-09-01') },
    { id: 'pChidi', userId: 'userChidi', email: 'chidi@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Chidi', lastName: 'Okoro' }, createdAt: new Date('2026-09-02') },
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'userRukia', createdAt: new Date(), scenario,
    peersVisibleToEachOther: true, timelineDays: null, restrictExternalVisibility: false,
    participants,
    checkIns: [
      { id: 'cAmani', participantId: 'pAmani', sessionNumber: 1, status: 'NOT_STARTED' },
      { id: 'cChidi', participantId: 'pChidi', sessionNumber: 1, status: 'NOT_STARTED' },
    ],
    resolution: null, patternDetections: [], report: null,
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    checkIn: { aggregate: async () => ({ _max: { sessionNumber: 1 } }), findMany: async () => [], count: async () => 0 },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, undefined);
}

const who = (res: any) => (res.participants as any[]).map((p) => p.user?.firstName).sort();

describe('a recognition round with the lead\'s switch on, on the check-in page', () => {
  it('Amani, the person it is about, reads only herself, and the sentence that says why', async () => {
    const res: any = await serviceFor('RECOGNITION').get('g1', 'org1', 'userAmani');
    expect(who(res)).toEqual(['Amani']);
    expect(res.peersVisibleEffective).toBe(false);
    expect(res.whyThePersonReviewedIsNotTold).toBe('On a check-in about one person, that person is never told who else gave a view.');
    expect(JSON.stringify(res)).not.toMatch(/Chidi|Okoro/);
  });

  it('Chidi, a colleague giving a view, reads who is on it, as the lead chose', async () => {
    const res: any = await serviceFor('RECOGNITION').get('g1', 'org1', 'userChidi');
    expect(who(res)).toEqual(['Amani', 'Chidi', 'Rukia']);
    expect(res.peersVisibleEffective).toBe(true);
    expect(res.whyThePersonReviewedIsNotTold).toBe(WHY_THE_PERSON_REVIEWED_IS_NOT_TOLD);
  });

  it('Rukia, the lead, reads everybody, and reads her switch as on', async () => {
    const res: any = await serviceFor('RECOGNITION').get('g1', 'org1', 'userRukia');
    expect(who(res)).toEqual(['Amani', 'Chidi', 'Rukia']);
    expect(res.peersVisibleEffective).toBe(true);
    expect(res.whyThePersonReviewedIsNotTold).toBe(WHY_THE_PERSON_REVIEWED_IS_NOT_TOLD);
  });

  /* An admin who was not given access does not open a check-in about one person at all (decision 5). */
  it('an admin of the organisation who was not given access is not let in', async () => {
    await expect(serviceFor('RECOGNITION', 'ADMIN').get('g1', 'org1', 'userJuma')).rejects.toThrow();
  });

  it('on an ordinary check-in nobody is given the sentence, and the switch names everybody', async () => {
    const res: any = await serviceFor('OKR_ALIGNMENT').get('g1', 'org1', 'userAmani');
    expect(who(res)).toEqual(['Amani', 'Chidi', 'Rukia']);
    expect(res.whyThePersonReviewedIsNotTold).toBeNull();
  });
});
