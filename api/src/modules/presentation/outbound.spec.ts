
/** 21 Sep 2026: "Signed paper contracts. It is your baseline. I'll use this when we check in on progress." */
describe('baseline is our word, not theirs', () => {
  const { forHumans } = require('./outbound');
  it('is said as what goes on the record', () => {
    expect(forHumans('Signed paper contracts. It is your baseline. I will use this when we check in on progress.')).toBe('Signed paper contracts. That goes on your record. I will use this when we check in on progress.');
    expect(forHumans('Your evidence baseline for this goal was two signed contracts.')).toMatch(/^What you said would show it for this goal was two signed contracts\./);
  });
});
