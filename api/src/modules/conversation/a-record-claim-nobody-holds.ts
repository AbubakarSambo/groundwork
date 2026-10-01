/**
 * "THE RECORD FROM OUR SIDE SHOWS THAT WEEKLY REPAYMENTS HAVE NOT BEEN MADE." NO RECORD SHOWED ANYTHING.
 *
 * Read in the 1 October review, the loans scenario, one conversation each:
 *
 *   to Chinedu, who had repaid every instalment:
 *     "That is what you are saying. The record from our side shows that weekly repayments have not
 *      been made. That gap has a name and it is worth a conversation."
 *   to Grace:
 *     "The record shows 0 of 12 payments so far, and you are saying you are making payments."
 *
 * No payment record was ever given to the check-in. The only thing the model held was the lead's
 * brief ("repayment is behind across the cohort"), and it turned that into a record of this person's
 * own payments and used it to contradict them. Two patterns were then stored against them as
 * dishonest, built on nothing but the product's own sentence.
 *
 * THE RULE, IN CODE. A sentence that says what "the record", "our records" or "the system" show,
 * say or contradict is a claim about somebody's own record. This product holds what people SAID.
 * So the claim stands only where it is about what they said ("the record shows you said...").
 * Anything else is cut, and so is the sentence that leans on it ("That gap has a name").
 *
 * IT CUTS, IT DOES NOT ASK AGAIN, for the reason a-promise-they-never-made gives: a model that has
 * just invented a record is not the thing to ask for a better one.
 *
 * WHETHER THE LEAD'S BRIEF MAY BE QUOTED INTO A PARTICIPANT'S CHECK-IN AT ALL is Hafsah's decision
 * and is not made here. This only stops the brief, or anything else, being presented as "the record".
 */

import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked } from './nobody-is-left-looking-at-a-paragraph';

const THE_RECORD = '(?:records?|system(?: of record)?|ledger|books|data|files?|logs?)';

/**
 * Something called "the record" being the subject of a verb that says what is in it.
 * "The record shows", "our records say", "the record from our side shows", "this record shows nothing".
 */
const THE_RECORD_SAYS = new RegExp(
  `\\b(?:the|our|this|that|your|their|my|payment|loan|system)\\s+(?:payment\\s+|loan\\s+|company\\s+)?${THE_RECORD}\\b(?:\\s+from\\s+(?:our|my|the)\\s+side)?(?:\\s+(?:so far|here|today|now))?\\s*,?\\s+(?:also\\s+|currently\\s+|clearly\\s+|actually\\s+)?(?:show(?:s|ed)?|say(?:s)?|said|indicat(?:e|es|ed)|confirm(?:s|ed)?|state(?:s|d)?|reflect(?:s|ed)?|contradict(?:s|ed)?|disagree(?:s|d)?|lists?|listed|hold(?:s)?|contain(?:s)?|has\\s+no|have\\s+no|has\\s+nothing|have\\s+nothing|reads?|record(?:s|ed)?)\\b`,
  'i',
);
/** "According to the record", "on our records", "from the system, you ...". */
const ACCORDING_TO_THE_RECORD = new RegExp(`\\b(?:according to|going by|judging by|based on)\\s+(?:the|our|your|this)\\s+(?:\\w+\\s+)?${THE_RECORD}\\b`, 'i');
/** "Records showed the opposite", "the system of record shows no payments" without an article. */
const A_BARE_RECORD_SAYS = /\b(?:records|system of record)\s+(?:show(?:s|ed)?|say|said|indicat\w+|confirm\w*|contradict\w*)\b/i;

/**
 * Where the sentence is about what the PERSON said, the record it names is theirs: "The record shows
 * you said eleven." It stays. Only an attribution to them does that.
 */
const IT_IS_ABOUT_WHAT_THEY_SAID =
  /\b(?:you|you've|you have)\s+(?:said|told|mentioned|wrote|gave|named|described|reported|stated|shared|answered)\b|\byour\s+(?:own\s+)?(?:words|answers?)\b|\bwhat\s+you\s+(?:said|told|wrote|gave|shared)\b|\bwhere\s+you\s+(?:said|told)\b/i;

export function claimsTheRecordShowsSomething(sentence: string): boolean {
  const claims = THE_RECORD_SAYS.test(sentence) || ACCORDING_TO_THE_RECORD.test(sentence) || A_BARE_RECORD_SAYS.test(sentence);
  return claims && !IT_IS_ABOUT_WHAT_THEY_SAID.test(sentence);
}

/** "That is what you are saying." said straight before a record claim: the put-down that sets it up. */
const THE_SET_UP = /^\s*(?:that is|that's|this is|so that is)\s+(?:what you are saying|your (?:read|view|version|account)(?: of it)?|what you say)\b[^?]*\.\s*$/i;
/** "That gap has a name." said straight after: it points at the claim that is gone. */
const POINTS_AT_THE_GAP = /^\s*(?:that|this|the)\s+(?:gap|difference|mismatch|discrepancy|contradiction|disagreement|inconsistency)\b/i;

/** What is said when the cut leaves nothing to say. Plain, and asserts nothing. */
export const WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT = 'What would you like to add about that?';

export type RecordClaimCut = { text: string; cut: string[] };

/** The text with every sentence that claims what the record shows, and the sentences that lean on one, taken out. */
export function withoutARecordClaimNobodyHolds(text: string, earlierAiTurns: string[] = []): RecordClaimCut {
  const sentences = intoSentences(text);
  if (!sentences.some(claimsTheRecordShowsSomething)) return { text, cut: [] };
  const out: string[] = [];
  const cut: string[] = [];
  let justCut = false;
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (claimsTheRecordShowsSomething(s)) {
      cut.push(s.trim());
      /* "That is what you are saying." only said so that the claim could follow it. */
      if (out.length && THE_SET_UP.test(out[out.length - 1])) cut.push(out.pop()!.trim());
      justCut = true;
      continue;
    }
    if (justCut && POINTS_AT_THE_GAP.test(s)) {
      cut.push(s.trim());
      continue;
    }
    justCut = false;
    out.push(s);
  }
  const kept = out.join('').trim();
  /* Never the same plain question twice in one check-in; see nobody-is-left-looking-at-a-paragraph. */
  return { text: kept || (aQuestionNotYetAsked(WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT, earlierAiTurns) ?? WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT), cut };
}
