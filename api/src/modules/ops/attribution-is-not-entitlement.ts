/**
 * What somebody is owed, which is not what somebody created.
 *
 * Attribution establishes what happened. The agreement establishes what
 * somebody is entitled to. Inferring one from the other is the mistake this
 * whole file exists to prevent - and it is an easy mistake, because the
 * originator field is sitting right there and 40% is a number somebody has said
 * out loud.
 *
 * So being recorded as originator creates NO entitlement. The entitlement comes
 * from that person's configured agreement, and where there is no agreement the
 * answer is nothing rather than the default. Assuming otherwise is how somebody
 * gets told they are owed money they never agreed to.
 */

/** The standing split for a technology client, as it was described. */
export const TECHNOLOGY_REVENUE_MODEL = {
  originator: 40,
  technicalDeliveryAndAdministration: 30,
  groundworkCore: 30,
  /** The originator share runs for this long from the first payment. */
  originatorMonths: 6,
} as const;

export interface Agreement {
  originatorSharePercent: number | null;
  originatorShareMonths: number | null;
}

export interface PaymentForShare {
  amount: number;
  paidAt: Date;
}

export interface ShareResult {
  /** Cash the originator's agreement entitles them to, from these payments. */
  originatorShare: number;
  /** What it was computed from, so the figure can be checked. */
  eligibleCash: number;
  percent: number | null;
  months: number | null;
  says: string;
}

/**
 * The originator's share of cash actually collected.
 *
 * Only payments inside the agreed window count, and the window runs from the
 * FIRST payment rather than from the deal being signed - a client who signs in
 * March and starts paying in July has six months from July, and dating it from
 * the signature would quietly shorten what somebody agreed to.
 */
export function originatorShareOf(
  payments: PaymentForShare[],
  agreement: Agreement | null,
): ShareResult {
  if (!agreement || agreement.originatorSharePercent === null) {
    return {
      originatorShare: 0,
      eligibleCash: 0,
      percent: null,
      months: null,
      /*
       * Said as an absence of an agreement rather than as a zero. "0" reads as
       * "you earned nothing"; this reads as "nobody has recorded what you agreed",
       * and those are different conversations.
       */
      says: 'No revenue share is recorded in this person’s agreement.',
    };
  }

  if (payments.length === 0) {
    return {
      originatorShare: 0,
      eligibleCash: 0,
      percent: agreement.originatorSharePercent,
      months: agreement.originatorShareMonths,
      says: 'Nothing has been paid yet.',
    };
  }

  const sorted = [...payments].sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
  const first = sorted[0].paidAt;
  const months = agreement.originatorShareMonths;

  const withinWindow = (p: PaymentForShare) => {
    if (months === null) return true;
    const cutoff = new Date(first);
    cutoff.setMonth(cutoff.getMonth() + months);
    return p.paidAt < cutoff;
  };

  const eligible = sorted.filter(withinWindow);
  const eligibleCash = eligible.reduce((sum, p) => sum + p.amount, 0);
  const share = (eligibleCash * agreement.originatorSharePercent) / 100;

  const excluded = sorted.length - eligible.length;

  return {
    originatorShare: Math.round(share * 100) / 100,
    eligibleCash,
    percent: agreement.originatorSharePercent,
    months,
    /* Money reads as money, in the sentence that justifies the figure. */
    says:
      excluded === 0
        ? `${agreement.originatorSharePercent}% of $${eligibleCash.toLocaleString()} collected`
        : `${agreement.originatorSharePercent}% of $${eligibleCash.toLocaleString()} collected in the first ${months} months; ${excluded} later payment${excluded === 1 ? '' : 's'} outside the window`,
  };
}
