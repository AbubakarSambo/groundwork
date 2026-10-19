/**
 * THE SEVEN BEHAVIOURS, IN THE BEHAVIOUR AND PATTERN LIBRARY (Release 1B, pull request 3 of 3; Hafsah's references-and-my-work.md
 * of 17 October 2026, "The seven behaviours", and her brief of 18 October: "Take 'what it means' and 'to improve' from the
 * product's behaviour and pattern library. Where the library has no entry, add the spec's lines and tell me which ones you added").
 *
 * WHY THESE ARE NEW ENTRIES. The library (pattern-library.ts, plain-pattern-names.ts, what-to-coach-towards.ts) holds patterns:
 * a code, its plain name, what the lead coaches towards and one step, each written for the lead about "them" and shown only after
 * three check-ins. It has no entry for any of these seven behaviours, and none of its lines says what a behaviour means to the
 * person in the second person or how they can improve it. So each behaviour's "what it means" (for a strength and for needs
 * work) and "to improve" are the spec's own lines, copied word for word, and every one of them is new to the library. Where a
 * pattern is close to a behaviour it is named in `nearestPatterns`, so the two are read together, never instead of each other.
 *
 * "KEEP DOING" is the prototype's own line for a strength (docs/prototype/screens/B7-my-work/*.txt), where the pictures have one.
 * Two behaviours have no "keep doing" line in any picture, Handling blockers and Working on the right things, so theirs are
 * written here from the spec's strength line, and are listed for Hafsah as written by us (`keepDoingFrom: 'written here'`).
 *
 * WRITTEN ONCE, HERE. My work (board/my-work.ts) takes every one of these words from this file and from nowhere else, so the
 * words are the same in every check-in. Nothing here is a label on a person: each line is about the behaviour.
 */

export type ABehaviourKey =
  | 'keeping-promises'
  | 'planning-ahead'
  | 'handling-blockers'
  | 'working-on-the-right-things'
  | 'backing-claims-with-proof'
  | 'helping-your-team'
  | 'check-in-quality';

export interface ABehaviour {
  key: ABehaviourKey;
  name: string;
  /** What the behaviour looks at, in the spec's words. */
  looksAt: string;
  /** What it means, when it is a strength. */
  strength: string;
  /** What it means, when it needs work. */
  needsWork: string;
  /** How to improve, shown only for needs work. */
  toImprove: string;
  /** The short line under Keep doing, when it is a strength. */
  keepDoing: string;
  /** Where each line comes from, for Hafsah. */
  linesFrom: 'the spec, added to the library';
  keepDoingFrom: 'the prototype pictures' | 'written here';
  /** Library patterns about the same ground, read beside the behaviour and never in place of it. */
  nearestPatterns: string[];
}

/** Always in this order, for every scenario. */
export const THE_SEVEN_BEHAVIOURS: readonly ABehaviour[] = [
  {
    key: 'keeping-promises',
    name: 'Keeping promises',
    looksAt: 'Promises kept against made',
    strength: 'Doing what you said builds trust fast.',
    needsWork: 'Promises that slip make it hard for others to rely on you.',
    toImprove: 'Promise less, and say early when a date will move.',
    keepDoing: 'Doing what you say you’ll do.',
    linesFrom: 'the spec, added to the library',
    keepDoingFrom: 'the prototype pictures',
    nearestPatterns: ['B2', 'E2'],
  },
  {
    key: 'planning-ahead',
    name: 'Planning ahead',
    looksAt: 'Items with a next step and a day',
    strength: 'A booked next step keeps work moving.',
    needsWork: 'Work without a booked next step stalls.',
    toImprove: 'Book the next step, with a day, before you finish each piece of work.',
    keepDoing: 'Booking the next step every time.',
    linesFrom: 'the spec, added to the library',
    keepDoingFrom: 'the prototype pictures',
    nearestPatterns: ['E2', 'B10'],
  },
  {
    key: 'handling-blockers',
    name: 'Handling blockers',
    looksAt: 'Blockers raised against cleared by the person, and how quickly they were raised',
    strength: 'Clearing blockers yourself shows ownership.',
    needsWork: 'Raising blockers without trying to clear them can look like excuses.',
    toImprove: 'Try one thing before you raise a blocker, and say what you tried.',
    keepDoing: 'Trying one thing yourself before you raise a blocker.',
    linesFrom: 'the spec, added to the library',
    keepDoingFrom: 'written here',
    nearestPatterns: ['K3', 'B5', 'R1'],
  },
  {
    key: 'working-on-the-right-things',
    name: 'Working on the right things',
    looksAt: 'Lead fit, chasing the same items after the team’s rule says stop, and work outside the plan',
    strength: 'Your time goes where it counts.',
    needsWork: 'Time spent on the wrong work is taken from the right work.',
    toImprove: 'Check each piece of work fits the plan before you spend time on it, and let go of what isn’t moving.',
    keepDoing: 'Spending your time where it counts.',
    linesFrom: 'the spec, added to the library',
    keepDoingFrom: 'written here',
    nearestPatterns: ['K4', 'K5', 'B6'],
  },
  {
    key: 'backing-claims-with-proof',
    name: 'Backing claims with proof',
    looksAt: 'Things called done, won or paid that have proof',
    strength: 'Proof makes your work easy to trust.',
    needsWork: 'Claims without proof can be read as guesses.',
    toImprove: 'Add the photo, slip or link when you say something is done.',
    keepDoing: 'Adding proof when you say something is done.',
    linesFrom: 'the spec, added to the library',
    keepDoingFrom: 'the prototype pictures',
    nearestPatterns: ['M1', 'D1'],
  },
  {
    key: 'helping-your-team',
    name: 'Helping your team',
    looksAt: 'Help that others mention in their check-ins',
    strength: 'Helping teammates is what strong team players do.',
    needsWork: 'Working alone when others are stuck slows the whole team.',
    toImprove: 'Offer one piece of help a week where you know the answer.',
    keepDoing: 'Helping your teammates.',
    linesFrom: 'the spec, added to the library',
    keepDoingFrom: 'the prototype pictures',
    nearestPatterns: ['R3', 'M2', 'C2'],
  },
  {
    key: 'check-in-quality',
    name: 'Check-in quality',
    looksAt: 'Done, on time, and specific (names the item, what changed, and the day)',
    strength: 'Specific, on-time check-ins make your work visible.',
    needsWork: 'Vague or late check-ins hide what you’re doing.',
    toImprove: 'Name the item, what changed and the day, every time.',
    keepDoing: 'Specific, on-time check-ins.',
    linesFrom: 'the spec, added to the library',
    keepDoingFrom: 'the prototype pictures',
    nearestPatterns: ['F3'],
  },
];

/** The library's footnote, as the pictures say it. */
export const WHERE_THE_WORDS_COME_FROM = 'What each behaviour means and how to improve come from the behaviour and pattern library, so the words are the same in every check-in.';

export function theBehaviour(key: ABehaviourKey): ABehaviour {
  const b = THE_SEVEN_BEHAVIOURS.find((x) => x.key === key);
  if (!b) throw new Error(`No behaviour ${key} in the library.`);
  return b;
}
