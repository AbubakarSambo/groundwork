import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { theQuietHoursNow } from '../../common/the-clock';

/**
 * A MAIL HELD FOR QUIET HOURS IS SENT WHEN ITS MOMENT COMES. The other half of nothing-lands-at-3am:
 * without this, honouring quiet hours for every sender would silently delete mail at scale. Every
 * fifteen minutes, whatever is due goes, oldest first, and is marked sent so it goes once.
 */
@Injectable()
export class HeldMailCron {
  private readonly logger = new Logger(HeldMailCron.name);

  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  @Cron('*/15 * * * *', { timeZone: 'UTC' })
  async sendWhatIsDue() {
    await this.prisma.withAdvisoryLock(CronLock.HELD_MAIL, async () => {
      /* Due by its moment, or held for quiet hours and no longer quiet: the person's hours and zone are read as they are now, so widening them lets it go. */
      const candidates = await this.prisma.scheduledEmail.findMany({
        where: { sentAt: null, OR: [{ notBefore: { lte: theQuietHoursNow() } }, { context: { path: ['heldFor'], equals: 'quiet-hours' } }] },
        orderBy: { notBefore: 'asc' },
        take: 200,
      });
      const due: typeof candidates = [];
      for (const row of candidates) {
        if (row.notBefore.getTime() <= theQuietHoursNow().getTime() || await this.email.mayGoNow(row.toAddress)) due.push(row);
      }
      for (const row of due) {
        /*
         * CLAIMED BEFORE IT IS SENT, SO ONE HELD MAIL IS ONE DECISION (messages test, 19 October, finding 3). On Thursday 15 October
         * the held "Three of four people have checked in for the third check-in on "Sales team, Q4", and here is what is new" reached
         * Grace half an hour after her WhatsApp summary, while a row for the same email said "suppressed": two runs read the same
         * row before either marked it, one sent it and the other then found her day's message gone. The row is now taken first, by
         * the one run that marks it, and only that run asks the day's rules, at the moment of sending, and sends or holds it back.
         */
        const claimed = await this.prisma.scheduledEmail.updateMany({ where: { id: row.id, sentAt: null }, data: { sentAt: new Date() } }).catch(() => ({ count: 0 }));
        if (!claimed?.count) continue;
        try {
          await this.email.deliverHeld(row);
        } catch (err: any) {
          /* Not sent: let go of it, so the next run tries again. */
          await this.prisma.scheduledEmail.updateMany({ where: { id: row.id }, data: { sentAt: null } }).catch(() => undefined);
          this.logger.error(`Held mail ${row.id} to ${row.toAddress} could not be sent: ${err?.message}`);
        }
      }
      if (due.length) this.logger.log(`Sent ${due.length} held mail(s).`);
    });
  }
}
