import { Controller, Get, HttpCode, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { RoundDigestService } from './round-digest.service';

/**
 * THE LINK ON EVERY MAIL, AND IT WORKS.
 *
 * No session, no login, no confirmation step. Somebody who wants to stop hearing from us must not
 * have to remember a password to do it, and a link that fails at that moment becomes a spam
 * complaint rather than a support ticket - which costs the whole organisation's mail, not this one.
 *
 * GET rather than POST, because it is a link in a mail client and that is what those are. The
 * consequence is that a link-scanner in somebody's mail security can follow it and unsubscribe them
 * without a human clicking - accepted, because the alternative is a form that a person has to find
 * and press, and the failure of THAT is silent.
 *
 * Its own controller rather than joining the Resend webhook one: that is mounted at /webhooks and
 * carries a signature check, and neither is right for a link a person clicks.
 */
@Controller()
export class UnsubscribeController {
  constructor(private readonly digests: RoundDigestService) {}

  @Public()
  @Get('unsubscribe/:token')
  @HttpCode(200)
  /* Slower than a normal route on purpose. The token is long and random, so guessing is not worth
     attempting - but nothing should be able to sit and try. */
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  async unsubscribe(@Param('token') token: string) {
    return this.digests.unsubscribe(token);
  }
}
