import { Controller, Get, HttpCode, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALREADY_STOPPED,
  NOT_A_LINK_WE_KNOW,
} from './ignoring-it-should-be-enough';

const STILL_ON_UNTIL_YOU_PRESS =
  'Your reminders are still on. Open the link in your browser and press "Stop the reminders" to stop them.';

/**
 * THE LINK ON THE INVITATION AND ON EVERY REMINDER, AS A GET.
 *
 * A GET CHANGES NOTHING (11 October). It used to stop the reminders on the spot, on the reasoning that
 * a scanner doing it "costs nobody anything". It does: a mail-security scanner opens every link in a
 * message, so somebody who never asked lost their reminders before they had read the mail. Stopping
 * is now a POST that only the page's button sends (email/the-reminder-link.controller.ts). This route
 * stays for mail already sent and any client that still calls it, and only says where things stand.
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
    /* An unknown token is not an error to the person holding it. */
    if (!party) return { stopped: false, says: NOT_A_LINK_WE_KNOW };
    if (party.remindersStoppedAt) return { stopped: true, says: ALREADY_STOPPED };
    return { stopped: false, says: STILL_ON_UNTIL_YOU_PRESS };
  }
}
