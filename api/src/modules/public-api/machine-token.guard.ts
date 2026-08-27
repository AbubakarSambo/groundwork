import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

export const REQUIRED_SCOPE = 'required_scope';
/** Declares what a public route needs. A route with none is a mistake, and the guard says so. */
export const RequiresScope = (scope: string) => SetMetadata(REQUIRED_SCOPE, scope);

export interface MachineCaller {
  organizationId: string;
  clientId: string;
  scopes: string[];
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
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
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

    const required = this.reflector.getAllAndOverride<string>(REQUIRED_SCOPE, [ctx.getHandler(), ctx.getClass()]);
    if (!required) {
      throw new ForbiddenException('This endpoint has no declared scope and cannot be called.');
    }
    const scopes: string[] = claims.scopes ?? [];
    if (!scopes.includes(required)) {
      throw new ForbiddenException(`This token does not hold the ${required} scope.`);
    }

    req.machine = { organizationId: claims.org, clientId: claims.sub, scopes } satisfies MachineCaller;
    return true;
  }
}
