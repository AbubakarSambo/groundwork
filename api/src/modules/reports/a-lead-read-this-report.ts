/**
 * THE PRODUCT RECORDS WHEN A LEAD READS A REPORT (decision 133, change 6).
 *
 * One row per lead per report (the check-in and its session) in `report_reads`: the first time and
 * the latest time they opened it. Only the lead who runs the check-in is recorded; nobody else's
 * reading is kept. This is one write and nothing else: opening a report never rebuilds it.
 */
export async function recordThatTheLeadRead(prisma: any, groundId: string, sessionNumber: number, userId: string, now: Date = new Date()): Promise<boolean> {
  const ground = await prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } });
  if (!ground || ground.initiatorId !== userId) return false;
  await prisma.reportRead.upsert({
    where: { groundId_sessionNumber_userId: { groundId, sessionNumber, userId } },
    create: { groundId, sessionNumber, userId, firstReadAt: now, lastReadAt: now },
    update: { lastReadAt: now },
  });
  return true;
}

/**
 * THE WEEKLY REPORT USES THE SAME TABLE (change 6). A weekly report has no session number, so its row is
 * kept under the negative of its Monday's date: the week of 12 October 2026 is -20261012. Session reports
 * are always 1 or more, so the two never meet, and no new column is needed.
 */
export function theWeeksReadNumber(weekStart: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return null;
  return -Number(weekStart.replace(/-/g, ''));
}

/** The lead opened the weekly report for the week starting `weekStart`. One write; only the lead is recorded. */
export async function recordThatTheLeadReadTheWeek(prisma: any, groundId: string, weekStart: string | null | undefined, userId: string, now: Date = new Date()): Promise<boolean> {
  const n = weekStart ? theWeeksReadNumber(weekStart) : null;
  if (n == null) return false;
  return recordThatTheLeadRead(prisma, groundId, n, userId, now);
}
