import { howOftenItRuns } from './the-check-ins-own-schedule';

/**
 * A YES THAT CHANGES NOTHING IS NOT OFFERED (B-085).
 *
 * Ask offered "I will set people to check in once a week" to a check-in that already ran every two
 * weeks, and "I will set this to run for 90 days" to one that already ran 90 days, and a yes to the
 * second wrote "from FORTNIGHTLY to FORTNIGHTLY" into the check-in's history. When what was heard is
 * what the check-in already has, and somebody chose it, the lead is told it already is so, and nothing
 * is proposed and nothing is written.
 */
export interface WhatTheCheckInHas {
  timelineDays: number;
  runsUntilEnded?: boolean | null;
  timelineStated?: boolean | null;
  endsAt?: Date | string | null;
  cadence: string;
  cadenceStated?: boolean | null;
}

/** Whether somebody chose the length: said so, or gave an end date. A default nobody chose is not "already" anything. */
export function theLengthWasChosen(g: Pick<WhatTheCheckInHas, 'timelineStated' | 'endsAt' | 'runsUntilEnded'>): boolean {
  return !!g.timelineStated || !!g.endsAt || !!g.runsUntilEnded;
}

export function alreadyHowItIs(
  g: WhatTheCheckInHas,
  proposal: { kind: string; days?: number; untilEnded?: boolean; cadence?: string },
): string | null {
  if (proposal.kind === 'timeline' && theLengthWasChosen(g)) {
    if (proposal.untilEnded) return g.runsUntilEnded ? 'This check-in already runs until you end it, so nothing needs to change.' : null;
    if (!g.runsUntilEnded && proposal.days === g.timelineDays) {
      return `This check-in already runs for ${g.timelineDays} days, so nothing needs to change.`;
    }
  }
  if (proposal.kind === 'cadence' && g.cadenceStated && proposal.cadence === g.cadence) {
    return `People already check in ${howOftenItRuns({ cadence: proposal.cadence })}, so nothing needs to change.`;
  }
  return null;
}
