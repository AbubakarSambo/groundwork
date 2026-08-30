/**
 * WHAT THE COMPANY SAYS ITS OWN PROCESS IS, IN THE ROOM WHERE SOMEBODY IS ASKED ABOUT IT.
 *
 * The audit's sharpest gap. "Do you understand our pricing process?" can be answered yes by
 * somebody who does not, and the interview had no way to tell - the organisation's own handbook,
 * playbook and decision records were sitting in `KnowledgeCard`, versioned and effective-dated, and
 * the check-in could not see any of it. The assistant could. The conversation could not.
 *
 * THIS IS NOT A TEST AND MUST NEVER BECOME ONE. The difference is the whole thing:
 *
 *   A quiz asks a question with a right answer, marks it, and produces a score somebody is
 *   measured by. That is a competency database, it is what this product is explicitly not, and it
 *   would poison the only thing that makes a check-in worth answering honestly.
 *
 *   This asks somebody to describe how something works in their own words, and where their account
 *   and the written process differ, records the DIFFERENCE as something to sort out. A difference
 *   is as likely to mean the document is stale as that the person is wrong, and the wording below
 *   says so every time.
 *
 * WHAT THE PERSON SEES. The same thing the lead sees. A gap recorded here is in their own record
 * and reaches them in their own report, because a hidden read on somebody's understanding is a
 * management dossier and this product does not keep one.
 */

export interface Card {
  key: string;
  title: string;
  body: string;
}

/** Kept small on purpose. Five cards of process is already more than one conversation can use. */
export const MOST_CARDS_IN_A_SESSION = 3;

/**
 * The block, or nothing at all.
 *
 * Nothing is the common case and has to stay comfortable: most organisations have written none of
 * this down, most conversations are not about process, and a check-in with no cards behind it is
 * exactly the check-in this product has always run.
 */
export function howThisCompanyDoesIt(cards: Card[]): string {
  const use = cards.slice(0, MOST_CARDS_IN_A_SESSION);
  if (!use.length) return '';

  return [
    'HOW THIS COMPANY SAYS IT WORKS.',
    '',
    'Written down by somebody here, and current as of today. It is what the organisation says, not',
    'what is necessarily true - a written process can be out of date, and often is.',
    '',
    ...use.map((c) => `--- ${c.title} ---\n${c.body.trim()}`),
    '',
    'HOW TO USE IT.',
    'Where this person describes something one of these covers, ask them to walk you through it in',
    'their own words - "a client says yes to a piece of work, what happens next" - and listen to',
    'the answer against what is written above.',
    '',
    'You are NOT testing them and you must never sound like you are. No quiz, no marking, no',
    'right-answer-checking, and never several of these in one session. One walk-through, where the',
    'conversation was already going there.',
    '',
    'WHERE THEIR ACCOUNT AND THE WRITTEN PROCESS DIFFER, that difference is the useful thing and it',
    'is not a verdict on either. Say what you understood them to describe, say what is written, and',
    'ask which is right - a document nobody has updated since March is at least as likely to be the',
    'wrong one as the person is. If they have not been told, that is the finding, and it belongs to',
    'whoever should have told them.',
    '',
    'Never say they are wrong, do not know, or have a gap. Say the two accounts differ and ask.',
  ].join('\n');
}

/**
 * WHAT TO SEARCH THE COMPANY'S OWN WRITING FOR.
 *
 * A FEW WORDS FROM WHAT THEY JUST SAID, not the whole sentence.
 *
 * Found by running it: passing the message itself returned nothing at all for a check-in that was
 * plainly about contracting. The retriever scores partly by what fraction of the query's words
 * appear in a card, so a long conversational turn buries the two words that matter under twenty
 * that do not - "the client said yes to the eighty thousand piece of work" scored zero against a
 * card titled "How contracting works", while "contract" found it immediately.
 *
 * So this keeps the words a process would be written about and drops the rest. It is blunt on
 * purpose: a cleverer reading would be us deciding what a check-in is about, and a check-in is
 * about whatever the person in it says it is.
 *
 * Short messages are skipped entirely. "Yes", "not yet" and "I think so" are the answers most
 * likely to be hiding a gap and the least likely to name a process, and pulling three pages of
 * handbook behind a one-word reply helps nobody.
 */
const NOT_WORTH_LOOKING_UP = new Set([
  'the', 'and', 'for', 'our', 'you', 'your', 'this', 'that', 'with', 'from', 'have', 'has', 'had',
  'was', 'were', 'been', 'being', 'are', 'not', 'but', 'they', 'them', 'their', 'there', 'here',
  'what', 'when', 'which', 'who', 'how', 'why', 'would', 'could', 'should', 'will', 'can', 'just',
  'about', 'into', 'onto', 'over', 'under', 'then', 'than', 'some', 'any', 'all', 'one', 'two',
  'got', 'get', 'going', 'went', 'said', 'say', 'says', 'think', 'thought', 'know', 'really',
  'week', 'day', 'days', 'weeks', 'month', 'months', 'time', 'thing', 'things', 'people', 'work',
]);

/** More than this and the fraction the retriever scores by collapses. Found by running it. */
export const MOST_WORDS_IN_A_LOOKUP = 6;

export function whatToLookUp(latestMessage: string | null | undefined): string | null {
  const t = (latestMessage ?? '').trim();
  if (t.length < 40) return null;

  const words = t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !NOT_WORTH_LOOKING_UP.has(w));

  /* Each word once, in the order they said them, so the query reads like what they were talking
     about rather than like a bag of terms. */
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    kept.push(w);
    if (kept.length === MOST_WORDS_IN_A_LOOKUP) break;
  }

  return kept.length >= 2 ? kept.join(' ') : null;
}
