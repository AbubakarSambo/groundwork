/**
 * ONE TIME, BY HAND: THE RECORD LINES WRITTEN FROM SETUP WORDS COPIED INTO THE LEAD'S FIRST CHECK-IN (Hafsah, 4 November 2026; the
 * privacy fix in docs/fix-plan.md, group 1).
 *
 * Until this fix, saving setup copied the whole setup chat into the lead's session 1 as check-in turns. Its assessment then read every
 * setup sentence as something she said in a check-in, so the record took lines from them, and every team member could read them
 * ("I do not know what he is working on. That is what I want to find out from these check-ins." on a member's board). Setup is no
 * longer copied, so nothing new is written this way. This removes what was written before:
 *   1. every record line on such a check-in (each one came from a copied setup turn);
 *   2. in its stored assessment, each message that came from a copied turn is marked as setup, so the facts read from it stay with
 *      whoever runs the check-in, like every setup fact now.
 *
 * Which check-ins, two kinds:
 *   - the lead's session 1 whose assessment ended "setup saved" and holds a check-in message with a turn behind it that was not typed
 *     in setup. Since this fix, the only turns on such a session are her own update, marked as said in setup, so a check-in saved
 *     since is never touched;
 *   - a lead's session 1 saved before the assessment existed (no assessment on it), whose turns were all written within one second of
 *     each other. A copy is written in one go; a conversation she really had takes seconds a turn, because every reply waits for the
 *     model. Only her record lines there are removed; there are no messages to mark. (This is the case the staging script of
 *     4 November removed; after that has run, this finds no lines there and changes nothing.)
 * Safe to run twice: a second run finds nothing to change. No model is called.
 *
 * Nothing changes without --yes. Run first without it and read what it would do.
 *   npx ts-node -P tsconfig.json --transpile-only scripts/setup-words-copied-into-the-leads-first-check-in.ts
 *   npx ts-node -P tsconfig.json --transpile-only scripts/setup-words-copied-into-the-leads-first-check-in.ts --yes
 *
 * Left as they are, on purpose: the copied turns (her transcript of setup), and the promises and waits read from them, which are hers
 * to keep or correct in her next check-in.
 */
import { PrismaClient } from '@prisma/client';

export interface ACopiedSetup {
  checkInId: string;
  groundId: string;
  /** The message numbers that came from a copied turn. */
  copied: number[];
}

/** Whether one stored column is a setup assessment with copied turns in it, and which messages those are. Pure, for the spec. */
export function theCopiedSetupIn(checkIn: { id: string; groundId: string; sessionReport: unknown }): ACopiedSetup | null {
  const a = checkIn.sessionReport as any;
  if (!a || a.kind !== 'assessment' || a.about?.howItEnded !== 'setup saved' || !a.about?.isTheLead) return null;
  /* A copied turn is a check-in message with a turn behind it that she did not type in setup; her own update, saved since, says it was. */
  const copied = ((a.messages ?? []) as any[]).filter((m) => m?.where === 'check-in' && m?.turnId && !m?.saidInSetup).map((m) => Number(m.n));
  return copied.length ? { checkInId: checkIn.id, groundId: checkIn.groundId, copied } : null;
}

/** A copy is written in one go, so every turn falls within this of the first. A real exchange cannot: each reply waits for the model. */
export const A_COPY_IS_WRITTEN_WITHIN_MS = 1000;

/** Whether a session's turns were copied in one go, from their times. */
export function wasCopiedInOneGo(turnTimes: readonly (Date | string | number)[]): boolean {
  if (!turnTimes.length) return false;
  const ms = turnTimes.map((t) => new Date(t).getTime());
  return Math.max(...ms) - Math.min(...ms) < A_COPY_IS_WRITTEN_WITHIN_MS;
}

/** Whether a session 1 was saved before the assessment existed and its turns were copied: no assessment on it, every turn in one go. */
export function anOlderCopiedSetup(checkIn: { sessionReport: unknown; turns: { createdAt: Date | string }[] }): boolean {
  const a = checkIn.sessionReport as any;
  if (a && a.kind === 'assessment') return false;
  return wasCopiedInOneGo(checkIn.turns.map((t) => t.createdAt));
}

/** The column with each copied message marked as setup. */
export function withTheCopiedMessagesAsSetup(column: unknown, copied: number[]): unknown {
  const a = column as any;
  const these = new Set(copied);
  return { ...a, messages: ((a?.messages ?? []) as any[]).map((m) => (these.has(Number(m?.n)) ? { ...m, where: 'setup' } : m)) };
}

async function main() {
  const prisma = new PrismaClient();
  const yes = process.argv.includes('--yes');
  const rows = await prisma.checkIn.findMany({
    where: { sessionNumber: 1, participant: { partyType: 'INITIATOR' } },
    select: { id: true, groundId: true, participantId: true, isSetup: true, sessionReport: true, turns: { select: { createdAt: true } } },
  });
  console.log(yes ? 'Changing:' : 'Would change (add --yes to do it):');
  let found = 0;
  let lines = 0;
  for (const row of rows) {
    const copied = theCopiedSetupIn(row);
    /* Never the anchor's own setup row, which is not her check-in. */
    const older = !copied && !row.isSetup && anOlderCopiedSetup(row);
    if (!copied && !older) continue;
    /* On an older copy only her own lines, as the staging script removed; on an assessed copy every line, each read from a copied turn. */
    const where = copied ? { checkInId: row.id } : { checkInId: row.id, participantId: row.participantId };
    const entries = await prisma.recordEntry.findMany({ where, select: { id: true, type: true, text: true } });
    if (older && !entries.length) continue;
    found += 1;
    lines += entries.length;
    console.log(`\nCheck-in ${row.id} (ground ${row.groundId}): ${entries.length} record line(s) to remove${copied ? `, ${copied.copied.length} message(s) to mark as setup` : ''}.`);
    for (const e of entries) console.log(`  - ${e.type}: ${e.text.slice(0, 160)}`);
    if (!yes) continue;
    await prisma.$transaction([
      prisma.recordEntry.deleteMany({ where }),
      ...(copied ? [prisma.checkIn.update({ where: { id: row.id }, data: { sessionReport: withTheCopiedMessagesAsSetup(row.sessionReport, copied.copied) as any } })] : []),
    ]);
  }
  console.log(`\n${found} check-in(s), ${lines} record line(s). ${yes ? 'Done.' : 'Nothing was changed.'}`);
  await prisma.$disconnect();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
