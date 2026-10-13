import { howTheNumbersSit } from './do-the-parts-add-up-to-the-whole';
import { theFirstInsight } from '../engagement/the-first-insight';
import { theRestOfTheWeekIn } from '../email/the-leads-weekly-letter';
import { saysTheSame } from '../engagement/a-sentence-said-twice';

/**
 * "THE TEAM'S SALES TARGET IS 21" (after-piece check, 8 October). The check-in's rows, as the test bed held them: the lead's promise about the 21 day credit
 * rule had 21 read out of its words and was the first row nobody owned, so the report writer was told "the objective is 21" while the team's target was 18 million.
 */
const rows = [
  { name: 'The team is aiming for a sales target of 18 million Kenyan shillings for the quarter.', target: null, ownerParticipantId: null },
  { name: 'Wairimu will settle the 21 day credit rule with finance.', target: 21, ownerParticipantId: null },
  { name: 'Sales for the quarter', target: 18000000, ownerParticipantId: null, direction: 'AIM' },
  { name: 'Credit as a percentage of sales', target: 35, ownerParticipantId: null, direction: 'LIMIT' },
  { name: 'Sales for the quarter', target: 4500000, ownerParticipantId: 'p-a', direction: 'AIM' },
];

describe('which number the report is told is the objective', () => {
  it('is the 18 million sales aim, never the 21 of the credit rule, whatever order the rows come in', () => {
    for (const order of [rows, [...rows].reverse(), [rows[1], rows[0], rows[4], rows[3], rows[2]]]) {
      const says = howTheNumbersSit(order as any, 3).says!;
      expect(says).toContain('18,000,000');
      expect(says).not.toMatch(/objective is 21\b|\b21 and\b/);
    }
  });

  it('with nobody owning a number, a promise is not the objective either', () => {
    const says = howTheNumbersSit([rows[1], rows[2]] as any, 3).says!;
    expect(says).toContain('18,000,000');
    expect(says).not.toContain('credit rule');
  });

  it('says nothing when the only number nobody owns is a promise', () => {
    expect(howTheNumbersSit([rows[1], rows[4]] as any, 3).says).toBeNull();
  });
});

describe('the report-ready mail does not say the same thing three times', () => {
  const sentence = "In this check-in, the team's sales target is 18 million shillings, but the contributions are measured in different units that cannot be added together";
  const served = (over: any = {}) => ({
    whereThingsStand: {
      settled: ['a'], agreed: 1, open: [sentence],
      openWithReasons: [{ settledBy: "The team's sales target is 18 million shillings, but contributions are measured in different units that cannot be added together" }],
    },
    theConversationWorthHaving: "The team's sales target is 18 million shillings but the contributions are measured in different units, which cannot be added together",
    ...over,
  });

  it('the lead reads it once', () => {
    const i = theFirstInsight(served(), 'Sales plan', { isTheLead: true })!;
    const all = i.lines.join(' ');
    expect(all.match(/different units/g)).toHaveLength(1);
  });

  it('a line that says something else is still there', () => {
    const i = theFirstInsight(served({ theConversationWorthHaving: 'Who will carry the shortfall in the north region?' }), 'Sales plan', { isTheLead: true })!;
    expect(i.lines.join(' ')).toContain('Who will carry the shortfall in the north region?');
  });

  it('the Friday letter does not say again what it said moved', () => {
    const w: any = { moved: ['The sales target is 18 million shillings, but the contributions are measured in different units that cannot be added.'], toDo: [{ do: "Agree that the sales target is 18 million shillings, because the contributions are measured in different units that cannot be added.", why: '' }, { do: 'Ask Lerato about the fallback.', why: 'Two people said they would do it.' }], notYet: [], reminded: [] };
    const out = theRestOfTheWeekIn(w, 3).join(' ');
    expect(out.match(/different units/g)).toHaveLength(1);
    expect(out).toContain('Ask Lerato about the fallback.');
  });

  it('two lines about different things are not the same', () => {
    expect(saysTheSame('Who owns the next step with the distributor is not agreed', 'The start date for the new depot has not been set')).toBe(false);
  });
});
