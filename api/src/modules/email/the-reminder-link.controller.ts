import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * THE PAGE A "STOP THESE REMINDERS" LINK OPENS (A3, #/stop, U.3).
 *
 * The link on every reminder carries the participant's `stopRemindersToken`. Opening it changes
 * nothing (11 October): a mail scanner that opens every link in a message used to switch reminders
 * off before the person had read the mail. The page reads the state with the GET below, asks, and
 * only the button stops them, with a POST. The old GET (conversation/stop-reminders.controller.ts)
 * now only reports, for mail already sent and for any client that still calls it.
 *
 * POST, not GET, so a mail scanner that follows links cannot turn reminders back on or stop every
 * email. No session: "No sign-in needed; the link in the email was enough." An unknown token gets a
 * plain `known: false` and changes nothing, so the link tells a stranger nothing.
 */
@Controller('reminders')
export class TheReminderLinkController {
  constructor(private readonly prisma: PrismaService) {}

  private find(token: string) {
    return this.prisma.groundParticipant.findUnique({
      where: { stopRemindersToken: token },
      select: { id: true, email: true, userId: true, remindersStoppedAt: true, ground: { select: { label: true } } },
    });
  }

  /** What the page needs to ask: which check-in, and whether its reminders are already off. Changes nothing. */
  @Public()
  @Get(':token')
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async read(@Param('token') token: string) {
    const party = token ? await this.find(token) : null;
    if (!party) return { known: false as const };
    return { known: true as const, checkInName: party.ground?.label ?? null, reminders: party.remindersStoppedAt ? ('off' as const) : ('on' as const) };
  }

  /** Stop this check-in's reminders. Safe to repeat. */
  @Public()
  @Post(':token/stop')
  @HttpCode(200)
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async stop(@Param('token') token: string) {
    const party = token ? await this.find(token) : null;
    if (!party) return { known: false as const };
    if (!party.remindersStoppedAt) {
      await this.prisma.groundParticipant.update({ where: { id: party.id }, data: { remindersStoppedAt: new Date() } });
    }
    return { known: true as const, checkInName: party.ground?.label ?? null, reminders: 'off' as const };
  }

  /** "Turn them back on", for this check-in only. */
  @Public()
  @Post(':token/start')
  @HttpCode(200)
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async start(@Param('token') token: string) {
    const party = token ? await this.find(token) : null;
    if (!party) return { known: false as const };
    await this.prisma.groundParticipant.update({ where: { id: party.id }, data: { remindersStoppedAt: null } });
    return { known: true as const, checkInName: party.ground?.label ?? null, reminders: 'on' as const };
  }

  /**
   * "Stop all email from Groundwork instead". Everything we decided to send stops: the reminders on
   * every check-in this address is invited to, and, for somebody with an account, the account's own
   * switch. What they ask for themselves (a sign-in link, a password reset) still arrives, because
   * suppressing it would lock them out (nothing-goes-out-that-was-turned-off.ts).
   */
  @Public()
  @Post(':token/stop-all')
  @HttpCode(200)
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  async stopAll(@Param('token') token: string) {
    const party = token ? await this.find(token) : null;
    if (!party) return { known: false as const };
    const now = new Date();
    await this.prisma.groundParticipant.updateMany({
      where: { email: { equals: party.email, mode: 'insensitive' }, remindersStoppedAt: null },
      data: { remindersStoppedAt: now },
    });
    if (party.userId) {
      await this.prisma.user.update({ where: { id: party.userId }, data: { emailNotifications: false } });
    }
    return { known: true as const, allEmail: 'off' as const };
  }
}
