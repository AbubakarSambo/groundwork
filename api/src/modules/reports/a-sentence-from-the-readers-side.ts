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

import { theShortNameOf } from './a-title-is-not-a-first-name';

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
  /* The first name is the first word that is not a title: "Dr Amina Bello" was cut to "Dr" (seniorhire,
     run 10). "Dr Bello" has no first name to cut to, so it stays whole. See a-title-is-not-a-first-name. */
  const firsts = new Map<string, number>();
  for (const n of all) {
    const first = theShortNameOf(n).toLowerCase();
    firsts.set(first, (firsts.get(first) ?? 0) + 1);
  }

  let out = text;
  for (const full of all) {
    const first = theShortNameOf(full);
    if (first === full) continue;
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
 * WHAT USED TO BE HERE, AND WHY IT IS NOT.
 *
 * `andTheVerbAgrees` conjugated a third-person verb joined on with "and" in a sentence that began
 * with "You" - "You say you were told the target was five renewals, and has completed six" became
 * "and have completed six". It guessed which noun the verb belonged to by looking for a capitalised
 * word or another pronoun between "You" and the verb, and where the real subject is neither it
 * guessed wrong. Read off the lead's own board on 26 September 2026:
 *
 *   "You believe the team is behind on a collective goal for one reason, but the record shows each
 *    person is working on an individual goal and ARE blocked by a different problem."
 *
 *   "You say the office move is going well and ARE on schedule."
 *
 * The subject is "each person" in the first and "the office move" in the second. Both were correct
 * English before the rule existed and broken by it, which is the one thing this file says it must
 * never do: "a sentence this leaves alone is merely stiff, and one it mangles is wrong." A regular
 * expression cannot resolve which noun a verb belongs to, so the rule is gone rather than narrowed.
 *
 * NOT TO BE CONFUSED WITH THE RULE IN `withNames`, which stays. That one fixes "you is", "you was",
 * "you has" and "you does" - the verb sits immediately after "you", so there is no other subject it
 * could belong to and nothing to guess.
 */

/**
 * All of them, in the order they have to run: the reorder first, because the group-pronoun rule
 * reads whether the previous sentence has "you" and an "and" in it; the shortening last, because
 * the others match on full names.
 */
export function fromTheReadersSide(text: string, names: Iterable<string>): string {
  if (!text) return text;
  return fullNameOnce(theReaderIsNotThey(youComeFirst(text)), names);
}

/**
 * NOBODY IS TOLD TO ASK THEMSELVES (the 1 October review).
 *
 * Amina, who runs the check-in, read in her own judgement: "Ask Amina for her account of her role in
 * the meetings." Once her name is "you" that is "Ask you for your account...", an instruction to
 * ask herself. What it means is that her own account is not on the record, so that is what she reads:
 *
 *   "Ask you for your account of your role in the meetings."
 *     -> "Your own account of your role in the meetings is not in this check-in."
 *   "Ask you and Tobi Adewale to account for how the role was first defined."
 *     -> "Ask Tobi Adewale to account for how the role was first defined."
 *
 * A step in "what to do" that only asked the reader is dropped where the judgement is served, by
 * `YOUR_OWN_ACCOUNT_IS_NOT_HERE`, because it is not something to do.
 */
export const YOUR_OWN_ACCOUNT_IS_NOT_HERE = /^\s*Your own account of .+ is not in this check-in\.\s*$/;
const TO_ASK = '(?:Ask|Check with|Confirm with|Speak with|Speak to|Talk with|Talk to|Meet with|Follow up with)';

export function noInstructionToAskYourself(text: string, agree: (s: string) => string = (s) => s): string {
  if (!text || !/\byou\b/i.test(text)) return text;
  let out = text.replace(new RegExp(`\\b(${TO_ASK}) you and `, 'g'), (_m, verb: string) => `${verb} `);
  const pieces = out.split(/(?<=[.!?])(\s+)/);
  out = pieces.map((piece) => {
    if (!new RegExp(`^\\s*${TO_ASK} you\\b`).test(piece)) return piece;
    const lead = piece.match(/^\s*/)?.[0] ?? '';
    const account = piece.match(new RegExp(`^\\s*${TO_ASK} you (?:for|about) (?:your|an|a|their|her|his) (?:own )?account of (.+?)[.!?]?\\s*$`));
    if (account) {
      const about = account[1]
        .replace(/\b(?:they|she|he)\b/g, 'you')
        .replace(/\b(?:their|her|his)\b/g, 'your');
      return `${lead}${agree(`Your own account of ${about} is not in this check-in.`)}`;
    }
    return `${lead}Your own account of this is not in this check-in.`;
  }).join('');
  return out;
}

/**
 * "her own" AND "his own" IN A SENTENCE ABOUT THE READER ALONE ARE THE READER'S. "Amina was not part
 * of this check-in, so her own account of the meetings is missing" reached Amina as "You were not part
 * of this check-in, so her own account...". Run where the reader's name has just become their label,
 * so "her own" becomes "<label>'s own", which the next step serves as "your own". Only where the
 * sentence names nobody else.
 */
export function theirOwnIsTheReaders(sentence: string, readersLabel: string, others: Iterable<string>): string {
  for (const n of others) if (n && n.length > 1 && new RegExp(`(?<![\\p{L}])${escapeRe(n)}(?![\\p{L}])`, 'iu').test(sentence)) return sentence;
  return sentence.replace(/\b(?:her|his|their) own\b/gi, `${readersLabel}'s own`);
}
