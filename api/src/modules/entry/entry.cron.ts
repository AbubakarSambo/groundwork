import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { sweepUnverifiedAccounts, UNVERIFIED_MAX_AGE_DAYS } from './unverified-sweep';

/** Housekeeping for server-side entry drafts. A draft that was never
 * verified within the magic-link window (24h) is an abandoned anonymous
 * session - purge it after 48h so unconfirmed transcripts do not linger
 * (ISSUE-17 hygiene). Consumed drafts are kept: they are the idempotency
 * record that maps a commit replay back to its ground. */
@Injectable()
export class EntryCron {
  private readonly logger = new Logger(EntryCron.name);

  constructor(private prisma: PrismaService) {}

  // timeZone pinned to UTC - previously implicit, same fix as grounds.cron.ts.
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async purgeAbandonedDrafts(): Promise<void> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const res = await this.prisma.entryDraft.deleteMany({
      where: { consumedAt: null, updatedAt: { lt: cutoff } },
    });
    if (res.count > 0) this.logger.log(`Purged ${res.count} abandoned entry draft(s)`);
  }

  /**
   * Sweep accounts created by a sign-in-link request that was never confirmed.
   *
   * Asking for a link with an unknown address creates the user and an
   * organisation straight away, before anything is clicked, because an
   * anonymous draft needs somewhere to live. That is the right trade - losing
   * someone's draft at the moment they have just written it is far worse - but
   * it leaves a mistyped or idly-entered address on record indefinitely.
   *
   * Only provably empty accounts go. See sweepUnverifiedAccounts: unverified is
   * not sufficient on its own, because someone can be invited to a ground and
   * contribute without ever clicking their own activation link.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { timeZone: 'UTC' })
  async sweepUnverifiedAccounts(): Promise<void> {
    const r = await sweepUnverifiedAccounts(this.prisma, new Date(), UNVERIFIED_MAX_AGE_DAYS);
    if (r.usersDeleted > 0 || r.skippedNotEmpty > 0) {
      this.logger.log(
        `Unverified sweep: removed ${r.usersDeleted} account(s) and ${r.orgsDeleted} empty org(s); ` +
        `kept ${r.skippedNotEmpty} that had a record.`,
      );
    }
  }
}
