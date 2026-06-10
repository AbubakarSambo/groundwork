import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CheckInStatus } from '@prisma/client';

@Injectable()
export class RemindService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  /**
   * Send a nudge email to every participant on the ground who has NOT yet
   * completed a check-in for the current session. Only the requesting user —
   * who must themselves be a party to this ground — may trigger a reminder.
   *
   * The check-in id is used as the lookup key because the front-end typically
   * knows the check-in id, not the ground id.
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

    // Find all participants who have accepted their invite (userId set) but
    // have NOT completed a check-in for the same session number.
    const allParticipants = await this.prisma.groundParticipant.findMany({
      where: { groundId: ground.id, userId: { not: null } },
      select: {
        id: true,
        email: true,
        userId: true,
        lastNudgedAt: true,
        user: { select: { firstName: true } },
        checkIns: {
          where: { sessionNumber: checkIn.sessionNumber },
          select: { id: true, status: true },
        },
      },
    });

    const incomplete = allParticipants.filter((p) => {
      const session = p.checkIns[0];
      return !session || session.status !== CheckInStatus.COMPLETED;
    });

    let count = 0;
    const frontendUrl = (this.email as any).frontendUrl ?? 'http://localhost:5173';

    for (const participant of incomplete) {
      // Throttle: do not nudge the same participant more than once per 24 h.
      if (participant.lastNudgedAt) {
        const hoursSince = (Date.now() - participant.lastNudgedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) continue;
      }

      const checkInUrl = `${frontendUrl}/check-ins/${participant.checkIns[0]?.id ?? ''}`;
      const specificThing = `session ${checkIn.sessionNumber} on "${ground.label}"`;

      await this.email.sendNudge(participant.email, specificThing, checkInUrl);

      await this.prisma.groundParticipant.update({
        where: { id: participant.id },
        data: { lastNudgedAt: new Date() },
      });

      count++;
    }

    return { sent: true, count };
  }
}
