import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CheckInStatus } from '@prisma/client';

// Day thresholds (in whole days since createdAt) that trigger scheduled nudges.
const NUDGE_DAY_THRESHOLDS = [3, 7, 14];

@Injectable()
export class RemindService {
  private readonly logger = new Logger(RemindService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  /**
   * Send a nudge email to every participant on the ground who has NOT yet
   * completed a check-in for the current session. Only the requesting user -
   * who must themselves be a party to this ground - may trigger a reminder.
   *
   * The check-in id is used as the lookup key because the front-end typically
   * knows the check-in id, not the ground id.
   *
   * #34: If the other party has already completed their check-in, the nudge
   * email includes a note that their version is the only thing missing.
   */
  async sendReminder(checkInId: string, requestingUserId: string): Promise<{ sent: boolean; count: number }> {
    // Load the check-in to get the ground.
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: { groundId: true, sessionNumber: true },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');

    const ground = await this.prisma.ground.findUnique({
      where: { id: checkIn.groundId },
      select: { id: true, label: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');

    // Verify the requesting user is a party to this ground.
    const requesterLink = await this.prisma.groundParticipant.findFirst({
      where: { groundId: ground.id, userId: requestingUserId },
    });
    if (!requesterLink) {
      throw new ForbiddenException('You are not a party to this ground');
    }

    // Find all OTHER participants who have accepted their invite (userId set)
    // but have NOT completed a check-in for the same session number. Exclude
    // the requester themselves - clicking "remind" nudges the other party,
    // never a self-addressed reminder to complete your own check-in.
    const allParticipants = await this.prisma.groundParticipant.findMany({
      where: { groundId: ground.id, userId: { not: null, notIn: [requestingUserId] } },
      select: {
        id: true,
        email: true,
        userId: true,
        lastNudgedAt: true,
        user: { select: { firstName: true, emailNotifications: true } },
        checkIns: {
          where: { sessionNumber: checkIn.sessionNumber },
          select: { id: true, status: true },
        },
      },
    });

    // #34: Determine whether the other party has already completed their check-in.
    const otherPartyCompleted = allParticipants.some((p) => {
      const session = p.checkIns[0];
      return session && session.status === CheckInStatus.COMPLETED;
    });

    const incomplete = allParticipants.filter((p) => {
      const session = p.checkIns[0];
      return !session || session.status !== CheckInStatus.COMPLETED;
    });

    let count = 0;
    const frontendUrl = (this.email as any).frontendUrl ?? 'http://localhost:5173';

    for (const participant of incomplete) {
      // Respect "Ground invites and reminders" being turned off - a reminder
      // email is exactly what that setting describes ("check-in is due").
      if (participant.user?.emailNotifications === false) continue;

      // Throttle: do not nudge the same participant more than once per 24 h.
      if (participant.lastNudgedAt) {
        const hoursSince = (Date.now() - participant.lastNudgedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) continue;
      }

      const checkInUrl = `${frontendUrl}/check-ins/${participant.checkIns[0]?.id ?? ''}`;
      const specificThing = `session ${checkIn.sessionNumber} on "${ground.label}"`;

      // #34: Pass otherPartyCompleted so the email includes the appropriate note.
      await this.email.sendNudge(participant.email, specificThing, checkInUrl, undefined, otherPartyCompleted);

      await this.prisma.groundParticipant.update({
        where: { id: participant.id },
        data: { lastNudgedAt: new Date() },
      });

      count++;
    }

    return { sent: true, count };
  }

  /**
   * #71 - Scheduled nudges at Day 3, Day 7, and Day 14 after a check-in is
   * opened with NOT_STARTED status. Runs daily at 8 AM. For each NOT_STARTED
   * check-in, calculates days elapsed since createdAt and sends the nudge if
   * the elapsed days exactly match one of the thresholds and the participant
   * has not been nudged in the past 24 hours.
   *
   * #72 - Consecutive absence tracking: after sending a Day-14 nudge (third
   * threshold), checks whether this participant has missed 3 or more consecutive
   * check-ins (NOT_STARTED sessions whose period has ended). If so, sends an
   * absence reminder naming the ground and the missed count.
   *
   * #34 - If the other party on the same ground/session has already completed
   * their check-in, includes "The other party has already submitted their
   * version. Your record is the only thing missing." in the nudge body.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendScheduledNudges(): Promise<void> {
    const now = new Date();
    const frontendUrl = (this.email as any).frontendUrl ?? 'http://localhost:5173';

    // Load all NOT_STARTED check-ins with participant and ground context.
    const notStarted = await this.prisma.checkIn.findMany({
      where: { status: CheckInStatus.NOT_STARTED },
      select: {
        id: true,
        createdAt: true,
        sessionNumber: true,
        availableFrom: true,
        participantId: true,
        groundId: true,
        ground: { select: { label: true } },
        participant: {
          select: {
            id: true,
            email: true,
            lastNudgedAt: true,
            user: { select: { firstName: true, emailNotifications: true } },
          },
        },
      },
    });

    for (const checkIn of notStarted) {
      // Skip if not yet available.
      if (checkIn.availableFrom && checkIn.availableFrom > now) continue;

      const daysElapsed = Math.floor((now.getTime() - checkIn.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      if (!NUDGE_DAY_THRESHOLDS.includes(daysElapsed)) continue;

      const participant = checkIn.participant;
      if (!participant) continue;
      if (participant.user?.emailNotifications === false) continue;

      // Throttle: skip if already nudged within the past 24 hours.
      if (participant.lastNudgedAt) {
        const hoursSince = (now.getTime() - participant.lastNudgedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) continue;
      }

      // #34: Check if the other party on the same ground + session has completed.
      const otherPartyCompleted = await this.prisma.checkIn.findFirst({
        where: {
          groundId: checkIn.groundId,
          sessionNumber: checkIn.sessionNumber,
          participantId: { not: checkIn.participantId },
          status: CheckInStatus.COMPLETED,
        },
        select: { id: true },
      }).then((r) => r !== null);

      const checkInUrl = `${frontendUrl}/check-ins/${checkIn.id}`;

      try {
        await this.email.sendNudge(
          participant.email,
          checkIn.ground.label,
          checkInUrl,
          undefined,
          otherPartyCompleted,
        );

        await this.prisma.groundParticipant.update({
          where: { id: participant.id },
          data: { lastNudgedAt: now },
        });

        this.logger.log(
          `Scheduled Day-${daysElapsed} nudge sent to participant ${participant.id} for check-in ${checkIn.id}`,
        );
      } catch (err: any) {
        this.logger.error(`Scheduled nudge failed for check-in ${checkIn.id}: ${err.message}`);
        continue;
      }

      // #72 - On the Day-14 nudge (last threshold), check for 3 consecutive missed check-ins.
      if (daysElapsed === 14) {
        try {
          await this.checkAndSendConsecutiveAbsenceReminder(
            participant.id,
            participant.email,
            participant.user?.firstName ?? participant.email,
            checkIn.ground.label,
          );
        } catch (err: any) {
          this.logger.error(`Consecutive absence check failed for participant ${participant.id}: ${err.message}`);
        }
      }
    }
  }

  /**
   * #72 - Checks whether the given participant has 3 or more consecutive
   * NOT_STARTED check-ins whose period has ended (i.e. they were never started
   * and there is a newer check-in for the same ground or the ground has moved on).
   * A check-in is treated as "missed" if it is still NOT_STARTED and was created
   * more than 14 days ago (beyond the last scheduled nudge window).
   * If missedCount >= 3, sends a sendAbsenceReminder email.
   */
  private async checkAndSendConsecutiveAbsenceReminder(
    participantId: string,
    email: string,
    name: string,
    groundName: string,
  ): Promise<void> {
    const MISSED_THRESHOLD_DAYS = 14;
    const cutoff = new Date(Date.now() - MISSED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Count NOT_STARTED check-ins for this participant that are past the nudge window.
    const missedCheckIns = await this.prisma.checkIn.findMany({
      where: {
        participantId,
        status: CheckInStatus.NOT_STARTED,
        createdAt: { lt: cutoff },
      },
      orderBy: { sessionNumber: 'desc' },
      select: { id: true, sessionNumber: true, createdAt: true },
    });

    // Walk back from the most recent session counting consecutive misses.
    let consecutiveMissed = 0;
    let prevSession: number | null = null;

    for (const ci of missedCheckIns) {
      if (prevSession === null || prevSession === ci.sessionNumber + 1) {
        consecutiveMissed++;
        prevSession = ci.sessionNumber;
      } else {
        // Gap in sessions - streak broken.
        break;
      }
    }

    if (consecutiveMissed >= 3) {
      await this.email.sendAbsenceReminder(email, name, groundName, consecutiveMissed);
      this.logger.warn(
        `Absence reminder sent to participant ${participantId}: ${consecutiveMissed} consecutive missed check-in(s) on "${groundName}"`,
      );
    }
  }
}
