import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GroundStatus, CheckInStatus, PartyType } from '@prisma/client';

const TERMINAL: GroundStatus[] = [GroundStatus.RESOLVED, GroundStatus.CLOSED, GroundStatus.STALLED];
const NUDGE_THROTTLE_DAYS = 3;
const OPEN_STATUSES: CheckInStatus[] = [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS];

@Injectable()
export class GroundsCron {
  private readonly logger = new Logger(GroundsCron.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  /**
   * Daily sweep: transition any ground past its timelineDays to STALLED.
   * Billing stops automatically because the monthly cron only queries ACTIVE grounds.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async stallOverdueGrounds() {
    const candidates = await this.prisma.ground.findMany({
      where: { status: { notIn: TERMINAL } },
      select: { id: true, createdAt: true, timelineDays: true },
    });

    const staleIds = candidates
      .filter((g) => {
        const deadline = new Date(g.createdAt.getTime() + g.timelineDays * 24 * 60 * 60 * 1000);
        return deadline < new Date();
      })
      .map((g) => g.id);

    if (staleIds.length === 0) return;

    await this.prisma.ground.updateMany({
      where: { id: { in: staleIds } },
      data: { status: GroundStatus.STALLED },
    });

    this.logger.warn(`Stalled ${staleIds.length} overdue ground(s): ${staleIds.join(', ')}`);
  }

  /**
   * Daily reminders (B1) — grounds die silently without them. Two kinds, both
   * throttled to once per NUDGE_THROTTLE_DAYS per party via lastNudgedAt:
   *   1. Return-nudge: an accepted party with an open, now-due session that
   *      hasn't been completed — bring them back.
   *   2. Activation reminder: a REPORT_READY ground the admin hasn't activated —
   *      remind the initiator the report is waiting.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminders() {
    const now = new Date();
    const throttleBefore = new Date(now.getTime() - NUDGE_THROTTLE_DAYS * 24 * 60 * 60 * 1000);
    const frontend = this.config.get<string>('resend.frontendUrl') || '';

    // 1. Return-nudges to idle accepted parties with a due, open session.
    const idleParties = await this.prisma.groundParticipant.findMany({
      where: {
        userId: { not: null },
        ground: { status: { notIn: TERMINAL } },
        OR: [{ lastNudgedAt: null }, { lastNudgedAt: { lt: throttleBefore } }],
        checkIns: { some: { status: { in: OPEN_STATUSES } } },
      },
      select: {
        id: true,
        email: true,
        ground: { select: { label: true } },
        checkIns: {
          where: { status: { in: OPEN_STATUSES } },
          orderBy: { sessionNumber: 'asc' },
          take: 1,
          select: { id: true, availableFrom: true },
        },
      },
    });

    let returnNudges = 0;
    for (const p of idleParties) {
      const ci = p.checkIns[0];
      if (!ci) continue;
      if (ci.availableFrom && ci.availableFrom > now) continue; // not due yet
      try {
        await this.email.sendNudge(p.email, p.ground.label, `${frontend}/checkin/${ci.id}`);
        await this.prisma.groundParticipant.update({ where: { id: p.id }, data: { lastNudgedAt: now } });
        returnNudges++;
      } catch (err: any) {
        this.logger.error(`Return-nudge failed for participant ${p.id}: ${err.message}`);
      }
    }

    // 2. Activation reminders to admins sitting on an unactivated report.
    const reportReady = await this.prisma.ground.findMany({
      where: { status: GroundStatus.REPORT_READY, billingActivatedAt: null },
      select: {
        id: true,
        label: true,
        participants: {
          where: { partyType: PartyType.INITIATOR },
          select: { id: true, email: true, lastNudgedAt: true },
          take: 1,
        },
      },
    });

    let activationNudges = 0;
    for (const g of reportReady) {
      const initiator = g.participants[0];
      if (!initiator) continue;
      if (initiator.lastNudgedAt && initiator.lastNudgedAt >= throttleBefore) continue;
      try {
        await this.email.sendActivationReminder(initiator.email, g.label, `${frontend}/grounds/${g.id}`);
        await this.prisma.groundParticipant.update({ where: { id: initiator.id }, data: { lastNudgedAt: now } });
        activationNudges++;
      } catch (err: any) {
        this.logger.error(`Activation reminder failed for ground ${g.id}: ${err.message}`);
      }
    }

    if (returnNudges || activationNudges) {
      this.logger.log(`Reminders sent — ${returnNudges} return-nudge(s), ${activationNudges} activation reminder(s).`);
    }
  }
}
