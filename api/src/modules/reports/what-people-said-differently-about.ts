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
const A_VERB = /\s(?:is|are|was|were|has|have|had|does|do|did|differs?|disagrees?|agrees?|can|cannot|can't|will|would|should|could|may|might|must|seems?|appears?|remains?|needs?|wants?|depends?|lacks?|exceeds?)\b/i;
const STARTS_A_NOUN_CLAUSE = /^(?:whether|what|how|who|when|where|which|why|if)\b/i;

export function isAWholeSentence(topic: string): boolean {
  const t = (topic ?? '').trim();
  return !!t && !STARTS_A_NOUN_CLAUSE.test(t) && A_VERB.test(` ${t}`);
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
