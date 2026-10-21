/**
 * NOT A BLOCKER THEY RAISED (the final real-model check, 21 October 2026, item 2).
 *
 * Mercy's board said "Mercy needs coaching on trying something before raising a blocker." and her My work said she raised blockers
 * without trying to clear them. Her "blockers" were these, from her own check-ins:
 *  - "The head teacher said they wouldn't have the budget until January." kept as a wait on "the school" for "the budget";
 *  - "They also need the school board to approve it." kept as a wait on "the school board" for "approval";
 *  - "From the team, maybe some ideas on how to approach schools that have budget constraints." kept as a wait on "the team";
 *  - "And from Grace, just her thoughts on the payment plan idea for kiosks." kept as a wait on Grace.
 * The first two are where a customer stands: a deal that cannot buy now, which the record already reads as a deal's state. The last
 * two are her asking for ideas and for Grace's view on her own idea. None of them is something in the way of her own work that she
 * could have tried to clear, so none of them is a blocker she raised, and none is held against her.
 *
 * A wait for somebody's check-in (a-wait-for-a-check-in-is-not-a-wait) is not a blocker either.
 *
 * Still a blocker: a document, a price, a fix, an advice or a decision somebody must give before the person can do their own part
 * ("the signed verifying affidavit" from the client, "advice on how to proceed with their query" from Wanjiru, "the pricing for Juja
 * Hardware"). Those are what "try one thing first" is about.
 */
import { aWaitForTheirCheckIn } from '../conversation/a-wait-for-a-check-in-is-not-a-wait';

export interface AWaitTheyRaised {
  what: string;
  onParticipantId?: string | null;
  onLabel?: string | null;
  status?: string | null;
  createdAt?: Date | string | null;
  clearedAt?: Date | string | null;
}

/* Asking for somebody's view, ideas or input on their own idea or approach. "Advice on how to proceed" is a decision they need, and stays. */
const ASKING_FOR_A_VIEW = /^(?:(?:some|any|more|her|his|their|your|the|a|an|just)\s+)*(?:thoughts?|ideas?|views?|opinions?|feedback|input|suggestions?|tips?|pointers?)\b/i;
/* Where a customer stands: their own budget, money, approval or decision, which is the deal's state, not the person's work held up. */
const A_CUSTOMERS_OWN = /^(?:(?:the|their|its|a|an|her|his|board'?s?|school'?s?|new)\s+)*(?:budget|budget allocations?|funds?|funding|money|approval|board approval|go[\s-]?ahead|sign[\s-]?off|decision|answer|reply|response)\b(?!.*\b(?:affidavit|document|statement|slip|draft|order form|contract)\b)/i;

/**
 * Is this wait something other than a blocker the person raised? On a sales check-in a customer's own budget, approval or decision is
 * where the deal stands; on any check-in, asking for a view or ideas is not a blocker, and nor is waiting for somebody's check-in.
 */
export function notABlockerTheyRaised(d: AWaitTheyRaised, how: { sales: boolean; namesHere?: string[][]; keepTheAsks?: boolean; keepWhatCleared?: boolean; theLeadOnHerTeam?: boolean }): boolean {
  const what = String(d.what ?? '').trim();
  if (!what) return true;
  /* The lead waiting on somebody in her own check-in for their part is her following their work, not a blocker of hers (Wanjiru's fee notes,
     "confirmation that payment is in the bank" from Njeri and "the follow-up on FN-004" from Brian, were four blockers "with nothing tried"). */
  if (how.theLeadOnHerTeam && d.onParticipantId) return true;
  if (aWaitForTheirCheckIn({ what, onParticipantId: d.onParticipantId ?? null, onLabel: d.onLabel ?? null }, how.namesHere ?? [])) return true;
  /* On the board an ask for the lead's view still needs her answer, so it is kept there (`keepTheAsks`), and only never held against them. */
  if (ASKING_FOR_A_VIEW.test(what) && !(how.keepTheAsks && d.onParticipantId)) return true;
  /* Something said to have come in the same check-in it was first mentioned ("Jamii said they've cleared our fee note too") is news, not a
     blocker: it was cleared on the day it was raised (final check, item 7). */
  if (!how.keepWhatCleared && String(d.status ?? '').toUpperCase() === 'CLEARED' && d.createdAt && d.clearedAt
    && Math.abs(new Date(d.clearedAt).getTime() - new Date(d.createdAt).getTime()) < 18 * 3_600_000) return true;
  /* Only a wait on somebody outside the check-in (a customer) is read as the customer's own state. */
  if (how.sales && !d.onParticipantId && A_CUSTOMERS_OWN.test(what)) return true;
  return false;
}
