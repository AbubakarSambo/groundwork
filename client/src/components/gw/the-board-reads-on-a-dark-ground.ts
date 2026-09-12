/**
 * THE BOARD'S OWN INK, NAMED, BECAUSE TWO SURFACES NOW USE IT.
 *
 * The board is the one dark surface in this product, so its palette lives as literals on the page
 * rather than as tokens for the whole app - which is right while only one file draws it. The
 * switcher in its header is a second, and the rule this codebase keeps is that a colour on more
 * than one page is a decision and a decision needs a name. Caught by one-vocabulary.spec, which
 * exists because "a colour typed from memory lands a few points off every time".
 *
 * Only what is genuinely shared is here. A colour still used by one file is that file's accent and
 * stays where it is.
 */

/** Muted text on the dark ground: session chips, secondary lines, the quiet half of a pair. */
export const BOARD_MUTED_INK = '#A8AFD6'
