/* Local only (untracked): renders what Wanjiru and Njeri read from Release 3, on the local test copy. */
import { PrismaClient } from '@prisma/client';
import { theDirectMorningFor, theParagraph, theEmailParts } from '../../src/modules/engagement/the-direct-morning';
import { whatThisPersonShouldRaise } from '../../src/modules/board/raising-invoices-on-time';
import { theCollectionsBoardFor } from '../../src/modules/board/the-collections-board.service';

(async () => {
  const prisma = new PrismaClient();
  const G = '549a4a9e-4686-4a5f-a612-ebdba4f22c93';
  const g: any = await prisma.ground.findUnique({ where: { id: G }, select: { initiatorId: true, participants: { select: { id: true, userId: true, user: { select: { firstName: true } } } } } });
  const wanjiru = g.participants.find((p: any) => p.userId === g.initiatorId);
  const njeri = g.participants.find((p: any) => p.user?.firstName === 'Njeri');
  const now = new Date();
  const collections = await theCollectionsBoardFor(prisma, G, { runsIt: true, participantId: wanjiru.id } as any, now);
  const m = await theDirectMorningFor(prisma, { groundId: G, leadUserId: g.initiatorId, board: { collections }, now });
  const out: any = {
    whatsapp: m ? theParagraph([m], 1024).text : null,
    email: m ? theEmailParts([m]) : null,
    njeriBlock: (await whatThisPersonShouldRaise(prisma, { groundId: G, participantId: njeri.id }, now)).block,
    wanjiruBlock: (await whatThisPersonShouldRaise(prisma, { groundId: G, participantId: wanjiru.id }, now)).block,
  };
  console.log(JSON.stringify(out, null, 1));
  await prisma.$disconnect();
})();
