import { canSeal, open, seal, whyNoKey } from '../../common/a-secret-kept-sealed';

/**
 * THE KEYS OF AN ORGANISATION'S OWN WHATSAPP NUMBER ARE KEPT SEALED (piece 5, A).
 *
 * Its access token sends messages as the organisation, and its app secret is what proves a message really came from Meta. Both were
 * stored as typed. They are now sealed with the server's key before they are written, the same way the back office keeps Groundwork's
 * own number's (a-secret-kept-sealed.ts), opened only at the moment of use, and never served back (the connection is read without them;
 * only the last four letters of the token are shown, to tell two tokens apart).
 *
 * EACH IS BOUND TO ITS ORGANISATION AND ITS PLACE, by GCM's additional data: a sealed token copied into another organisation's row, or
 * into the app secret's place, does not open.
 *
 * A row saved before this carries its keys as typed. They are read as they are, and sealed the next time they are saved or when the
 * server starts with a key, so nothing already connected stops working.
 */
export type TheirKey = 'accessToken' | 'appSecret';

const aad = (organizationId: string, field: TheirKey) => `whatsapp.organisation:${organizationId}:${field}`;

/** Whether a stored value is a sealed one. */
export const isSealed = (v: string | null | undefined): boolean => typeof v === 'string' && /^v1:[^:]+:[^:]+:[^:]*$/.test(v);

export const theServerCanKeepSecrets = (): boolean => canSeal();
export const whyItCannot = () => whyNoKey();

/** The key as it is written to the row. Throws when the server has no key: a secret is never written in the clear. */
export function sealTheirKey(organizationId: string, field: TheirKey, plain: string): string {
  return seal(plain, aad(organizationId, field));
}

/** The key as it is used. A value kept as typed is used as it is; a sealed one this server cannot open is empty, so nothing is sent with it. */
export function theirKey(row: { organizationId: string; accessToken: string; appSecret: string }, field: TheirKey): string {
  const stored = row[field];
  if (!isSealed(stored)) return stored ?? '';
  return open(stored, aad(row.organizationId, field)) ?? '';
}

export const THE_SERVER_HAS_NO_KEY = 'This server has no key to keep secrets with, so the number cannot be saved yet. Whoever runs the hosting sets SETTINGS_ENCRYPTION_KEY, and then it can.';

/** What is kept against a send that was not made because the token is sealed and cannot be opened. For the record, not for the admin. */
export const THEIR_KEYS_CANNOT_BE_OPENED = 'Not sent: the organisation\'s own WhatsApp access token cannot be opened on this server.';
/** What the organisation's admin reads when its keys cannot be opened. */
export const KEYS_NEED_TYPING_AGAIN = "Your number's keys need to be typed in again. Nothing is sent from your number until they are.";
