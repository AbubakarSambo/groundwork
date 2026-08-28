import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

/**
 * THE SIGNATURE, AND THE TIMESTAMP INSIDE IT.
 *
 * HMAC-SHA256 over the raw body, with the timestamp part of what is signed rather than a separate
 * header. If the timestamp sat outside the signature, anybody replaying an old request could change
 * it freely and the signature would still verify - which defeats the whole point of having one.
 *
 * The receiver checks the age and rejects anything beyond a few minutes. That is their side, and it
 * is documented for them rather than enforced here, because we are the sender.
 */
export const SIGNATURE_HEADER = 'X-Groundwork-Signature';
export const TIMESTAMP_HEADER = 'X-Groundwork-Timestamp';
export const EVENT_ID_HEADER = 'X-Groundwork-Event-Id';

export function newSecret(): string {
  return `gwh_${randomBytes(32).toString('base64url')}`;
}

/** `t=<unix seconds>,v1=<hex hmac>` - one header a receiver can parse without a library. */
export function sign(rawBody: string, secret: string, timestampSeconds: number): string {
  const signed = `${timestampSeconds}.${rawBody}`;
  const mac = createHmac('sha256', secret).update(signed).digest('hex');
  return `t=${timestampSeconds},v1=${mac}`;
}

/**
 * Provided so the documentation can show a receiver exactly how to check, and so the test suite
 * verifies against the same code a customer would write rather than against itself.
 */
export function verify(rawBody: string, header: string, secret: string, toleranceSeconds = 300, now = new Date()): boolean {
  const t = /(?:^|,)t=(\d+)/.exec(header)?.[1];
  const v1 = /(?:^|,)v1=([a-f0-9]+)/.exec(header)?.[1];
  if (!t || !v1) return false;

  const age = Math.abs(Math.floor(now.getTime() / 1000) - Number(t));
  if (age > toleranceSeconds) return false;

  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  /* Constant time, so the comparison does not leak the signature one byte at a time. */
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * WHEN TO TRY AGAIN. Exponential, capped, and dead after roughly a day.
 *
 * The first retry is quick because most failures are a deploy restarting; the later ones are far
 * apart because a receiver that has been down for six hours is not coming back in ninety seconds,
 * and hammering it is how we end up in somebody's firewall rules.
 */
export const BACKOFF_SECONDS = [30, 120, 600, 1800, 7200, 21600, 43200];

export function nextAttemptAfter(attempts: number, now: Date): Date | null {
  if (attempts >= BACKOFF_SECONDS.length) return null;
  return new Date(now.getTime() + BACKOFF_SECONDS[attempts] * 1000);
}
