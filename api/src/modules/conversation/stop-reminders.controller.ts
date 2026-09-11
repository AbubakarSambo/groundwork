import { Controller, Get, HttpCode, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALREADY_STOPPED,
  NOT_A_LINK_WE_KNOW,
  WHAT_WE_SAY_WHEN_THEY_ASK,
} from './ignoring-it-should-be-enough';

/**
 * THE LINK ON THE INVITATION AND ON EVERY REMINDER.
 *
 * No session and no confirmation step, for the same reason the unsubscribe link has none:
 * somebody who has had enough of our mail must not have to make an account to say so, and a
 * link that fails at that moment becomes a spam complaint rather than a support ticket.
 *
 * GET, and safe to be GET. A mail-security scanner that follows it stops some reminders and
 * costs nobody anything - their invitation still works and nothing is recorded about whether
 * they are taking part. That is exactly why this route may not also decline for them: a scanner
 * that could would put a false answer in front of their lead.
 */
@Controller()
export class StopRemindersController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('stop-reminders/:token')
  @HttpCode(200)
  /* The token is long and random, so guessing is not worth attempting - but nothing should be
     able to sit and try. */
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async stop(@Param('token') token: string) {
    const party = await this.prisma.groundParticipant.findUnique({
      where: { stopRemindersToken: token },
      select: { id: true, remindersStoppedAt: true },
    });
    /* An unknown token is not an error to the person holding it. Saying "invalid" to somebody who
       just wants the mail to stop reads as a refusal, and the true state is almost always that it
       has already stopped. */
    if (!party) return { stopped: true, says: NOT_A_LINK_WE_KNOW };
    if (party.remindersStoppedAt) return { stopped: true, says: ALREADY_STOPPED };

    await this.prisma.groundParticipant.update({
      where: { id: party.id },
      data: { remindersStoppedAt: new Date() },
    });
    return { stopped: true, says: WHAT_WE_SAY_WHEN_THEY_ASK };
  }
}
