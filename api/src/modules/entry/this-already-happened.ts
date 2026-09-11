/**
 * SOME PEOPLE ARRIVE LOOKING BACK, AND THE PRODUCT KEPT ASKING THEM WHAT THEY WANTED TO ACHIEVE.
 *
 * The setup conversation is built for something starting: who is involved, how often you will check
 * in, what good looks like from here. That is the right shape for a new hire or a quarter's
 * targets, and the wrong shape entirely for somebody typing "the handover went badly and nobody
 * will say why". Asked how often they want to check in on a thing that already finished, a person
 * concludes the product did not read what they wrote.
 *
 * A RECALL SESSION PROTOCOL has existed in prompt-library since the spring - a five-step
 * reconstruct-from-memory interview that opens by admitting memory is less reliable than a record
 * built as it happens. It has never run once, because the only thing that could turn it on was a
 * session mode nothing ever set.
 *
 * Decided by the product owner, 11 September 2026: when somebody describing their own situation
 * opens with something that already happened, bring recall, and cancel the forward-looking half.
 * Not both. A conversation that asks you to reconstruct the past AND set a cadence for the future
 * is two interviews wearing one coat.
 *
 * WHAT THIS IS NOT. It is not a classifier of sad situations, and it does not fire on a bad
 * quarter, a difficult person or anything about how the work is going. It fires on TENSE: has this
 * thing happened, or is it still to happen. That is a question about grammar, which is the only
 * part of this a regular expression has any business answering.
 */

/** Looking back: a thing that is over, or a period being reconstructed. */
const ALREADY_HAPPENED = [
  /\b(went|was|were|had been|has been|used to|ended|fell apart|broke down|collapsed|failed)\b/,
  /\b(what happened|looking back|in hindsight|after the fact|by the time|turned out)\b/,
  /\b(never (?:got|happened|delivered|arrived|came)|did ?n[o']t (?:deliver|happen|work|go))\b/,
  /\b(last (?:quarter|year|month|week)|(?:six|three|twelve) months ago|back in|at the time)\b/,
  /\b(has (?:left|gone|resigned|quit)|have left|no longer (?:here|with us|works))\b/,
];

/** Still to happen: setting something up, or running something that is under way. */
const STILL_TO_COME = [
  /\b(going to|we will|i will|plan to|planning|about to|starting|starts|kicks off|upcoming)\b/,
  /\b(next (?:quarter|year|month|week)|this quarter|from here|going forward|for the quarter)\b/,
  /\b(set(?:ting)? (?:up|clear )?(?:targets|okrs|goals|expectations)|keep (?:an eye|track))\b/,
  /\b(on track|how it is going|how things are going|check in on)\b/,
  /*
   * WANTING IS FORWARD-LOOKING, AND THIS ONE CARRIES THE MIXED SENTENCE.
   *
   * "The last quarter went badly so I want to set targets for the next one" is the commonest way
   * anybody explains why they are here: a reason in the past, a purpose in the future. It is a
   * set-up. Without a bare "want to" the past half won on count alone and took the cadence
   * questions away from the person who came for them.
   */
  /\bwants? to\b/,
  /\bthe next (?:one|quarter|year|month|week)\b/,
];

const hits = (patterns: RegExp[], text: string) => patterns.filter((p) => p.test(text)).length;

/**
 * Does this read as somebody reconstructing something that already happened?
 *
 * Deliberately conservative, and it has to be: recall cancels the forward-looking half of setup, so
 * a false positive costs somebody the questions they actually came for. Looking back has to be BOTH
 * present AND the stronger reading - a sentence carrying both tenses ("the last quarter went badly
 * so I want to set targets for the next one") is somebody planning, and they get the ordinary path.
 */
export function thisAlreadyHappened(whatTheySaid: string | null | undefined): boolean {
  const t = (whatTheySaid ?? '').toLowerCase();
  if (t.trim().length < 12) return false;
  const back = hits(ALREADY_HAPPENED, t);
  return back > 0 && back > hits(STILL_TO_COME, t);
}

/**
 * What the setup prompt is told when it is. Two halves, and the second matters as much as the
 * first: without it the model runs the recall questions and the setup questions, one after the
 * other, and the session doubles in length at the worst possible moment.
 */
export const LOOK_BACK_INSTEAD = `
THIS ONE IS A LOOK BACK, NOT A SET UP.

What they have described has already happened. Two things follow, and the second is not optional.

RUN THE RECALL SHAPE. Get what was agreed at the start, in their words, before anything else. Then
walk the periods in order - what the state of things was, what changed, what exists now that can be
pointed to, and what was expected to exist that does not. The gap between those last two is the
whole of it. Say once, plainly, that this is being reconstructed from memory and is therefore less
reliable than something written down as it happened, and that what they say is their account of it.

CANCEL THE FORWARD-LOOKING QUESTIONS. Do not ask how often they want to check in, what cadence
suits, how long this should run, or what they want to achieve from here. Those questions are for
something starting. Asked about a thing that already finished they read as not having been listened
to, which is the exact complaint that produced this instruction. If they raise the future
themselves, follow them there - but never take them there.`;
