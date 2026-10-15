import { ReportsService } from './reports.service';

/**
 * REQUEST 79 (b). The board serves the coaching from the report's own builders, under the report's privacy:
 * a person reads their own note and nobody else's; whoever runs the check-in also reads what to ask each
 * person; an admin who only reads gets nothing; a stranger gets nothing.
 */
const party = (id: string, userId: string, type: string, n: number) => ({
  id, userId, partyType: type, email: `${id}@x.test`, managingOnly: false, roleAsDescribed: null, remitAsGiven: null, nameGiven: null,
  organisationGiven: null, createdAt: new Date(`2026-09-0${n}`), user: { firstName: id, lastName: 'X', email: `${id}@x.test` },
});

function service() {
  const ground = {
    id: 'g1', organizationId: 'org', initiatorId: 'u-lead', createdByUserId: 'u-setter', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY',
    peersVisibleToEachOther: true, report: { findings: [] },
    participants: [party('lead', 'u-lead', 'INITIATOR', 1), party('ade', 'u-ade', 'PARTICIPANT', 2), party('chidi', 'u-chidi', 'PARTICIPANT', 3)],
  };
  const prisma: any = new Proxy({ ground: { findUnique: async () => ground } }, {
    get(t: any, p: string) {
      if (!(p in t) && typeof p === 'string' && !p.startsWith('$')) t[p] = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0 };
      return t[p];
    },
  });
  const svc: any = new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => '' } as any, { emit: async () => undefined } as any, {} as any, {} as any);
  svc.coachingNoteFor = jest.fn(async (_g: string, _ground: any, p: any) => ({ forWhom: p.id, say: `One thing for ${p.id}.` }));
  svc.whatToProbeOn = jest.fn(async () => [{ who: 'Ade', probe: ['Ask about the delayed order.'] }]);
  return svc as any;
}

describe('the coaching on the board', () => {
  it('the person reads their own note, never another person’s, and no list of what to ask', async () => {
    const s = service();
    const got: any = await s.coachingForTheBoard('g1', 'u-ade');
    expect(got.yours).toEqual({ forWhom: 'ade', say: 'One thing for ade.' });
    expect(got.eachPerson).toBeNull();
    expect(s.coachingNoteFor.mock.calls.map((c: any[]) => c[2].id)).toEqual(['ade']);
    expect(s.whatToProbeOn).not.toHaveBeenCalled();
  });
  it('a colleague reads their own note and not Ade’s', async () => {
    const s = service();
    const got: any = await s.coachingForTheBoard('g1', 'u-chidi');
    expect(JSON.stringify(got)).toContain('chidi');
    expect(JSON.stringify(got)).not.toContain('ade.');
    expect(got.eachPerson).toBeNull();
  });
  it('the lead reads their own note and what to ask each person', async () => {
    const s = service();
    const got: any = await s.coachingForTheBoard('g1', 'u-lead');
    expect(got.yours.forWhom).toBe('lead');
    expect(got.eachPerson).toEqual([{ who: 'Ade', probe: ['Ask about the delayed order.'] }]);
  });
  it('the admin who set it up reads what to ask each person, as a pattern is read', async () => {
    const got: any = await service().coachingForTheBoard('g1', 'u-setter');
    expect(got.eachPerson).toBeTruthy();
    expect(got.yours).toBeNull();
  });
  it('an admin who only reads, and a stranger, read nothing', async () => {
    expect(await service().coachingForTheBoard('g1', 'u-other-admin')).toBeNull();
    expect(await service().coachingForTheBoard('g1', 'u-stranger')).toBeNull();
  });
});
