/**
 * THE LEAD WHO ONLY ASKS.
 *
 * Everybody gives a first check-in, including a lead who chose to manage rather than take part:
 * they are a party to round one and the round waits for them, and only from session two are they
 * left out. That rule is right for every situation where the lead is in the work.
 *
 * "Get updates from your team" is the one where they are not. The lead writes one line, the team
 * answers it on their own links, and the report comes back: the whole card is a lead asking a
 * question, and asking is not answering. The anchor's lead (HELP_TEAM_UNDERSTAND) is the same: she has a set-up conversation, not a
 * check-in, so it never counts as an answer and she is never counted or waited on in any round. So the ordinary rule made the promise unkeepable - read on
 * a live ground, with all four people in and the report generated:
 *
 *   "4 of 5 answered - waiting on Hafsah Lead"
 *
 * Waiting on the person it is for, who was never given anything to answer, forever. And the "your
 * team has all checked in" mail, which is the moment of value that card is sold on, would never
 * send.
 */
export const THE_LEAD_ONLY_ASKS = ['TEAM_UPDATES', 'DISCOVERY', 'HELP_TEAM_UNDERSTAND'];

/**
 * Whether this round is waiting on a managing-only lead.
 *
 * @param scenario the ground's situation
 * @param sessionNumber the round being counted
 */
export function waitsOnAManagingOnlyLead(scenario: string | null | undefined, sessionNumber: number): boolean {
  if (THE_LEAD_ONLY_ASKS.includes(scenario ?? '')) return false;
  return sessionNumber <= 1;
}
