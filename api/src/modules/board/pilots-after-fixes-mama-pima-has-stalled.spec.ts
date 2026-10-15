import { notAnsweringSince, theDaySilenceBegan, workingDaysSince, hasStalled } from './a-deal-that-has-stalled';
import { eachDealInItsGroup, THE_STALL_RULE } from './each-deal-in-its-group';

/**
 * PILOTS AFTER FIXES, 14 OCTOBER (A4): Joseph said on Sunday 18 October "Mama Pima has not answered my calls since
 * Wednesday." and the board never said the deal had stalled. Three working days without an answer is stalled.
 */
const LINES = [
  { text: 'Mama Pima still deciding.', createdAt: '2026-10-16T06:06:42Z' },
  { text: 'Mama Pima has not answered my calls since Wednesday.', createdAt: '2026-10-18T08:33:15Z' },
  { text: 'Kilele Hotel paid for all 40 units today.', createdAt: '2026-10-14T09:00:00Z' },
];

describe('a deal stalls when the customer has not answered for three working days', () => {
  it('"since Wednesday", said on Sunday 18 October, is Wednesday 14 October', () => {
    expect(theDaySilenceBegan('has not answered my calls since Wednesday', new Date('2026-10-18T08:33:15Z')).toISOString().slice(0, 10)).toBe('2026-10-14');
    expect(notAnsweringSince('Mama Pima', LINES)?.toISOString().slice(0, 10)).toBe('2026-10-14');
    expect(notAnsweringSince('Kilele Hotel', LINES)).toBeNull();
  });
  it('Thursday, Friday and Monday are three working days, so on Monday 19 October it has stalled', () => {
    const since = new Date('2026-10-14T00:00:00Z');
    expect(workingDaysSince(since, new Date('2026-10-18T12:00:00Z'))).toBe(2);
    expect(hasStalled(since, new Date('2026-10-18T12:00:00Z'))).toBe(false);
    expect(hasStalled(since, new Date('2026-10-19T12:00:00Z'))).toBe(true);
  });
  it('a later line that they answered ends it', () => {
    expect(notAnsweringSince('Mama Pima', [...LINES, { text: 'Mama Pima answered and ordered 10 units.', createdAt: '2026-10-19T08:00:00Z' }])).toBeNull();
  });
  it('the board puts it under Stalled, with the reason and the rule in full sentences', () => {
    const sections: any = [{ rows: [{ id: 'd1', kind: 'deal', name: 'Mama Pima', stage: 'Contacted', mark: 'said', from: 'said', lastSaidOn: '2026-10-18', notAnsweringSince: '2026-10-14' }], stages: ['Contacted', 'Quoted', 'Won'] }];
    const [sec] = eachDealInItsGroup('sales org', sections, null, new Date('2026-10-19T12:00:00Z')) as any[];
    expect(sec.rows[0].group).toBe('cold');
    expect(sec.groups[0]).toMatchObject({ group: 'cold', heading: 'Stalled', reason: 'The customer has not answered for 3 working days or more, as said in a check-in, and nobody has said since that they answered.' });
    expect(sec.rows[0].groupSays).toContain('The customer has not answered since');
    expect(sec.rows[0].groupSays).toContain('which is 3 working days.');
    expect(sec.groupsNote).toContain(THE_STALL_RULE);
  });
});
