/**
 * WHAT IS ACTUALLY TRUE about each person in the captured run.
 *
 * The fixture beside this file is real output from a 12-session run against
 * live Gemini. This file is the answer key: what a fair reader of that record
 * would conclude about each person. The reads are asserted against THIS, not
 * against whatever the code currently happens to produce - otherwise the test
 * just freezes today's behaviour, including today's bugs.
 *
 * Written from the scripted personas, so it is knowable rather than a matter of
 * opinion. Each person was given a deliberate, known shape.
 */

export type Expectation = {
  key: string;
  name: string;
  /** What the person actually did, in one line. */
  truth: string;
  /** Sessions where they genuinely contributed something checkable. */
  strongSessions: number[];
  /** Sessions where they genuinely produced nothing of substance. */
  deadSessions: number[];
  /** Were they genuinely blocked by someone else, and when. */
  genuinelyBlocked: boolean;
  /** Should the board flag a drop in ownership for this person? */
  expectDriftFlag: boolean;
  /** Should the board protect them from a negative read, and why. */
  protectedBecause: string | null;
  /** The function map that should win. */
  expectFunction: string | null;
};

export const GROUND_TRUTH: Expectation[] = [
  {
    key: 'kavon',
    name: 'Kavon Badie',
    truth:
      'Closed one customer in session 1, then produced nothing for five sessions while NOT blocked on anyone, then recovered from session 8 after a conversation with the lead. The one person a negative read is genuinely correct about.',
    strongSessions: [1, 8, 9, 10, 11, 12],
    deadSessions: [2, 3, 4, 5, 6],
    genuinelyBlocked: false,
    expectDriftFlag: true,
    protectedBecause: null,
    expectFunction: 'SALES',
  },
  {
    key: 'abubakar',
    name: 'Abubakar Sambo',
    truth:
      'Delivered every single session and unblocked other people repeatedly, but describes his own work modestly ("stable", "consolidating and documenting"). Others credit him by name throughout. The hidden contributor.',
    strongSessions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    deadSessions: [],
    genuinelyBlocked: false,
    expectDriftFlag: false,
    protectedBecause:
      'Engineering work described unverifiably is the illegibility trap the role map exists to protect against. Others credit him throughout, including during his quietest stretch.',
    expectFunction: 'ENGINEERING',
  },
  {
    key: 'nate',
    name: 'Nate Peterson',
    truth:
      'Genuinely blocked on pricing for six sessions and kept working around it - chased it, escalated it, built a queue, finished the contributor side. Converted fast once unblocked. Blocked, never behind.',
    strongSessions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    deadSessions: [],
    genuinelyBlocked: true,
    expectDriftFlag: false,
    protectedBecause:
      'An unresolved dependency is not the same as a goal that is not moving. Reading him like the person who simply stopped is the most damaging false positive this product can make.',
    expectFunction: 'SALES',
  },
  {
    key: 'adam',
    name: 'Adam Grunewald',
    truth:
      'Specific and steady all quarter. Named real buyers with real detail, recruited a contributor, worked around a missing sales deck rather than stalling. Any negative read on Adam is a false positive.',
    strongSessions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    deadSessions: [],
    genuinelyBlocked: true,
    expectDriftFlag: false,
    protectedBecause: 'Waited on the sales deck for six sessions and kept delivering around it.',
    expectFunction: 'SALES',
  },
  {
    key: 'hafsah',
    name: 'Hafsah Jumare',
    truth:
      'The lead. Deferred the pricing decision for six sessions (which blocked Nate), promised a hard conversation from session 3 and did not have it until session 8, and never registered that a report had stopped delivering. Textbook abdication.',
    strongSessions: [1, 2, 7, 8, 9, 10, 11, 12],
    deadSessions: [],
    genuinelyBlocked: false,
    expectDriftFlag: false,
    protectedBecause: null,
    expectFunction: 'CEO',
  },
];

export const byKey = (k: string) => GROUND_TRUTH.find((g) => g.key === k)!;

/** People the board must NEVER flag as dropping ownership. */
export const MUST_NOT_FLAG = GROUND_TRUTH.filter((g) => !g.expectDriftFlag).map((g) => g.key);
/** People the board SHOULD flag. */
export const MUST_FLAG = GROUND_TRUTH.filter((g) => g.expectDriftFlag).map((g) => g.key);
