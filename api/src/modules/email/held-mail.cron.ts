import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { EmailService } from './email.service';

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
      const due = await this.prisma.scheduledEmail.findMany({
        where: { sentAt: null, notBefore: { lte: new Date() } },
        orderBy: { notBefore: 'asc' },
        take: 200,
      });
      for (const row of due) {
        try {
          await this.email.deliverHeld(row);
          await this.prisma.scheduledEmail.update({ where: { id: row.id }, data: { sentAt: new Date() } });
        } catch (err: any) {
          this.logger.error(`Held mail ${row.id} to ${row.toAddress} could not be sent: ${err?.message}`);
        }
      }
      if (due.length) this.logger.log(`Sent ${due.length} held mail(s).`);
    });
  }
}
