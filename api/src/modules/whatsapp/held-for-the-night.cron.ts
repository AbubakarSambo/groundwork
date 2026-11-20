import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { theQuietHoursNow } from '../../common/the-clock';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

/**
 * A WHATSAPP MESSAGE HELD FOR THE NIGHT IS SENT WHEN ITS MORNING COMES (quiet-hours-are-the-organisations.ts). Every fifteen minutes,
 * whatever is due goes, oldest first, through the same door as any message Groundwork starts, so STOP, "Not now", one a day and the
 * 24 hours are asked again. It is marked done whatever became of it, so it is tried once and never sent twice.
 */
@Injectable()
export class HeldForTheNightCron {
  private readonly logger = new Logger(HeldForTheNightCron.name);

  constructor(private readonly prisma: PrismaService, private readonly whatsapp: WhatsAppService) {}

  @Cron('*/15 * * * *', { timeZone: 'UTC' })
  async sendWhatIsDue(now: Date = theQuietHoursNow()): Promise<number> {
    let sent = 0;
    await this.prisma.withAdvisoryLock(CronLock.HELD_WHATSAPP, async () => {
      const due = await (this.prisma as any).scheduledWhatsApp.findMany({
        where: { sentAt: null, notBefore: { lte: now } },
        orderBy: { notBefore: 'asc' },
        take: 200,
      });
      for (const row of due) {
        try {
          /* Marked first, so a send that throws halfway is never repeated by the next pass. Taken only where nobody has taken it yet, so
             two runs that read the same row never both send it (messages test, 19 October, finding 3, the same race as the held email). */
          const held = (this.prisma as any).scheduledWhatsApp;
          const taken = typeof held.updateMany === 'function'
            ? ((await held.updateMany({ where: { id: row.id, sentAt: null }, data: { sentAt: new Date() } }))?.count ?? 0)
            : ((await held.update({ where: { id: row.id }, data: { sentAt: new Date() } })), 1);
          if (!taken) continue;
          const went = await this.whatsapp.sendHeldForTheNight(row);
          if (went.sent) sent++;
        } catch (err: any) {
          this.logger.error(`Held WhatsApp message ${row.id} could not be sent: ${err?.message}`);
        }
      }
      if (due.length) this.logger.log(`Tried ${due.length} WhatsApp message(s) held for the night; ${sent} went.`);
    });
    return sent;
  }
}
