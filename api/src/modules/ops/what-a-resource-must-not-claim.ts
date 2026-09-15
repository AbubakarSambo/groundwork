/**
 * WHETHER A PIECE OF MARKETING MATCHES WHAT WE ACTUALLY SELL.
 *
 * The rule is hers: all marketing content and resources are evaluated against
 * what the product is, so a campaign cannot quietly call it a coaching tool or
 * promise a use case it does not support.
 *
 * TWO PASSES, IN THIS ORDER, AND NEITHER ONE IS THE VERDICT ALONE.
 *
 *   1. The words. Every line in the statement's `isNotIt` is something we have
 *      already decided this product is not, and a resource containing one of
 *      those words is worth surfacing whatever else is true. This pass runs with
 *      no model, no key and no network, which is why it is first: the check has
 *      to work on the day the model is down and the deck is going out.
 *
 *   2. The reading. The words pass catches "coaching" and misses "we help your
 *      managers get more out of their people", which is the same claim written
 *      by somebody being careful. That needs something that reads.
 *
 * WHY THIS IS NOT A SCORE. It reports how many claims a resource clears out of
 * how many were checked, and every one of them opens onto the sentence it is
 * about. A number nobody can open is a claim - which is the same rule the rest
 * of this system runs on, and it matters more here than anywhere, because the
 * thing being judged is somebody's writing.
 */

export interface WhatWeSayWeAre {
  version: number;
  headline: string;
  isIt: string[];
  isNotIt: string[];
}

export type Verdict = 'CLEAR' | 'SAYS_WHAT_WE_ARE_NOT' | 'NEEDS_A_LOOK';

export interface OneCheck {
  /** The line from the statement this check is about. */
  claim: string;
  kind: 'IS_NOT' | 'IS';
  verdict: Verdict;
  /** Why, in a sentence, and quoting the resource where it can. */
  says: string;
}

/**
 * The words pass. No model, no network.
 *
 * Only ever produces SAYS_WHAT_WE_ARE_NOT or CLEAR against `isNotIt`, because
 * the presence of a word is evidence and its absence is not: "does not contain
 * the word coaching" says nothing about whether the deck describes coaching.
 */
export function whatTheWordsAlreadyShow(
  resource: { title: string; content: string },
  statement: WhatWeSayWeAre,
): OneCheck[] {
  const text = `${resource.title}\n${resource.content}`.toLowerCase();

  return statement.isNotIt.map((claim) => {
    const hit = distinctiveWordsIn(claim).filter((word) => containsWord(text, word));

    return {
      claim,
      kind: 'IS_NOT' as const,
      verdict: hit.length > 0 ? ('SAYS_WHAT_WE_ARE_NOT' as const) : ('NEEDS_A_LOOK' as const),
      says:
        hit.length > 0
          ? `The words ${hit.map((w) => `"${w}"`).join(', ')} appear in this, and we have said this product is not that.`
          : 'None of these words appear. Whether the idea does is not something counting words can answer.',
    };
  });
}

/**
 * The words in a claim worth looking for.
 *
 * Everything short or ordinary is dropped: matching on "a", "is" or "tool"
 * would flag every document ever written, and a check that fires on everything
 * is read as noise within a week and then ignored on the one that mattered.
 */
export function distinctiveWordsIn(claim: string): string[] {
  const ORDINARY = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has', 'have',
    'in', 'into', 'is', 'it', 'its', 'not', 'of', 'on', 'or', 'our', 'so', 'that', 'the',
    'their', 'them', 'they', 'this', 'to', 'we', 'what', 'which', 'with', 'you', 'your',
    'people', 'thing', 'things', 'work', 'tool', 'system', 'product', 'about', 'more',
  ]);

  return [
    ...new Set(
      claim
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 4 && !ORDINARY.has(w)),
    ),
  ];
}

/** Whole words only: "coach" must not match "coachload", and must match "coaching". */
function containsWord(text: string, word: string): boolean {
  const stem = word.replace(/(ing|ed|es|s)$/, '');
  if (stem.length < 4) return false;
  return new RegExp(`\\b${stem}[a-z]*\\b`, 'i').test(text);
}

/**
 * What the register shows for one resource: how many claims it clears, out of
 * how many were checked, and never as a percentage.
 *
 * A resource nobody has checked returns `checked: 0` and says so, rather than
 * scoring zero — those are opposite facts and a number cannot tell them apart.
 */
export function howItStands(checks: OneCheck[] | null | undefined): {
  clear: number;
  checked: number;
  flagged: string[];
  says: string;
} {
  if (!checks || checks.length === 0) {
    return {
      clear: 0,
      checked: 0,
      flagged: [],
      says: 'Not checked yet. That is not the same as failing, and it is not the same as passing.',
    };
  }

  const flagged = checks.filter((c) => c.verdict === 'SAYS_WHAT_WE_ARE_NOT');
  const clear = checks.filter((c) => c.verdict === 'CLEAR').length;

  return {
    clear,
    checked: checks.length,
    flagged: flagged.map((c) => c.claim),
    says:
      flagged.length > 0
        ? `${flagged.length} of ${checks.length} claims say something we have decided this product is not.`
        : `${clear} of ${checks.length} claims read as clear. Open each one to see what it was checked against.`,
  };
}

/**
 * Why a resource cannot be entered yet.
 *
 * Three risks, because the number is what makes it useful: one is a formality
 * and five is an essay nobody writes. It is asked of a person rather than of
 * the model on purpose - a risk somebody typed is a risk somebody owns.
 */
export function whyThisResourceIsNotReady(input: {
  category: string;
  categoryDetail?: string | null;
  content?: string | null;
  risks?: string[] | null;
}): string | null {
  if (input.category === 'OTHER' && (input.categoryDetail?.trim().length ?? 0) < 3) {
    return 'Say what kind of thing this is. An unnamed "other" is a drawer, and a drawer is where the unchecked things end up.';
  }

  if ((input.content?.trim().length ?? 0) < 40) {
    return 'Paste the words themselves. A link cannot be read by a check, and a register of links is a list of things nobody looked at.';
  }

  const risks = (input.risks ?? []).map((r) => r.trim()).filter((r) => r.length > 0);
  if (risks.length < 3) {
    return `Name three things most likely to go wrong with this piece. ${risks.length} so far - one is a formality, and the third is usually the real one.`;
  }

  return null;
}

/**
 * A sign-off is only good for the words it was checked against.
 *
 * Null when it still holds.
 */
export function whyThisSignOffIsStale(input: {
  checkedAgainstVersion: number | null;
  currentVersion: number;
}): string | null {
  if (input.checkedAgainstVersion === null) return null;
  if (input.checkedAgainstVersion >= input.currentVersion) return null;

  return `Checked against version ${input.checkedAgainstVersion} of what we say we are; we are now on ${input.currentVersion}. What changed may be exactly what this piece claims.`;
}
