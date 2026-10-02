import { PrismaService } from '../prisma/prisma.service';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';

/**
 * WHAT THE PLATFORM HAS ACTUALLY DONE: ONE SET OF PREDICATES, ONE CLOCK, ONE RATE.
 *
 * The staff console counted three different objects and called them all check-ins, and none of its
 * queries filtered anything: setup conversations were counted as accounts (schema.prisma says on
 * `CheckIn.isSetup` that a setup conversation "is NOT an account and must never be counted as one"),
 * and our own organisations were counted as customers. 484 sessions over 243 check-ins read as a
 * funnel; it was a grain mismatch.
 *
 * Three shaped predicates, because the three tables are shaped differently (planaudit_b.md A7):
 * `isSetup` is a CheckIn column, a CheckIn reaches its organisation through its ground, and a
 * UsageEvent's organisation is nullable - an event with no organisation is nobody's usage and is
 * not counted. The vocabulary is the product's: a Ground is a "check-in", a CheckIn is a "session"
 * (client/src/lib/one-word-for-the-thing.spec.ts), and a report is "released". Every number on the
 * panel counts one kind of thing and is labelled with that thing's word.
 */

/** A session somebody actually gave, on a customer's check-in. */
export const A_REAL_SESSION = { isSetup: false, ground: { organization: { isInternal: false } } } as const;

/**
 * A SESSION IS TIMED ONLY WHEN A PERSON FINISHED IT (item 19). The sweep closes a session somebody
 * walked away from, a day or more after they started, and marks it complete with
 * `closedReason: 'auto_closed'`. Timed with the rest, those sessions read as about 1,450 minutes
 * each, and on the test database they put the mean minutes a session takes at 110 where the
 * sessions people finished took 12.8. A measure of how long a session takes leaves them out. They
 * are still sessions completed, and every count still counts them.
 */
export { CLOSED_BY_THE_CLOCK };

/** A check-in belonging to a customer. */
export const A_REAL_CHECK_IN = { organization: { isInternal: false } } as const;

/**
 * Usage by a customer. UsageEvent carries an `organizationId` and no relation, so this is a
 * predicate over ids: our own organisations' ids are read once and excluded.
 */
export async function aRealUsageEvent(prisma: PrismaService): Promise<{ organizationId: { not: null; notIn: string[] } }> {
  const ours = await prisma.organization.findMany({ where: { isInternal: true }, select: { id: true } });
  return { organizationId: { not: null, notIn: ours.map((o) => o.id) } };
}

/**
 * HOW MANY OF EACH USAGE EVENT CUSTOMERS MADE, AN EVENT WITH NO ORGANISATION FOUND BY ITS CHECK-IN
 * (item 19). A session finishing writes CHECK_IN_COMPLETED with its check-in and no organisation, so
 * the rule above, "an event with no organisation is nobody's usage", dropped every one of them: the
 * Usage tab listed three kinds of event and never "Check in completed", which on the test database
 * is 6,325 events. An event with no organisation now belongs to its check-in's organisation, and is
 * counted when that is a customer. An event with neither (the /start page's model calls) is still
 * nobody's usage.
 */
export async function usageEventsByCustomers(prisma: PrismaService, since: Date | null): Promise<Record<string, number>> {
  const byACustomer = await aRealUsageEvent(prisma);
  const [withAnOrganisation, byTheirCheckIn] = await Promise.all([
    prisma.usageEvent.groupBy({ by: ['type'], where: { ...byACustomer, ...inRange('createdAt', since) }, _count: { id: true } }),
    prisma.usageEvent.groupBy({ by: ['type', 'groundId'], where: { organizationId: null, groundId: { not: null }, ...inRange('createdAt', since) }, _count: { id: true } }),
  ]);
  const groundIds = [...new Set(byTheirCheckIn.map((r) => r.groundId as string))];
  const customers = groundIds.length
    ? await prisma.ground.findMany({ where: { id: { in: groundIds }, ...A_REAL_CHECK_IN }, select: { id: true } })
    : [];
  const aCustomers = new Set(customers.map((g) => g.id));
  const totals: Record<string, number> = {};
  for (const r of withAnOrganisation) totals[r.type] = (totals[r.type] ?? 0) + r._count.id;
  for (const r of byTheirCheckIn) if (aCustomers.has(r.groundId as string)) totals[r.type] = (totals[r.type] ?? 0) + r._count.id;
  return totals;
}

/** A customer. */
export const A_CUSTOMER = { isInternal: false } as const;

/**
 * ONE DATE RANGE FOR THE WHOLE PANEL. Every percentage and mean on the panel was over all time with
 * no range and no sample size anywhere. The panel now carries one control, and every query
 * respects it. `null` is "since the beginning", said rather than implied.
 */
export const RANGES = ['7d', '30d', '90d', 'all'] as const;
export type Range = (typeof RANGES)[number];

export function sinceFor(range: string | undefined, now = new Date()): Date | null {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
  return days == null ? null : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function inRange(field: string, since: Date | null): Record<string, unknown> {
  return since ? { [field]: { gte: since } } : {};
}

/**
 * A RATE CARRIES ITS DENOMINATOR. "62%" alone is a number with no size; "62% of 34" is a finding.
 * Null pct when nothing is in the denominator, never zero: zero of nothing is not zero percent.
 */
export interface Rate {
  pct: number | null;
  of: number;
  n: number;
}

export function aRate(n: number, of: number): Rate {
  return { pct: of > 0 ? Math.round((Math.min(n, of) / of) * 100) : null, of, n };
}

/**
 * A MEAN OVER FEW IS ROUNDED. A one-decimal mean over eleven rows claims a precision the sample
 * does not have. Under thirty, the mean is a whole number; the sample size travels with it.
 */
export const A_SMALL_SAMPLE = 30;

export function aMean(value: number | null, n: number): { value: number | null; n: number } {
  if (value == null) return { value: null, n };
  return { value: n < A_SMALL_SAMPLE ? Math.round(value) : Math.round(value * 10) / 10, n };
}

/**
 * THE SESSION-TWO RATE, OVER THOSE WHOSE SESSION TWO WAS DUE.
 *
 * It divided session-2 completions by session-1 completions with no cohort matching, so people
 * whose second session was not yet due sat in the denominator; it read permanently low and could
 * not reach 100. The cohort is: session-1 completions whose SAME PARTICIPANT has a session-2 row
 * with an `availableFrom` in the past. `availableFrom` is a column on CheckIn, not the participant
 * (planaudit_b.md A8). A null `availableFrom` means "not yet due" and drops out. SEQUENTIAL and
 * ONE_TIME cadences have no schedule to be due against, and are excluded by name rather than by
 * the accident of their null date.
 */
export const NO_SCHEDULE_TO_BE_DUE_AGAINST = ['SEQUENTIAL', 'ONE_TIME'] as const;

export async function session2RateOfThoseDue(prisma: PrismaService, since: Date | null, now = new Date()): Promise<Rate> {
  const due = await prisma.checkIn.findMany({
    where: {
      ...A_REAL_SESSION,
      sessionNumber: 1,
      status: 'COMPLETED',
      ...inRange('completedAt', since),
      ground: { ...A_REAL_CHECK_IN, cadence: { notIn: [...NO_SCHEDULE_TO_BE_DUE_AGAINST] as any } },
      participant: { checkIns: { some: { sessionNumber: 2, availableFrom: { lte: now } } } },
    },
    select: { participant: { select: { checkIns: { where: { sessionNumber: 2, status: 'COMPLETED' }, select: { id: true } } } } },
  });
  const came = due.filter((c) => c.participant.checkIns.length > 0).length;
  return aRate(came, due.length);
}
