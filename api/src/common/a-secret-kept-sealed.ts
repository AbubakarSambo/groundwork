import * as crypto from 'crypto';

/**
 * A SECRET KEPT SEALED IN THE DATABASE (5 Oct 2026, Hafsah: Groundwork staff set Groundwork's own
 * WhatsApp number and its keys in the back office).
 *
 * A secret typed into the back office is sealed with AES-256-GCM before it is written, and opened
 * only at the moment it is used. The key is a server setting, `SETTINGS_ENCRYPTION_KEY`, never a
 * row: somebody who reads the database alone cannot read the secret.
 *
 * THE KEY. 32 bytes written in base64 or hex is used as it is (`openssl rand -base64 32` makes one).
 * Any other string of at least 32 characters is stretched to 32 bytes with SHA-256. Anything shorter
 * is refused: a short word is a key somebody can guess.
 *
 * EACH SECRET IS BOUND TO ITS PLACE. The caller passes `aad`, for example
 * "whatsapp.groundworksNumber:accessToken", as GCM's additional data. A sealed access token copied
 * into the app secret's place does not open. Nothing had been saved anywhere when this was added, so
 * no older seal without it exists and none needs to be moved.
 *
 * Changing the key makes every secret sealed with the old one unreadable. `open` then answers null,
 * which the caller treats as "set, but this server cannot read it", and the secret is typed again.
 */

const PREFIX = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;
export const THE_KEY_SETTING = 'SETTINGS_ENCRYPTION_KEY';
export const MIN_KEY_CHARACTERS = 32;

export type WhyNoKey = 'missing' | 'too short';

function keyFrom(raw: string | undefined): Buffer | null {
  const k = raw?.trim();
  if (!k) return null;
  if (/^[0-9a-fA-F]{64}$/.test(k)) return Buffer.from(k, 'hex');
  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(k)) {
    const b = Buffer.from(k.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (b.length === 32) return b;
  }
  if (k.length >= MIN_KEY_CHARACTERS) return crypto.createHash('sha256').update(k, 'utf8').digest();
  return null;
}

/** Why this server cannot seal a secret, or null when it can. */
export function whyNoKey(raw: string | undefined = process.env[THE_KEY_SETTING]): WhyNoKey | null {
  if (!raw?.trim()) return 'missing';
  return keyFrom(raw) ? null : 'too short';
}

/** Whether this server can seal a secret at all. */
export function canSeal(raw: string | undefined = process.env[THE_KEY_SETTING]): boolean {
  return !!keyFrom(raw);
}

/** The secret, sealed and bound to `aad`. Throws when the server has no usable key: a secret is never written in the clear. */
export function seal(plain: string, aad: string, raw: string | undefined = process.env[THE_KEY_SETTING]): string {
  const key = keyFrom(raw);
  if (!key) throw new Error(`${THE_KEY_SETTING} is ${whyNoKey(raw) === 'missing' ? 'not set' : 'too short'}, so a secret cannot be saved.`);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':');
}

/** The secret, opened. Null when there is no key, the key changed, the place differs, or the sealed text was altered. */
export function open(sealed: string | null | undefined, aad: string, raw: string | undefined = process.env[THE_KEY_SETTING]): string | null {
  if (!sealed || typeof sealed !== 'string') return null;
  const key = keyFrom(raw);
  if (!key) return null;
  const [v, ivText, tagText, data, ...rest] = sealed.split(':');
  if (v !== PREFIX || !ivText || !tagText || data === undefined || rest.length) return null;
  const iv = Buffer.from(ivText, 'base64');
  const tag = Buffer.from(tagText, 'base64');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
