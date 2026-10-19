/**
 * WHEN THE BOARD LAST CHANGED, FROM THE RECORD (U.10, board-as-lead.txt).
 *
 * "Last updated on Wednesday 23 September at 6pm. The board only changes when something new comes
 * in, such as a check-in, a report, a decision or a number from another system."
 *
 * The board is built from the record, so the moment it last changed is the moment the newest thing
 * it is built from arrived: a finished check-in, the report being rewritten, a target or its count
 * changing, something someone is waiting on, or a document everyone in the check-in may read.
 * Opening the board is not on that list, and nothing here is written: this only reads times the
 * record already holds.
 *
 * WHEN SOMETHING CAME IN, NEVER WHEN A ROW WAS WRITTEN AGAIN (Hafsah's quality pass, 18 October, B-30): Grace's board read "Last
 * updated on Sunday 18 October at 8:09pm" though nothing had come in since 14 October; the report, the counts and the waits had
 * been written again from the same record. So a target counts from when it was set, a wait from when it was raised or cleared,
 * and the report's rewrite only where it followed something that came in (within the hour after it). A check-in, a document, a
 * decision still count when they come in.
 *
 * A private document is left out on purpose. Its time would tell the others that somebody added
 * something they cannot see.
 */
export interface WhatTheBoardIsBuiltFrom {
  checkIns?: { completedAt?: Date | string | null }[];
  report?: { updatedAt?: Date | string | null; createdAt?: Date | string | null; releasedAt?: Date | string | null } | null;
  objectives?: { updatedAt?: Date | string | null; createdAt?: Date | string | null }[];
  dependencies?: { updatedAt?: Date | string | null; createdAt?: Date | string | null; clearedAt?: Date | string | null }[];
  documentsEveryoneMayRead?: { createdAt?: Date | string | null }[];
  /** When the lead decided how the check-in ends (U.11). A decision is something new coming in. */
  decidedAt?: Date | string | null;
  /**
   * What the lead and the person agreed at the start, once the person has seen it (faith90-board.jpg: a check-in
   * nobody has answered yet still changed when both confirmed what was agreed on day 1). A goal the person has not
   * been told is left out, as a private document is: its time would say something was added they cannot see.
   */
  agreedWithThePerson?: { createdAt?: Date | string | null; updatedAt?: Date | string | null; seenBySubject?: boolean | null }[];
  /** When an anchor check-in's month ended (decision 121, item 2): a scheduled event, written once by the sweep, never by opening the board. */
  monthEndedAt?: Date | string | null;
}

export function whenTheBoardLastChanged(from: WhatTheBoardIsBuiltFrom): string | null {
  const ms = (t: Date | string | null | undefined) => (t ? new Date(t).getTime() : NaN);
  const cameIn: (Date | string | null | undefined)[] = [
    ...(from.checkIns ?? []).map((c) => c.completedAt),
    ...(from.objectives ?? []).map((o) => o.createdAt ?? o.updatedAt),
    ...(from.dependencies ?? []).map((d) => d.clearedAt ?? d.createdAt ?? d.updatedAt),
    ...(from.documentsEveryoneMayRead ?? []).map((d) => d.createdAt),
  ];
  const lastIn = Math.max(...cameIn.map(ms).filter(Number.isFinite), -Infinity);
  /* The report rewritten: only as part of something coming in, never a rewrite days later from the same record. */
  const rewrite = from.report?.updatedAt ?? from.report?.createdAt;
  const rewriteCounts = !!rewrite && (!Number.isFinite(lastIn) || ms(rewrite) <= lastIn + 3_600_000);
  const times: (Date | string | null | undefined)[] = [
    ...cameIn,
    rewriteCounts ? rewrite : from.report?.createdAt,
    ...(from.agreedWithThePerson ?? []).filter((a) => a.seenBySubject === true).map((a) => a.updatedAt ?? a.createdAt),
    from.decidedAt,
    from.monthEndedAt,
  ];
  let newest: number | null = null;
  for (const t of times) {
    if (!t) continue;
    const ms = new Date(t).getTime();
    if (Number.isFinite(ms) && (newest == null || ms > newest)) newest = ms;
  }
  return newest == null ? null : new Date(newest).toISOString();
}

/**
 * "You can read this check-in’s board and reports. Wairimu Kamau runs it." (read-only-view.txt)
 *
 * For somebody who may read the board but neither runs the check-in nor takes part in it, which is
 * an admin of the organisation. Everybody else gets nothing: the lead runs it, and a participant is
 * in it.
 */
export function whatAReaderWhoOnlyReadsIsTold(
  reader: { runsIt: boolean; takesPart: boolean; mayRead: boolean },
  leadName: string | null,
): string | null {
  if (reader.runsIt || reader.takesPart || !reader.mayRead) return null;
  return leadName
    ? `You can read this check-in’s board and reports. ${leadName} runs it.`
    : 'You can read this check-in’s board and reports.';
}
