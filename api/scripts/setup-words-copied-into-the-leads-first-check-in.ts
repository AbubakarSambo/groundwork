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
 * Which check-ins: the lead's session 1 whose assessment ended "setup saved" and holds a check-in message with a turn behind it that
 * was not typed in setup. Since this fix, the only turns on such a session are her own update, marked as said in setup, so a check-in
 * saved since is never touched.
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
    select: { id: true, groundId: true, sessionReport: true },
  });
  const found = rows.map((r) => ({ row: r, copied: theCopiedSetupIn(r) })).filter((x) => x.copied);
  console.log(yes ? 'Changing:' : 'Would change (add --yes to do it):');
  let lines = 0;
  for (const { row, copied } of found) {
    const entries = await prisma.recordEntry.findMany({ where: { checkInId: row.id }, select: { id: true, type: true, text: true } });
    lines += entries.length;
    console.log(`\nCheck-in ${row.id} (ground ${row.groundId}): ${entries.length} record line(s) to remove, ${copied!.copied.length} message(s) to mark as setup.`);
    for (const e of entries) console.log(`  - ${e.type}: ${e.text.slice(0, 160)}`);
    if (!yes) continue;
    await prisma.$transaction([
      prisma.recordEntry.deleteMany({ where: { checkInId: row.id } }),
      prisma.checkIn.update({ where: { id: row.id }, data: { sessionReport: withTheCopiedMessagesAsSetup(row.sessionReport, copied!.copied) as any } }),
    ]);
  }
  console.log(`\n${found.length} check-in(s), ${lines} record line(s). ${yes ? 'Done.' : 'Nothing was changed.'}`);
  await prisma.$disconnect();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
