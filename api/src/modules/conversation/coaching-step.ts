/**
 * WHAT HAPPENS WHEN SOMEBODY COMES BACK.
 *
 * The difference between coaching and advice is the wait. Advice hands over a
 * list. Coaching gives one small thing, waits a week, asks what happened, and
 * picks the next thing from the answer. The map lives in the coach's head; the
 * person only ever sees one step.
 *
 * So the whole engine turns on reading one answer correctly, and there are four
 * things that answer can be. Three of them are obvious and the fourth is the one
 * that matters:
 *
 *   DONE          they did it. Acknowledge, and give the next step, fitted to
 *                 what they actually found.
 *   DID MORE      they went past it. Meet them there rather than walking them
 *                 back through a step they have overtaken.
 *   SIDEWAYS      they did it and reality answered: a reply, a silence, a no.
 *                 The next step is about THE RESULT, not the original plan.
 *   NOT DONE      and this is the one that decides whether the product is any
 *                 good.
 *
 * NOT DONE IS NOT A FAILURE TO BE REPEATED AT SOMEBODY. The instinct is to say
 * it again, or say it louder, or add a second thing. That is what makes people
 * stop answering honestly, because the check-in becomes a place where you get
 * told off for the same thing twice.
 *
 * The obstacle IS the coaching. "Was it time, or did it feel like it would
 * commit you to the scary next thing?" is a better question than any next step,
 * because the answer is usually the actual problem, and the person very often
 * has not said it out loud to anyone. Then a SMALLER version of the same step,
 * never a repeat and never a pile-on.
 *
 * Pure functions. Reading an answer and choosing a move should be checkable
 * without a model, a database or a network.
 */

export type StepOutcome = 'done' | 'did_more' | 'not_done' | 'sideways' | 'unclear';

export type CoachMove =
  /** They did it. Advance, personalised to what they found. */
  | 'advance'
  /** They went further. Pick up from where they actually are. */
  | 'meet_them_there'
  /** Reality answered. The next step is about the result. */
  | 'work_the_result'
  /** Get curious about what stopped them, then offer a smaller version. */
  | 'ask_the_obstacle'
  /** Nothing readable yet. Ask plainly what happened, do not assume. */
  | 'ask_what_happened';

const DID_IT = /\b(i (did|sent|had|made|wrote|called|asked|shipped|drafted|posted|spoke)|done|sent it|had the conversation|got it out|went ahead)\b/i;

const WENT_FURTHER = /\b(and (then|also) i|went further|did that and|also (sent|had|asked|called)|ended up (doing|sending|having)|two of them|all three|as well as)\b/i;

const REALITY_ANSWERED = /\b(they (replied|said|came back|got back|declined|passed|went quiet)|no reply|heard nothing|still nothing|silence|said no|turned (it|me) down|pushed back|bounced)\b/i;

const DID_NOT = /\b(not yet|didn'?t|did not|haven'?t|have not|no,? i|never got (to|round)|ran out of time|no time|forgot|kept (putting|pushing) it off|meant to)\b/i;

/**
 * Read what happened to the step they were given.
 *
 * Order matters and is deliberate.
 *
 * "Not done" is tested FIRST, because "I didn't send it" contains "sent" and a
 * naive reading calls that a success. Congratulating somebody for a thing they
 * just told you they did not do is the single most trust-destroying output this
 * layer could produce: it proves nobody is listening, and the next answer will
 * be shorter.
 *
 * Then SIDEWAYS before DONE, because "I sent it and heard nothing" is a done
 * step whose useful content is the silence. Treating it as a plain success and
 * moving on abandons them exactly where the help was needed.
 */
export function readOutcome(answer: string): StepOutcome {
  /**
   * Normalise the apostrophe before reading anything.
   *
   * "Haven't" typed on a phone is "Haven’t", with a curly apostrophe, and a
   * pattern written with a straight one does not match it. The consequence is
   * not cosmetic: the sentence falls through the not-done test, hits "had the
   * conversation", and comes back as a SUCCESS. The person is then congratulated
   * for the exact thing they just said they had not managed.
   *
   * iOS, Android and Word all produce the curly form by default, so this is the
   * common case rather than the edge one. Caught by the guard test, which is the
   * only reason it is not in the product.
   */
  const text = (answer ?? '').replace(/[\u2018\u2019\u02BC]/g, "'").trim();
  if (!text) return 'unclear';

  if (DID_NOT.test(text)) return 'not_done';
  if (REALITY_ANSWERED.test(text)) return 'sideways';
  if (WENT_FURTHER.test(text) && DID_IT.test(text)) return 'did_more';
  if (DID_IT.test(text)) return 'done';
  return 'unclear';
}

/** The move that follows from what happened. One move, never a list. */
export function moveFor(outcome: StepOutcome): CoachMove {
  switch (outcome) {
    case 'done':
      return 'advance';
    case 'did_more':
      return 'meet_them_there';
    case 'sideways':
      return 'work_the_result';
    case 'not_done':
      return 'ask_the_obstacle';
    default:
      return 'ask_what_happened';
  }
}

/**
 * Advice that could have been written before meeting the person.
 *
 * A step is only a step if it could not have been given to anybody else. "Find
 * some leads" and "ask a colleague for an intro" are not coaching, they are the
 * things a person already knows and has already failed to act on. Generic advice
 * is the tell that the staircase was skipped and something was generated to fill
 * the slot.
 *
 * This is a guard, not a rewriter: it catches the shape and refuses it, so a
 * generic step is never handed over as though it were considered.
 */
const GENERIC = [
  /\bfind (some |more |new )?(leads|prospects|customers|clients)\b/i,
  /\bask (a |your )?(colleague|friend|contact|someone) for an intro\b/i,
  /\bcheck (out )?linkedin\b/i,
  /\bnetwork more\b/i,
  /\bdo some research\b/i,
  /\breach out to (some|a few|more) people\b/i,
  /\bhave a conversation with (someone|somebody)\b/i,
  /\bmake a list\b(?!\s+of\s+\w)/i,
  /\bfollow up\b(?!\s+(with|on)\s+\w)/i,
  /\bset (some |a few )?goals\b/i,
  /\bbe more (proactive|specific|assertive|visible)\b/i,
  /\bthink about\b/i,
];

/** Is this step generic enough that it could have gone to anyone? */
export function isGenericStep(step: string): boolean {
  if (!step?.trim()) return true;
  return GENERIC.some((p) => p.test(step));
}

/**
 * Size the step to where the person is.
 *
 * Frozen means shrink until refusing it would take a decision. "Draft it, do not
 * send" is a real step for somebody who has not been able to start; "send three"
 * is not, and offering it just moves the failure along a week.
 *
 * Momentum means grow, because holding somebody to a small step after they have
 * overtaken it is its own kind of insult.
 */
export function sizeFor(outcome: StepOutcome): 'shrink' | 'hold' | 'grow' {
  if (outcome === 'not_done') return 'shrink';
  if (outcome === 'did_more') return 'grow';
  return 'hold';
}
