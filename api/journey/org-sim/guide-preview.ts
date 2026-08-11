/**
 * Generate item 3 - the post-report guide - for review, without releasing it.
 *
 * The feature is fully built (POST_REPORT_GUIDE_PROMPT, its schema, and the
 * persistence into report.engagement.postReportGuides) and gated off, and
 * nothing in the client renders it. Before it gets wired to a surface, the
 * wording has to be read by a human, on real records rather than an example.
 *
 * So this calls the same prompt and schema the product calls, over the org-18
 * records, and PRINTS the result. It writes nothing to any report and sends
 * nothing to anyone - the guide is per-party advice about a conversation, and
 * an unreviewed version of that reaching a real person is the exact failure
 * this preview exists to prevent.
 *
 *   DATABASE_URL=... npx ts-node journey/org-sim/guide-preview.ts <groundId>
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { AnthropicService } from '../../src/modules/conversation/anthropic.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import * as fs from 'fs';

// IMPORTED, not copied. The first version of this file pasted the prompt in, and
// a preview that drifts from the product is worse than no preview - it certifies
// wording that never ships. Both the prompt and the sanitiser now come from the
// service, so what prints here is what a person would receive.
import { POST_REPORT_GUIDE_PROMPT } from '../../src/modules/reports/reports.service';
import { forbiddenNames, sanitiseGuide } from '../../src/modules/reports/guide-sanitiser';

const POST_REPORT_GUIDE_SCHEMA = {
  name: 'emit_post_report_guide',
  description: 'Emit a short post-report guide to help each party walk into the conversation.',
  input_schema: {
    type: 'object',
    properties: {
      openingLine: { type: 'string', description: "One opening line this person can use to start the conversation - grounded, not defensive." },
      questionToCarry: { type: 'string', description: 'One question they should carry - a genuine inquiry, not a challenge. Never assume a meeting.' },
      toAcknowledge: { type: 'string', description: 'One concrete thing from another account this person should take seriously, even if they see it differently. Never name or quote anyone.' },
    },
    required: ['openingLine', 'questionToCarry', 'toAcknowledge'],
  },
};

async function main() {
  const groundId = process.argv[2];
  if (!groundId) throw new Error('give a groundId');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const anthropic = app.get(AnthropicService);

  const report = await prisma.report.findFirst({ where: { groundId }, orderBy: { createdAt: 'desc' } });
  if (!report) throw new Error('no report on that ground');

  const synthesisText = [
    `Shared picture: ${report.sharedPicture}`,
    `Agreements: ${JSON.stringify(report.agreements)}`,
    `Divergences: ${JSON.stringify(report.divergences)}`,
    `Central question: ${report.centralQuestion}`,
  ].join('\n');

  const parties = await prisma.groundParticipant.findMany({
    where: { groundId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  // The same forbidden-name list the service builds, from the same ground.
  const names = forbiddenNames(
    parties.map((p: any) => ({ firstName: p.user?.firstName, lastName: p.user?.lastName, email: p.email })),
  );
  console.log(`Forbidden names on this ground: ${names.map((n) => n.value + (n.caseSensitive ? " [case-sensitive]" : "")).join(", ") || "(none)"}`);

  const out: any[] = [];
  let totalDropped = 0;

  for (const p of parties) {
    const entries = await prisma.recordEntry.findMany({
      where: { participantId: p.id },
      orderBy: { createdAt: 'asc' },
      select: { type: true, text: true },
    });
    if (!entries.length) continue;

    const corpus = `SHARED SYNTHESIS:\n${synthesisText}\n\nTHIS PARTY'S RECORD:\n${entries.map((e) => `(${e.type}) ${e.text}`).join('\n')}`;
    const guide = await anthropic.extract<any>(POST_REPORT_GUIDE_PROMPT, [{ role: 'user', content: corpus }], POST_REPORT_GUIDE_SCHEMA);

    // What the model returned, then what a person would actually receive. Both
    // are printed: if the strip is doing heavy lifting, that is a fact about the
    // prompt worth seeing, not something to hide behind a clean result.
    const { guide: clean, dropped } = sanitiseGuide(guide ?? {}, names);
    totalDropped += dropped.length;

    out.push({
      party: (p as any).label ?? p.id,
      partyType: (p as any).partyType,
      entries: entries.length,
      raw: guide,
      shipped: clean,
      dropped,
    });

    console.log(`\n=== ${(p as any).label ?? p.id} (${(p as any).partyType}, ${entries.length} entries)`);
    console.log('  OPENING LINE   :', clean.openingLine ?? '(dropped)');
    console.log('  QUESTION       :', clean.questionToCarry ?? '(dropped)');
    console.log('  TO ACKNOWLEDGE :', clean.toAcknowledge ?? '(dropped)');
    for (const d of dropped) {
      console.log(`  !! DROPPED ${d.field} (${d.reason}): ${(guide as any)?.[d.field]}`);
    }
  }

  console.log(`\nFields dropped by the sanitiser across all parties: ${totalDropped}`);
  fs.writeFileSync('journey/org-sim/out/guide-preview.json', JSON.stringify(out, null, 2));
  await app.close();
  process.exit(0);
}

main();
