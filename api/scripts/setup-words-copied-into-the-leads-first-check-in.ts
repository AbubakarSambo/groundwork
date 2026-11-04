/**
 * THE RECORD LINES WRITTEN FROM A LEAD'S SETUP, COPIED ONTO HER FIRST CHECK-IN, ARE REMOVED (Hafsah, 4 November 2026: "setup stays
 * private to whoever runs the check-in").
 *
 * Until this fix, saving setup copied the whole setup conversation onto the lead's session 1 as check-in turns, all in one go, and
 * the record writer then turned her words into record lines that every member read on the board, in the report and in Ask. Saving
 * setup no longer does either. This removes the lines it already wrote, on any database it is pointed at.
 *
 * Which sessions: the lead's own session 1 (never a setup row of the anchor), whose turns were all written within one second of each
 * other. A copy is written in one go, a millisecond apart or at one time; a conversation she really had takes seconds a turn, because
 * every reply waits for the model. Only the record lines on those sessions are removed. The turns stay, on her own transcript, which
 * only she is served. Promises and targets are not touched: targets were never read from the copy.
 *
 * Safe to run twice: a second run finds no lines on those sessions and changes nothing. No model is called.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/setup-words-copied-into-the-leads-first-check-in.ts         (says what it would do)
 *   npx ts-node -P tsconfig.json --transpile-only scripts/setup-words-copied-into-the-leads-first-check-in.ts --yes   (does it)
 */
import { PrismaClient } from '@prisma/client';

/** A copy is written in one go, so every turn falls within this of the first. A real exchange cannot: each reply waits for the model. */
export const A_COPY_IS_WRITTEN_WITHIN_MS = 1000;

/** Whether a session's turns were copied in one go, from their times. */
export function wasCopiedInOneGo(turnTimes: readonly (Date | string | number)[]): boolean {
  if (!turnTimes.length) return false;
  const ms = turnTimes.map((t) => new Date(t).getTime());
  return Math.max(...ms) - Math.min(...ms) < A_COPY_IS_WRITTEN_WITHIN_MS;
}

async function main() {
  const yes = process.argv.includes('--yes');
  const prisma = new PrismaClient();
  let sessions = 0;
  let lines = 0;
  try {
    const firstCheckIns = await prisma.checkIn.findMany({
      where: { sessionNumber: 1, isSetup: false, participant: { partyType: 'INITIATOR' as any }, turns: { some: {} } },
      select: { id: true, participantId: true, groundId: true, ground: { select: { label: true } }, turns: { select: { createdAt: true } } },
    });
    for (const ci of firstCheckIns) {
      if (!wasCopiedInOneGo(ci.turns.map((t) => t.createdAt))) continue;
      const theLines = await prisma.recordEntry.findMany({ where: { checkInId: ci.id, participantId: ci.participantId }, select: { id: true, type: true, text: true } });
      if (!theLines.length) continue;
      sessions += 1;
      lines += theLines.length;
      console.log(`${ci.ground?.label ?? ci.groundId} (session 1, check-in ${ci.id}): ${theLines.length} line${theLines.length === 1 ? '' : 's'} written from the lead's setup.`);
      for (const l of theLines) console.log(`  ${l.type}: ${String(l.text).slice(0, 120)}`);
      if (yes) await prisma.recordEntry.deleteMany({ where: { id: { in: theLines.map((l) => l.id) } } });
    }
    console.log(sessions
      ? `${yes ? 'Removed' : 'Would remove'} ${lines} line${lines === 1 ? '' : 's'} from ${sessions} check-in${sessions === 1 ? '' : 's'}.${yes ? '' : ' Run again with --yes to remove them.'}`
      : 'No record lines written from a lead\'s setup were found. Nothing to do.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
