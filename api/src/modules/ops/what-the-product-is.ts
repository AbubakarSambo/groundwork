import { ABOUT_HOW_LONG } from '../../common/how-long-a-check-in-takes';

/**
 * WHAT THIS PRODUCT IS, AND WHAT IT IS NOT.
 *
 * The statement every piece of marketing is held up against. It existed already
 * — as slide three of the sales deck — which is the wrong home for it twice
 * over: it lives inside one of the documents it is meant to govern, and a deck
 * is a file somebody edits and re-sends rather than a thing the system can read.
 *
 * KEPT AS HER WORDS, NOT A PARAPHRASE. Every sentence below is from the deck
 * verbatim. A statement rewritten to sound better than the one the company
 * actually uses is a second positioning, and then there are two.
 *
 * VERSIONED AND APPEND-ONLY, because a sign-off records what it was checked
 * against. Change the statement and everything signed against the old one has to
 * reopen — which is only computable if the old one still exists.
 */

export interface ProductStatement {
  headline: string;
  /** The line to say out loud in the room. */
  saidOutLoud: string;
  isIt: string[];
  isNotIt: string[];
}

export const WHAT_WE_SAY_WE_ARE: ProductStatement = {
  headline: 'Groundwork is about the groundwork, not all the work.',
  saidOutLoud: 'Say it out loud in the room: if nothing needs deciding, there is nothing to open.',
  isIt: [
    'Opened at a specific moment',
    'Closed when that moment resolves',
    `Six to twelve check-ins a quarter, ${ABOUT_HOW_LONG} each`,
    'Private accounts, compared',
  ],
  isNotIt: [
    'A system your team logs into forever',
    'A permanent evaluation layer',
    'Another dashboard to maintain',
    'A file anybody is building on anybody',
  ],
};

/**
 * WHY THE "IS NOT" LIST IS THE HALF THAT DOES THE WORK.
 *
 * "What it is" is aspirational and every product's version reads the same. The
 * refusals are specific, arguable, and the thing a piece of marketing actually
 * violates — a deck does not usually claim to be something we never said we
 * were; it quietly becomes one of the four things below.
 *
 * The nearest one to hand: this product has a `coaching/` module and a coach
 * network on the roadmap, so "a permanent evaluation layer" and a coaching
 * product are both a short step away from how somebody might describe it.
 */
export function whatItMustNotBecome(statement: ProductStatement = WHAT_WE_SAY_WE_ARE): string[] {
  return statement.isNotIt;
}

/** Nothing here is decoration: a statement missing either half cannot be checked against. */
export function whyThisStatementIsNotUsable(statement: Partial<ProductStatement>): string | null {
  if (!statement.headline?.trim()) return 'A statement needs a line that says what this is.';
  if (!statement.isIt?.length) return 'Say what it is. A statement with nothing in it refuses nothing.';
  if (!statement.isNotIt?.length) {
    return 'Say what it is not. That is the half marketing actually violates, and without it there is nothing to check against.';
  }
  return null;
}
