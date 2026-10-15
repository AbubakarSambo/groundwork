import { WhatNeedsYouService } from './what-needs-you.service';

/**
 * (Final check, 9 October.) The same wait was on Today twice, in different words: under "What needs you" as the board's own row
 * ("You need to get back to Amani Wekesa, who is waiting on you for the discount limit") and under "Risks" as a wait that has gone on
 * too long ("Amani has been waiting on you for the discount limit since 3 October"). The page now lists it once, as the board says it.
 */
const wait = (id: string, what: string, extra: Record<string, unknown> = {}) => ({ id, fromParticipantId: 'p-amani', onParticipantId: 'p-lead', onLabel: null, what, ...extra });
const ROWS = [
  wait('d1', 'the discount limit for the Naivas order'),
  /* The same wait, stored again in other words (a second row). */
  wait('d2', 'permission on the discount limit for the Naivas order'),
  wait('d3', 'the new price list', { fromParticipantId: 'p-baraka' }),
];
const service = (rows: any[]) => {
  const s: any = Object.create(WhatNeedsYouService.prototype);
  s.prisma = { groundDependency: { findMany: jest.fn(async () => rows) } };
  return s;
};
const need = (depId: string) => ({ key: `board-action-g1-waiting-on-the-lead-${depId}`, kind: 'look', title: 'You need to get back to Amani Wekesa, who is waiting on you for the discount limit for the Naivas order.', detail: null, action: { label: 'Open it', to: '/grounds/g1' }, groundId: 'g1', organizationId: 'o' });
const found = {
  needsYou: [], overdueOnYourTeam: [],
  risks: [
    'Amani has been waiting on you for permission on the discount limit for the Naivas order since Saturday 3 October.',
    'Baraka has been waiting on you for the new price list since Monday 28 September.',
    'The target “Sign 12 shops” in “Sales team, Q3” is behind.',
  ],
  about: { needsYou: [], overdueOnYourTeam: [], risks: [{ kind: 'wait', ids: ['d2'] }, { kind: 'wait', ids: ['d3'] }, { kind: 'target', ids: ['t1'] }] },
};

describe('the same wait on Today', () => {
  it('is said once: as the board says it, and not again under Risks', async () => {
    const out = await service(ROWS).withoutTheWaitsTodayAlreadyListed(found, 'u-lead', 'o', [need('d1')]);
    expect(out.risks).toEqual([found.risks[1], found.risks[2]]);
    expect(out.about.risks.map((a: any) => a.kind)).toEqual(['wait', 'target']);
  });
  it('is left alone when nothing on Today is that wait', async () => {
    const out = await service(ROWS).withoutTheWaitsTodayAlreadyListed(found, 'u-lead', 'o', [need('d3')]);
    expect(out.risks).toContain(found.risks[0]);
    expect(out.risks).not.toContain(found.risks[1]);
  });
  it('changes nothing when Today lists no wait', async () => {
    const out = await service(ROWS).withoutTheWaitsTodayAlreadyListed(found, 'u-lead', 'o', []);
    expect(out).toBe(found);
  });
});
