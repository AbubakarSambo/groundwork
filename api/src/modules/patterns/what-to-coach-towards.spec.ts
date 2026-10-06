import { PLAIN_PATTERN_NAMES } from './plain-pattern-names';
import { COACHING_FOR_EACH_PATTERN, coachingForAPattern } from './what-to-coach-towards';
import { SAID_AGAINST_WHAT_HAPPENED, whatAPatternIsAbout } from './what-a-pattern-is-about';

/**
 * DECISION 67 (SCREENS REQUEST 82). The section a pattern belongs in is nine fixed codes and nothing
 * else, and every pattern that can be served has a good version and one step, in plain full sentences.
 */
describe('the section "How what people say can run ahead of what happened"', () => {
  it('is exactly D1, D2, D3, D5, D8, B1, B2, B3 and E2', () => {
    expect([...SAID_AGAINST_WHAT_HAPPENED].sort()).toEqual(['B1', 'B2', 'B3', 'D1', 'D2', 'D3', 'D5', 'D8', 'E2']);
    for (const code of Object.keys(PLAIN_PATTERN_NAMES)) {
      expect(whatAPatternIsAbout(code)).toBe(SAID_AGAINST_WHAT_HAPPENED.has(code) ? 'what is said against what happened' : 'the work');
    }
  });

  it('adds, removes and changes no pattern: the plain names are as they were', () => {
    expect(Object.keys(PLAIN_PATTERN_NAMES)).toHaveLength(47);
  });
});

describe('the good version and one step, for every pattern that can be served', () => {
  it('every pattern with a plain name has both, and no other code has any', () => {
    expect(Object.keys(COACHING_FOR_EACH_PATTERN).sort()).toEqual(Object.keys(PLAIN_PATTERN_NAMES).sort());
    expect(coachingForAPattern('E4')).toBeNull();
    expect(coachingForAPattern('F5')).toBeNull();
  });

  it.each(Object.keys(PLAIN_PATTERN_NAMES))('%s reads as two plain, full sentences, with no label, verdict or name', (code) => {
    const c = coachingForAPattern(code)!;
    for (const sentence of [c.coachTowards, c.oneStep]) {
      expect(sentence).toMatch(/^[A-Z]/);
      expect(sentence).toMatch(/\.$/);
      expect(sentence).not.toMatch(/[:;→]|\s-\s|\.\./);
      expect(sentence).not.toMatch(/\b(PIP|at risk|score|scored|rating|verdict|exit|fire|fired|underperform\w*|poor|weak|bad)\b/i);
      expect(sentence.split('. ').length).toBe(1);
    }
    expect(c.coachTowards).toMatch(/^(Coach them towards|In )/);
    expect(c.oneStep).toMatch(/^One step they could take this week is to /);
  });
});

describe('the step is the person\'s alone, and being listened to is the lead\'s part (A3)', () => {
  it('reads as something only the person does, with the listening in the sentence for the lead', () => {
    const c = coachingForAPattern('A3')!;
    expect(c.oneStep).toBe('One step they could take this week is to say what has got in their way since the change.');
    expect(c.oneStep).not.toMatch(/listened/);
    expect(c.coachTowards).toBe('Coach them towards getting back to the level of work they did before the change, after listening first to what has got in their way.');
  });
});
