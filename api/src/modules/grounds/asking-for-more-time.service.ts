import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { hasStalled } from './a-ground-that-has-ended';
import { fullNameToCall } from '../engagement/a-name-to-call-them';

/**
 * "ASK WAIRIMU FOR MORE TIME" (A3, #/join/outoftime, U.3).
 *
 * A check-in that ran past its end date takes nothing new until whoever runs it gives it more time
 * (a-ground-that-has-ended.ts). A person in it can ask the lead, who gets the request by email with
 * one button to the check-in, where giving it more time is one press and reopens it. Once a day per
 * person, enforced here, so one person pressing again does not flood the lead.
 *
 * Only a person taking part in that check-in, and only while it is out of time.
 */
const A_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AskingForMoreTimeService {
  private readonly logger = new Logger(AskingForMoreTimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private async mine(groundId: string, userId: string) {
    const party = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId, partyType: 'PARTICIPANT' },
      select: { id: true, email: true, moreTimeAskedAt: true, nameGiven: true },
    });
    if (!party) throw new NotFoundException('Check-in not found');
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { id: true, label: true, status: true, endsAt: true, initiator: { select: { firstName: true, email: true } } },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    return { party, ground };
  }

  /** What the "Out of time" page needs: whose it is, until when it ran, and whether they already asked today. */
  async whereItStands(groundId: string, userId: string, now: Date = new Date()) {
    const { party, ground } = await this.mine(groundId, userId);
    const askedRecently = !!party.moreTimeAskedAt && now.getTime() - party.moreTimeAskedAt.getTime() < A_DAY;
    return {
      outOfTime: hasStalled(ground.status),
      checkInName: ground.label,
      leadFirstName: (ground.initiator?.firstName ?? '').trim() || null,
      ranUntil: ground.endsAt ? ground.endsAt.toISOString() : null,
      askedAt: askedRecently ? party.moreTimeAskedAt!.toISOString() : null,
      /* "All 38 of your check-ins" (item 11, 29 September): the CHECK-INS this person has ever been
         part of (Ground rows), never the SESSIONS inside them (CheckIn rows). `distinct` on
         `groundId` counts each check-in once, however many rounds it ran. */
      checkInsCount: await this.checkInsCount(userId),
    };
  }

  private async checkInsCount(userId: string): Promise<number> {
    const rows = await this.prisma.groundParticipant.findMany({
      where: { userId },
      distinct: ['groundId'],
      select: { groundId: true },
    });
    return rows.length;
  }

  async ask(groundId: string, userId: string, now: Date = new Date()) {
    const { party, ground } = await this.mine(groundId, userId);
    if (!hasStalled(ground.status)) throw new BadRequestException('This check-in is not out of time, so there is nothing to ask for.');
    if (party.moreTimeAskedAt && now.getTime() - party.moreTimeAskedAt.getTime() < A_DAY) {
      throw new BadRequestException('You have already asked today. You can ask again tomorrow.');
    }
    await this.prisma.groundParticipant.update({ where: { id: party.id }, data: { moreTimeAskedAt: now } });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
    const who = fullNameToCall({ user, nameGiven: party.nameGiven });
    if (ground.initiator?.email) {
      await this.email
        .sendMoreTimeAsked(ground.initiator.email, ground.initiator.firstName ?? null, who, ground.label, ground.id)
        .catch((err: any) => this.logger.warn(`More-time request to the lead of ${ground.id} did not send: ${err?.message}`));
    }
    return { asked: true, askedAt: now.toISOString() };
  }
}
