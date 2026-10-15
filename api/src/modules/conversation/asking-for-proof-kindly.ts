/**
 * ASKING FOR PROOF KINDLY, AND SAYING WHAT IT IS FOR.
 *
 * Task 2.5, week 4 of the weekly plan; point 7 of docs/conversation-standard.md: "A photo of the
 * order is enough. Then it counts as proven." Never curt, such as "That's the activity."
 *
 * "Proof asked for" fell from 50 to 53 on runs 8 to 10 to 37 on run-14, against a baseline of 42.
 * Nothing in the check-in told the model when proof was worth asking for: it asked when it happened
 * to think of it. So when a person says something is done and nothing shows it yet, the model is
 * told so, once, with the sentence, and asked to ask kindly for the smallest thing that would show
 * it. Context for the model, never a scripted line; the model still decides the turn.
 */

/** A piece of work somebody finished: a sale, a signature, a payment, a delivery. */
const WORK_DONE = '(?:[Ss]old|signed|paid|delivered|approved|disbursed|submitted|installed|closed|finished|completed|launched|shipped|collected|booked|migrated|deployed|fixed|won|sent (?:the |a |an |our |my )?(?:quote|proposal|invoice|order|contract|report|file|plan))';
/** Said as done: "I sold", "we have signed", "Ngozi paid", "it was approved", "all systems are deployed". */
const SAID_IT_WAS_DONE = new RegExp(
  `\\b(?:(?:I|[Ww]e|[Hh]e|[Ss]he|[Tt]hey|[A-Z][a-z]+)\\s+(?:have\\s+|has\\s+|had\\s+|just\\s+|finally\\s+|already\\s+)*${WORK_DONE}|(?:is|are|was|were|has been|have been)\\s+(?:now\\s+|already\\s+|all\\s+|fully\\s+)*${WORK_DONE})\\b|\\bgot the (?:order|contract|approval|payment)\\b`,
  /* Case matters: "a capitalised word" is a name or a person, and "i" would make it any word at all. */
  '',
);
/** A wish, a plan, a condition or a promise is not something done. */
export const NOT_DONE_YET = /\b(expect|will|going to|would|should|could|want|plan|hope|means|if|when|once|until|need to|have to|committing|not|n't|never|no)\b/i;
/** They already said what shows it, or that nothing can. */
const THEY_NAMED_PROOF = /\b(photo|picture|screenshot|receipt|invoice|statement|document|attached|email|message|whatsapp|record|system shows|in the system|signed copy|contract number|reference)\b/i;
/** The same words the checker counts as asking for proof. */
export const ASKS_FOR_PROOF = /\b(photo|picture|document|screenshot|receipt|statement|proof|a copy|send (me|it|us)|attach|upload)\b/i;

export interface ATurn { role: 'AI' | 'PERSON' | string; content: string | null }

/** The sentence to ask about, or null where proof is not worth asking for in this turn. */
export function aClaimNothingShowsYet(turnsThisSession: readonly ATurn[]): string | null {
  const turns = turnsThisSession ?? [];
  if (turns.some((t) => t.role === 'AI' && ASKS_FOR_PROOF.test(t.content ?? ''))) return null;
  const theirs = turns.filter((t) => t.role === 'PERSON').map((t) => t.content ?? '');
  if (theirs.some((t) => THEY_NAMED_PROOF.test(t))) return null;
  for (let i = theirs.length - 1; i >= 0; i -= 1) {
    const sentences = theirs[i].split(/(?<=[.!?])\s+/);
    const done = sentences.reverse().find((s) => SAID_IT_WAS_DONE.test(s) && !NOT_DONE_YET.test(s));
    if (done) return done.trim();
  }
  return null;
}

/** What the model is told. Empty where there is nothing to ask. */
export function askForProofKindly(claim: string | null): string {
  if (!claim) return '';
  return `AND ONE THING THEY SAID IS DONE, WITH NOTHING THAT SHOWS IT YET:
"${claim}"
Ask kindly for the smallest thing that would show it, and say what it is for. Ask once in this check-in, in this turn or the next. For example: "A photo of the signed order is enough. Then it counts as proven." Or: "If you can forward the approval email, it goes on the record as confirmed." Never sound as if you doubt them. If they cannot, that is an answer: take it and do not ask again.`;
}

/** A number said as where things stand now or what was reached: "we have 30 clients", "we reached 200", "sales are at 4 million". */
const A_NUMBER_SAID_AS_FACT = /\b(?:have|has|had|got|reached|hit|made|did|are at|is at|stands at|now)\b[^.!?]*\d|\d[^.!?]*\b(?:so far|this (?:week|month|quarter)|last (?:week|month|quarter)|already|now)\b/i;

/**
 * A CLAIM THAT MATTERS, IN THE ANSWER THEY JUST GAVE (decision 132). Something said as done or delivered, or a number said as where
 * things stand, in their latest answer, while nothing in this session shows it yet and proof has not been asked for. Null otherwise.
 * Used to put asking for proof ahead of any other question in this turn, never to write the question.
 */
export function aClaimThatMattersInTheirLastAnswer(turnsThisSession: readonly ATurn[]): string | null {
  const turns = turnsThisSession ?? [];
  const last = [...turns].reverse().find((t) => t.role === 'PERSON')?.content ?? '';
  if (!last.trim()) return null;
  const done = aClaimNothingShowsYet(turns);
  if (done && last.includes(done)) return done;
  if (turns.some((t) => t.role === 'AI' && ASKS_FOR_PROOF.test(t.content ?? ''))) return null;
  if (turns.some((t) => t.role === 'PERSON' && THEY_NAMED_PROOF.test(t.content ?? ''))) return null;
  const sentences = last.split(/(?<=[.!?])\s+/).reverse();
  const number = sentences.find((s) => A_NUMBER_SAID_AS_FACT.test(s) && !NOT_DONE_YET.test(s));
  return number ? number.trim() : null;
}
