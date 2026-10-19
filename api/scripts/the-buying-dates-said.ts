/**
 * THE BUYING DATES SAID, FILED ON THEIR DEALS, FOR A TEST ORGANISATION'S CHECK-INS ALREADY ON RECORD (Hafsah's point 6,
 * 17 October). The board listener files a customer's buying date on the deal when a check-in completes; check-ins that
 * completed before it did are read here, with the same rule (board.listener's fileTheBuyingDatesSaid), from the lines on
 * record. No model is called. Only an organisation whose name ends in "(test)". Says what it would do without --yes.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-buying-dates-said.ts "Drop Access (test)" --yes
 */
import { PrismaClient } from '@prisma/client';
import { theBuyingDateTheySaid, BUYING_DATE } from '../src/modules/board/a-deals-value-and-buying-date';
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
    const grounds = await prisma.ground.findMany({ where: { organization: { name } }, select: { id: true, label: true } });
    for (const g of grounds) {
      const deals = await (prisma as any).workItem.findMany({ where: { groundId: g.id, kind: 'deal' }, select: { id: true, name: true, fields: true, ownerParticipantId: true } });
      const lines = await prisma.recordEntry.findMany({ where: { disputedAt: null, participant: { groundId: g.id } }, select: { text: true, participantId: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
      for (const d of deals as any[]) {
        const day = theBuyingDateTheySaid({ name: d.name, ownerParticipantId: d.ownerParticipantId, fields: d.fields }, lines);
        if (!day || d.fields?.[BUYING_DATE] === day) continue;
        console.log(`${g.label}: ${d.name}, buying date ${day}. ${yes ? 'Filed.' : 'Would file (add --yes).'}`);
        if (yes) await (prisma as any).workItem.update({ where: { id: d.id }, data: { fields: { ...(d.fields ?? {}), [BUYING_DATE]: day } } });
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
