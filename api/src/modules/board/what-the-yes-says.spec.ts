import { isAYesOrNoQuestion, theAnswerAsALine, theYesFor, whatToDoAboutADecision } from './what-needs-you-and-what-to-do';

/**
 * "DECIDE WHETHER A PRICE RANGE COUNTS AS A BUDGET", THEN "YES, IT COUNTS" AND "NO" (board-as-lead.txt,
 * screen match 16 October). The lead's own question to decide, written the way the picture writes it,
 * is still a yes-or-no question, and its yes is said in the question's own verb.
 */
describe('the yes, in the question’s own verb', () => {
  it('the picture’s question is a yes-or-no question and its yes reads "Yes, it counts"', () => {
    const q = 'Decide whether a price range counts as a budget';
    expect(isAYesOrNoQuestion(q)).toBe(true);
    expect(theYesFor(q)).toBe('Yes, it counts');
    expect(theAnswerAsALine(q, true)).toBe('On whether a price range counts as a budget, the answer is yes.');
  });

  it('the lead reads those two words on the buttons', () => {
    const a = whatToDoAboutADecision({ source: 'lead', question: 'Decide whether a price range counts as a budget', contextItemId: 'c-1' }, 'g-1', 'p-lead', () => null);
    expect(a.choices?.map((c) => c.label)).toEqual(['Yes, it counts', 'No']);
  });

  it('a question with no plain verb keeps a plain "Yes"', () => {
    expect(theYesFor('Should we drop a lead after three calls?')).toBe('Yes');
    expect(theYesFor('Whether Brian or Miriam takes Lakeside')).toBe('Yes');
  });
});
