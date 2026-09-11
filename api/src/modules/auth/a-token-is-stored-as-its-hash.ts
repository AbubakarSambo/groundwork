import { createHash } from 'crypto';

/**
 * AN EMAILED TOKEN IS STORED AS ITS HASH.
 *
 * Every set-password, reset and magic-link token sat in email_verification_tokens in plaintext, so a
 * read of the table was a set of working links into other people's accounts (fix plan A10). The raw
 * token goes into the email and nowhere else; the row holds its SHA-256 and lookups hash first. The
 * OTP and the API client secret already did this; this is the same rule for the third kind.
 *
 * Unsalted on purpose: the token is 32 random bytes, so there is nothing to guess and no dictionary
 * to build. A salt would only stop the unique lookup working.
 */
export const hashed = (raw: string): string => createHash('sha256').update(raw).digest('hex');
