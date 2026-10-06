import { aStepSaidToYou } from './a-step-said-to-you';
import { ROLE_MAPS } from './../board/role-maps';

/**
 * ONE STEP, SAID TO YOU. Read live on the /you board: "One thing for this week: Names what they
 * would do differently, then does it." - colon-joined, third person, clipped. See a-step-said-to-you.
 */
describe('a step, said to you, as a full sentence', () => {
  it('turns the library’s third-person signal into a sentence spoken to "you"', () => {
    expect(aStepSaidToYou('Names what they would do differently, then does it'))
      .toBe('One thing to try this week is to name what you would do differently, then do it.');
  });

  it('an irregular verb, at the front and mid-sentence', () => {
    expect(aStepSaidToYou('Goes back to the lost deal and asks what really happened'))
      .toBe('One thing to try this week is to go back to the lost deal and asks what really happened.');
    expect(aStepSaidToYou('Has a plan for what they would do if it goes wrong'))
      .toBe('One thing to try this week is to have a plan for what you would do if it go wrong.');
  });

  it('never a colon, never "for this week:"', () => {
    const said = aStepSaidToYou('Counts a deal as real only when somebody who can decide has said what happens next');
    expect(said).not.toContain(':');
    expect(said).not.toMatch(/^One thing for this week/);
  });

  it('a plain regular verb', () => {
    expect(aStepSaidToYou('Picks the accounts worth the effort and stays on them'))
      .toBe('One thing to try this week is to pick the accounts worth the effort and stays on you.');
  });

  it('nothing in, nothing out', () => {
    expect(aStepSaidToYou(null)).toBeNull();
    expect(aStepSaidToYou(undefined)).toBeNull();
    expect(aStepSaidToYou('')).toBeNull();
    expect(aStepSaidToYou('   ')).toBeNull();
  });

  it('every successSignal in the library turns into a full sentence with no leftover "they/them/their"', () => {
    for (const map of Object.values(ROLE_MAPS)) {
      for (const signal of map.successSignals ?? []) {
        const said = aStepSaidToYou(signal);
        expect(said).toMatch(/^One thing to try this week is to /);
        expect(said).not.toMatch(/\bthey\b|\bthem\b|\btheir\b|\bthemselves\b|\btheirs\b/i);
        expect(said!.endsWith('.')).toBe(true);
      }
    }
  });
});
