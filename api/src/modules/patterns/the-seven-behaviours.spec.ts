import { THE_SEVEN_BEHAVIOURS } from './the-seven-behaviours';
import { PLAIN_PATTERN_NAMES } from './plain-pattern-names';

/**
 * THE SEVEN BEHAVIOURS ARE IN THE LIBRARY, IN THE SPEC'S ORDER AND WORDS (docs/references-and-my-work.md, "The seven behaviours";
 * Hafsah's brief of 18 October). The library had no entry for any of them, so every line is the spec's, word for word.
 */
const THE_SPEC: [string, string, string, string][] = [
  ['Keeping promises', 'Doing what you said builds trust fast.', 'Promises that slip make it hard for others to rely on you.', 'Promise less, and say early when a date will move.'],
  ['Planning ahead', 'A booked next step keeps work moving.', 'Work without a booked next step stalls.', 'Book the next step, with a day, before you finish each piece of work.'],
  ['Handling blockers', 'Clearing blockers yourself shows ownership.', 'Raising a blocker without saying what you tried makes it hard for others to help.', 'Try one thing before you raise a blocker, and say what you tried.'],
  ['Working on the right things', 'Your time goes where it counts.', 'Time spent on the wrong work is taken from the right work.', 'Check each piece of work fits the plan before you spend time on it, and let go of what isn’t moving.'],
  ['Backing claims with proof', 'Proof makes your work easy to trust.', 'Claims without proof can be read as guesses.', 'Add the photo, slip or link when you say something is done.'],
  ['Helping your team', 'Helping teammates is what strong team players do.', 'Working alone when others are stuck slows the whole team.', 'Offer one piece of help a week where you know the answer.'],
  ['Check-in quality', 'Specific, on-time check-ins make your work visible.', 'Vague or late check-ins hide what you’re doing.', 'Name the item, what changed and the day, every time.'],
];

describe('the seven behaviours in the behaviour and pattern library', () => {
  it('holds the seven, in the spec’s order, with the spec’s lines word for word', () => {
    expect(THE_SEVEN_BEHAVIOURS.map((b) => [b.name, b.strength, b.needsWork, b.toImprove])).toEqual(THE_SPEC);
  });

  it('names only patterns the library knows beside each behaviour, and puts no label on a person', () => {
    for (const b of THE_SEVEN_BEHAVIOURS) {
      for (const code of b.nearestPatterns) expect(PLAIN_PATTERN_NAMES[code]).toBeDefined();
      for (const line of [b.strength, b.needsWork, b.toImprove, b.keepDoing]) expect(line).not.toMatch(/\b(pip|exit|at risk|score)\b/i);
      /* Nor a judgement of the person's motives: "can look like excuses" was removed everywhere (final real-model check, item 2). */
      for (const line of [b.strength, b.needsWork, b.toImprove, b.keepDoing]) expect(line).not.toMatch(/\bexcuses?\b/i);
    }
  });
});
