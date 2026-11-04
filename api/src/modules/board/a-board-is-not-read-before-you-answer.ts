/**
 * THE RULE THE REPORT ALREADY KEEPS, KEPT ON THE BOARD TOO.
 *
 * `reports.service` withholds the forming picture from a party who has not given their account this
 * round, and the reason is written there from a real walk-through: Zainab, invited and not yet
 * checked in, opened her Report tab and read her manager's private account of her, summarised,
 * before she had written a word. Whatever she said next was an answer to it.
 *
 * The board had never heard of that rule. It is the surface that puts the WHOLE run in one place -
 * every person, every number, every blocker - so reading it first is worse than reading the report
 * first, not better. One gate on one surface is not a rule, it is a gap with a guard next to it.
 *
 * WHO IT IS BETWEEN. The parties. Never the lead, the admin who set the check-in up, or an admin of
 * this organisation: they are waiting ON the accounts rather than giving one, and a lead who cannot
 * see the board until they have done their own check-in cannot run the round.
 *
 * AND IT SAYS WHY. A board that renders empty reads as a broken page, and a bare refusal reads as
 * an accusation. This is a fact about the method - the accounts are independent, and they stop
 * being independent the moment one is read before the other is written.
 */
export interface WhoIsAsking {
  /** Their participant row, or null for somebody who has none - an org admin, say. */
  participantId: string | null;
  /** Whether they run this check-in: its lead, the admin who set it up, an admin of this org. */
  runsThisGround: boolean;
}

export interface ThisRound {
  missingParticipantIds: string[];
}

/** True when this reader has a check-in due on this round and is not the one running it. */
export function theyOweAnAccountFirst(who: WhoIsAsking, round: ThisRound | null): boolean {
  if (who.runsThisGround || !who.participantId || !round) return false;
  return round.missingParticipantIds.includes(who.participantId);
}

/** What a person reads in place of the board before they have checked in, with one button beside it (Hafsah, 25 October and 4 November). */
export const BECAUSE_YOURS_WOULD_BE_AN_ANSWER = 'Check in first, then you’ll see the board.';
