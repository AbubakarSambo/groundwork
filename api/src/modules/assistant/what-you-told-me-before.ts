/**
 * HOW LONG AGO SOMETHING WAS SAID, IN WORDS SOMEBODY WOULD USE.
 *
 * "Three weeks ago" rather than a timestamp. The point of recall is that it sounds like a colleague
 * remembering, and a colleague does not say "on 2026-08-07T14:22:11Z".
 */
export function howLongAgo(then: Date, now: Date): string {
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'earlier today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 31) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'last month';
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * WHERE ONE CONVERSATION ENDS AND THE NEXT BEGINS.
 *
 * There is no session id on a turn and deliberately so: a panel is opened and closed constantly,
 * and a session that ended when somebody navigated would make "earlier in this conversation" a lie
 * roughly every time. A gap is what people actually mean - come back after lunch and it is a new
 * conversation, come back after thirty seconds and it is the same one.
 *
 * The number is a judgement rather than a measurement, and it is here in one place so it can be
 * argued with rather than being spread through three queries.
 */
export const SESSION_GAP_MINUTES = 45;

export function isSameSession(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= SESSION_GAP_MINUTES * 60_000;
}

/**
 * Split turns, newest first, into "this conversation" and "before that".
 *
 * Both halves are needed and they are not the same thing: the current session is context for what
 * is being said now, and prior sessions are memory. Answering "did I mention X" from the current
 * session alone would be a product with no memory pretending to have one.
 */
export function splitBySession<T extends { createdAt: Date }>(
  turnsNewestFirst: T[],
  now: Date,
): { current: T[]; earlier: T[] } {
  const current: T[] = [];
  const earlier: T[] = [];
  let boundary = now;
  let broken = false;

  for (const t of turnsNewestFirst) {
    if (!broken && isSameSession(t.createdAt, boundary)) {
      current.push(t);
      boundary = t.createdAt;
    } else {
      broken = true;
      earlier.push(t);
    }
  }
  return { current, earlier };
}
