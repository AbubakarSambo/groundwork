import type { PrismaService } from '../prisma/prisma.service';
import { whoIsAwayOn } from './who-is-away';
import type { DecidesNow } from './who-may-decide';

/**
 * A REQUEST THAT WAITS TOO LONG IS PASSED ON (decision 85; step 4 of the build list in
 * docs/suites-against-the-workflow-model.md).
 *
 * Once a day (a-request-waits-too-long.cron.ts), for each organisation whose admin set a number of
 * working days on leave, time sheets or spending (the-approval-steps.ts), each request still waiting is
 * looked at. When it has waited that many working days for the same person without an answer, or that
 * person is on approved leave that day (who-is-away.ts), it moves to the next rule on the same step's
 * list (decision 85's example: "to the department head after two working days"), and whoever that
 * names is told on WhatsApp and reads it on Today.
 *
 * NOTHING CHANGES BY ITSELF. A suite with no number of days set is never passed on, not even when the
 * approver is away: the admin turns both on together.
 *
 * Working days are Monday to Friday, as the leave suite counts them. Public holidays are not known.
 */

const DAY = 86_400_000;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** Working days after the day `since` up to and including `today`. Waiting since Monday, it is 2 on Wednesday. */
export function workingDaysSince(since: Date, today: Date): number {
  let n = 0;
  const end = new Date(`${dayOf(today)}T00:00:00.000Z`).getTime();
  for (let t = new Date(`${dayOf(since)}T00:00:00.000Z`).getTime() + DAY; t <= end; t += DAY) {
    const w = new Date(t).getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Why a request is passed on, or null when it is not. */
export type WhyPassedOn = { because: 'waited'; days: number } | { because: 'away' };

/**
 * Whether a request is passed on today: it has waited the set number of working days for the person
 * it waits for, or that person is on approved leave today. An admin, as a group, is never "away".
 */
export async function whyPassOn(
  prisma: PrismaService, organizationId: string, now: DecidesNow, since: Date, today: Date, escalateAfter: number | undefined,
): Promise<WhyPassedOn | null> {
  if (!escalateAfter) return null;
  const waited = workingDaysSince(since, today);
  if (waited >= escalateAfter) return { because: 'waited', days: waited };
  if (now.who.kind !== 'admin') {
    const away = await whoIsAwayOn(prisma, [now.who.userId], organizationId, today).catch(() => new Map());
    if (away.has(now.who.userId)) return { because: 'away' };
  }
  return null;
}
