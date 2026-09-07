/**
 * WHY IS A REPORT THIN?
 *
 * Two possibilities with opposite fixes. If a thin report follows thin input, the synthesis is
 * behaving correctly and the work is upstream in the check-in. If a thin report follows rich input,
 * synthesis is losing material and the prompt is the problem. Measured rather than guessed.
 */
import { PrismaClient } from '@prisma/client';

const chars = (v: unknown): number => {
  if (!v) return 0;
  if (typeof v === 'string') return v.trim().length;
  return JSON.stringify(v).length;
};

(async () => {
  const p = new PrismaClient();
  const reports = await p.report.findMany({
    select: {
      id: true, groundId: true, sharedPicture: true, agreements: true, divergences: true,
      centralQuestion: true,
    },
  });

  const rows: any[] = [];
  for (const r of reports) {
    const [turns, entries, parties] = await Promise.all([
      p.conversationTurn.findMany({
        where: { role: 'PERSON', checkIn: { groundId: r.groundId } },
        select: { content: true },
      }),
      p.recordEntry.count({ where: { participant: { groundId: r.groundId } } }),
      p.groundParticipant.count({ where: { groundId: r.groundId } }),
    ]);
    const saidChars = turns.reduce((n, t) => n + (t.content?.trim().length ?? 0), 0);
    rows.push({
      answers: turns.length,
      saidChars,
      entries,
      parties,
      picture: chars(r.sharedPicture),
      agreements: Array.isArray(r.agreements) ? r.agreements.length : 0,
      divergences: Array.isArray(r.divergences) ? r.divergences.length : 0,
      question: chars(r.centralQuestion),
      total: chars(r.sharedPicture) + chars(r.agreements) + chars(r.divergences) + chars(r.centralQuestion),
    });
  }

  const thin = rows.filter((x) => x.picture < 200);
  const rich = rows.filter((x) => x.picture >= 200);
  const avg = (xs: any[], k: string) => xs.length ? Math.round(xs.reduce((n, x) => n + x[k], 0) / xs.length) : 0;

  console.log(`${rows.length} reports\n`);
  console.log(`                     thin (<200 chars)   the rest`);
  console.log(`  reports            ${String(thin.length).padEnd(19)} ${rich.length}`);
  for (const k of ['answers', 'saidChars', 'entries', 'parties', 'agreements', 'divergences', 'question']) {
    console.log(`  avg ${k.padEnd(15)} ${String(avg(thin, k)).padEnd(19)} ${avg(rich, k)}`);
  }

  /* The decisive cut: reports where somebody said a LOT and the picture is still thin. */
  const richInputThinOutput = rows.filter((x) => x.saidChars >= 600 && x.picture < 200);
  const thinInputThinOutput = rows.filter((x) => x.saidChars < 600 && x.picture < 200);
  console.log(`\n  thin picture from a THIN check-in (<600 chars said): ${thinInputThinOutput.length}`);
  console.log(`  thin picture from a RICH check-in (>=600 chars said): ${richInputThinOutput.length}`);
  console.log(`\n  and no divergences recorded, by input size:`);
  console.log(`    said <600:  ${rows.filter((x) => x.saidChars < 600 && x.divergences === 0).length} of ${rows.filter((x) => x.saidChars < 600).length}`);
  console.log(`    said >=600: ${rows.filter((x) => x.saidChars >= 600 && x.divergences === 0).length} of ${rows.filter((x) => x.saidChars >= 600).length}`);
  console.log(`\n  one-party grounds (a divergence is impossible): ${rows.filter((x) => x.parties < 2).length}`);
  await p.$disconnect();
})();
