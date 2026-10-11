/**
 * WHO IS WORTH NUDGING, AND WHO IS BEING HARASSED.
 *
 * The manual reminder asked one question — "is this party's check-in not COMPLETED" — and sent to
 * everybody who answered yes. Three kinds of person answer yes and should not be written to:
 *
 *  - somebody who DECLINED, who is being asked again to do the thing they said no to. Declining is
 *    a recorded decision, not a delay.
 *  - a managing-only lead, who has no check-in at all by design, so `!session` is true for them
 *    forever. They were nudged about work that is not theirs.
 *  - anybody with no check-in for this session for any other reason — because the nudge link is
 *    built from a check-in id, and with no check-in the caller built a link out of an empty
 *    string. A reminder pointing at nothing is worse than no reminder.
 *
 * One list, so the manual path and the scheduled sweep cannot answer it differently.
 */

export type SessionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';

export interface APartyToNudge {
  id: string;
  /** The lead (INITIATOR) checks in when they choose and is never sent a participant reminder (decision 133). */
  partyType?: string | null;
  /**
   * Whether they have accepted their invitation and have an account.
   *
   * The manual reminder queried `userId: { not: null }`, so somebody who never accepted could not
   * be reminded at all — the one person a lead most wants to chase, and pressing the button did
   * nothing for them. They are not sent a nudge (the link goes to a check-in they cannot open
   * without an account); they are sent their invitation again. See `whatToSendThem`.
   */
  hasAccepted?: boolean;
  /** Their check-in for the session in question, if they have one. */
  session?: { id: string; status: SessionStatus } | null;
  /** True where the party exists to oversee rather than to answer. */
  managingOnly?: boolean;
  emailNotifications?: boolean | null;
  /**
   * Whether their account is still active.
   *
   * A leaver keeps receiving reminders about a check-in at a company they have left, at an address
   * that may now belong to somebody else — the audit's finding was "nothing stops nudges going to
   * a leaver's address until the roster says inactive", and the roster is optional. The account
   * being deactivated is the fact we always have.
   */
  stillHere?: boolean;
  hoursSinceLastNudge?: number | null;
  /* They used the link on the mail. The invitation told them ignoring it was enough and it was
     not, so this is the thing that makes that sentence true. See ignoring-it-should-be-enough.ts. */
  remindersStoppedAt?: Date | string | null;
}

import { checksInOnlyWhenTheyChoose, owesThisSession } from '../grounds/the-lead-checks-in-when-they-choose';
import { whyNotRemindThem } from './ignoring-it-should-be-enough';

export const NOT_TWICE_WITHIN_HOURS = 24;

export type WhyNot =
  | 'they have already finished'
  | 'they declined, and that is a decision rather than a delay'
  | 'they oversee this check-in rather than answering it'
  | 'there is no check-in of theirs to point them at'
  | 'they turned these emails off'
  | 'they were nudged in the last day'
  | 'their account here has been deactivated'
  | 'they asked us to stop reminding them, which the invitation told them they could do'
  | 'they lead this check-in and check in only when they choose';

export function whyNotNudge(party: APartyToNudge): WhyNot | null {
  /* FIRST, and before anything about check-in state. Somebody who has asked us to stop is done
     being reasoned about: whether they finished, whether they accepted and whether a day has
     passed are all questions about chasing them, and they have withdrawn the invitation to. */
  const asked = whyNotRemindThem(party);
  if (asked) return asked as WhyNot;
  if (party.managingOnly) return 'they oversee this check-in rather than answering it';
  if (checksInOnlyWhenTheyChoose(party)) return 'they lead this check-in and check in only when they choose';
  /* Somebody who has not accepted has a check-in row and no way into it, so the id being present
     is not the question for them — `whatToSendThem` decides what they get instead. */
  if (party.hasAccepted !== false && (!party.session || !party.session.id)) {
    return 'there is no check-in of theirs to point them at';
  }
  /* A party who has not accepted may have no session yet; the two states above have already
     been decided for anybody who does. */
  if (party.session?.status === 'COMPLETED') return 'they have already finished';
  if (party.session?.status === 'DECLINED') return 'they declined, and that is a decision rather than a delay';
  if (party.stillHere === false) return 'their account here has been deactivated';
  if (party.emailNotifications === false) return 'they turned these emails off';
  if (party.hoursSinceLastNudge !== null && party.hoursSinceLastNudge !== undefined
      && party.hoursSinceLastNudge < NOT_TWICE_WITHIN_HOURS) {
    return 'they were nudged in the last day';
  }
  return null;
}

export function worthNudging<T extends APartyToNudge>(parties: readonly T[]): T[] {
  return parties.filter((p) => whyNotNudge(p) === null);
}

/**
 * WHAT TO SEND SOMEBODY THE LEAD HAS ASKED TO REMIND.
 *
 * Two different mails, and sending the wrong one is worse than sending nothing:
 *
 *  - somebody who has accepted gets a nudge, which links to their own check-in;
 *  - somebody who has not gets their INVITATION again, because a nudge would link to a check-in
 *    they cannot open. Before this they got nothing at all: the query that found people to remind
 *    required a `userId`, so the person most worth chasing was the one the button could not reach,
 *    and the lead's only move was to add them a second time.
 */
export type WhatToSend = 'a nudge' | 'their invitation again' | 'nothing';

export function whatToSendThem(party: APartyToNudge): { send: WhatToSend; because?: WhyNot } {
  const why = whyNotNudge(party);
  if (why) return { send: 'nothing', because: why };
  return { send: party.hasAccepted === false ? 'their invitation again' : 'a nudge' };
}
