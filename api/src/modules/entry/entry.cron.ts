import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/** Housekeeping for server-side entry drafts. A draft that was never
 * verified within the magic-link window (24h) is an abandoned anonymous
 * session - purge it after 48h so unconfirmed transcripts do not linger
 * (ISSUE-17 hygiene). Consumed drafts are kept: they are the idempotency
 * record that maps a commit replay back to its ground. */
@Injectable()
export class EntryCron {
  private readonly logger = new Logger(EntryCron.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeAbandonedDrafts(): Promise<void> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const res = await this.prisma.entryDraft.deleteMany({
      where: { consumedAt: null, updatedAt: { lt: cutoff } },
    });
    if (res.count > 0) this.logger.log(`Purged ${res.count} abandoned entry draft(s)`);
  }
}
