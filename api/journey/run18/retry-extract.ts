import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { ConversationService } from '../../src/modules/conversation/conversation.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const conv = app.get(ConversationService);

  const p = await prisma.groundParticipant.findFirst({ where: { email: 'abubakar@meridian.test' } });
  const ci = await prisma.checkIn.findFirst({ where: { participantId: p!.id, sessionNumber: 1 } });

  for (let i = 1; i <= 3; i++) {
    await prisma.recordEntry.deleteMany({ where: { checkInId: ci!.id } });
    await conv.extractRecordEntries(ci!.id, p!.id);
    const n = await prisma.recordEntry.count({ where: { checkInId: ci!.id } });
    const rows = await prisma.recordEntry.findMany({ where: { checkInId: ci!.id }, select: { type: true, text: true } });
    console.log(`attempt ${i}: ${n} entries`, rows.map(r => `${r.type}: ${r.text.slice(0, 70)}`));
  }
  await app.close(); process.exit(0);
}
main();
