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

/**
 * WHAT GROUNDWORK BUILT FROM THE LEAD'S PRIVATE SET-UP IS NOT SERVED TO ANYONE WHO DOES NOT RUN THE CHECK-IN (B-013, B-091), on every
 * kind of check-in and on every read that serves the row: the subjects it will cover (their words are taken from the lead's brief), what a
 * complete answer holds (the list answers are judged against), and the opener written from the brief. No screen reads them for a member;
 * the conversation reads them from the database, not from this row.
 */
export const BUILT_FROM_THE_LEADS_SET_UP = ['subjectsToCover', 'whatACompleteAnswerHolds', 'openerForALink'] as const;

export function withoutWhatWasBuiltFromTheLeadsSetUp<T extends Record<string, any>>(page: T, runsIt: boolean): T {
  if (runsIt) return page;
  const out: Record<string, any> = { ...page };
  for (const key of BUILT_FROM_THE_LEADS_SET_UP) if (key in out) out[key] = null;
  return out as T;
}

export function withoutTheLeadsSetUpForAMember<T extends Record<string, any>>(page: T, opts: { startedFrom?: string | null; scenario?: unknown; runsIt: boolean }): T {
  /* By how it was started or by its scenario (decision 114): a check-in made through the ordinary set-up with the anchor's scenario has the same wall. */
  if (opts.runsIt) return page;
  const walled = withoutWhatWasBuiltFromTheLeadsSetUp(page, false);
  if (opts.startedFrom !== STARTED_FROM_THE_ANCHOR_WORD && opts.scenario !== 'HELP_TEAM_UNDERSTAND') return walled;
  return { ...walled, objectives: [] } as T;
}
