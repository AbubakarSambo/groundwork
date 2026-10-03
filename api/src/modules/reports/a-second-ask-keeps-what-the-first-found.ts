/**
 * ASKING AGAIN MAY FIX HOW A REPORT SAYS SOMETHING. IT MAY NOT LOSE WHAT THE REPORT FOUND.
 *
 * Run 26, 3 October 2026. The synthesis drafted the differences between people, and one piece of
 * evidence copied eight of somebody's words. The report was asked again ("it copied ... word for
 * word ... do not quote it"), and the second answer came back with no differences at all. It had
 * fewer faults - no differences means nothing left to copy - so it was kept. Six scenarios lost
 * every difference they had found, "differences found" fell from 36 to 29, and the project lead's
 * report still said "they disagree on whether the project includes automating the daily
 * reconciliation" over a list of differences that was empty.
 *
 * A fault count that goes down because a finding went is not a better report. So whatever a second
 * ask returns, every list the first draft filled and the second one shortened is put back from the
 * first draft, whole, and so is anything the first draft had that the second left empty. The
 * central question goes with the differences: it was written about them.
 *
 * What is put back may still copy somebody's words. That is not left to chance: the synthesis then
 * asks for those phrases alone to be restated, and a sentence that still copies them is replaced in
 * place by a line that says so (said-in-its-own-words.ts). The words never ship; the finding does.
 */

/** The parts of a report that hold what it found, rather than how it is told. */
const WHAT_IT_FOUND = [
  'divergences',
  'agreements',
  'successDefinitions',
  'askVsRecord',
  'driftTrace',
  'hiddenContributors',
  'concernFlags',
  'specificityCauses',
] as const;

const isEmpty = (v: unknown): boolean =>
  v == null ||
  (typeof v === 'string' && !v.trim()) ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

/**
 * The second answer, with what the first one found put back where the second lost it. Returns the
 * names of the parts put back, so the caller can say so in the log.
 */
export function keepWhatTheFirstFound<T extends Record<string, any>>(first: T, second: T): { report: T; putBack: string[] } {
  const report: Record<string, any> = { ...second };
  const putBack: string[] = [];
  for (const field of WHAT_IT_FOUND) {
    const before = first?.[field];
    const after = second?.[field];
    if (isEmpty(before)) continue;
    const shorter = Array.isArray(before) && (!Array.isArray(after) || after.length < before.length);
    if (shorter || isEmpty(after)) {
      report[field] = before;
      putBack.push(field);
    }
  }
  if (putBack.includes('divergences') && !isEmpty(first?.centralQuestion)) {
    report.centralQuestion = first.centralQuestion;
  }
  return { report: report as T, putBack };
}

/** How much a draft holds, for the log: the part of a report that holds what it found, counted. */
export function whatADraftHolds(r: Record<string, any> | null | undefined): string {
  const n = (v: unknown) => (Array.isArray(v) ? v.length : isEmpty(v) ? 0 : 1);
  return `${n(r?.divergences)} difference(s), ${n(r?.agreements)} agreement(s), central question ${n(r?.centralQuestion) ? 'present' : 'missing'}`;
}

/**
 * A report with no picture, no agreements, no differences and no question says nothing. It is
 * never stored over one that said something: the earlier report stays and the caller is told.
 */
export function isAnEmptyReport(r: Record<string, any> | null | undefined): boolean {
  return isEmpty(r?.sharedPicture) && isEmpty(r?.agreements) && isEmpty(r?.divergences) && isEmpty(r?.centralQuestion);
}
