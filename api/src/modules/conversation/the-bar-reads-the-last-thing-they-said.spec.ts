import { lastSubstantiveTurn } from './the-close-is-held-once';

/** "over the next 3 months" then "no, we are good": the bar reads the first, not the acknowledgement. */
describe('the bar reads the last thing they said, not the last thing they typed', () => {
  it('skips a closing acknowledgement', () => {
    expect(lastSubstantiveTurn(['to bring in 5 clients', 'over the next 3 months', 'no, we are good'])).toBe('over the next 3 months');
    expect(lastSubstantiveTurn(['I will send the rota by Friday.', "yes that's everything"])).toBe('I will send the rota by Friday.');
  });
  it('keeps a short answer that carries a number', () => {
    expect(lastSubstantiveTurn(['what happened', '8th Oct'])).toBe('8th Oct');
  });
  it('falls back to the last turn when nothing else exists', () => {
    expect(lastSubstantiveTurn(['ok'])).toBe('ok');
  });
});
