/**
 * A GUEST'S QUESTIONS ARE KEPT APART FROM EVERYBODY ON THE LIST (decision 36).
 *
 * A guest from another organisation is never added to the host's list of people, so their questions
 * to Ask Groundwork cannot be kept against an entry on it. They are kept in the same table as
 * everybody else's, under a key made from their own account, and the key says it is a guest's.
 *
 * WHY THE KEY IS FENCED, NOT ONLY CHOSEN. An entry on the list carries whatever external id the
 * directory or the developer API gave it, and nothing stops somebody giving an entry the id
 * "guest:<an account id>". Whoever was linked to that entry would then read the guest's questions
 * as their own history. So the reads that look turns up by an entry's external id treat a guest's
 * key as nobody's: the assistant keeps and recalls nothing under it, the member's panel shows
 * nothing under it, and the detectors that read what people asked leave it out. Only the guest's
 * own path, which starts from their signed-in account and never from an entry, reads it.
 */
export const A_GUESTS_KEY_BEGINS = 'guest:';

/** Where a guest's own questions and answers are kept, made from their own account and nothing else. */
export function aGuestsOwnKey(userId: string): string {
  return `${A_GUESTS_KEY_BEGINS}${userId}`;
}

/** True for a key that belongs to a guest, whoever it is attached to. */
export function isAGuestsKey(externalId: string | null | undefined): boolean {
  return typeof externalId === 'string' && externalId.startsWith(A_GUESTS_KEY_BEGINS);
}
