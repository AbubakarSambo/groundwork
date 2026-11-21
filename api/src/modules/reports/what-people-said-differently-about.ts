import { inASentence } from '../board/a-phrase-inside-a-sentence';
/**
 * WHAT PEOPLE SAID DIFFERENT THINGS ABOUT, AS A SENTENCE (review of 1 October 2026, re-d, sales).
 *
 * The Differences tile read "People said different things about the team is not aligned on the
 * primary reason that applications are being held up." The report writes a difference's topic either
 * as a noun phrase ("the price list", "whether a price range counts as a budget") or as a whole
 * sentence ("The accounts differ on the primary cause of delays."), and the tile put both after
 * "about". A noun phrase still follows "about"; a whole sentence is said as its own sentence:
 *
 *   "People said different things. The team is not aligned on the primary reason that applications are
 *    being held up."
 */

/** A topic that is a whole sentence: it has a verb of its own after its first word. */
/* And the verbs of saying and seeing (item 21, the government programme board): "Your reporting shows full system adoption,
   but both branch leads describe ..." was put after "about". Only verbs that are hardly ever nouns. */
const A_VERB = /\s(?:is|are|was|were|has|have|had|does|do|did|differs?|disagrees?|agrees?|can|cannot|can't|will|would|should|could|may|might|must|seems?|appears?|remains?|needs?|wants?|depends?|lacks?|exceeds?|shows|describes?|relies|rely|believes?|thinks?|expects?|suggests?|indicates?|says|feels?|considers?|insists?|argues?|understands?|attributes?|blames?|sees?|saw|regards?)\b/i;
const STARTS_A_NOUN_CLAUSE = /^(?:whether|what|how|who|when|where|which|why|if)\b/i;

/*
 * A NOUN CLAUSE WITH A VERB OF ITS OWN AFTER IT IS STILL A WHOLE SENTENCE (item 18). "Who has the final authority on
 * the completion of the Atlas analysis is not agreed." starts like "who has ..." but says something of it, so Tunde read
 * "People in this check-in said different things about who has the final authority ... is not agreed".
 */
/* "... is not agreed upon by the team" and "... is not clear to the team" are the same sentences with the people it is said of after them (found on the test bed, 8 October). */
const OF_WHOM = '(?:\\s+(?:by|among|across|within|between|to|for)\\s+(?:the\\s+|all\\s+|our\\s+|these\\s+|those\\s+)?[\\w\'-]+(?:\\s+[\\w\'-]+){0,2})?';
const SAYS_SOMETHING_OF_IT = new RegExp(
  `\\s(?:is|are|was|were)\\s+(?:still\\s+)?(?:not\\s+)?(?:agreed|clear|settled|decided|known|defined|shared)(?:\\s+(?:upon|on))?${OF_WHOM}$|\\s(?:is|are|remains?|was|were)\\s+(?:unclear|undecided|unsettled|disputed|undefined|open|contested)${OF_WHOM}$`,
  'i',
);

export function isAWholeSentence(topic: string): boolean {
  const t = (topic ?? '').trim().replace(/[.!?]+$/, '');
  if (!t) return false;
  /* A topic that itself says people differ ("Lucy Njeri and participants count sales differently") is a sentence whatever its verb is: after "about" it
     read "...about You and participants count sales differently", and after "see" it read "...see ... differently differently" (run 6, 20 November). */
  if (/\bdifferently$/i.test(t)) return true;
  if (STARTS_A_NOUN_CLAUSE.test(t)) return SAYS_SOMETHING_OF_IT.test(t);
  /* Two sides set against each other with ", while" or ", whereas" are two clauses, so a sentence (item 21, the loans board). */
  return A_VERB.test(` ${t}`) || /,\s+(?:while|whereas)\s+\S+\s+\S+/i.test(t);
}


/** "People said different things about the price list." or "People said different things. The accounts differ on ...". */
/*
 * A TOPIC THAT ONLY SAYS PEOPLE DIFFER (request 118, from request 117, part 8). Rukia read "People see two things
 * differently. People said different things." The topic the report wrote was itself only "people see two things
 * differently", which says no more than the sentence it was put in, so the two said one fact twice. Such a topic is
 * left out, and the sentence is said once.
 */
const ONLY_SAYS_PEOPLE_DIFFER = /^(?:people|they|the team|everybody|everyone)\s+(?:see|saw|said|say|describe|described|read|view)\s+(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+|some|several|a few|many)\s+)?(?:things?|this|it|matters?)?\s*(?:differently|different things)$/i;

/*
 * WHO SAID IT, WHEN THE READER MAY KNOW (Hafsah, 30 October 2026, first-experience round 1). The board, Today and the lead's
 * summary each wrote their own sentence for one difference ("..., so it needs settling.", "Settle the difference between what
 * you and Kwame said."), and an impatient lead read both, about the same thing, on one page. This is now the one sentence all
 * of them say: "You and Kwame Nkosi said different things about the purpose of this check-in." `who` is the people, already
 * named for this reader; without it, "People".
 */
/** A board stored before 30 October 2026 ended the sentence ", so it needs settling." or " This needs settling."; read as the sentence alone. */
export function withoutTheOldEnding(question: string): string {
  return String(question ?? '').trim().replace(/(?:,\s*so it needs settling|\.\s*This needs settling)\.?$/i, '.');
}

/*
 * NAMED, IN THE APPROVED JOURNEY'S WORDS (stages 8 and 9, Hafsah, 1 November 2026): "Jane and John see the Westgate deal
 * differently." Where the people are named for this reader, the sentence says they see it differently; unnamed, it stays
 * "People said different things about ...", which every board and the lead's morning read.
 */
export function peopleSaidDifferentThingsAbout(topic: string, who = 'People'): string {
  const t = (topic ?? '').trim().replace(/[.!?]+$/, '');
  const named = !/^People\b/.test(who);
  if (!t || ONLY_SAYS_PEOPLE_DIFFER.test(t)) return named ? `${who} see this differently.` : `${who} said different things.`;
  if (isAWholeSentence(t)) return `${named ? `${who} see this differently.` : `${who} said different things.`} ${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
  /* "see whether X differently" is not English: a noun clause goes after "differently". */
  if (named) return STARTS_A_NOUN_CLAUSE.test(t) ? `${who} see differently ${inASentence(t)}.` : `${who} see ${inASentence(t)} differently.`;
  return `${who} said different things about ${inASentence(t)}.`;
}
