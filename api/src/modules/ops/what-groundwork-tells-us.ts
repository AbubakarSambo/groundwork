import { createHmac, timingSafeEqual } from 'crypto';

/**
 * CHECKING THAT AN EVENT REALLY CAME FROM GROUNDWORK.
 *
 * Written here rather than imported, and that is the point twice over. The
 * boundary forbids this back office reaching into a product module — and more
 * usefully, a customer receiving these writes exactly this, from the
 * documentation, without our source. If the documented scheme is wrong or
 * unclear, this is where we find out, because we are the first ones outside it.
 *
 * The timestamp is INSIDE the signature. Anybody replaying an old delivery could
 * otherwise change it freely and the signature would still verify, which defeats
 * the point of having one.
 *
 * A FAILURE IS RECORDED, NOT DROPPED. Somebody sending us badly signed events is
 * a thing to know about, and a silent rejection tells nobody here.
 */

/** Five minutes. Long enough for a slow delivery, short enough that a replay is useless. */
export const TOLERANCE_SECONDS = 300;

export function isReallyFromGroundwork(
  rawBody: string,
  header: string | undefined,
  secret: string,
  now = new Date(),
): { ok: true } | { ok: false; because: string } {
  if (!header) return { ok: false, because: 'no signature header' };

  const t = /(?:^|,)t=(\d+)/.exec(header)?.[1];
  /*
   * EVERY `v1`, BECAUSE A ROTATION SENDS TWO.
   *
   * This read the first and only the first, so the day the product rotated its signing secret this
   * back office would have started refusing its own deliveries — half the time, depending on which
   * signature happened to come first. That is the whole reason this system runs on the product: a
   * receiver we wrote, failing the way a customer's would.
   */
  const offered = [...header.matchAll(/(?:^|,)v1=([a-f0-9]+)/g)].map((m) => m[1]);
  if (!t || offered.length === 0) return { ok: false, because: 'signature header is not in the documented shape' };

  const age = Math.abs(Math.floor(now.getTime() / 1000) - Number(t));
  if (age > TOLERANCE_SECONDS) return { ok: false, because: `signed ${age} seconds ago, outside the window` };

  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');

  /*
   * Constant time. A comparison that returns early on the first wrong character
   * tells somebody guessing how much of their guess was right, one request at a
   * time.
   */
  const a = Buffer.from(expected, 'hex');
  const matched = offered.some((v1) => {
    const b = Buffer.from(v1, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  });
  if (!matched) return { ok: false, because: 'signature does not match' };

  return { ok: true };
}

/**
 * What an event means for this company, or null where it means nothing yet.
 *
 * DELIBERATELY SMALL. Nine kinds are announced and this reads three, because
 * writing a handler for an event nobody uses produces code that is never
 * exercised and rots silently — the same disease as a route no screen reaches.
 * The rest are recorded and left, which is honest and is not the same as
 * ignoring them: the payload is kept whole, so anything decided later can be
 * applied to what already arrived.
 */
export function whatItMeansForUs(kind: string, payload: Record<string, unknown>): string | null {
  switch (kind) {
    case 'session.completed':
    case 'round.completed':
      /* The one that matters most: a report exists and nobody here would
         otherwise know until they went looking. */
      return `A round finished on check-in ${short(payload.groundId)} - a report is ready.`;

    case 'checkin.completed':
      return `Somebody finished their check-in on ${short(payload.groundId)}.`;

    case 'blocker.raised':
    case 'blocker.escalated':
      /* A fact and a pointer. Never who, never what they said — that is the
         webhook's own rule and this must not go looking for more. */
      return `Something is blocked on check-in ${short(payload.groundId)}, and somebody is waiting.`;

    default:
      return null;
  }
}

const short = (v: unknown) => (typeof v === 'string' ? v.slice(0, 8) : 'one of ours');
