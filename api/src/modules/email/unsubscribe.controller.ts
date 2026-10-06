import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { TheWaysToStopMail } from '../engagement/the-ways-to-stop-mail';

/**
 * THE LINK ON EVERY MAIL, WITH A QUESTION FIRST (decision 109, spec 28).
 *
 * No session and no login: somebody who wants to stop hearing from us must not have to remember a
 * password to do it. But the first GET no longer stops anything. A mail security scanner follows every
 * link in a message, and a stop made by a scanner is a person who stops hearing from us without ever
 * choosing to. GET says what would stop; POST is the answer. The POST is also what the mail program
 * sends for the one-click header, which is a person's own click in their own program.
 *
 * Its own controller rather than joining the Resend webhook one: that is mounted at /webhooks and
 * carries a signature check, and neither is right for a link a person clicks.
 */
@Controller()
export class UnsubscribeController {
  constructor(private readonly stops: TheWaysToStopMail) {}

  @Public()
  @Get('unsubscribe/:token')
  @HttpCode(200)
  /* Slower than a normal route on purpose. The token is long and random, so guessing is not worth
     attempting - but nothing should be able to sit and try. */
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async whatWouldStop(@Param('token') token: string) {
    return this.stops.describe(token);
  }

  @Public()
  @Post('unsubscribe/:token')
  @HttpCode(200)
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async stop(@Param('token') token: string) {
    return this.stops.stop(token);
  }

  /** Undo from the same page, for somebody who pressed it and did not mean to. */
  @Public()
  @Post('unsubscribe/:token/undo')
  @HttpCode(200)
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async undo(@Param('token') token: string) {
    return this.stops.turnBackOn(token);
  }
}
