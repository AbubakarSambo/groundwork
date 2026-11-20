/**
 * WHERE A SESSION'S OWN REPORT STANDS.
 *
 * `CheckIn.sessionReport` is written only by the sign-in-free entry chat, when somebody finishes and makes an account. A session run
 * while signed in never writes it, and no background job writes it afterwards. So a finished session with `report: null` is not being
 * written: it will never come. The screen polled for it forever and said it was still being written. The reply now says which of the
 * three it is, in a full sentence, so no page has to guess.
 */
export type TheStateOfASessionReport = 'ready' | 'open' | 'being-read' | 'not-kept';

export function whereASessionsReportStands(input: { report: unknown; finishedAt: Date | null; readIsStillToCome?: boolean; /** Their own report is kept and drawn beside this ("Here is what you shared"). */ theirOwnReportIsKept?: boolean }): { state: TheStateOfASessionReport; says: string } {
  /* A report that is kept and drawn below is a report that was kept: "No report was kept" above "Here is what you shared" was both at once (run 9). */
  if (input.report || (input.finishedAt && input.theirOwnReportIsKept)) return { state: 'ready', says: 'This is the report this check-in ended on.' };
  if (!input.finishedAt) return { state: 'open', says: 'This check-in is still open, so it has no report of its own yet.' };
  /* A read that failed is still owed and will land: that is "not read yet", never "not kept" (the read is tried again by the scheduled pass). */
  if (input.readIsStillToCome) return { state: 'being-read', says: 'Groundwork is still working out the report for this check-in. What you said is below, and the report will appear here when it is ready.' };
  return { state: 'not-kept', says: 'No report was kept for this check-in. What you said is below.' };
}
