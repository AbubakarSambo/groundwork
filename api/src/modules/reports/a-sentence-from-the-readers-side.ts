/**
 * THE READER IS ONE OF THE PEOPLE IN THE SENTENCE, SO THE SENTENCE IS WRITTEN FROM THEIR SIDE.
 *
 * What Nathan read on 25 September 2026, after labels had been swapped for names:
 *
 *   "Both Caroline Mensah and you have answered. They disagree on what the performance target is."
 *
 * He is one of the two. "Both Caroline Mensah and you" puts him second in his own report, and
 * "They" excludes him from a disagreement he is half of. It should read "You and Caroline have both
 * answered. You disagree on what the target is."
 *
 * WHY THIS CANNOT BE THE MODEL'S JOB. The report is written once, in labels, and rendered for every
 * reader separately. At the moment it is written there is no reader, so there is no side to write
 * from. Whoever is reading only becomes known here, which is the same argument `withNames` makes
 * about second person, one step further on.
 *
 * WHAT IT DOES NOT DO. It does not parse English. It rewrites three shapes that the substitution
 * itself creates and that therefore recur exactly: a coordinated pair with "you" in it, a group
 * pronoun in a sentence the reader is part of, and a full name repeated after it has been given
 * once. Anything it does not recognise is left exactly as it was, because a sentence this leaves
 * alone is merely stiff, and one it mangles is wrong.
 */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * "Caroline Mensah and you have both answered" -> "You and Caroline Mensah have both answered".
 *
 * Only for a pair, and only where "you" is the second half. A longer list is left alone: reordering
 * "Ada, Tunde and you" is a bigger rewrite than this is allowed to make, and it reads acceptably.
 */
export function youComeFirst(text: string): string {
  let out = text;

  /* "Both X and you" -> "You and X ... both". The "both" moves after the verb, which is where it
     belongs once the subject is reordered: "Both X and you have answered" -> "You and X have both
     answered". */
  out = out.replace(
    /\bBoth ([A-Z][\w'’-]*(?: [A-Z][\w'’-]*)?) and you (have|are|were|had|say|said|agree|agreed|disagree|disagreed)\b/g,
    (_m, who: string, verb: string) => `You and ${who} ${verb} both`,
  );
  out = out.replace(
    /\bboth ([A-Z][\w'’-]*(?: [A-Z][\w'’-]*)?) and you (have|are|were|had|say|said|agree|agreed|disagree|disagreed)\b/g,
    (_m, who: string, verb: string) => `you and ${who} ${verb} both`,
  );

  /* "X and you have" -> "You and X have", with no "both" to move. */
  out = out.replace(
    /(^|[.!?]\s+)([A-Z][\w'’-]*(?: [A-Z][\w'’-]*)?) and you\b/g,
    (_m, lead: string, who: string) => `${lead}You and ${who}`,
  );

  return out;
}

/**
 * "You and Caroline have both answered. They disagree on..." -> "...You disagree on..."
 *
 * A group pronoun that refers back to a set the reader is inside. Narrow on purpose: only where the
 * PREVIOUS sentence addressed the reader as part of a pair or group, and only for a "They <verb>"
 * that opens the next sentence. Anything looser starts rewriting sentences about third parties.
 */
export function theReaderIsNotThey(text: string): string {
  const READER_IS_IN_IT = /\byou\b/i;
  const sentences = text.split(/(?<=[.!?])(\s+)/);
  const out: string[] = [];
  let previousIncludedTheReader = false;

  for (const piece of sentences) {
    if (/^\s+$/.test(piece)) { out.push(piece); continue; }
    let s = piece;
    if (previousIncludedTheReader) {
      s = s.replace(/^They (disagree|agree|differ|both|say|said|report|reported)\b/, (_m, verb: string) => {
        /* "They both" keeps the "both": "You both agree". */
        return `You ${verb}`;
      });
    }
    previousIncludedTheReader = READER_IS_IN_IT.test(s) && /\band\b/.test(s);
    out.push(s);
  }
  return out.join('');
}

/**
 * A FULL NAME ONCE, THEN THE FIRST NAME.
 *
 * "Caroline Mensah says the target was five. Caroline Mensah says you are not meeting that target."
 * Nobody writes like that about somebody they work with. The first mention introduces the person;
 * every one after it is the first name.
 *
 * ONLY WHERE THE FIRST NAME IS UNAMBIGUOUS. Two people called Caroline on the same check-in keep
 * their full names throughout, because shortening there would tell the reader one thing and mean
 * another. That is the whole reason this takes every visible name rather than one at a time.
 */
export function fullNameOnce(text: string, names: Iterable<string>): string {
  const all = [...names].map((n) => (n ?? '').trim()).filter((n) => n.includes(' '));
  const firsts = new Map<string, number>();
  for (const n of all) {
    const first = n.split(/\s+/)[0].toLowerCase();
    firsts.set(first, (firsts.get(first) ?? 0) + 1);
  }

  let out = text;
  for (const full of all) {
    const first = full.split(/\s+/)[0];
    if ((firsts.get(first.toLowerCase()) ?? 0) > 1) continue;
    const re = new RegExp(`\\b${escapeRe(full)}\\b`, 'g');
    let seen = false;
    out = out.replace(re, () => {
      if (seen) return first;
      seen = true;
      return full;
    });
  }
  return out;
}

/**
 * AND A VERB JOINED ON WITH "AND" AGREES WITH "YOU" TOO.
 *
 * `withNames` already conjugates a verb sitting immediately after "you" - that rule was written for
 * "You is concerned". It cannot see this shape, where the subject is several words back:
 *
 *   "You say you were told the target was five renewals, and has completed six."
 *   "You, however, had an expectation that the target would increase, and is concerned about it."
 *
 * NARROW, BECAUSE THE OBVIOUS RULE CORRUPTS REAL SENTENCES. "You say Caroline has completed six"
 * has a "has" that agrees with Caroline and must not be touched. So this only fires when the
 * sentence begins with "You" and nothing between that "You" and the "and" looks like another
 * subject - no capitalised word, no other pronoun. Where it cannot tell, it does nothing.
 */
const THIRD_PERSON: Record<string, string> = { is: 'are', has: 'have', was: 'were', does: 'do' };

export function andTheVerbAgrees(text: string): string {
  return text.replace(/[^.!?]+[.!?]?/g, (sentence) => {
    if (!/^\s*You\b/.test(sentence)) return sentence;
    return sentence.replace(
      /\b(and|but)\s+(is|has|was|does)\b/g,
      (whole: string, conj: string, verb: string, offset: number) => {
        const before = sentence.slice(0, offset);
        /* Another subject between "You" and here means the verb is probably theirs. Leave it. */
        if (/\b[A-Z][a-z]+\b/.test(before.replace(/^\s*You\b/, ''))) return whole;
        if (/\b(he|she|they|it|we|I)\b/i.test(before.replace(/^\s*You\b/, ''))) return whole;
        return `${conj} ${THIRD_PERSON[verb]}`;
      },
    );
  });
}

/**
 * All of them, in the order they have to run: the reorder first, because the group-pronoun rule
 * reads whether the previous sentence has "you" and an "and" in it; the agreement after that, once
 * every "you" that is going to exist does; the shortening last, because the others match on full
 * names.
 */
export function fromTheReadersSide(text: string, names: Iterable<string>): string {
  if (!text) return text;
  return fullNameOnce(andTheVerbAgrees(theReaderIsNotThey(youComeFirst(text))), names);
}
