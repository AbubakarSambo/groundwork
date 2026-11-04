import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { onceAcrossCopies } from '../prisma/once-across-copies';
import { EmailService } from '../email/email.service';
import { DAILY_USAGE_JOB, sendTheDailyUsageSummary, theDailyUsageSetting, theDayInLagos, theHourInLagos } from './the-daily-usage-summary';

/**
 * THE DAILY USAGE SUMMARY, once a day at the hour set at Admin, System (eight in the morning in Lagos until somebody changes it). The
 * timer looks every hour, on the hour, and sends only in the hour that is set, and only once a Lagos day across every copy of the API
 * (decision 74, item 7). Changing the hour after today's has gone does not send a second one today. What it counts and says is in
 * the-daily-usage-summary.ts.
 */
@Injectable()
export class TheDailyUsageSummaryCron {
  private readonly logger = new Logger(TheDailyUsageSummaryCron.name);

  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  @Cron('0 * * * *', { timeZone: 'Africa/Lagos' })
  async everyHour(now: Date = new Date()) {
    const setting = await theDailyUsageSetting(this.prisma);
    if (!setting.on || theHourInLagos(now) !== setting.hour) return false;
    let ran = false;
    await this.prisma.withAdvisoryLock(CronLock.DAILY_USAGE, async () => {
      ran = await onceAcrossCopies(this.prisma, DAILY_USAGE_JOB, theDayInLagos(now), () => this.sendNow(now));
    });
    return ran;
  }

  /** The work itself, without the hour, the lock or the once-a-day claim. */
  async sendNow(now: Date = new Date()) {
    const done = await sendTheDailyUsageSummary({ prisma: this.prisma, email: this.email }, now)
      .catch((err: any) => { this.logger.warn(`The daily usage summary could not be put together: ${err?.message}`); return { sent: 0, to: [] as string[] }; });
    if (done.sent) this.logger.log(`Daily usage summary sent to ${done.sent} on the back-office team.`);
    return done;
  }
}
