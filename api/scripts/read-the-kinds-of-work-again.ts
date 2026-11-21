/**
 * READ AGAIN THE KIND OF WORK OF EVERY CHECK-IN WHOSE SAVED KIND IS NOT ONE OF THE FIFTEEN (Hafsah, 21 November 2026).
 *
 * "a sales team", "a project", "where next" and the like were saved on check-ins, matched none of the fifteen kinds, and every board
 * read them as no kind at all, so a sales team got the general board. Each such check-in is read again by the one reading setup uses
 * (GroundsService.readTheKindOfWork: the model reads the lead's words, the brief and the people's job titles, and may only answer one
 * of the fifteen or none). A kind the lead chose is never touched. Says what it would do without --yes.
 *
 *   DATABASE_URL=... npx ts-node -P tsconfig.json --transpile-only scripts/read-the-kinds-of-work-again.ts            (counts only)
 *   DATABASE_URL=... npx ts-node -P tsconfig.json --transpile-only scripts/read-the-kinds-of-work-again.ts --yes      (reads them)
 *   ... --label "Sales team, Q4" --yes                                                                                (one check-in)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { GroundsService } from '../src/modules/grounds/grounds.service';
import { oneOfTheKinds } from '../src/modules/board/the-kind-of-work';

async function main() {
  const yes = process.argv.includes('--yes');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    const grounds = app.get(GroundsService);
    const saved = await prisma.ground.findMany({ where: { kindOfWork: { not: null } }, select: { id: true, label: true, kindOfWork: true, kindOfWorkSetBy: true } });
    const only = process.argv.includes('--label') ? process.argv[process.argv.indexOf('--label') + 1] : null;
    const notAKind = saved.filter((g) => !oneOfTheKinds(g.kindOfWork) && g.kindOfWorkSetBy !== 'lead' && (!only || g.label === only));
    console.log(`${saved.length} check-ins have a kind of work saved. ${notAKind.length} of them hold words that are not one of the fifteen kinds.`);
    for (const g of notAKind) {
      if (!yes) { console.log(`Would read again: ${g.label} ("${g.kindOfWork}")`); continue; }
      /* The reading writes only where nobody chose it, so a saved kind that is not a kind is cleared first, as never read. */
      await prisma.ground.updateMany({ where: { id: g.id, OR: [{ kindOfWorkSetBy: null }, { kindOfWorkSetBy: { not: 'lead' } }] }, data: { kindOfWork: null, kindOfWorkSetBy: null } });
      await grounds.readTheKindOfWork(g.id);
      const now = await prisma.ground.findUnique({ where: { id: g.id }, select: { kindOfWork: true } });
      console.log(`${g.label}: "${g.kindOfWork}" is now ${now?.kindOfWork ? `"${now.kindOfWork}"` : 'no kind of work'}.`);
    }
    /* A kind read where there was none sends the finished check-ins to be read for their records (BoardListener.onKindOfWorkRead);
       that runs on its own after each read, so the script waits for it before it closes. */
    if (yes && notAKind.length) await new Promise((r) => setTimeout(r, Number(process.env.WAIT_FOR_THE_RECORDS_MS ?? 180_000)));
  } finally {
    await app.close();
  }
}

if (require.main === module) void main();
