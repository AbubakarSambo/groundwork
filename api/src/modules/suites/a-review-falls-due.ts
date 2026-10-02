/**
 * A REVIEW THAT FALLS DUE FROM INSIDE THE PRODUCT (week 11 of docs/weekly-plan.md).
 *
 * Until now a review fell due only when the organisation's own system said so (the `EvaluationDue`
 * table the daily reminder reads). Two more things make one fall due, and both are only a PROPOSAL:
 *
 *   1. a check-in about one person ends, and the person carries on (the lead's yes is what starts it);
 *   2. the date the organisation set for reviews comes round ("Every 6 months" on the suite).
 *
 * Decided for Hafsah to confirm: the product proposes the review to whoever runs it, and only their
 * yes starts it. Nothing here starts a review, and nothing here sends anything to the person the
 * review is about. A proposal is a row in `EvaluationDue`, marked by where it came from, which the
 * reviews board already shows with "Start it" for the person who writes the review.
 */

/** Where a proposed date came from, so a wrong one can be traced rather than argued about. */
export const PROPOSED_BY_GROUNDWORK = {
  aCheckInEnded: 'groundwork:a-check-in-ended',
  theOrganisationsDate: 'groundwork:the-organisations-date',
} as const;

export const theKindOfAProposedReview = {
  aCheckInEnded: 'after a check-in about one person',
  theOrganisationsDate: 'on the date the organisation set',
} as const;

/** The check-ins that are about one person's work, where a review can follow. */
export const SCENARIOS_ABOUT_ONE_PERSON = ['NEW_HIRE', 'NEW_MANAGER', 'NEW_ADVISOR', 'PIP', 'CONTRACT_RENEWAL', 'RECOGNITION'] as const;

/** Endings where the person does not carry on in the role, so a review would be about nothing. */
export const ENDINGS_WHERE_THEY_DO_NOT_CARRY_ON = ['EXIT', 'SEPARATE', 'SEPARATED', 'END', 'STOP', 'ENDED', 'NOT_PROCEEDING', 'PREDECESSOR_GONE'] as const;

export function isProposedByGroundwork(source: string | null | undefined): boolean {
  return !!source && (Object.values(PROPOSED_BY_GROUNDWORK) as string[]).includes(source);
}

/**
 * How many months "Every 6 months", "Every 3 months", "Every year" or "Every 12 months" mean. Null for
 * anything else: a date nobody can read is a date nobody proposes from.
 */
export function monthsIn(every: string | null | undefined): number | null {
  const text = (every ?? '').trim().toLowerCase();
  if (!text) return null;
  const n = /every\s+(\d{1,2})\s+months?/.exec(text);
  if (n) { const m = Number(n[1]); return m >= 1 && m <= 36 ? m : null; }
  if (/every\s+(year|12\s+months)/.test(text)) return 12;
  if (/every\s+(six|6)\s+months|twice a year/.test(text)) return 6;
  if (/every\s+(three|3)\s+months|quarter/.test(text)) return 3;
  return null;
}

export function addMonths(d: Date, months: number): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return out;
}

/** What the person who runs reviews reads beside a proposed one, in plain full sentences. */
export function theProposalSentence(source: string, firstName: string): string | null {
  const name = firstName.trim() || 'this person';
  if (source === PROPOSED_BY_GROUNDWORK.aCheckInEnded) {
    return `Groundwork suggests a review for ${name}, because a check-in about ${name}’s work has ended. Nothing is sent to ${name} unless you say yes.`;
  }
  if (source === PROPOSED_BY_GROUNDWORK.theOrganisationsDate) {
    return `Groundwork suggests a review for ${name}, because your organisation asked for reviews on a regular date and this is the next one. Nothing is sent to ${name} unless you say yes.`;
  }
  return null;
}
