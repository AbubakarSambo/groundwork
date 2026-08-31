/**
 * WHOSE WORK A CREDENTIAL MAY SEE.
 *
 * Scopes answer what a token may DO. Nothing answered whom to, so a credential holding `findings:read`
 * read every finding in the organisation, and a sales integration and an engineering one were the
 * same integration under different names. For one design partner that is survivable; it is the
 * difference between one customer and a product you can sell twice.
 *
 * EMPTY MEANS EVERYTHING, and that is the only safe default. Every credential issued before this
 * existed means the whole organisation, and a single-team customer wants exactly that - so an empty
 * fence has to keep behaving as it always did rather than locking working integrations out on
 * deploy. The cost is that a fence is opt-in; the alternative is an outage for every existing user.
 */

export type Fence = { boundToPersonExternalIds: string[] };

export function isFenced(cred: Fence | null | undefined): boolean {
  return !!cred?.boundToPersonExternalIds?.length;
}

/**
 * May this credential act on this person's record?
 *
 * Unfenced: yes, always. Fenced: only for somebody named. There is no partial answer - a fence that
 * sometimes let a name through would be worse than none, because nobody could reason about it.
 */
export function mayTouch(cred: Fence | null | undefined, personExternalId: string | null | undefined): boolean {
  if (!isFenced(cred)) return true;
  if (!personExternalId) return false;
  return cred!.boundToPersonExternalIds.includes(personExternalId);
}

/**
 * A CHECK-IN IS REACHABLE ONLY IF EVERY PARTY IS INSIDE THE FENCE.
 *
 * Not "any" - every. A report is the synthesis of what several people independently said, so reading
 * one about a check-in containing somebody outside the fence hands over their account through a
 * credential that was never allowed near them. The strict rule costs a sales integration access to a
 * cross-functional check-in, which is the correct trade: the fence exists precisely because those two
 * groups should not read each other.
 */
export function mayReadGround(cred: Fence | null | undefined, participantExternalIds: (string | null)[]): boolean {
  if (!isFenced(cred)) return true;
  if (!participantExternalIds.length) return false;
  return participantExternalIds.every((id) => mayTouch(cred, id));
}

export const OUTSIDE_THE_FENCE =
  'This credential is limited to specific people, and this request is about somebody outside that '
  + 'list. Nothing is wrong with the credential - it was issued with a boundary on purpose.';
