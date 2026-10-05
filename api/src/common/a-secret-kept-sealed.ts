import * as crypto from 'crypto';

/**
 * A SECRET KEPT SEALED IN THE DATABASE (5 Oct 2026, Hafsah: Groundwork staff set Groundwork's own
 * WhatsApp number and its keys in the back office).
 *
 * A secret typed into the back office is sealed with AES-256-GCM before it is written, and opened
 * only at the moment it is used. The key is a server setting, `SETTINGS_ENCRYPTION_KEY`, never a
 * row: somebody who reads the database alone cannot read the secret. Any string works as the key;
 * it is stretched to 32 bytes with SHA-256. `openssl rand -base64 32` makes a good one.
 *
 * Changing the key makes every secret sealed with the old one unreadable. `open` then answers null,
 * which the caller treats as "set, but this server cannot read it", and the secret is typed again.
 */

const PREFIX = 'v1';
export const THE_KEY_SETTING = 'SETTINGS_ENCRYPTION_KEY';

function keyFrom(raw: string | undefined): Buffer | null {
  const k = raw?.trim();
  if (!k) return null;
  return crypto.createHash('sha256').update(k, 'utf8').digest();
}

/** Whether this server can seal a secret at all. */
export function canSeal(raw: string | undefined = process.env[THE_KEY_SETTING]): boolean {
  return !!keyFrom(raw);
}

/** The secret, sealed. Throws when the server has no key: a secret is never written in the clear. */
export function seal(plain: string, raw: string | undefined = process.env[THE_KEY_SETTING]): string {
  const key = keyFrom(raw);
  if (!key) throw new Error(`${THE_KEY_SETTING} is not set, so a secret cannot be saved.`);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':');
}

/** The secret, opened. Null when there is no key, the key changed, or the sealed text was altered. */
export function open(sealed: string | null | undefined, raw: string | undefined = process.env[THE_KEY_SETTING]): string | null {
  if (!sealed || typeof sealed !== 'string') return null;
  const key = keyFrom(raw);
  if (!key) return null;
  const [v, iv, tag, data] = sealed.split(':');
  if (v !== PREFIX || !iv || !tag || data === undefined) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
