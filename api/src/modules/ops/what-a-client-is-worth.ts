/**
 * What a paying client is worth, and how much of that has been earned.
 *
 * Two rules, and both exist because the obvious simplification is wrong.
 *
 * A $25 client is not a $1,000 client. Counting clients treats them as if they
 * were, and a system used as evidence in an equity conversation cannot do that.
 * So value is banded, and the bands are CONFIGURABLE - they are a judgement
 * about what a client is worth to this company at this size, and that judgement
 * will change.
 *
 * And a client who paid once is not a client who stayed. Credit is earned as
 * they stay: nothing at first payment, half at three months of repeat paying,
 * all of it at six. Twelve is tracked as a further milestone rather than more
 * credit, because by then the question is retention rather than acquisition.
 *
 * Everything here computes from CASH ACTUALLY COLLECTED. Projected revenue is
 * shown for pipeline and can never earn a credit - a forecast that earns credit
 * is a forecast somebody has a reason to inflate.
 */

export interface ValueBand {
  /** Inclusive lower bound of monthly value, in the reporting currency. */
  fromMonthly: number;
  /** Exclusive upper bound. Null means no ceiling. */
  toMonthly: number | null;
  credits: number;
}

/** The starting framework. Stored in settings, editable by an admin. */
export const DEFAULT_VALUE_BANDS: ValueBand[] = [
  { fromMonthly: 0, toMonthly: 100, credits: 0.25 },
  { fromMonthly: 100, toMonthly: 500, credits: 0.5 },
  { fromMonthly: 500, toMonthly: 1000, credits: 1 },
  { fromMonthly: 1000, toMonthly: 2500, credits: 2 },
  { fromMonthly: 2500, toMonthly: null, credits: 3 },
];

/** How much of a client's credit has been earned, by how long they have stayed. */
export const RETENTION_EARNING = [
  { months: 0, share: 0, label: 'first payment' },
  { months: 3, share: 0.5, label: 'three months repeat-paying' },
  { months: 6, share: 1, label: 'six months repeat-paying' },
] as const;

/** A milestone worth seeing, which earns nothing further. */
export const FURTHER_MILESTONE_MONTHS = 12;

export function creditsForMonthlyValue(monthly: number, bands: ValueBand[] = DEFAULT_VALUE_BANDS): number {
  const band = bands.find(
    (b) => monthly >= b.fromMonthly && (b.toMonthly === null || monthly < b.toMonthly),
  );
  return band?.credits ?? 0;
}

/**
 * How many whole months of repeat paying there have been.
 *
 * From the FIRST payment to the last, not to today: a client who paid twice in
 * March and stopped has one month of retention for ever, and letting the clock
 * run on would quietly turn them into a six-month client by September.
 */
export function monthsRetained(paymentDates: Date[]): number {
  if (paymentDates.length < 2) return 0;

  const sorted = [...paymentDates].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const months =
    (last.getFullYear() - first.getFullYear()) * 12 +
    (last.getMonth() - first.getMonth()) -
    (last.getDate() < first.getDate() ? 1 : 0);

  return Math.max(0, months);
}

export interface EarnedCredit {
  /** What this client would be worth fully retained. */
  possible: number;
  /** What has actually been earned. */
  earned: number;
  monthsRetained: number;
  /** The band and milestone in words, so a number on a screen explains itself. */
  says: string;
}

export function earnedCredit(
  payments: Array<{ amount: number; paidAt: Date }>,
  bands: ValueBand[] = DEFAULT_VALUE_BANDS,
): EarnedCredit {
  if (payments.length === 0) {
    return { possible: 0, earned: 0, monthsRetained: 0, says: 'Nothing paid yet' };
  }

  /*
   * The monthly value is the average of what actually arrived, not the contract
   * value and not the last payment. A client on $1,000 who paid $250 once is a
   * $250 client until more arrives.
   */
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const months = monthsRetained(payments.map((p) => p.paidAt));
  const monthly = total / Math.max(1, months + 1);

  const possible = creditsForMonthlyValue(monthly, bands);
  const milestone = [...RETENTION_EARNING].reverse().find((r) => months >= r.months)!;
  const earned = possible * milestone.share;

  return {
    possible,
    earned,
    monthsRetained: months,
    says:
      earned === 0
        ? `${possible} possible, none earned yet - ${milestone.label}`
        : `${earned} of ${possible} earned - ${milestone.label}`,
  };
}
