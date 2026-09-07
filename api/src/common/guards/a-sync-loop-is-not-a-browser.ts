/**
 * A SYNC LOOP IS NOT A BROWSER.
 *
 * One throttler covers everything: sixty requests a minute, keyed by IP. That is a sensible number
 * for a person clicking and an absurd one for a customer's HR system pushing a roster — SCIM is one
 * person per call, so a company of four hundred people cannot complete a first sync at all. It gets
 * 429s, and 429 is indistinguishable from "your integration is broken".
 *
 * Two changes, and both matter:
 *
 *  - the allowance is per CREDENTIAL rather than per IP. Machine callers sit behind one egress
 *    address, so keying on IP means two customers' integrations share a bucket and one busy
 *    customer throttles another.
 *  - the limit is the one an integration needs.
 *
 * THE TOKEN IS VERIFIED BEFORE THE HIGHER ALLOWANCE IS GRANTED. This runs as a global guard, so it
 * happens BEFORE MachineTokenGuard has authenticated anything — `req.machine` is not there yet. Had
 * this trusted the token's claims unverified, anybody could claim to be a machine and buy themselves
 * ten times the rate limit for whatever they were doing. Verifying costs one signature check on
 * requests that carry a bearer token.
 */
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerRequest } from '@nestjs/throttler';

/**
 * Enough for a first roster sync at one person per call, and still a ceiling. A customer pushing
 * four hundred people gets through in under a minute rather than not at all.
 */
export const A_MACHINE_MAY_MAKE_PER_MINUTE = 600;

@Injectable()
export class ASyncLoopIsNotABrowser extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  /** The credential this request is made with, or null where it is not a machine. */
  private async whichCredential(req: Record<string, any>): Promise<string | null> {
    const header: string = req?.headers?.authorization ?? '';
    const [kind, token] = header.split(' ');
    if (kind !== 'Bearer' || !token) return null;
    try {
      const claims: any = await this.jwt.verifyAsync(token);
      /* The same marker MachineTokenGuard uses to tell the three audiences apart. A session token
         signed with the same secret must NOT buy an integration's allowance. */
      if (claims?.typ !== 'machine' || !claims?.sub) return null;
      return String(claims.sub);
    } catch {
      /* Unreadable, expired, or not ours: it is not a machine, and the ordinary limit applies. */
      return null;
    }
  }

  protected async handleRequest(props: ThrottlerRequest): Promise<boolean> {
    const { req } = this.getRequestResponse(props.context);
    const credential = await this.whichCredential(req);
    if (!credential) return super.handleRequest(props);

    return super.handleRequest({
      ...props,
      /* Never LOWER than the route's own limit: a route that deliberately allows more (a bulk
         endpoint, say) must not be narrowed by passing through here. */
      limit: Math.max(props.limit, A_MACHINE_MAY_MAKE_PER_MINUTE),
      getTracker: async () => `credential:${credential}`,
    });
  }
}
