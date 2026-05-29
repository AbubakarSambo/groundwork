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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
