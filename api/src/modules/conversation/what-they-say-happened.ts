/**
 * WHAT SOMEBODY SAYS HAPPENED THAT NO SYSTEM RECORDED.
 *
 * External evidence is not infallible and the ways it fails are ordinary: a call made from a phone
 * nothing is connected to, an app that did not sync, a shop the system has twice under two names, a
 * follow-up sent from a personal email. In every one of those the record is silent and the work
 * happened.
 *
 * A product that treats silence as absence gets this exactly backwards, and it gets it backwards
 * about the person rather than about the tool. So their account becomes evidence in its own right,
 * at its own strength - `SELF_REPORTED`, which the report already knows how to describe without
 * either doubting it or dressing it up as corroboration.
 *
 * NOTHING IS SETTLED BY THIS. It does not overwrite the record and the record does not overwrite
 * it. Both sit there, and a discrepancy preserved is worth more than a certainty invented.
 *
 * IT IS THEIR OWN WORK ONLY. Somebody cannot record activity on behalf of a colleague here - that
 * would be one person's account of another's work presented as evidence, which is the thing this
 * product refuses everywhere else.
 */

export interface TheySay {
  /** What kind of thing: the same six the evidence path uses. */
  kind: string;
  /** Which counterparty, by the name they used. Resolved by the caller, dropped when it matches none. */
  counterparty?: string;
  /** When they say it happened, in their words. */
  when?: string;
  /** Their own line about it. */
  note?: string;
  /** Whether they said a record of it is missing or wrong. */
  saysRecordIsWrong?: boolean;
}

export const KINDS = ['VISIT', 'CALL', 'MESSAGE', 'MEETING', 'PROPOSAL', 'TRANSACTION'];

/**
 * WHAT THE INTERVIEW IS TOLD TO DO WITH IT.
 *
 * Never argue. Somebody saying "I called them, it just is not logged" has given the answer, and the
 * next question is about the work rather than about the tool. Pressing them to prove it is how a
 * check-in turns into an audit, and it teaches people that the safe answer is the one that matches
 * the record.
 */
export const WHEN_THEY_SAY_IT_IS_MISSING =
  'IF THEY SAY SOMETHING HAPPENED THAT IS NOT IN THE RECORDS ABOVE, take it. A call from a phone '
  + 'nothing is connected to, an app that did not sync, a shop logged twice under two names - these '
  + 'are ordinary and the record is wrong about them more often than the person is. Write down what '
  + 'they say happened, ask what you would ask if it had been logged, and move on. Never press them '
  + 'to prove it and never imply the system is more likely to be right than they are.';

/**
 * Whether a claim is worth writing down as their own account.
 *
 * The bar is that they said a specific thing happened with somebody specific. "I have been doing a
 * lot of outreach" is not an interaction; "I called Mama Ngozi on Tuesday" is. Without that line
 * every check-in would fill the record with activity nobody can point at, which is the same
 * failure as counting visits.
 */
export function worthRecording(said: TheySay): boolean {
  if (!KINDS.includes((said.kind ?? '').toUpperCase())) return false;
  /* Somebody specific, or it is a description of a week rather than a thing that happened. */
  return !!said.counterparty?.trim();
}
