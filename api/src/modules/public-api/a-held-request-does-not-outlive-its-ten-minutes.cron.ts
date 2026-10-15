import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock, PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';

/**
 * NIGHTLY, ANYTHING HELD FOR A YES OR A NO PAST ITS TEN MINUTES IS PUT AWAY (decision 110, P12). See
 * `WhatsAppForAnOrganisationService.putAwayWordsHeldTooLong`: the words go into the check-in they were held from, as a no does, and are not
 * kept. Once across every copy of the API, and under the job lock, so two copies never put the same words in twice.
 */
@Injectable()
export class HeldRequestsCron {
  private readonly logger = new Logger(HeldRequestsCron.name);

  constructor(private readonly prisma: PrismaService, private readonly whatsapp: WhatsAppForAnOrganisationService) {}

  @Cron('15 3 * * *', { timeZone: 'UTC' })
  async putAwayWhatWasHeldTooLong() {
    await onceAcrossCopies(this.prisma, 'put-away-held-requests', theDay(), () => this.prisma.withAdvisoryLock(CronLock.HELD_REQUESTS, async () => {
      try {
        const out = await this.whatsapp.putAwayWordsHeldTooLong();
        if (out.cleared) this.logger.log(`Put away ${out.cleared} held request(s) past their ten minutes; ${out.putIn} went into their check-in.`);
      } catch (err: any) {
        this.logger.warn(`Putting away held requests failed: ${err?.message}`);
      }
    }));
  }
}
