/**
 * THE RECORD IS WHAT THE PERSON SAID, NOT WHAT THE SESSION SAID BACK.
 *
 * A lead's report described "more than ten specific commitments on design and UX", quoting "Five
 * tabs, one design language" and "light theme only, deliberately" as her own words. She had never
 * typed any of it. Her actual check-in was about testing a product and fixing bugs.
 *
 * The extractor is given the transcript with both speakers in it - `GROUNDWORK:` lines and
 * `PERSON:` lines - and told it is reading "ONE party's check-in transcript". Nothing told it that
 * only one of those two speakers is the party. So anything the session itself said with enough
 * substance in it - a summary of an uploaded document, a proposed definition, the established
 * context read back - was available to be recorded as something the person had committed to. And
 * the assistant in this product talks a great deal, on purpose.
 *
 * WHY THE ASSISTANT'S TURNS CANNOT SIMPLY BE REMOVED. "All three of the above" means nothing
 * without the question above it. Strip the session's side and every short answer becomes
 * unreadable, which is a different way of losing what somebody said.
 *
 * SO IT IS CHECKED AFTERWARDS, IN CODE. The instruction is added too, and an instruction is not a
 * guarantee: this is the second time in one day a model has been asked politely not to attribute
 * one speaker's words to another. What makes it hold is that every entry has to be traceable to
 * words the person actually used, and one that is not is dropped before it is ever stored.
 */

/** Words too common to say anything about where a sentence came from. */
const EVERYWHERE = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'to',
  'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'it', 'its', 'this', 'that', 'these',
  'those', 'we', 'i', 'they', 'them', 'he', 'she', 'you', 'my', 'our', 'their', 'his', 'her',
  'your', 'not', 'no', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
  'should', 'there', 'here', 'what', 'when', 'who', 'how', 'why', 'which', 'all', 'any', 'some',
  'more', 'most', 'own', 'said', 'says', 'say', 'get', 'got', 'make', 'made', 'need', 'needs',
  'want', 'wants', 'one', 'two', 'also', 'about', 'into', 'than', 'then', 'so', 'as', 'if',
]);

/**
 * ENDINGS ARE STRIPPED, because paraphrase is allowed and paraphrase changes them.
 *
 * "I want them to find the bugs and fix them" becoming "the bugs found and fixed" is exactly what
 * the extractor is for, and without this it read as invention - which is the same failure as the
 * one being fixed, pointed the other way. Dropping a real entry loses somebody's words just as
 * surely as inventing one puts words in their mouth.
 *
 * Deliberately crude. It will not join "find" to "found", and it does not need to: the bar is half
 * the distinctive words, not all of them.
 */
function stem(w: string): string {
  return w
    .replace(/(ies)$/, 'y')
    .replace(/(ing|ed|es|s)$/, '')
    || w;
}

function words(s: string): string[] {
  return s
    .toLowerCase()
    /* The extractor's own commentary is not the person's words and must not vouch for itself. */
    .replace(/\[(inferred|verifiability)[^\]]*\]/gi, ' ')
    .split(/[^a-z0-9]+/)
    /*
     * STEM FIRST, THEN LENGTH. Filtering by length before stemming was asymmetric and quietly
     * wrong: "fix" is three letters and was dropped from what the person said, while "fixed" was
     * five and survived on the other side to be stemmed to "fix" - so a word present in both texts
     * could only be found in one of them. It rejected a plain paraphrase of what she had typed.
     */
    .map(stem)
    .filter((w) => w.length >= 3 && !EVERYWHERE.has(w));
}

/**
 * HOW MUCH OF AN ENTRY HAS TO BE TRACEABLE TO THE PERSON.
 *
 * Not all of it: the extractor is allowed to paraphrase and to mark an inference, and both are
 * useful. Half is the bar - enough that a sentence built out of the session's vocabulary cannot
 * pass, and loose enough that a genuine paraphrase of what somebody said does.
 */
export const MUST_BE_THEIRS = 0.5;

/** An entry with nothing distinctive in it at all is kept: there is nothing to check it against. */
export function isTheirs(entryText: string, whatTheySaid: string): boolean {
  const mine = words(entryText);
  if (mine.length === 0) return true;
  const theirs = new Set(words(whatTheySaid));
  const shared = mine.filter((w) => theirs.has(w)).length;
  return shared / mine.length >= MUST_BE_THEIRS;
}

/**
 * Added to the extraction prompt. It says the thing the prompt never said, and it is the belt
 * rather than the braces - `isTheirs` is what actually holds.
 */
export const ONLY_THEIR_WORDS =
  'WHOSE WORDS COUNT. The transcript has two speakers. Lines beginning PERSON: are the party whose '
  + 'record this is. Lines beginning GROUNDWORK: are the session talking to them - questions, '
  + 'summaries, definitions read back, and descriptions of documents. Nothing on a GROUNDWORK line '
  + 'is something this person said, committed to, or defined, however much it sounds like it and '
  + 'however reasonable it would be. Read those lines only to understand what a PERSON line is '
  + 'answering. If the session proposed a definition and the person agreed, record what the PERSON '
  + 'said in agreeing, not the definition the session wrote.';
