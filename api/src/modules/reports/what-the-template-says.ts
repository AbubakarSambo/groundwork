/**
 * THE TEMPLATE, WRITTEN DOWN, BECAUSE THE FILE IT LIVED IN IS GONE.
 *
 * The reports were designed in `scratchpad/report-templates.html`. `scratchpad` is gitignored, so
 * that file was never committed by anybody, and it is now off disk and unrecoverable - I searched
 * every session transcript for it. Nine surfaces were rebuilt against a reference that no longer
 * exists.
 *
 * What survived is surface 01, whose own note on the preview page reads: "Rebuilt to the template:
 * the finding first and alone, four states in a row, numbered blocks each with a note saying what
 * it is for, and the long material folded. This is the reference the others are being built
 * against."
 *
 * So the template is reconstructed here from the surface that holds it, and from THE_ORDER, which
 * already carried the blocks and their sequence. This is a statement of the design, in the repo,
 * where the next person can find it and a test can hold it to account.
 *
 * IT IS A RECONSTRUCTION AND SAYS SO. If the original had a rule that surface 01 does not show,
 * that rule is lost and nothing here can recover it. Written down anyway: a reconstruction somebody
 * can correct beats a memory nobody can.
 */

/** The shape every report surface is built to, whatever cell it draws. */
export const THE_TEMPLATE = {
  /**
   * ONE FINDING, FIRST, AND NOTHING BESIDE IT.
   *
   * Not a list and not a heading with three things under it: the single thing this round found,
   * alone, so it cannot be skimmed past. Its basis goes underneath it in small type - what the read
   * rests on - never above, because a caveat above the thing it qualifies reads as a verdict on it.
   */
  findingFirstAndAlone: true,

  /**
   * FOUR STATES IN A ROW, each with a note saying what it means.
   *
   * Differences, movement, blockers, how much was said. Four at a glance, in one row, so two
   * sittings can be compared by eye rather than read. The note under each is what stops a number
   * becoming a score.
   */
  fourStatesInARow: ['differences', 'movement', 'blockers', 'howMuchWasSaid'],

  /**
   * NUMBERED BLOCKS, EACH WITH A NOTE SAYING WHAT IT IS FOR.
   *
   * NUMBERED BY WHAT IS DRAWN, not by a fixed position. A block hides when it has nothing, because
   * a heading with nothing under it reads as a page that failed to load - and fixed numbers then
   * skip, so "01 · 03 · 06" reads as three pieces missing rather than as a report with three
   * blocks. The order is THE_ORDER; the labels are WHAT_THE_BLOCK_IS_CALLED.
   */
  numberedByWhatIsDrawn: true,

  /** THE LONG MATERIAL FOLDED. What it rests on, every line somebody said, the five dimensions. */
  longMaterialFolded: true,

  /**
   * AND IT NEVER DECIDES ANYTHING ABOUT ANYBODY. No score, no verdict, no arrow. Where the record
   * cannot say, the surface says that rather than choosing.
   */
  neverAVerdict: true,
} as const;

/**
 * WHERE THE TEMPLATE CANNOT APPLY, AND WHY - so an exception is a decision rather than a gap.
 *
 * Kept beside the template because the last one of these went unnoticed for months: surface 02 was
 * marked "not rebuilt yet" on a page that was then deleted, and nothing anywhere else said so.
 */
export const NOT_THE_TEMPLATE: Record<string, string> = {
  theEndOfTheEntryChat:
    'It runs before the check-in is committed, so there is no ground and no sitting to fetch, and '
    + 'the report is an object held in the page. It cannot be the same COMPONENT - that one reads '
    + 'rows - but it is drawn in the same chrome and follows the same template: the finding first '
    + 'and alone, numbered blocks each with a note, and nothing numbered that is not drawn. Only '
    + 'the four states are absent, because they are computed at extraction and extraction has not '
    + 'run yet. Two moments, one shape.',
  aStoredReport:
    'Where a report was stored, it is shown exactly as it was read, because that object IS what the '
    + 'person read. Re-rendering it in the new shape would be a different page about the same '
    + 'facts, which is the complaint the rule came from. Only the entry chat stores one.',
  overWhatsAppAndTheMail:
    'Neither carries a read. A notification says a report exists; it is not a short report, and the '
    + 'moment it starts carrying content it inherits every rule the report has and can honour '
    + 'almost none of them.',
};
