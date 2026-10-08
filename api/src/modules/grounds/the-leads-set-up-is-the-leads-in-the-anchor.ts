/**
 * IN AN ANCHOR CHECK-IN, WHAT THE LEAD IS CARRYING AND TRYING TO GET ACROSS IS THE LEAD'S ALONE (decision 96, item 8).
 *
 * "What you're carrying" and "What you're seeing today" stay the lead's. "What you need the team to understand" reaches the team only
 * once the lead says so, and that is the shorter version people are told, not these. The ground read served the lead's own aim as the
 * check-in's objective, with the subjects it will cover and what a complete answer holds, to a member (screens request 168 item 1).
 * A member's board drew the aim under "What we are aiming for".
 *
 * Walled at the read, and regardless of whether the anchor is switched on: the rule is about who may read the lead's set-up, not
 * about the switch. Whoever runs the check-in (the lead, and an admin of the organisation) reads it whole.
 */
export const STARTED_FROM_THE_ANCHOR_WORD = 'anchor';

export function withoutTheLeadsSetUpForAMember<T extends Record<string, any>>(page: T, opts: { startedFrom?: string | null; scenario?: unknown; runsIt: boolean }): T {
  /* By how it was started or by its scenario (decision 114): a check-in made through the ordinary set-up with the anchor's scenario has the same wall. */
  if (opts.runsIt || (opts.startedFrom !== STARTED_FROM_THE_ANCHOR_WORD && opts.scenario !== 'HELP_TEAM_UNDERSTAND')) return page;
  const out: Record<string, any> = { ...page, objectives: [] };
  for (const key of ['subjectsToCover', 'whatACompleteAnswerHolds'] as const) if (key in out) out[key] = null;
  return out as T;
}
