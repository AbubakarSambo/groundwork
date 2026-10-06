import { Injectable, Logger } from '@nestjs/common';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { Cron } from '@nestjs/schedule';
import { PrismaService, CronLock } from '../prisma/prisma.service';

/**
 * THE SIGN-IN CODES NOBODY REDEEMED. A code is deleted when it is used; one the browser never came
 * back for sits past its minute until this sweeps it. Daily is plenty: the table is small and an
 * expired row cannot be redeemed.
 */
@Injectable()
export class AuthCron {
  private readonly logger = new Logger(AuthCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 4 * * *', { timeZone: 'UTC' })
  async pruneOAuthExchangeCodes() {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'prune-oauth-exchange-codes', theDay(), () => this.pruneOAuthExchangeCodesHere());
  }

  private async pruneOAuthExchangeCodesHere() {
    await this.prisma.withAdvisoryLock(CronLock.OAUTH_CODES, async () => {
      const gone = await this.prisma.oAuthExchangeCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      if (gone.count) this.logger.log(`Pruned ${gone.count} expired sign-in code(s).`);
    });
  }
}
