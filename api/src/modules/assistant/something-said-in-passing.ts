import { quotedThenEnding } from './a-quote-takes-no-second-mark';
/**
 * NOTICING A COMMITMENT NOBODY TYPED A COMMAND FOR.
 *
 * "I'll send the pricing comparison on Wednesday" is a commitment. Nobody should have to know that
 * writing it down is a feature, or which words to use to make it happen - the whole point is that
 * it works the way saying it to a colleague works.
 *
 * DETECTION IS RULES, NOT A MODEL, and that is the same decision as the router. A model deciding
 * that somebody committed to something would be a model deciding to write - and every message
 * reaching it may carry text from a customer's own systems. What the rules find is only ever a
 * PROPOSAL; a person's plain yes is what writes it.
 *
 * It will miss things. That is the correct direction to be wrong in: a missed commitment is a
 * commitment somebody can still state, and a wrongly-invented one is a record about them that they
 * did not make.
 */

export interface Caught {
  /** The commitment, in their words, with the "I'll" stripped. */
  text: string;
  /** Their words for when, if they gave any. Never turned into a date. */
  dueSaid: string | null;
}

/*
 * First person, future, and an actual verb phrase after it. Deliberately narrow: "I'll think about
 * it" and "I'll be honest" match the shape and are not commitments, so the stop-list below carries
 * the ones that turn up constantly rather than trying to be clever about intent.
 */
const FORM = /\b(?:i['’]ll|i will|i'm going to|i am going to)\s+(.{4,160}?)\s*$/i;

/**
 * Openings that take the grammatical form and mean nothing. Each of these produced a nonsense
 * proposal in a real conversation, which is the only reason any of them is here.
 */
const NOT_A_COMMITMENT = [
  /^(?:be honest|be frank|say it|admit|tell you)\b/i,
  /^(?:think about|have a think|consider|see|check)\b(?!\s+\w+\s+\w)/i,
  /^(?:try|probably|maybe|see how|see if)\b/i,
  /^(?:let you know|get back to you)\s*$/i,
];

/**
 * WHEN THEY SAID, IN THEIR WORDS. Never parsed into a date - see the schema note on `dueSaid`.
 *
 * Only phrases somebody actually uses about work. "By Wednesday", "on the 8th", "end of the week".
 * A date is not inferred from any of them.
 */
const WHEN = /\b(?:by|on|before|this|next|end of)\s+(?:the\s+)?(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|\b(?:by|on|before)\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b|\bend of (?:the )?(?:day|week|month|quarter|year)\b|\b(?:today|tomorrow|this week|next week|this month)\b/i;

export function catchCommitment(message: string): Caught | null {
  const m = FORM.exec((message ?? '').trim());
  if (!m) return null;

  let rest = m[1].trim().replace(/[.!]+$/, '');
  if (!rest) return null;
  if (NOT_A_COMMITMENT.some((p) => p.test(rest))) return null;

  const when = WHEN.exec(rest);
  const dueSaid = when ? when[0].trim() : null;

  /*
   * The deadline is left IN the text as well as pulled out. "Send the comparison by Wednesday" is
   * what they said, and a record that reads "send the comparison" with the date filed elsewhere is
   * a tidier version of a sentence nobody wrote.
   */
  return { text: rest, dueSaid };
}

/**
 * ONE SHARED GATE, AND ANYTHING THAT IS NOT A CLEAR YES OR NO DROPS THE PROPOSAL.
 *
 * Not "ask again", not "assume no". Dropped, so it can never fire later. A parked action that
 * survives the conversation moving on turns an unrelated "yes, that's right" three turns later into
 * a write about something the person has forgotten being asked - which is worse than having no
 * confirmation at all, because they will believe they agreed to it.
 */
export type Resolution = 'accept' | 'decline' | 'drop';

const YES = /^(?:y|ye|yes|yep|yeah|yup|ok|okay|sure|please do|go ahead|do it|correct|that'?s right)\b[.!]?$/i;
const NO = /^(?:n|no|nope|nah|don'?t|do not|no thanks|leave it|cancel|not that)\b[.!]?$/i;

export function resolveConfirmation(message: string): Resolution {
  const t = (message ?? '').trim();
  if (YES.test(t)) return 'accept';
  if (NO.test(t)) return 'decline';
  return 'drop';
}

/** What gets echoed back. Their words, so what they agree to is what goes on the record. */
export function proposalSummary(c: Caught): string {
  return `Shall I write down ${quotedThenEnding(c.text, '?')}`;
}
