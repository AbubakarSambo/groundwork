import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { EmailService } from './email.service';
import { sendTheDailyDeliveryAlert } from '../engagement/the-daily-delivery-alert';

/**
 * THE DAILY DELIVERY ALERT, at half past seven in the morning in Nairobi (East Africa Time), so Hafsah can act before the team's day
 * starts. It reads the whole of yesterday in Nairobi, so yesterday's lead's summaries (nine in Lagos) and anything held overnight have
 * had their chance. Its own lock, and once across every copy of the API
 * (decision 74, item 7), so the platform address is written to once. What it reads and says is in engagement/the-daily-delivery-alert.ts.
 */
@Injectable()
export class TheDailyDeliveryAlertCron {
  private readonly logger = new Logger(TheDailyDeliveryAlertCron.name);

  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  @Cron('30 7 * * *', { timeZone: 'Africa/Nairobi' })
  async sendTheDailyDeliveryAlert() {
    await this.prisma.withAdvisoryLock(CronLock.DELIVERY_ALERT, async () => {
      await onceAcrossCopies(this.prisma, 'daily-delivery-alert', theDay(), () => this.sendNow());
    });
  }

  /** The work itself, without the lock or the once-a-day claim, for the spec. */
  async sendNow(now: Date = new Date()) {
    const done = await sendTheDailyDeliveryAlert({ prisma: this.prisma, email: this.email }, now)
      .catch((err: any) => { this.logger.warn(`The daily delivery alert could not be put together: ${err?.message}`); return { sent: false, to: null, organisations: 0 }; });
    if (done.sent) this.logger.log(`Daily delivery alert sent, about ${done.organisations} organisations.`);
    return done;
  }
}
