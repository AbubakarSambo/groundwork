/**
 * THE LEAD'S ANSWER ON A PRICE RANGE, SAID IN HER OWN CHECK-IN, KEPT IN HOW WE WORK, FOR A TEST ORGANISATION'S CHECK-INS ALREADY ON
 * RECORD (Drop Access run 1, A6). The board listener keeps it when a check-in completes (fileTheLeadsRangeAnswer); check-ins that
 * completed before it did are read here, with the same rule and the same line as the board's Yes or No, from the lines on record.
 * No model is called. Only an organisation whose name ends in "(test)". Says what it would do without --yes.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-leads-range-answer-said.ts "Drop Access (test)" --yes
 */
import { PrismaClient } from '@prisma/client';
import { thePriceRangeAnswer, theLeadsRangeAnswerIn, THE_RANGE_QUESTION } from '../src/modules/board/a-deals-four-criteria';
import { theAnswerAsALine } from '../src/modules/board/what-needs-you-and-what-to-do';
import { isASalesKind, oneOfTheKinds } from '../src/modules/board/the-kind-of-work';
import { cleanText } from '../src/modules/reports/what-the-record-actually-holds';
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
    const grounds = await prisma.ground.findMany({ where: { organization: { name } }, select: { id: true, label: true, kindOfWork: true, initiatorId: true, participants: { select: { id: true, userId: true, partyType: true } } } as any }) as any[];
    for (const g of grounds) {
      if (!isASalesKind(oneOfTheKinds(g.kindOfWork)) || !g.initiatorId) continue;
      if (await thePriceRangeAnswer(prisma, g.id)) { console.log(`${g.label}: answered already.`); continue; }
      const leads = (g.participants as any[]).filter((p) => p.userId === g.initiatorId || p.partyType === 'INITIATOR').map((p) => p.id);
      const lines = await prisma.recordEntry.findMany({ where: { participantId: { in: leads }, disputedAt: null }, select: { text: true, createdAt: true } });
      const answer = theLeadsRangeAnswerIn(lines.map((l) => ({ text: cleanText(l.text ?? ''), createdAt: l.createdAt })));
      if (!answer) { console.log(`${g.label}: the lead has not answered it in a check-in.`); continue; }
      const text = theAnswerAsALine(THE_RANGE_QUESTION, answer === 'yes');
      console.log(`${g.label}: "${text}" ${yes ? 'Kept.' : 'Would keep (add --yes).'}`);
      if (yes) await (prisma as any).groundContextItem.create({ data: { groundId: g.id, kind: 'WAY_OF_WORKING', text, audience: 'EVERYONE', source: 'CHECK_IN', authorUserId: g.initiatorId } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
