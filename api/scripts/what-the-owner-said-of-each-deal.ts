/**
 * WHAT EACH DEAL'S OWNER SAID OF IT, FILED ON THE DEAL, FOR A TEST ORGANISATION'S CHECK-INS ALREADY ON RECORD (Hafsah's quality
 * pass, 18 October). The board listener does this when a sales check-in completes (fileWhatTheOwnerSaid); check-ins that
 * completed before it did are read here, in the order they completed, with the same rule. No model is called, and the
 * organisation's aims are counted from the deals again afterwards. Only an organisation whose name ends in "(test)". Says what it
 * would do without --yes.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/what-the-owner-said-of-each-deal.ts "Drop Access (test)" --yes
 */
import { PrismaClient } from '@prisma/client';
import { BoardListener } from '../src/modules/board/board.listener';
import { whatTheOwnerSaidOfEachDeal } from '../src/modules/board/what-the-owner-said-of-each-deal';
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
    /* No model is called: the listener's model is never reached by the two methods used here. */
    const listener = new BoardListener(prisma as any, null as any);
    const grounds = await prisma.ground.findMany({ where: { organization: { name } }, select: { id: true, label: true, participants: { select: { id: true, user: { select: { firstName: true } } } } } });
    for (const g of grounds) {
      const checkIns = await prisma.checkIn.findMany({ where: { status: 'COMPLETED', participant: { groundId: g.id } }, select: { id: true, participantId: true, sessionNumber: true, completedAt: true }, orderBy: { completedAt: 'asc' } });
      for (const c of checkIns) {
        if (!yes) {
          const deals = await (prisma as any).workItem.findMany({ where: { groundId: g.id, kind: 'deal', ownerParticipantId: c.participantId }, select: { id: true, name: true, stage: true, fields: true } });
          const turns = await prisma.conversationTurn.findMany({ where: { checkInId: c.id }, orderBy: { createdAt: 'asc' }, select: { role: true, content: true, createdAt: true } });
          const said = whatTheOwnerSaidOfEachDeal(deals, turns as any, g.participants.map((p: any) => p.user?.firstName ?? ''));
          for (const [id, w] of said) console.log(`${g.label}: ${deals.find((d: any) => d.id === id)?.name}, ${JSON.stringify(w)}. Would file (add --yes).`);
          continue;
        }
        const n = await listener.fileWhatTheOwnerSaid(g.id, c.id, c.sessionNumber ?? null, c.completedAt ?? new Date());
        if (n) console.log(`${g.label}: check-in ${c.id} (session ${c.sessionNumber}), ${n} deal(s) filed.`);
      }
      if (yes) console.log(`${g.label}: aims counted from the deals again (${[...(await listener.countTheAimsFromTheDeals(g.id, null))].length}).`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
