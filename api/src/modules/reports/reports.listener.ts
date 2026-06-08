import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds';
import { ReportsService } from './reports.service';
import { EmailService } from '../email/email.service';
import { GroundworkEvents, CheckInCompletedEvent, GroundActivatedEvent } from '../../common';
import { PartyType } from '@prisma/client';

/**
 * Bridges domain events to report generation. Lives in the reports module so
 * the emitters (conversation, grounds) never import reports — no cycle.
 *
 * Flow:
 *   checkin.completed  -> if both parties are through session 2, synthesize the
 *                         report (it LOCKS at REPORT_READY behind the paywall).
 *   ground.activated   -> admin has activated and billing has started; release
 *                         the report to both parties simultaneously.
 */
@Injectable()
export class ReportsListener {
  private readonly logger = new Logger(ReportsListener.name);

  constructor(
    private prisma: PrismaService,
    private grounds: GroundsService,
    private reports: ReportsService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(event: CheckInCompletedEvent) {
    try {
      const ready = await this.grounds.isReportReady(event.groundId);
      if (!ready) return;

      // Idempotency: only synthesize once. If a report already exists, skip.
      const existing = await this.prisma.report.findUnique({ where: { groundId: event.groundId } });
      if (existing) return;

      this.logger.log(`Both parties through session 2 — synthesizing report for ground ${event.groundId}`);
      await this.reports.synthesize(event.groundId);
    } catch (err: any) {
      this.logger.error(`Report synthesis on checkin.completed failed for ground ${event.groundId}: ${err.message}`);
    }
  }

  @OnEvent(GroundworkEvents.GROUND_ACTIVATED)
  async onGroundActivated(event: GroundActivatedEvent) {
    try {
      this.logger.log(`Ground ${event.groundId} activated — releasing report to both parties`);
      await this.reports.release(event.groundId);
    } catch (err: any) {
      this.logger.error(`Report release on ground.activated failed for ground ${event.groundId}: ${err.message}`);
    }

    // Notify the participant(s) so they know to return.
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: event.groundId },
        select: { label: true, participants: { include: { user: { select: { email: true, firstName: true } } } } },
      });
      if (!ground) return;

      const frontendUrl = this.config.get<string>('resend.frontendUrl') || 'http://localhost:5173';
      const groundUrl = `${frontendUrl}/grounds/${event.groundId}`;

      const participants = ground.participants.filter((p) => p.partyType === PartyType.PARTICIPANT && p.user);
      await Promise.all(
        participants.map((p) =>
          this.email
            .sendGroundActivated(p.user!.email, p.user!.firstName, ground.label, groundUrl)
            .catch((err: any) => this.logger.error(`Failed to notify participant ${p.user!.email} of activation: ${err.message}`)),
        ),
      );
    } catch (err: any) {
      this.logger.error(`Participant activation notification failed for ground ${event.groundId}: ${err.message}`);
    }
  }
}
