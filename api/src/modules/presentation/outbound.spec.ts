
/** 21 Sep 2026: "Signed paper contracts. It is your baseline. I'll use this when we check in on progress." */
describe('baseline is our word, not theirs', () => {
  const { forHumans } = require('./outbound');
  it('is said as what goes on the record', () => {
    expect(forHumans('Signed paper contracts. It is your baseline. I will use this when we check in on progress.')).toBe('Signed paper contracts. That goes on your record. I will use this when we check in on progress.');
    expect(forHumans('Your evidence baseline for this goal was two signed contracts.')).toMatch(/^What you said would show it for this goal was two signed contracts\./);
  });
});

describe('a stray closing quote at the start of a line (26 October 2026)', () => {
  it('Kevin\'s "” What\'s the latest" opening reads without it, and a whole quotation is untouched', () => {
    const { forHumans } = require('./outbound');
    expect(forHumans('This takes about 10 minutes.\n\n” What is the latest with Savannah Cafe?')).toBe('This takes about 10 minutes. What is the latest with Savannah Cafe?');
    expect(forHumans('You wrote: “I called Paul.” What happened next?')).toContain('"I called Paul." What happened next?');
  });
});
