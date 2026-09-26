/**
 * THE ONE SENTENCE ABOUT THE FREE TRIAL. Hafsah's decision of 26 September: teams under 20 people get
 * Groundwork free for 3 months.
 *
 * The numbers come from the server (`trial` on GET /billing/pricing), never from a screen, and every
 * screen that mentions the trial uses this, so they all say it the same way. It gives nothing while
 * the trial is off, and the trial stays off until billing really grants it (U.19): no screen may
 * promise what billing does not do.
 */
export interface FreeTrial { on: boolean; teamsUnder: number; months: number }

export function theFreeTrialSentence(trial: FreeTrial | null | undefined): string | null {
  if (!trial?.on) return null
  if (!Number.isInteger(trial.teamsUnder) || !Number.isInteger(trial.months) || trial.teamsUnder < 2 || trial.months < 1) return null
  const length = trial.months === 1 ? '1 month' : `${trial.months} months`
  return `Teams of fewer than ${trial.teamsUnder} people get ${length} free. No card needed.`
}
