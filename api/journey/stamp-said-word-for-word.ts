/**
 * STAMP THE RECORD LINES ALREADY WRITTEN: WHICH ARE THE PERSON'S OWN WORDS.
 *
 * `RecordEntry.saidWordForWord` is stamped when a line is written (conversation.service,
 * extractRecordEntries). Lines written before the column existed are all false, so no report could
 * quote any of them. This stamps them the same way, from the same rule (saidWordForWord in
 * reports/a-quote-is-what-they-said): true only where the line is an unbroken passage of what that
 * person typed in that check-in. It reads the person's own turns, which is why it lives here and not
 * in a report read. A line with no check-in stays false.
 *
 * Local only. It refuses any database that is not on this machine.
 *
 *   DATABASE_URL=postgresql://localhost/gw_pw9_1786222102 npx ts-node -T journey/stamp-said-word-for-word.ts
 */
import { PrismaClient } from '@prisma/client';
import { saidWordForWord } from '../src/modules/reports/a-quote-is-what-they-said';

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/^postgres(ql)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url)) {
    throw new Error('DATABASE_URL must be a database on this machine. This never writes anywhere else.');
  }
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  let yes = 0;
  let no = 0;
  try {
    const checkIns = await prisma.recordEntry.findMany({ where: { checkInId: { not: null } }, distinct: ['checkInId'], select: { checkInId: true } });
    for (const { checkInId } of checkIns) {
      const typed = (await prisma.conversationTurn.findMany({ where: { checkInId: checkInId!, role: 'PERSON' }, select: { content: true } })).map((t) => t.content);
      const lines = await prisma.recordEntry.findMany({ where: { checkInId: checkInId! }, select: { id: true, text: true, saidWordForWord: true } });
      const theirs = lines.filter((l) => saidWordForWord(l.text, typed)).map((l) => l.id);
      const notTheirs = lines.filter((l) => !theirs.includes(l.id)).map((l) => l.id);
      if (theirs.length) await prisma.recordEntry.updateMany({ where: { id: { in: theirs } }, data: { saidWordForWord: true } });
      if (notTheirs.length) await prisma.recordEntry.updateMany({ where: { id: { in: notTheirs } }, data: { saidWordForWord: false } });
      yes += theirs.length;
      no += notTheirs.length;
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`${yes + no} record lines stamped: ${yes} are the person's own words, ${no} are the record reader's version.`);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(2);
});
