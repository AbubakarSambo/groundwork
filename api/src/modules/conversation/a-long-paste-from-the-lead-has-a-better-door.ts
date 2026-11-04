import { askName } from '../assistant/ask-name';
import { looksLikeADump } from '../grounds/a-dump-is-many-things';

/**
 * A LONG PASTE FROM THE LEAD, IN THEIR OWN CHECK-IN, IS POINTED AT THE DOOR THAT KEEPS IT.
 *
 * Driven with a real weekly sales update (4 October 2026): the lead pasted it into their own session,
 * the conversation asked one follow-up question, and none of it reached the check-in. It was kept as
 * the lead's own words, which is right, but the targets on each rep, the commitments, the dates and
 * the questions for people in it were not put anywhere. A check-in session is for what the person
 * says about their own work, one thing at a time; reading a whole dump into everyone's targets, with
 * a say-back and a yes, is the setup chat's and Ask Groundwork's job.
 *
 * So the session keeps the words and says, once and plainly, where to take them. Nothing here reads
 * the paste, changes the reply the person is given, or writes anything.
 */
export const WHERE_TO_TAKE_A_LONG_PASTE_IN_ASK_GROUNDWORK = (ask: string = askName(null)) =>
  `That is a lot to read. To put the numbers, dates, decisions and questions in it on this check-in, paste it into ${ask}. It will say back what it found, and nothing is saved until you say yes.`;
export const WHERE_TO_TAKE_A_LONG_PASTE_ON_THE_CONTEXT_PAGE =
  'That is a lot to read. To put the numbers, dates, decisions and questions in it on this check-in, paste it into the chat on this check-in\'s References and resources page. It will say back what it found, and nothing is saved until you say yes.';

export function whereToTakeALongPaste(opts: { isTheLead: boolean; message: string; askGroundworkTakesContext: boolean; ask?: string }): string | null {
  if (!opts.isTheLead || !looksLikeADump(opts.message ?? '')) return null;
  return opts.askGroundworkTakesContext ? WHERE_TO_TAKE_A_LONG_PASTE_IN_ASK_GROUNDWORK(opts.ask) : WHERE_TO_TAKE_A_LONG_PASTE_ON_THE_CONTEXT_PAGE;
}
