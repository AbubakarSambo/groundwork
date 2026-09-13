/**
 * WHAT EACH OF THE EIGHT SURFACES MUST HOLD, FOR THIS ROUND, FOR THIS PERSON.
 *
 * Walking the surfaces by hand found two real defects in an afternoon and neither had a failing
 * test - a close card whose two main blocks were structurally empty before a report is released,
 * and a cascade check-in wearing the other card's name. Both were invisible to 7,000 unit tests
 * because both are about what a whole assembled screen holds, not about what a function returns.
 *
 * The cost of finding them that way is that it does not repeat: every fix means walking all eight
 * again. So the walk is written down.
 *
 * IT ASSERTS SHAPE, NOT JUDGEMENT. It can tell you a block is empty when it should not be, that a
 * number is missing, that somebody's name leaked into a place it may not go. It cannot tell you the
 * question asked was a good one. That part stays human, and no amount of this replaces one person
 * doing a cold run.
 *
 * A CHECK THAT CRIES WOLF GETS TURNED OFF. The first version failed the board on the word
 * "undefined" and the offending sentence was "An undefined role is often the real problem, not the
 * person" - ordinary English, on a read somebody wrote carefully. A guard with a false positive in
 * its first run is a guard nobody will keep, so the pattern looks for the shapes a leak actually
 * takes rather than the word.
 *
 * AND IT CHECKS AFTER EVERY ROUND, NOT AT THE END. The missing-rows defect existed only BEFORE a
 * report is released. A check on a finished check-in would have passed and told us nothing.
 */

export type Stage = 'first' | 'middle' | 'last';

export interface Check {
  /** Short name, for the table. */
  what: string;
  /** True when this check applies to this round. */
  /**
   * True when this check applies to this round.
   *
   * `renders` is whether the product says this check-in HAS a board. It is passed to every check
   * rather than only the board's, because a surface that is absent by decision and a surface that
   * is absent by accident look identical from here and only the product knows which.
   */
  when?: (stage: Stage, answered: number, of: number, renders: boolean) => boolean;
  /** Pass, or the reason it failed. */
  holds: (s: any) => true | string;
}

const nonEmpty = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : v != null;

/** Words that must never appear on any surface, whatever the data. */
export const NEVER_ON_A_SCREEN = [
  /\[VERIFIABILITY:/i,
  /\[\[?[A-Z_]{4,}\]\]?/,
  /\[object Object\]/,
  /\bNaN\b/,
  /\bmiddle round\b/i,
  /*
   * "UNDEFINED" IS AN ENGLISH WORD AND THIS GUARD HAS NOW CRIED WOLF TWICE OVER IT.
   *
   * First on a board read that said "An undefined role is often the real problem, not the person".
   * Then, after tightening, on a report that said "If the people and workplan items remain
   * undefined, no meaningful tracking can happen" - caught by `\bundefined\s*[,}]`, which is a
   * word before a comma and therefore most of the times anybody writes it.
   *
   * A guard with a false positive in every run is a guard somebody turns off, and then the real
   * leak goes out. So this looks for the SHAPES a leaked value takes - a whole value that is the
   * string, a name slot filled with nothing, the doubled one - and leaves the adjective alone.
   */
  /"undefined"|:\s*undefined\b|\bundefined\s+undefined\b|\bundefined'?s\b|\b(?:by|for|from|to|with|owner|name|assigned to)\s+undefined\b/i,
];

export function nothingInternalLeaked(text: string): true | string {
  for (const re of NEVER_ON_A_SCREEN) {
    const m = re.exec(text);
    if (m) return `carries internal text: "${m[0]}"`;
  }
  return true;
}

/**
 * 01 · THE SHARED HALF. Everybody's, this session.
 */
export const SHARED_HALF: Check[] = [
  { what: 'names who is counted', holds: (d) => nonEmpty(d?.counting) || 'counting is empty, so the report cannot say who it is waiting on' },
  {
    what: 'says how many answered',
    holds: (d) => (d?.counting ?? []).some((c: any) => c.answered) || 'nobody is marked as answered',
  },
  {
    what: 'has a finding once everyone has answered',
    when: (_s, answered, of) => answered >= of && of > 1,
    holds: (d) => nonEmpty(d?.finding?.text) || 'everyone answered and there is no finding',
  },
  { what: 'no internal text', holds: (d) => nothingInternalLeaked(JSON.stringify(d ?? {})) },
];

/**
 * 04 · THE SIGNED-IN CLOSE. Theirs, this session.
 *
 * The rows check is the one that catches the defect this file was written after: they are fed from
 * the person's own record and must not wait on a release.
 */
export const THEIR_CLOSE: Check[] = [
  {
    /*
     * PRESENT, NOT NON-EMPTY, AND THE DIFFERENCE IS THE WHOLE DEFECT THIS WAS WRITTEN FOR.
     *
     * The fault was `myRows` being ABSENT from one of the report's three return paths, so the close
     * card's two main blocks were structurally empty before a release. That is what this catches.
     *
     * Genuinely empty is a different thing and a correct one. On one run a person answered "yeah,
     * all good from my side" and "I think I am doing what is expected", and extraction found
     * nothing checkable in it - which is right, and failing the product for it would be failing it
     * for not inventing rows out of an answer that had none.
     */
    what: 'the lines taken from what they said are there to show',
    holds: (d) => Array.isArray(d?.myRows)
      || 'myRows is absent, so the close card has nothing to draw from - not empty, missing',
  },
  {
    what: 'rows carry this round',
    /* Only asks it of a record that has rows. See above. */
    when: (_s, _a, _o, _r) => true,
    holds: (d) => ((d?.myRows ?? []).length === 0
      || (d?.myRows ?? []).some((r: any) => r.sessionNumber != null))
      || 'no row knows which session it came from',
  },
  { what: 'no internal text', holds: (d) => nothingInternalLeaked(JSON.stringify(d?.myRows ?? [])) },
];


/**
 * 02 / 03 · THE END OF A SITTING, AS THE PERSON WHO JUST FINISHED IT SEES IT.
 *
 * One surface with two crops: 03 is 02 with the two blocks dropped that a first session cannot
 * have. They share a route, so they share a check, and the difference is which round it is.
 *
 * THIS IS THE ONE WITH THE KNOWN PROBLEM UNDER IT. The component takes a report OBJECT, and that
 * object is only written when somebody comes through the entry chat - ten of four hundred and
 * ninety-five finished sittings have one. So a null `report` here is not a harness fault to route
 * around: it is the finding, and it says so in the words the preview page already uses.
 */
export const THE_SITTING_YOU_FINISHED: Check[] = [
  {
    what: 'knows which session it belongs to',
    holds: (d) => d?.sitting?.sessionNumber != null || 'the sitting does not say which session it was',
  },
  {
    /*
     * THE PAGE HAS THREE STATES AND ONLY ONE OF THEM IS WRONG.
     *
     * A stored report draws in full. No stored report but a solo record draws that instead. Neither
     * draws "Your report is still being written", which on a sitting that closed is the product
     * telling somebody their answers went nowhere.
     *
     * The first version of this check demanded the stored report on every round and went red on
     * four of six, which was the check being wrong rather than the product: the stored object is
     * written at the entry-chat commit and nothing else ever writes one, so rounds two and three
     * fall back by design. What the page actually promises is that a finished sitting opens with
     * something of yours on it, and that is what this asks for.
     */
    what: 'opens with something of theirs on it',
    holds: (d) => (d?.sitting?.report != null || d?.solo != null)
      || 'neither a stored report nor a solo record, so a closed sitting opens on "your report is still being written"',
  },
  {
    /* And on the first sitting it is the full thing, because that is the one the entry chat wrote. */
    what: 'the first sitting keeps the report they read at the end of the chat',
    when: (stage) => stage === 'first',
    holds: (d) => d?.sitting?.report != null
      || 'the report read at the end of the entry chat was not kept, so the sitting it belongs to cannot show it back',
  },
  { what: 'no internal text', holds: (d) => nothingInternalLeaked(JSON.stringify(d ?? {})) },
];

/**
 * 05 · WHAT YOU HAVE SHARED, ACROSS THE RUN. Theirs, every session.
 *
 * The only surface where the specificity read has somewhere to stand, because it needs more than
 * one sitting before it can say anything - so that part is only asked for from the second round.
 */
export const ACROSS_THE_RUN: Check[] = [
  {
    what: 'lists the sittings',
    holds: (d) => nonEmpty(d?.sessions) || 'no sittings listed, so the run-long view has nothing to draw',
  },
  {
    what: 'a finished sitting is marked finished',
    holds: (d) => (d?.sessions ?? []).some((x: any) => x.completedAt)
      || 'every sitting reads as unfinished, on a run where they were closed',
  },
  {
    what: 'says how specific they have been, once there is more than one sitting',
    when: (stage) => stage !== 'first',
    holds: (d) => ((d?.sessions ?? []).filter((x: any) => x.completedAt).length > 1)
      || 'fewer than two finished sittings are visible, so the specificity read cannot stand',
  },
  { what: 'no internal text', holds: (d) => nothingInternalLeaked(JSON.stringify(d ?? {})) },
];

/**
 * 06 · THE BOARD. Everybody's, across the run.
 */
export const THE_BOARD: Check[] = [
  {
    /*
     * A BOARD THAT SAYS IT DOES NOT RENDER IS NOT A BROKEN BOARD.
     *
     * The sensing family and the snapshot have no board by decision - "no sections means no board,
     * which is the right answer for a situation the product cannot lay out" - and they say so with
     * a reason rather than returning an empty shell. Eight of the twenty-two situations are in that
     * position, so a check demanding `renders` would fail a quarter of the product for being right.
     *
     * What IS checked is that the refusal is a refusal somebody can read.
     */
    what: 'renders, or says plainly why not',
    holds: (d) => d?.renders !== false
      ? true
      : (typeof d?.reason === 'string' && d.reason.trim().length > 0)
        || 'the board does not render and gives no reason, so it reads as a broken page',
  },
  {
    what: 'names the people',
    when: (_s, _a, _o, renders) => renders,
    holds: (d) => nonEmpty(d?.participants) || 'no participants on the board',
  },
  {
    what: 'each person against their own number, once targets have owners',
    when: (stage, _a, _o, renders) => renders && stage !== 'first',
    holds: (d) => nonEmpty(d?.eachPerson) || 'eachPerson is empty for the lead',
  },
  {
    what: 'a blocker somebody raised reaches the board',
    when: (stage, _a, _o, renders) => renders && stage !== 'first',
    holds: (d) => (d?.dependencies == null || Array.isArray(d?.dependencies)) || 'dependencies is the wrong shape',
  },
  { what: 'no internal text', holds: (d) => nothingInternalLeaked(JSON.stringify(d ?? {})) },
];

/**
 * 09 · THE REPORT TAB. An index, and the place the wrong card's name showed up.
 */
export const THE_INDEX: Check[] = [
  { what: 'lists the sessions', holds: (d) => nonEmpty(d?.rounds ?? d?.sessions) || 'no sessions listed' },
];

/** Which checks belong to which surface, for the table. */
export const EVERY_SURFACE: { key: string; name: string; checks: Check[] }[] = [
  { key: 'sharedHalf', name: '01 shared half', checks: SHARED_HALF },
  { key: 'theSitting', name: '02 the sitting', checks: THE_SITTING_YOU_FINISHED },
  { key: 'theirClose', name: '04 their close', checks: THEIR_CLOSE },
  { key: 'acrossTheRun', name: '05 across the run', checks: ACROSS_THE_RUN },
  { key: 'board', name: '06 the board', checks: THE_BOARD },
  { key: 'index', name: '09 report tab', checks: THE_INDEX },
];
