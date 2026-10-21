/**
 * WHAT IS WAITED FOR, WITHOUT "HER" OR "HIS" ABOUT THE PERSON WAITED ON, FOR A TEST ORGANISATION'S WAITS ALREADY ON RECORD (Drop
 * Access run 1, A7). A wait is written that way now (theThingWaitedFor); waits written before are read here with the same rule.
 * No model is called. Only an organisation whose name ends in "(test)". Says what it would do without --yes.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-waits-said-without-her.ts "Drop Access (test)" --yes
 */
import { PrismaClient } from '@prisma/client';
import { theThingWaitedFor } from '../src/modules/board/a-wait-said-in-full';
import { ONLY_A_TEST_ORGANISATION } from './the-release-one-sales-board';

async function main() {
  const [name] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const yes = process.argv.includes('--yes');
  if (!name || !ONLY_A_TEST_ORGANISATION.test(name)) {
    console.log('Give a test organisation\'s name, ending in "(test)", for example: "Drop Access (test)" --yes');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const waits = await prisma.groundDependency.findMany({ where: { ground: { organization: { name } }, onParticipantId: { not: null } }, select: { id: true, what: true, onParticipantId: true } });
    for (const w of waits) {
      const what = theThingWaitedFor(w.what, w.onParticipantId);
      if (what === w.what) continue;
      console.log(`"${w.what}" becomes "${what}". ${yes ? 'Kept.' : 'Would keep (add --yes).'}`);
      if (yes) await prisma.groundDependency.update({ where: { id: w.id }, data: { what } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
