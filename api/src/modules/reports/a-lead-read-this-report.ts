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
