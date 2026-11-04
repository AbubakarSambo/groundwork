import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { ConversationService } from './conversation.service';
import { theWritesOwedIn, type AnOwedWrite } from './a-write-is-owed-until-it-lands';

/**
 * THE SCHEDULED PASS OVER WHAT IS OWED (a-write-is-owed-until-it-lands.ts). Every five minutes, every write a check-in still owes whose
 * time has come is run again. One that lands is cleared; one that fails again is owed again, with a longer wait, and is never dropped.
 */
@Injectable()
export class TheOwedWritesCron {
  private readonly logger = new Logger(TheOwedWritesCron.name);

  constructor(private readonly prisma: PrismaService, private readonly conversation: ConversationService) {}

  @Cron('*/5 * * * *', { timeZone: 'UTC' })
  async writeWhatIsOwed(now: Date = new Date()): Promise<number> {
    let tried = 0;
    await this.prisma.withAdvisoryLock(CronLock.OWED_WRITES, async () => {
      tried = await writeEverythingOwed(this.prisma, this.conversation, now, this.logger);
    });
    return tried;
  }
}

/** The pass itself, apart from the lock, so a test can run it. Returns how many writes it tried. */
export async function writeEverythingOwed(
  prisma: any,
  conversation: Pick<ConversationService, 'writeWhatIsOwed'>,
  now: Date,
  logger?: { log: (m: string) => void; warn: (m: string) => void },
): Promise<number> {
  const rows = ((await prisma.checkIn.findMany({
    where: { writesOwed: { not: Prisma.DbNull } },
    select: { id: true, participantId: true, groundId: true, sessionNumber: true, writesOwed: true },
    take: 50,
  }).catch(() => [])) ?? []) as { id: string; participantId: string; groundId: string; sessionNumber: number; writesOwed: unknown }[];
  let tried = 0;
  for (const row of rows) {
    const due = theWritesOwedIn(row.writesOwed).filter((w: AnOwedWrite) => new Date(w.nextTryAt).getTime() <= now.getTime());
    for (const write of due) {
      tried += 1;
      await conversation.writeWhatIsOwed(row, write).catch((err: any) => logger?.warn(`Check-in ${row.id}: ${write.step} could not be tried again: ${err?.message ?? err}`));
    }
  }
  if (tried) logger?.log(`Tried ${tried} owed write(s) again.`);
  return tried;
}
