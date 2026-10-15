/**
 * THE ONE SWITCH FOR WHETHER ANYBODY READS A PATTERN. IT IS ON: HAFSAH APPROVED THE PLAIN NAMES
 * (DECISION 52, 29 SEPTEMBER 2026), B5 INCLUDED, WITH EIGHT NAMES REWORDED.
 *
 * What it means. Hafsah, 27 September 2026: "Patterns are built, so they are not hidden at
 * release. They stay switched off only until they follow Hafsah's rules." Every rule is built
 * and kept in one place, patterns/who-reads-a-pattern, so this constant being true means "serve
 * patterns under these rules", and nothing else:
 *
 *   1. PLAIN NAMES. Every page uses the plain names in plain-pattern-names.ts, copied from
 *      docs/pattern-names.md, never an internal name or a code. E4 and F5 are never named to anyone.
 *   2. NEVER A LABEL BESIDE A NAME. A pattern is served as a sentence of what happened in the work,
 *      with the person as an id for the page to place, never a name joined to a pattern's name.
 *   3. A PARTICIPANT READS ONLY THEIR OWN, on every page. Only whoever runs the check-in reads anybody
 *      else's: its lead, or the admin who set it up for them - never every admin of the
 *      organisation (decision 58, patterns/who-reads-a-pattern.ts, runsItForAPattern).
 *   4. THREE PERIODS, counted from every period it was really seen in, good news included.
 *   5. THE PERSON SEES IT FIRST, AND CAN ANSWER (POST /patterns/:id/answer). The lead reads it only
 *      after the person has answered, or three days after they were shown it, or a week after it
 *      was ready if they never opened it, with the person's own words beside it.
 *
 * WHY IT WAS OFF, AND WHY IT IS NOW ON. The plain names were Hafsah's to approve (decision 19). She
 * has now approved docs/pattern-names.md (decision 52, 29 September 2026), B5's name included, with
 * B3, B8, B11, E1, E3, E5, F3 and F4 reworded from the 26 September draft. plain-pattern-names.ts was
 * updated to match, word for word, and this switch turned on the same day.
 *
 * WHAT RUNS EITHER WAY. Detection, the three-period rule and every `pattern_detections` row, and the
 * live conversation's use of a surfaced pattern to sharpen a question, which a person never reads as
 * a pattern. The developer API's findings never carry a pattern, on or off, and neither does the
 * record over time stored on a report, which was written before any of these rules held.
 *
 * This is a code constant, not a database row: nothing in `platform_settings` or any other table
 * gates it, so no row needs setting anywhere for this change to take effect once deployed.
 * the-board-serves-patterns-under-the-rules.spec.ts reads the board, the check-in's own page and the
 * person's own record as every kind of reader with it on and with it off, and
 * the-board-serves-no-pattern.spec.ts checks every board while it is off (kept as a test of the `on:
 * false` path, via the `opts.on` override, now that the real constant is true).
 */
/*
 * WHO A SERVED PATTERN REACHES is written in who-reads-a-pattern.ts: the person first, then whoever
 * runs the check-in. There is no setting for it any more (decision 86). Patterns are never switched off.
 */
export const PATTERNS_ARE_SERVED = true;
