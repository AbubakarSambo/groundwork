/**
 * THE ONE SWITCH FOR WHETHER ANYBODY READS A PATTERN. IT IS OFF, AND STAYS OFF UNTIL HAFSAH HAS
 * APPROVED THE PLAIN NAMES.
 *
 * What it means now. Hafsah, 27 September 2026: "Patterns are built, so they are not hidden at
 * release. They stay switched off only until they follow Hafsah's rules." Every rule is now built
 * and kept in one place, patterns/who-reads-a-pattern, so turning this on means "serve patterns
 * under these rules", and nothing else:
 *
 *   1. PLAIN NAMES. Every page uses the plain names in plain-pattern-names.ts, copied from
 *      docs/pattern-names.md, never an internal name or a code. E4 and F5 are never named to anyone.
 *   2. NEVER A LABEL BESIDE A NAME. A pattern is served as a sentence of what happened in the work,
 *      with the person as an id for the page to place, never a name joined to a pattern's name.
 *   3. A PARTICIPANT READS ONLY THEIR OWN, on every page. Only whoever runs the check-in (its lead,
 *      whoever set it up, an admin of its organisation) reads anybody else's.
 *   4. THREE PERIODS, counted from every period it was really seen in, good news included.
 *   5. THE PERSON SEES IT FIRST, AND CAN ANSWER (POST /patterns/:id/answer). The lead reads it only
 *      after the person has answered, or three days after they were shown it, or a week after it
 *      was ready if they never opened it, with the person's own words beside it.
 *
 * WHY IT IS STILL OFF. The plain names are Hafsah's to approve (decision 19), and she has not yet
 * approved docs/pattern-names.md, B5's name included. Turn it on only after she has, and after the
 * screens can show the new shape and the "Say what's behind it" answer box.
 *
 * WHAT RUNS EITHER WAY. Detection, the three-period rule and every `pattern_detections` row, and the
 * live conversation's use of a surfaced pattern to sharpen a question, which a person never reads as
 * a pattern. The developer API's findings never carry a pattern, on or off, and neither does the
 * record over time stored on a report, which was written before any of these rules held.
 *
 * Turning it on is changing `false` to `true` here and nowhere else.
 * the-board-serves-patterns-under-the-rules.spec.ts reads the board, the check-in's own page and the
 * person's own record as every kind of reader with it on and with it off, and
 * the-board-serves-no-pattern.spec.ts checks every board while it is off.
 */
export const PATTERNS_ARE_SERVED = false;
