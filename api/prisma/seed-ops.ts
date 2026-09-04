/**
 * Seeds the back office the Groundwork team runs on.
 *
 * Separate from `seed.ts` on purpose: that one seeds the PRODUCT, this one
 * seeds OUR COMPANY, and they must be runnable and skippable independently.
 * Running this on a database with no product data works, and so does the
 * reverse — which is the whole claim the two systems make about each other.
 */
import { PrismaClient } from '@prisma/client';
import { seedTheFoundations } from '../src/modules/ops/seed-the-foundations';

const prisma = new PrismaClient();

async function main() {
  const counts = await seedTheFoundations(prisma);
  console.log(
    `Ops foundations: ${counts.people} people, ${counts.periods} periods, ${counts.workstreams} workstreams.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
