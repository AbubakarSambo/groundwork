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
  /** Their check-in for the session in question, if they have one. */
  session?: { id: string; status: SessionStatus } | null;
  /** True where the party exists to oversee rather than to answer. */
  managingOnly?: boolean;
  emailNotifications?: boolean | null;
  hoursSinceLastNudge?: number | null;
}

export const NOT_TWICE_WITHIN_HOURS = 24;

export type WhyNot =
  | 'they have already finished'
  | 'they declined, and that is a decision rather than a delay'
  | 'they oversee this check-in rather than answering it'
  | 'there is no check-in of theirs to point them at'
  | 'they turned these emails off'
  | 'they were nudged in the last day';

export function whyNotNudge(party: APartyToNudge): WhyNot | null {
  if (party.managingOnly) return 'they oversee this check-in rather than answering it';
  if (!party.session || !party.session.id) return 'there is no check-in of theirs to point them at';
  if (party.session.status === 'COMPLETED') return 'they have already finished';
  if (party.session.status === 'DECLINED') return 'they declined, and that is a decision rather than a delay';
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
