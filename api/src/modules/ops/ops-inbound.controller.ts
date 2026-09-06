import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { OpsGroundworkEventsService } from './ops-groundwork-events.service';

/**
 * WHAT GROUNDWORK TELLS US, ARRIVING.
 *
 * Its own controller, because its audience is different from everything else in
 * this back office: a SERVER calls it, holding no login of ours and no place in
 * this team. The rest of the ops surface is guarded by who somebody is and what
 * they may do, and neither question means anything here.
 *
 * Putting it on the main controller was the first attempt and it answered 403 to
 * a perfectly signed delivery — the capability guard runs whether or not a route
 * is public, and correctly so. The answer was a different door rather than a
 * hole in that one.
 *
 * THE SIGNATURE IS THE AUTHENTICATION, checked with our own implementation of
 * the documented scheme. See `what-groundwork-tells-us.ts` for why we do not
 * import theirs.
 */
@ApiTags('Ops · inbound')
@Controller('ops/groundwork')
export class OpsInboundController {
  constructor(private readonly events: OpsGroundworkEventsService) {}

  /**
   * IT ALWAYS ANSWERS 200, INCLUDING WHEN THE SIGNATURE FAILS.
   *
   * A sender that receives an error retries, and retrying a badly signed event
   * produces the same failure every few minutes forever. The failure is recorded
   * on this side, where somebody can look at it, rather than argued about across
   * a network boundary.
   */
  @Post('events')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive an event from Groundwork. The signature is the authentication.' })
  async received(
    @Req() req: { rawBody?: Buffer; body: unknown },
    @Headers('x-groundwork-signature') signature?: string,
    @Headers('x-groundwork-event-id') eventId?: string,
  ) {
    /* The RAW body, because a signature is over bytes. Re-serialising the parsed
       object changes key order and whitespace, and the signature then fails for a
       delivery that was perfectly good. */
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    return this.events.received(raw, signature, eventId);
  }
}
