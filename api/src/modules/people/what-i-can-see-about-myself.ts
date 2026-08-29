/**
 * WHAT A PERSON MAY SEE ABOUT THEMSELVES, AND THE ASSUMPTION THAT MAKES IT HARD.
 *
 * §13C.8. It is likely a legal requirement wherever a customer operates under GDPR-equivalent law,
 * and worth having regardless. The easy version - hand them everything keyed to their id - is wrong
 * twice over, and the spec says both:
 *
 * FIRST, the §12.8 exclusions apply to their own view too. "A person should not be shown a
 * writing-quality score about themselves any more than their manager should." That is the reading
 * people get backwards, because a subject-access request feels like it should override everything -
 * but the reason those things never leave is that they should not exist as a judgement about a
 * person at all, and showing them to the person does not make them true.
 *
 * SECOND, a record that names them can be about somebody else. A `goal_divergence` finding says two
 * people describe an objective differently; handing the whole row to one of them hands them the
 * other's read. So a finding reaches them as what it found and what it was about, never as who else
 * was in it.
 */

/** Keys that must never appear in an export, whoever asked for it. §12.8, applied to themselves. */
export const NEVER_ABOUT_YOURSELF = [
  'score', 'rating', 'grade', 'rank', 'percentile', 'verdict', 'recommendation',
  'clarity', 'writingQuality', 'specificity',
] as const;

/** Keys that identify SOMEBODY ELSE. Present in rows that are legitimately about the asker. */
const ABOUT_SOMEBODY_ELSE = [
  'diverging', 'people', 'speakers', 'whoTheyUnblocked', 'contributors',
  'fromPersonKey', 'onPersonKey', 'proposedToPersonExternalId', 'predecessor',
];

/**
 * Strip both, recursively, and count what went.
 *
 * A count rather than silence, because an export that quietly omits things is worse than one that
 * says it omitted them - somebody checking whether they were given everything deserves an answer,
 * and "nothing was withheld" is a claim this can actually make when it is true.
 */
export function forTheirOwnEyes<T>(value: T): { value: T; withheld: string[] } {
  const withheld: string[] = [];

  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        const lower = k.toLowerCase();
        if ((NEVER_ABOUT_YOURSELF as readonly string[]).some((bad) => lower.includes(bad.toLowerCase()))) {
          withheld.push(k);
          continue;
        }
        if (ABOUT_SOMEBODY_ELSE.includes(k)) {
          withheld.push(k);
          continue;
        }
        out[k] = walk(val);
      }
      return out;
    }
    return v;
  };

  return { value: walk(value), withheld: [...new Set(withheld)] };
}

/**
 * WHY SOMETHING WAS WITHHELD, in words rather than as a list of field names.
 *
 * Somebody who asked for everything about themselves and got a list of keys they cannot see has
 * been told less than nothing. The two reasons are genuinely different and only one of them is
 * about them.
 */
export function whyWithheld(withheld: string[]): string[] {
  const out: string[] = [];
  if (withheld.some((k) => (NEVER_ABOUT_YOURSELF as readonly string[])
    .some((bad) => k.toLowerCase().includes(bad.toLowerCase())))) {
    out.push(
      'Some fields are not shown to anybody, including you and including your manager: scores of how '
      + 'clearly somebody writes or speaks, and any recommended verdict about a person. They are not '
      + 'withheld from you specifically - they never leave this product for anyone.',
    );
  }
  if (withheld.some((k) => ABOUT_SOMEBODY_ELSE.includes(k))) {
    out.push(
      'Some fields name other people. A record can mention you and still be partly about a colleague, '
      + 'and their account of their own work is theirs.',
    );
  }
  return out;
}
