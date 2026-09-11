import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CALLS_PER_MINUTE } from './the-api-is-watched';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { heldBy } from './scopes';

export const REQUIRED_SCOPE = 'required_scope';
/** Declares what a public route needs. A route with none is a mistake, and the guard says so. */
export const RequiresScope = (scope: string) => SetMetadata(REQUIRED_SCOPE, scope);

export interface MachineCaller {
  organizationId: string;
  clientId: string;
  /** The system this credential speaks for. What the roster is keyed on, unlike `clientId`. */
  sourceSystem: string;
  scopes: string[];
  /**
   * WHOSE WORK THIS CREDENTIAL MAY SEE. Empty means the whole organisation.
   *
   * Carried on the caller rather than looked up per route, so a route added next year is fenced by
   * whatever the credential says without anybody remembering to check. The failure mode of the other
   * arrangement is silent: a new endpoint that simply forgets, and reads everything.
   */
  boundToPersonExternalIds: string[];
}

/**
 * THE ONLY WAY INTO THE PUBLIC API, AND IT CARRIES THE ORG.
 *
 * Every request here is a machine acting for exactly one organisation, and that organisation comes
 * from the signed token rather than from anything in the path or body. A customer's system cannot
 * name an org it does not hold a credential for, because it never names one at all.
 *
 * A ROUTE WITHOUT A DECLARED SCOPE IS REFUSED rather than allowed. The safe default for a
 * forgotten annotation is closed: a public endpoint that authorises everybody is a much worse
 * outcome than one that authorises nobody and gets a bug report on its first day.
 */
@Injectable()
export class MachineTokenGuard implements CanActivate {
  private readonly logger = new Logger(MachineTokenGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers?.authorization ?? '';
    const [kind, token] = header.split(' ');
    if (kind !== 'Bearer' || !token) throw new UnauthorizedException('A bearer token is required.');

    let claims: any;
    try {
      claims = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token is invalid or has expired.');
    }

    /*
     * A SESSION TOKEN IS NOT A MACHINE TOKEN. Both are signed by us with the same secret, so
     * without this a logged-in person's browser token would authenticate as a machine and carry
     * whatever scopes the check below failed to find. The marker is what keeps the two audiences
     * apart, and it is checked before anything else is read off the claims.
     */
    if (claims.typ !== 'machine') throw new UnauthorizedException('This token is not valid for the integration API.');

    /*
     * EVERY CALL IS WRITTEN DOWN AND A CREDENTIAL HAS A PACE. The row feeds the watch that looks
     * for an integration behaving like a scraper (the-api-is-watched.ts); the count is the one
     * enforcement that does not wait for a person: past CALLS_PER_MINUTE the call is refused with a
     * 429 and the minute is left on the record for the admin to see. Recording is best-effort so a
     * database hiccup slows nobody's integration down. It happens BEFORE the scope check: a token
     * trying route after route it does not hold the scope for is exactly the pattern worth seeing.
     */
    const clientId: string = claims.sub;
    let lastMinute = 0;
    try {
      lastMinute = await this.prisma.apiCall.count({ where: { clientId, at: { gte: new Date(Date.now() - 60_000) } } });
    } catch (err: any) {
      this.logger.warn(`API call count failed for ${clientId}: ${err?.message}`);
    }
    this.prisma.apiCall
      .create({ data: { organizationId: claims.org, clientId, method: req.method ?? 'GET', path: (req.originalUrl ?? req.url ?? '').slice(0, 300) } })
      .catch((err: any) => this.logger.warn(`API call record failed for ${clientId}: ${err?.message}`));
    if (lastMinute >= CALLS_PER_MINUTE) {
      throw new HttpException(
        `This credential has made ${lastMinute} calls in the last minute. The limit is ${CALLS_PER_MINUTE}. Wait, then continue; if your integration needs more, say so on the Connect page.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    /*
     * REVOKED MEANS NOW. The token is signed and unexpired for up to its TTL after an admin presses
     * revoke, and nothing here read the credential row, so a leaked credential kept working for the
     * rest of that window with the leak known (fix plan A10). One indexed read; the two above are
     * the pace and the record, this is the door.
     */
    const credential = await this.prisma.apiCredential.findUnique({ where: { clientId }, select: { revokedAt: true } });
    if (!credential || credential.revokedAt) {
      throw new UnauthorizedException('This credential has been revoked.');
    }

    const required = this.reflector.getAllAndOverride<string>(REQUIRED_SCOPE, [ctx.getHandler(), ctx.getClass()]);
    if (!required) {
      throw new ForbiddenException('This endpoint has no declared scope and cannot be called.');
    }
    const scopes: string[] = claims.scopes ?? [];
    /* `heldBy`, not `includes`: a caller holding graph:write may read the graph. See scopes.ts. */
    const held = heldBy(scopes, required);
    if (!held) {
      throw new ForbiddenException(`This token does not hold the ${required} scope.`);
    }
    /* The grace period's evidence: which credentials are relying on an implied scope, so the
       IMPLIED entry can be deleted when nobody is. */
    if (held.how === 'implied' && held.by !== 'graph:write') {
      this.logger.warn(`Credential ${clientId} called a ${required} route holding only ${held.by}; that grace ends next release.`);
    }

    req.machine = {
      organizationId: claims.org,
      clientId: claims.sub,
      /* Older tokens, issued before the split, carry no `src`. Falling back to the client id
         keeps them writing under exactly the key their people were created with, which is the
         whole point of the backfill. */
      sourceSystem: claims.src ?? claims.sub,
      scopes,
      boundToPersonExternalIds: Array.isArray(claims.fence) ? claims.fence : [],
    } satisfies MachineCaller;

    return true;
  }
}
