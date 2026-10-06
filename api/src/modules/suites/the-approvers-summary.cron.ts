import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';

/**
 * ONCE A DAY, EACH APPROVER IS TOLD WHAT WAITS FOR THEM, ONCE (suites at scale; the-approvals-summary.ts).
 *
 * Half past seven in the morning in Lagos, half an hour after the lead's daily summary, so a lead who has had that one has had their
 * message of the day, and this one is held for them (it says nothing they have not read, because the lead's summary counts what
 * waits for them to approve). Only what has not been said to the person yet is counted as new. Once across every copy of the API
 * (decision 74, item 7), so nobody is written to twice.
 */
@Injectable()
export class TheApproversSummaryCron {
  private readonly logger = new Logger(TheApproversSummaryCron.name);

  constructor(private readonly prisma: PrismaService, private readonly told: ARequestToldOnWhatsApp) {}

  @Cron('30 7 * * *', { timeZone: 'Africa/Lagos' })
  async tellApproversWhatWaits() {
    await onceAcrossCopies(this.prisma, 'tell-approvers-what-waits', theDay(), () => this.tellNow());
  }

  /** The work itself, without the once-a-day claim, for the spec. */
  async tellNow(now: Date = new Date()): Promise<{ whatsapp: number; email: number; held: number }> {
    const done = await this.told.theMorningSweep(now).catch((err: any) => { this.logger.warn(`Could not tell approvers what waits for them: ${err?.message}`); return { whatsapp: 0, email: 0, held: 0 }; });
    if (done.whatsapp || done.email) this.logger.log(`Approvers told what waits for them: ${done.whatsapp} on WhatsApp, ${done.email} by email.`);
    return done;
  }
}
