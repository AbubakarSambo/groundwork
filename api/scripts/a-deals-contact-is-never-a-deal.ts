/**
 * A PERSON NAMED AS A DEAL'S CONTACT IS NEVER A DEAL, FOR A TEST ORGANISATION'S DEALS ALREADY ON RECORD (Drop Access short run,
 * item 8). The board listener now folds a deal named as a person ("Mr Kariuki") into the deal it is about (Juja Hardware) when a
 * check-in completes; deals kept before it did are read here with the same rule (a-deals-contact-is-never-a-deal), from the
 * record and the check-in's own turns. No model is called. Only an organisation whose name ends in "(test)". Says what it would
 * do without --yes. The person-named row is removed; the line it came from stays on the record.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/a-deals-contact-is-never-a-deal.ts "Drop Access (test)" --yes
 */
import { PrismaClient } from '@prisma/client';
import { aDealNamedAsAPerson, theDealThePersonIsAt, thePersonsDetailsOnTheDeal, theQuestionBefore } from '../src/modules/board/a-deals-contact-is-never-a-deal';
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
      const deals = (await (prisma as any).workItem.findMany({ where: { groundId: g.id, kind: 'deal' }, orderBy: { createdAt: 'asc' } })) as any[];
      for (const d of deals.filter((x) => aDealNamedAsAPerson(x))) {
        const line = d.sourceEntryId ? await prisma.recordEntry.findUnique({ where: { id: d.sourceEntryId }, select: { text: true, checkInId: true, participantId: true } as any }) as any : null;
        const turns = line?.checkInId ? await prisma.conversationTurn.findMany({ where: { checkInId: line.checkInId }, orderBy: { createdAt: 'asc' }, select: { role: true, content: true } }) : [];
        const owner = line?.participantId ?? d.ownerParticipantId ?? null;
        const at = theDealThePersonIsAt(d, deals.filter((x) => (x.ownerParticipantId ?? null) === owner), theQuestionBefore(turns as any[], String(line?.text ?? '')));
        if (!at) { console.log(`${g.label}: "${d.name}" is named as a person, and no deal is surely theirs. Left as it is.`); continue; }
        console.log(`${g.label}: "${d.name}" is ${at.name}'s contact. ${yes ? 'Folded into it.' : 'Would fold into it (add --yes).'}`);
        if (yes) {
          await (prisma as any).workItem.update({ where: { id: at.id }, data: { fields: thePersonsDetailsOnTheDeal(at, d) } });
          await (prisma as any).workItem.delete({ where: { id: d.id } });
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
