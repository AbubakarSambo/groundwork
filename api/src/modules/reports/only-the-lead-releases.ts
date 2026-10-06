/**
 * What another admin reads when they try to share a check-in's report that is not theirs to share
 * (request 57). The screens already tell them the same thing before they press anything.
 *
 * STILL THE RIGHT WORDS WHILE THE LEAD IS STILL HERE (decision 53, 29 September 2026): the lead is
 * simply the one to ask. Where the lead has left the organisation there is nobody left to ask, and
 * `ReportsService.releaseAsTheLead` lets another admin share it instead - see
 * who-shared-it-because-the-lead-left.ts.
 */
export const ONLY_THE_LEAD_RELEASES =
  'Only the person who runs this check-in can share its report. Ask them to share it when they are ready.';
