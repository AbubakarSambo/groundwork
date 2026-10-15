/**
 * ONE NUMBER PER CONVERSATION (survey item 8).
 *
 * An organisation can have two WhatsApp numbers in play: Groundwork's, which every organisation can
 * use, and its own, once connected. Replies went out on the organisation's own number even when the
 * person had written to Groundwork's, so they came from a number the person never wrote to, which
 * WhatsApp is likely to refuse; and the 24-hour window was measured per person, though WhatsApp
 * measures it per business number.
 *
 * So every message that comes in is claimed with the number it came in on and who sent it, and that
 * claim is what says which number the person last wrote to, and when.
 */
export type WhichNumber = 'ours' | 'theirs';

/** The claim key for one message that came in: which number, who sent it, and WhatsApp's own id. */
export function anInboundKey(via: WhichNumber, phone: string, messageId: string): string {
  return `${via}:${phone}:${messageId}`;
}

/** The start every claim on this number from this person shares, for finding the latest one. */
export function inboundKeysFrom(via: WhichNumber, phone: string): string {
  return `${via}:${phone}:`;
}

/** Which number a claim was made on; null for a claim made before this was recorded. */
export function whichNumberOf(key: string | null | undefined): WhichNumber | null {
  const head = (key ?? '').split(':')[0];
  return head === 'ours' || head === 'theirs' ? head : null;
}
