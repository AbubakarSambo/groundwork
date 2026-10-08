import { withoutARatingOfWhatHappened } from './the-anchor-does-not-rate-what-happened';

/** Found in the anchor walk (8 October): on WhatsApp, "You finished the route plan, which is progress." */
describe('the anchor says what happened and never how good it was', () => {
  it('takes the clause off and keeps the rest and the question', () => {
    const r = withoutARatingOfWhatHappened('You finished the route plan, which is progress. Zawadi has also said that the vans are in the way. What do you think could happen next?');
    expect(r.text).toBe('You finished the route plan. Zawadi has also said that the vans are in the way. What do you think could happen next?');
    expect(r.cut).toHaveLength(1);
  });
  it('takes off a sentence that only rates, and a gladness', () => {
    expect(withoutARatingOfWhatHappened("That's good progress. What got in the way on Tuesday?").text).toBe('What got in the way on Tuesday?');
    expect(withoutARatingOfWhatHappened("I'm glad to hear that. What is taking most of your attention now?").text).toBe('What is taking most of your attention now?');
  });
  it('takes off a mark given to what they said', () => {
    const r = withoutARatingOfWhatHappened('You delivered this before you described it as in progress. That is the strongest kind of record entry. What did you learn this week?');
    expect(r.text).toBe('You delivered this before you described it as in progress. What did you learn this week?');
  });
  it('leaves a plain reply alone, and a view about the work that is not a rating', () => {
    for (const ok of ['What moved since we last spoke?', 'The delay in delivery touches the customer\'s renewal. What happened on Monday?', 'It is progress reports that the donor asks for. Who sends them?']) {
      expect(withoutARatingOfWhatHappened(ok)).toEqual({ text: ok, cut: [] });
    }
  });
  it('never leaves nothing', () => {
    expect(withoutARatingOfWhatHappened("That's progress.")).toEqual({ text: "That's progress.", cut: [] });
  });
});
