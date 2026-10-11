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
  if (STARTS_A_NOUN_CLAUSE.test(t)) return SAYS_SOMETHING_OF_IT.test(t);
  /* Two sides set against each other with ", while" or ", whereas" are two clauses, so a sentence (item 21, the loans board). */
  return A_VERB.test(` ${t}`) || /,\s+(?:while|whereas)\s+\S+\s+\S+/i.test(t);
}

const inASentence = (phrase: string): string => {
  const t = phrase.trim().replace(/[.!?]+$/, '');
  return /^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

/** "People said different things about the price list." or "People said different things. The accounts differ on ...". */
/*
 * A TOPIC THAT ONLY SAYS PEOPLE DIFFER (request 118, from request 117, part 8). Rukia read "People see two things
 * differently. People said different things." The topic the report wrote was itself only "people see two things
 * differently", which says no more than the sentence it was put in, so the two said one fact twice. Such a topic is
 * left out, and the sentence is said once.
 */
const ONLY_SAYS_PEOPLE_DIFFER = /^(?:people|they|the team|everybody|everyone)\s+(?:see|saw|said|say|describe|described|read|view)\s+(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+|some|several|a few|many)\s+)?(?:things?|this|it|matters?)?\s*(?:differently|different things)$/i;

export function peopleSaidDifferentThingsAbout(topic: string): string {
  const t = (topic ?? '').trim().replace(/[.!?]+$/, '');
  if (!t || ONLY_SAYS_PEOPLE_DIFFER.test(t)) return 'People said different things.';
  if (isAWholeSentence(t)) return `People said different things. ${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
  return `People said different things about ${inASentence(t)}.`;
}
