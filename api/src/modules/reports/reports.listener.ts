import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds';
import { ReportsService } from './reports.service';
import { EmailService } from '../email/email.service';
import { GroundworkEvents, CheckInCompletedEvent, GroundActivatedEvent } from '../../common';
import { GroundStatus, PartyType } from '@prisma/client';

/**
 * Bridges domain events to report generation. Lives in the reports module so
 * the emitters (conversation, grounds) never import reports — no cycle.
 *
 * Flow:
 *   checkin.completed  -> when ALL parties finish a session:
 *                           sessions 1–4: auto-synthesize and auto-release the report.
 *                           session 5:    request payment from admin; no report generated.
 *   ground.activated   -> billing has started; synthesize if needed then release
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
      const sessionNumber = event.sessionNumber;
      const allDone = await this.grounds.isSessionReadyForReport(event.groundId, sessionNumber);
      if (!allDone) return;

      if (sessionNumber <= 4) {
        this.logger.log(`All parties through session ${sessionNumber} — synthesizing and auto-releasing report for ground ${event.groundId}`);
        await this.reports.synthesize(event.groundId);
        const g = await this.prisma.ground.findUnique({ where: { id: event.groundId }, select: { organizationId: true } });
        if (g) await this.reports.release(event.groundId, g.organizationId);
      } else if (sessionNumber === 5) {
        this.logger.log(`All parties through session 5 — requesting payment for ground ${event.groundId}`);
        const g = await this.prisma.ground.findUnique({ where: { id: event.groundId }, select: { organizationId: true } });
        if (g?.organizationId) {
          await this.grounds
            .requestPaymentForSession5(g.organizationId, event.groundId)
            .catch((err) => this.logger.warn(`requestPaymentForSession5 failed for ground ${event.groundId}: ${err.message}`));
          await this.prisma.ground.update({ where: { id: event.groundId }, data: { status: GroundStatus.REPORT_READY } });
        }
      }
    } catch (err: any) {
      this.logger.error(`Report handling on checkin.completed failed for ground ${event.groundId}: ${err.message}`);
    }
  }

  @OnEvent(GroundworkEvents.GROUND_ACTIVATED)
  async onGroundActivated(event: GroundActivatedEvent) {
    try {
      this.logger.log(`Ground ${event.groundId} activated — synthesizing (if needed) and releasing report`);
      const g = await this.prisma.ground.findUnique({ where: { id: event.groundId }, select: { organizationId: true } });
      if (!g) return;
      // For session 5+, the report hasn't been synthesized yet — do it now on activation.
      const existing = await this.prisma.report.findUnique({ where: { groundId: event.groundId } });
      if (!existing || !existing.releasedAt) {
        await this.reports.synthesize(event.groundId);
      }
      await this.reports.release(event.groundId, g.organizationId);
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
