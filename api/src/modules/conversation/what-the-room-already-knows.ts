/**
 * GIVE SOMETHING BACK, IN THE TURN IT IS WORTH SOMETHING IN.
 *
 * The conversation is extractive. A lead answers eight questions and receives a report about the
 * answers she just gave. Nothing comes back while she is in it, which is why it reads as a form and
 * why nobody would return to it by choice. Her words, on a live session: "it is repeat and going
 * around in circles".
 *
 * The product already knows things she never sees in the moment. Three people waiting on the same
 * thing. The blocker nobody owns. All of it is computed, and all of it is pointed at a report she
 * reads afterwards, alone.
 *
 * SO IT COMES BACK IN THE TURN. She names the aggregation point, and the next reply can tell her she
 * is the third person this week to name it. That is a conversation worth having again; a form is not.
 *
 * WHAT THIS IS NOT. It is not a second question, it does not replace the question, and it never
 * guesses. It offers the model ONE fact, already true and already on the shared board, and the model
 * decides whether it fits and writes every word.
 *
 * WHY DEPENDENCIES FIRST. They are the most useful thing a person can hear and the safest thing to
 * say: a handoff already renders on the shared board that every participant reads, so naming one back
 * tells nobody anything they could not already see. Anything drawn from what a person SAID needs the
 * wall applied first and is not in this file.
 */

export interface ABlockerOnTheBoard {
  /** The thing being waited on, in the words of whoever raised it. */
  what: string;
  /** Who raised it. Never the reader themselves. */
  raisedBy: string | null;
  /** Whether anybody is named as owning the other end. */
  owned: boolean;
}

/** Only where the board is shared. A private check-in has no shared board and nothing to share from. */
export interface WhatMayBeOffered {
  shared: boolean;
  theyJustSaid: string;
  /** Live blockers on this ground, raised by anybody but the reader. */
  others: ABlockerOnTheBoard[];
}

const SHORT_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'from', 'that', 'this', 'our', 'their', 'its',
  'is', 'are', 'was', 'were', 'has', 'have', 'had', 'been', 'not', 'what', 'who', 'when', 'where',
  'how', 'why', 'get', 'got', 'need', 'needs', 'want', 'wants', 'still', 'more', 'some', 'any',
]);

function subjectWords(text: string): Set<string> {
  return new Set(
    (text ?? '').toLowerCase().match(/[a-z']{4,}/g)?.filter((w) => !SHORT_WORDS.has(w)) ?? [],
  );
}

/**
 * IS WHAT THEY JUST SAID ABOUT THE SAME THING SOMEBODY ELSE IS WAITING ON?
 *
 * Deliberately strict. A false match offers somebody a fact about a different subject, which is worse
 * than offering nothing: it reads as the product not following the conversation, which is the
 * complaint this whole file exists to answer.
 */
export function theSameThingSomebodyElseNamed(theyJustSaid: string, what: string): boolean {
  const said = subjectWords(theyJustSaid);
  const theirs = subjectWords(what);
  if (theirs.size === 0 || said.size === 0) return false;
  let shared = 0;
  for (const w of theirs) if (said.has(w)) shared += 1;
  /* Most of the blocker's own subject appearing in what they just said. */
  return shared / theirs.size >= 0.6;
}

/**
 * The one thing worth offering this turn, or nothing.
 *
 * ONE, NEVER A LIST. A turn that hands somebody three facts has stopped being a conversation and
 * started being a report, which is the thing being fixed. Where several match, the one nobody owns
 * comes first: an unowned blocker is the fact with somewhere to go.
 */
export function whatIsWorthSaying(input: WhatMayBeOffered): string {
  if (!input.shared) return '';
  const said = (input.theyJustSaid ?? '').trim();
  if (said.length < 12) return '';

  const matched = (input.others ?? []).filter(
    (o) => o.what?.trim() && theSameThingSomebodyElseNamed(said, o.what),
  );
  if (!matched.length) return '';

  const unowned = matched.filter((m) => !m.owned);
  const pick = unowned[0] ?? matched[0];
  const alsoWaiting = matched.filter((m) => m.raisedBy).map((m) => m.raisedBy!) as string[];
  const names = [...new Set(alsoWaiting)];

  const who = names.length === 0
    ? 'Somebody else on this check-in'
    : names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return [
    'SOMETHING THEY DO NOT KNOW, AND IT IS TRUE.',
    '',
    `${who} ${names.length > 1 ? 'have' : 'has'} already named the same thing as being in the way: "${pick.what.trim()}".`,
    pick.owned ? '' : 'Nobody is named as owning the other end of it.',
    '',
    'Say this back to them in one short sentence, in your own words, before your question. It is on',
    'the shared board they can already read, so it reveals nothing. Do not turn it into a second',
    'question, do not make it the whole turn, and drop it entirely if it does not fit what they just',
    'said. Offering somebody a fact about a different subject is worse than offering nothing.',
  ].filter((l) => l !== '').join('\n');
}
