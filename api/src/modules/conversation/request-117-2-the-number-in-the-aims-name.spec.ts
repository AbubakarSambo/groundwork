import { readFileSync } from 'fs';
import { join } from 'path';
import { theNumberInTheNameIsKept } from './an-aim-said-twice-is-one-aim';
import { boardAs } from '../board/the-switchboards-sections-harness';
import { review5, REVIEW_5_OBJECTIVES, RUKIA_RUNS_IT, GRACE_SET_IT_UP, AMANI } from '../board/__fixtures__/sales-board-review-5';

/**
 * SCREENS REQUEST 117 (2): THE HEADLINE'S TARGET HAS NO NUMBER.
 *
 * "Sign 12 shops for kitchen appliances in Nairobi." was stored with `target: null`, so the board's headline had no
 * answer and no bar. The setup chat already keeps the figure in the name (a740e362). An aim said in a check-in now
 * does too, where the figure is in the person's own words. The row already stored is brought up to date by
 * journey/bring-a-check-in-up-to-date.ts; here, the board is read once that row holds 12.
 */
describe('request 117 (2): the number in the aim\'s own name', () => {
  it('an aim said in a check-in keeps the figure in its name, only where they said it', () => {
    const said = new Set([12]);
    expect(theNumberInTheNameIsKept([{ name: 'Sign 12 shops for kitchen appliances in Nairobi.', target: null }], (n) => said.has(n)))
      .toEqual([{ name: 'Sign 12 shops for kitchen appliances in Nairobi.', target: 12 }]);
    expect(theNumberInTheNameIsKept([{ name: 'Sign 40 shops.', target: null }], (n) => said.has(n))).toEqual([{ name: 'Sign 40 shops.', target: null }]);
    expect(theNumberInTheNameIsKept([{ name: 'Sign 12 shops.', target: 15 }], () => true)).toEqual([{ name: 'Sign 12 shops.', target: 15 }]);
    /* Only the count the name aims at: a figure elsewhere in it is not the aim (read over the whole test database). */
    expect(theNumberInTheNameIsKept([{ name: 'a signed renewal before the end of March with no discount past 12 percent', target: null }], () => true))
      .toEqual([{ name: 'a signed renewal before the end of March with no discount past 12 percent', target: null }]);
    expect(theNumberInTheNameIsKept([{ name: 'Reach 40 percent of the market.', target: null }], () => true)).toEqual([{ name: 'Reach 40 percent of the market.', target: null }]);
    expect(theNumberInTheNameIsKept([{ name: 'Disburse 120 million naira.', target: null }], () => true)).toEqual([{ name: 'Disburse 120 million naira.', target: null }]);
  });

  it('the check-in\'s write asks the rule', () => {
    const service = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(service).toMatch(/const aimsWithTheirNumbers = theNumberInTheNameIsKept\(aims, \(n\) => numbersInTheirWords\.has\(n\)\);/);
    expect(service).toMatch(/theAimsThatAreNew\(aimsWithTheirNumbers,/);
  });

  it('once the row holds 12, the lead and the admin who set it up read the headline with its answer and its bar', async () => {
    const brought = REVIEW_5_OBJECTIVES
      .filter((o) => o.id !== 'o-said-again' && o.id !== 'o-onboarded')
      .map((o) => (o.id === 'o-team' ? { ...o, target: 12, dueOn: new Date('2026-12-20T00:00:00Z') } : o));
    for (const reader of [RUKIA_RUNS_IT, GRACE_SET_IT_UP]) {
      const b = await boardAs(review5({ objectives: brought }), reader[0], reader[1]);
      expect(b.headline?.question).toBe('Will we sign 12 shops for kitchen appliances in Nairobi by 20 December?');
      expect(b.headline?.answer).toBe('Nothing has been counted yet. 12 more are needed by 20 December.');
      expect(b.headline?.bars).toHaveLength(1);
      expect(JSON.stringify(b.objectives)).not.toMatch(/"word":"Met"/);
    }
    const amani = await boardAs(review5({ objectives: brought }), ...AMANI);
    expect(JSON.stringify(amani)).not.toMatch(/12 now, up from 0/);
  });
});
