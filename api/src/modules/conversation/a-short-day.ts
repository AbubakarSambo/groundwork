/**
 * A CHECK-IN IS SHORT BECAUSE IT ASKS ONLY WHAT THE BOARD NEEDS, NEVER BECAUSE IT IS CUT OFF (Hafsah, 26 October 2026).
 *
 * Round 1 ran 13 to 15 questions a session, so a cap was tried: told to close from the fifth answer and closed by the product at the
 * sixth. Hafsah's answer after round 3: no question limit and no forced close. Groundwork keeps a check-in short by never asking what the
 * record already holds and by putting related questions together. Once today's needs are covered it asks "Anything else I should
 * know?", and closes after they answer it or say no. Whatever they add is filed where it belongs, with at most two follow-ups for what
 * the board needs. If a check-in runs long, Groundwork says they can end it now; it never ends it for them. End session stays visible
 * the whole time, on every channel. Nobody is cut off while they are explaining or adding something.
 *
 * Said to the model in code on every turn, so it holds whichever stored prompt is active.
 */
export const A_SHORT_DAY = [
  'KEEP TODAY SHORT BY ASKING ONLY WHAT THE BOARD STILL NEEDS.',
  'That is the next step and its day for each open item, proof for anything new they claim, what changed since last time, and one coaching or follow-up question.',
  'Never ask what the record already holds, or what they answered last time unless it has changed.',
  'Put related things in one question: "Westgate and Ngong Road: what is next for each, and when?"',
  'If they say something outside your question, take it: say in a few words where it goes (the deal, the person or the promise), and carry on from there. Never push them back to your question, and never cut them off while they are explaining.',
  'Never ask about a motive, as if they meant to hold something back or let somebody down. Brian said he had not told Njeri about the filing yet, and was asked "What is the goal of holding that information back from Njeri?". Ask what happens next instead: "When will Njeri hear about the filing, and from whom?"',
].join(' ');

/** The last question of a normal day, asked once today's needs are covered. */
export const ANYTHING_ELSE = 'Anything else I should know?';
export const askedAnythingElse = (aiTurn: string | null | undefined): boolean => /\banything else I should know\?/i.test(String(aiTurn ?? ''));

/** "No", "nothing", "that's all": the answer to "Anything else I should know?" that leaves nothing to add. */
export function saysThereIsNothingMore(message: string): boolean {
  const m = String(message ?? '').trim();
  return m.length <= 80 && /^(?:no|nope|nah|nothing|not really|none|that'?s (?:all|it|everything)|that is (?:all|it|everything)|all good|i'?m good|no,? (?:thanks|thank you|that'?s all|nothing else)|nothing (?:else|more))\b/i.test(m);
}

/** From this many answers on, the model is told to ask "Anything else I should know?" once today's needs are covered. */
export const ASK_ANYTHING_ELSE_FROM = 4;
/** From this many answers on, Groundwork says once that they can end now. It never ends it for them. */
export const A_LONG_CHECK_IN_FROM = 10;
/** After "Anything else I should know?", at most this many follow-ups about what they added. */
export const FOLLOW_UPS_ON_WHAT_THEY_ADDED = 2;

export const WHEN_TODAY_IS_COVERED = `WHEN TODAY'S NEEDS ARE COVERED, your next question is exactly: "${ANYTHING_ELSE}", alone in its turn. Not before. If they are still explaining or adding something, keep listening and ask about that instead; never cut them off.`;

export const THEY_ADDED_SOMETHING = `They answered "${ANYTHING_ELSE}" with something new. Take it as said and say in a few words where it goes (the deal, the person or the promise). Ask at most ${FOLLOW_UPS_ON_WHAT_THEY_ADDED} follow-up questions about it, and only for what the board needs: the day, or the proof. When you have that, close in one short line saying what is recorded and what happens next, then write [[SESSION_COMPLETE]].`;

export const THE_DAY_IS_COVERED = 'TODAY IS COVERED. Ask nothing more. In one short line, say what is now recorded and what happens next, then write [[SESSION_COMPLETE]].';

/** Said once, at the end of a reply, when a check-in has run long. The person decides. */
export const YOU_CAN_END_NOW = 'We’ve covered what’s needed today. You can end the session now, or tell me anything else.';
export const YOU_CAN_END_NOW_ON_WHATSAPP = 'We’ve covered what’s needed today. You can reply END now, or tell me anything else.';

/**
 * Where a check-in stands at the end of a day's needs, from its own turns: whether "Anything else I should know?" was asked, how many
 * of Groundwork's turns came after it, and whether the person said there is nothing more.
 */
export function whereTheEndStands(aiTurnsNewestFirst: readonly string[], message: string): { asked: boolean; followUps: number; nothingMore: boolean } {
  const i = aiTurnsNewestFirst.findIndex((t) => askedAnythingElse(t));
  if (i < 0) return { asked: false, followUps: 0, nothingMore: false };
  return { asked: true, followUps: i, nothingMore: i === 0 && saysThereIsNothingMore(message) };
}

/**
 * Whether this turn closes: they said there is nothing more, or the follow-ups on what they added are done. Never on a count of answers.
 */
export function itIsTimeToClose(end: { asked: boolean; followUps: number; nothingMore: boolean }, isSelfCorrection: boolean): boolean {
  if (isSelfCorrection || !end.asked) return false;
  return end.nothingMore || end.followUps >= FOLLOW_UPS_ON_WHAT_THEY_ADDED;
}

/** What the model is told this turn about the end of today, if anything. */
export function whatToSayAboutTheEnd(answersNow: number, end: { asked: boolean; followUps: number; nothingMore: boolean }, isSelfCorrection: boolean): string | null {
  if (isSelfCorrection) return null;
  if (itIsTimeToClose(end, false)) return THE_DAY_IS_COVERED;
  if (end.asked) return THEY_ADDED_SOMETHING;
  return answersNow >= ASK_ANYTHING_ELSE_FROM ? WHEN_TODAY_IS_COVERED : null;
}

/** Whether to say, once, that they can end now: a long check-in, not closing, and not said already. */
export function itIsTimeToSayTheyCanEnd(answersNow: number, closing: boolean, aiTurnsSoFar: readonly string[]): boolean {
  return answersNow >= A_LONG_CHECK_IN_FROM && !closing && !aiTurnsSoFar.some((t) => /You can (?:end the session|reply END) now, or tell me anything else\./.test(t));
}
