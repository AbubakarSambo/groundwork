/**
 * WHERE A SESSION'S OWN REPORT STANDS.
 *
 * `CheckIn.sessionReport` is written only by the sign-in-free entry chat, when somebody finishes and makes an account. A session run
 * while signed in never writes it, and no background job writes it afterwards. So a finished session with `report: null` is not being
 * written: it will never come. The screen polled for it forever and said it was still being written. The reply now says which of the
 * three it is, in a full sentence, so no page has to guess.
 */
export type TheStateOfASessionReport = 'ready' | 'open' | 'not-kept';

export function whereASessionsReportStands(input: { report: unknown; finishedAt: Date | null }): { state: TheStateOfASessionReport; says: string } {
  if (input.report) return { state: 'ready', says: 'This is the report this session ended on.' };
  if (!input.finishedAt) return { state: 'open', says: 'This session is still open, so it has no report of its own yet.' };
  return { state: 'not-kept', says: 'This session was finished, but no separate report was kept for it. What you said, and what came from it, is shown on this page.' };
}
