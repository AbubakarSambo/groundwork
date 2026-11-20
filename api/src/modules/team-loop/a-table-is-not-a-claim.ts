/**
 * A SPREADSHEET IS NOT SOMEBODY'S SENTENCE (Fatima round 3). A payments tracker or an export, read as text, is rows of cells joined with commas; reading it as
 * "what the person said" put a row of cells into the register as a promise, into the nudges as a subject line and into the year-end report as a claim.
 * What a table holds is read by the payments tracker (principal-work/the-payments-tracker.ts), which knows its rows. The team loop reads only words.
 */
export const isATable = (r: { fileName?: string | null; mimeType?: string | null }): boolean =>
  /\.(?:xlsx|xlsm|xls|csv|tsv|ods)$/i.test(String(r.fileName ?? '')) || /spreadsheet|ms-excel|text\/csv|text\/tab-separated/i.test(String(r.mimeType ?? ''));
