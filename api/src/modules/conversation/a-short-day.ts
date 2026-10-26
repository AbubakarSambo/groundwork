/**
 * A CHECK-IN IS 5 TO 7 QUESTIONS ON A NORMAL DAY (Hafsah, 26 October 2026). Round 1 ran 13 to 15 questions a session. Said to the model on
 * every turn, in code, so it holds whichever stored prompt is active; and held by the product at the sixth answer, whatever was written.
 * Polish round 2: closing from the seventh answer still made nine questions (the opening, seven, and "Is anything wrong?" on the
 * summary). The close now comes from the fifth answer, so a normal day is the opening, five questions and the check of the summary.
 */
export const A_NORMAL_DAY_ASKS_AT_MOST = 5;

export const A_SHORT_DAY = [
  'TODAY IS SHORT: 5 TO 7 QUESTIONS IN ALL, FEWER IF THEY ARE LATE OR SHORT OF TIME.',
  'Ask only for what the board still needs. That is the next step and its day for each open item, proof for anything new they claim, what changed since last time, and one coaching or follow-up question.',
  'Never ask what the record already holds, or what they answered last time unless it has changed.',
  'Put related things in one question: "Westgate and Ngong Road: what is next for each, and when?"',
  'Never ask about a motive, as if they meant to hold something back or let somebody down. Brian said he had not told Njeri about the filing yet, and was asked "What is the goal of holding that information back from Njeri?". Ask what happens next instead: "When will Njeri hear about the filing, and from whom?"',
  'As soon as today’s needs are covered, close.',
].join(' ');

/** From the fifth answer: no more questions; one line on what was recorded and what happens next, then the close marker. */
export const THE_DAY_IS_COVERED = 'THIS WAS THE LAST ANSWER FOR TODAY. Ask nothing more. In one short line, say what is now recorded and what happens next, then write [[SESSION_COMPLETE]].';

export function itIsTimeToClose(answersNow: number, isSelfCorrection: boolean): boolean {
  return !isSelfCorrection && answersNow >= A_NORMAL_DAY_ASKS_AT_MOST;
}

/** At the sixth answer the product closes, whatever the model wrote. */
export function itMustCloseNow(answersNow: number, isSelfCorrection: boolean): boolean {
  return !isSelfCorrection && answersNow > A_NORMAL_DAY_ASKS_AT_MOST;
}

/** The close the product says when it has to: what was recorded, and what happens next, in one line. */
export function theCloseThatCoversToday(leadFirstName: string | null): string {
  return `Done. That covers today. Everything you said is saved${leadFirstName ? `, and ${leadFirstName} sees it on the board` : ''}.`;
}
