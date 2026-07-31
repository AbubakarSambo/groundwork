import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { BoardService } from '../src/modules/board/board.service';
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService); const board = app.get(BoardService);
  const g = await prisma.ground.findFirst({ orderBy: { createdAt: 'desc' } });
  const b: any = await board.get(g!.id, g!.initiatorId);
  console.log('CONTRIBUTION CARDS:');
  for (const c of b.contribution ?? []) {
    console.log(`  ${String(c.name).padEnd(20)} remitDefined=${c.remitDefined} fn=${c.fnLabel ?? '-'} note=${(c.note ?? '').slice(0,80)}`);
    if (c.reason) console.log(`      ${c.reason}`);
  }
  await app.close(); process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
