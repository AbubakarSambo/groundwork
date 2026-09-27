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
 * A private document is left out on purpose. Its time would tell the others that somebody added
 * something they cannot see.
 */
export interface WhatTheBoardIsBuiltFrom {
  checkIns?: { completedAt?: Date | string | null }[];
  report?: { updatedAt?: Date | string | null; createdAt?: Date | string | null } | null;
  objectives?: { updatedAt?: Date | string | null; createdAt?: Date | string | null }[];
  dependencies?: { updatedAt?: Date | string | null; createdAt?: Date | string | null }[];
  documentsEveryoneMayRead?: { createdAt?: Date | string | null }[];
  /** When the lead decided how the check-in ends (U.11). A decision is something new coming in. */
  decidedAt?: Date | string | null;
}

export function whenTheBoardLastChanged(from: WhatTheBoardIsBuiltFrom): string | null {
  const times: (Date | string | null | undefined)[] = [
    ...(from.checkIns ?? []).map((c) => c.completedAt),
    from.report?.updatedAt ?? from.report?.createdAt,
    ...(from.objectives ?? []).map((o) => o.updatedAt ?? o.createdAt),
    ...(from.dependencies ?? []).map((d) => d.updatedAt ?? d.createdAt),
    ...(from.documentsEveryoneMayRead ?? []).map((d) => d.createdAt),
    from.decidedAt,
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
