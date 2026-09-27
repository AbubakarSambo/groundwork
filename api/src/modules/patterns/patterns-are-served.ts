/**
 * THE ONE SWITCH FOR WHETHER ANYBODY READS A PATTERN. IT IS OFF.
 *
 * Hafsah, 27 September 2026: "stop serving patterns to every board, for everyone, until patterns are
 * done properly. Switch them off; don't delete the code." The capability check that morning found
 * three things a person actually read (docs/capability-check.md, "What must be fixed before
 * deploying"):
 *
 *   - the internal names, "Blame Shifting", "Equity Without Contribution", "Claimed Work Inflation",
 *     on the lead's board and the participant's board, beside a person's name;
 *   - a participant reading a colleague's pattern, unnamed, on a team of four where the observation
 *     names them as surely as a name would;
 *   - the lead reading a pattern after one session, before the person it is about had read it, and
 *     with no way for that person to answer it.
 *
 * WHAT STILL RUNS. Detection, the three-period rule and every `pattern_detections` row are exactly as
 * they were: the detector runs after every session, stores what it saw, and the live conversation
 * still uses a surfaced pattern to sharpen a question, which a person never reads as a pattern. What
 * stops is every road from those rows to a page: the board's pattern section, the lead's "what the
 * record shows over time", the ground page's feed of what was noticed, a person's own record, the
 * session report's section and the picture drafted from it, the coaching note and the probe list
 * built from them, and the judgement's material, which the lead reads on the board.
 *
 * WHAT MUST BE TRUE BEFORE THIS IS TURNED ON, all four, and not one of them is true today:
 *
 *   1. THREE PERIODS. Nothing negative reaches anybody before it has been seen in three periods.
 *      Today the lead's record-over-time shows patterns seen once, under "not yet a pattern".
 *   2. THE PERSON SEES THEIRS FIRST, AND CAN ANSWER. A pattern reaches the person it is about before
 *      it reaches anybody else, and they have a way to say what is behind it that the lead then
 *      reads beside it. Today there is no route for an answer (patterns.controller has only
 *      `accuracy` and `rate`), and their own report leaves the pattern out.
 *   3. PLAIN NAMES, APPROVED BY HAFSAH. Every screen uses the plain names in docs/pattern-names.md,
 *      never the internal names or codes, and only once Hafsah has approved that list. Today no code
 *      reads it.
 *   4. NEVER BESIDE A NAME. A pattern is never printed next to a person's name, or on a page where
 *      the rest of the page identifies who it is about. Today the board prints both.
 *
 * Turning it on is changing `false` to `true` here and nowhere else. Every road listed above reads
 * this constant, and the-board-serves-no-pattern.spec.ts builds every board as every reader and
 * checks that none of it carries a pattern while it is off.
 */
export const PATTERNS_ARE_SERVED = false;

/**
 * Pattern rows on their way to something a person reads: the rows while the switch is on, and none
 * while it is off. Everything that turns `pattern_detections` into a page goes through this, so the
 * switch is one line rather than a rule each builder has to remember.
 */
export function patternsAsServed<T>(rows: readonly T[] | null | undefined): T[] {
  if (!PATTERNS_ARE_SERVED) return [];
  return [...(rows ?? [])];
}
