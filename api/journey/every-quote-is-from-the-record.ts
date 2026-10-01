/**
 * EVERY QUOTE A PERSON WAS SERVED, CHECKED AGAINST THE RECORD, WORD FOR WORD.
 *
 * Hafsah, 27 September 2026: "for every quote in a served report, the text matches the original
 * answer exactly." The spec the-quote-a-person-reads-is-what-they-said proves it on one scenario;
 * this proves it on a whole run. It reads the reports and boards a scenario run captured, as each
 * reader was served them (lead report, lead board, participant report, participant board), finds
 * every quotation in them, and looks each one up in that check-in's record in the database: every
 * record line stamped as the person's own words (`saidWordForWord`), and the lead's own words at
 * set-up, and (since 1 October) every message the people themselves wrote in their check-ins. A line the record reader tidied is not an original, so a quote of it fails here. A quote passes only if it is there character for
 * character.
 *
 * WHAT IT DOES NOT COUNT, AND WHY:
 *   - `myRows[].text` and `whoOwnsWhat[].items[].text` ARE the record. A quotation mark inside them is
 *     the person quoting somebody, in their own line.
 *   - `coaching.role.*` is the product's own copy about a kind of role, the same for everybody,
 *     with nobody's words in it.
 * Everything else is counted, including what is built by the product rather than written by a
 * model, because a person reading it cannot tell the difference.
 *
 * Local only. It refuses any database that is not on this machine.
 *
 *   DATABASE_URL=postgresql://localhost/gw_pw9_1786222102 npx ts-node -T journey/every-quote-is-from-the-record.ts journey/all-24/run-8
 *
 * Exits 1 when any served quote is not in the record, so a run can be failed on it.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { quotationsIn } from '../src/modules/reports/a-quote-is-what-they-said';

const NOT_COUNTED = [/\.myRows\[\]\.text$/, /\.whoOwnsWhat\[\]\.items\[\]\.text$/, /\.coaching\.role\./];
const SERVED = ['leadReport', 'board', 'participantReport', 'participantBoard'] as const;

function* strings(v: any, at: string): Generator<[string, string]> {
  if (typeof v === 'string') yield [at, v];
  else if (Array.isArray(v)) for (const x of v) yield* strings(x, `${at}[]`);
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) yield* strings(x, `${at}.${k}`);
}

async function main() {
  const folder = process.argv[2];
  const url = process.env.DATABASE_URL ?? '';
  if (!folder) throw new Error('Give the run folder, for example journey/all-24/run-8.');
  if (!/^postgres(ql)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url)) {
    throw new Error('DATABASE_URL must be a database on this machine. This never reads anything else.');
  }
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const byPath = new Map<string, { quotes: number; notInTheRecord: number }>();
  const failures: { file: string; reader: string; path: string; quote: string }[] = [];
  let quotes = 0;

  try {
    for (const file of fs.readdirSync(folder).filter((f) => f.endsWith('.json')).sort()) {
      const run = JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8'));
      if (!run?.groundId || !Array.isArray(run.sessions)) continue;
      const ground = await prisma.ground.findUnique({
        where: { id: run.groundId },
        select: { brief: true, participants: { select: { roleAsDescribed: true, remitAsGiven: true } } },
      });
      if (!ground) {
        console.warn(`${file}: ground ${run.groundId} is not in this database, skipped.`);
        continue;
      }
      /* Only the lines that are the person's own words, as the report may quote them. */
      const lines = await prisma.recordEntry.findMany({ where: { participant: { groundId: run.groundId }, saidWordForWord: true }, select: { text: true } });
      const promises = await prisma.groundCommitment.findMany({ where: { groundId: run.groundId }, select: { text: true, whenSaid: true, saidWordForWord: true, whenSaidWordForWord: true } });
      /* Hafsah, 1 October: people's own messages in their check-ins are their words too, so a quote
         taken word for word from a message is never flagged. Only people's turns, never Groundwork's. */
      const theirMessages = await prisma.conversationTurn.findMany({
        where: { checkIn: { groundId: run.groundId }, role: { not: 'AI' as any } },
        select: { content: true },
      });
      const record = [
        ...theirMessages.map((t) => t.content ?? ''),
        ...lines.map((l) => l.text.replace(/\s*\[INFERRED:[^\]]*\]/gi, '')),
        ...promises.filter((c) => c.saidWordForWord).map((c) => c.text),
        ...promises.filter((c) => c.whenSaidWordForWord && c.whenSaid).map((c) => c.whenSaid!),
        ground.brief ?? '',
        ...ground.participants.flatMap((p) => [p.roleAsDescribed ?? '', p.remitAsGiven ?? '']),
      ].filter(Boolean).map((t) => t.normalize('NFC'));

      for (const session of run.sessions) {
        for (const reader of SERVED) {
          if (!session?.[reader]) continue;
          for (const [at, text] of strings(session[reader], reader)) {
            if (NOT_COUNTED.some((re) => re.test(at))) continue;
            for (const q of quotationsIn(text)) {
              quotes += 1;
              const row = byPath.get(at) ?? { quotes: 0, notInTheRecord: 0 };
              row.quotes += 1;
              if (!record.some((line) => line.includes(q.inner.normalize('NFC')))) {
                row.notInTheRecord += 1;
                failures.push({ file, reader, path: at, quote: q.inner });
              }
              byPath.set(at, row);
            }
          }
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`${quotes} quotes served. ${quotes - failures.length} are word for word in the record. ${failures.length} are not.`);
  for (const [at, row] of [...byPath.entries()].sort((a, b) => b[1].notInTheRecord - a[1].notInTheRecord || b[1].quotes - a[1].quotes)) {
    console.log(`  ${String(row.notInTheRecord).padStart(4)} of ${String(row.quotes).padStart(4)} not in the record  ${at}`);
  }
  for (const f of failures.slice(0, 40)) console.log(`  ${f.file} ${f.reader} ${f.path}: "${f.quote.slice(0, 140)}"`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(2);
});
