import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { BoardService } from '../src/modules/board/board.service';
import { countCheckableSpecifics } from '../src/modules/conversation/conversation.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const board = app.get(BoardService);

  const g = await prisma.ground.findFirst({ where: { label: 'Coamana growth, Q3 paying customers' }, orderBy: { createdAt: 'desc' } });
  if (!g) throw new Error('journey ground not found');
  const lead = await prisma.user.findUnique({ where: { email: 'hafsah@coamana.test' } });

  // Retro-apply the extraction fix to the EXISTING real data: remove entries the
  // fixed extractor would never have recorded. This is what the board would have
  // been reading all along.
  const NON_ANSWER = /^(nothing (new|much|else)|no( real)? (update|change|progress)|same as (before|last|above)|not (really |much )?(sure|applicable)|n\/?a|none|tbd|as (before|discussed))\b/i;
  const all = await prisma.recordEntry.findMany({ select: { id: true, text: true, participantId: true } });
  const strip = (t: string) => t.replace(/^\[VERIFIABILITY:\w+\]\s*/, '').trim();
  const junk = all.filter((e) => {
    const t = strip(e.text).replace(/\[INFERRED:[^\]]*\]/gi, '').replace(/[.!]+$/, '').trim();
    return t.length < 12 || NON_ANSWER.test(t) || countCheckableSpecifics(t) === 0;
  });
  console.log(`\nnon-answers the fixed extractor would never have recorded: ${junk.length} of ${all.length}`);
  await prisma.recordEntry.deleteMany({ where: { id: { in: junk.map((j) => j.id) } } });

  const b: any = await board.get(g.id, lead!.id);

  console.log('\n=== CONTRIBUTION AGAINST ROLE (the read a lead actually sees) ===');
  for (const c of b.contribution ?? []) {
    console.log(`\n${c.name}`);
    console.log(`  ${c.reason ?? c.note}`);
  }

  console.log('\n=== WHERE WORK IS LANDING ===');
  for (const r of b.coverage?.reads ?? []) {
    console.log(`\n${r.name}  [${r.kind}]`);
    console.log(`  ${r.what}`);
  }

  console.log('\n=== WAITING ON (was 27 duplicated rows) ===');
  for (const d of b.dependencies ?? []) console.log(`  ${d.status.padEnd(9)} ${d.from} needs "${d.what}" from ${d.on ?? d.onLabel}`);
  console.log(`  total: ${(b.dependencies ?? []).length}`);

  console.log('\n=== DECISIONS NEEDED (was 15) ===');
  for (const d of b.decisions ?? []) console.log(`  - ${d.question}`);

  console.log('\n=== QUICK READ ===');
  for (const q of b.quickRead ?? []) console.log(`  ${q.label}: ${q.value} (${q.sub})`);

  console.log('\n=== PATTERNS (were showing raw "k5"/"k1") ===');
  for (const p of b.patterns ?? []) console.log(`  label=${p.label ?? '(none - unknown code, correctly hidden)'} :: ${String(p.text).slice(0, 80)}`);

  await app.close(); process.exit(0);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
