import { PrismaClient } from '@prisma/client';
import { SEED_PROMPTS } from '../src/modules/conversation/prompt-library';

const prisma = new PrismaClient();

/**
 * Seeds and activates the versioned prompts the engine loads — the exact Part 3
 * wording lives in src/modules/conversation/prompt-library.ts (the canonical
 * source). Every change there should be a NEW version, versioned against
 * outcome data, then activated deliberately. Re-running this seed is a no-op for
 * keys that already exist.
 */
async function main() {
  // Seed a demo organisation so the system has a concrete anchor for manual testing.
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Organisation',
      slug: 'demo',
      companyStage: 'EARLY_REVENUE',
    },
  });
  console.log(`org "${demoOrg.slug}" ready (id: ${demoOrg.id})`);

  for (const { key, content } of SEED_PROMPTS) {
    const existing = await prisma.promptVersion.findFirst({ where: { key }, orderBy: { version: 'desc' } });
    if (existing) {
      console.log(`prompt "${key}" already exists (v${existing.version}) — skipping`);
      continue;
    }
    const created = await prisma.promptVersion.create({
      data: { key, version: 1, content, isActive: true, activatedAt: new Date() },
    });
    console.log(`seeded prompt "${key}" v${created.version} (active, ${content.length} chars)`);
  }

  // Sample pattern benchmarks — anonymised cross-org baselines.
  await prisma.patternBenchmark.createMany({
    data: [
      {
        code: 'D1',
        orgStage: 'EARLY_REVENUE',
        teamSizeRange: '2-10',
        outcomeType: 'RESOLVED',
        periodsToOutcome: 3,
        moment: 'STARTING',
      },
      {
        code: 'B4',
        orgStage: 'SCALING',
        teamSizeRange: '11-50',
        outcomeType: 'STALLED',
        periodsToOutcome: 6,
        moment: 'RESOLUTION',
      },
    ],
    skipDuplicates: true,
  });
  console.log('seeded 2 sample pattern benchmarks');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
