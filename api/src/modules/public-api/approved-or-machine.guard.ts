import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { mayUseTheApi, whyTheApiIsRefused } from './access-is-asked-for-not-bought';

/**
 * THE CONTRACT IS READABLE BY THOSE WHO HAVE BEEN LET IN. `how-to-connect` was public so that an
 * engineer could read what the calls want before holding a token. That stays true for an approved
 * organisation: a signed-in admin of one, or a machine token, may read it. Nobody else can, because
 * a full description of the calls is a large part of what somebody copying the product would want.
 */
@Injectable()
export class ApprovedOrMachineGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const [kind, token] = (req.headers?.authorization ?? '').split(' ');
    if (kind !== 'Bearer' || !token) throw new UnauthorizedException('Sign in, or use a machine token.');
    let claims: any;
    try {
      claims = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token is invalid or has expired.');
    }
    if (claims.typ === 'machine') {
      /* Same as MachineTokenGuard: revoked means now, not at the token's expiry (B16, P2-026). */
      const credential = await this.prisma.apiCredential.findUnique({ where: { clientId: claims.sub }, select: { revokedAt: true } });
      if (!credential || credential.revokedAt) throw new UnauthorizedException('This credential has been revoked.');
      return true;
    }

    const organizationId: string | undefined = claims.organizationId;
    if (!organizationId) throw new UnauthorizedException('Sign in, or use a machine token.');
    const access = await this.prisma.apiAccessRequest.findUnique({ where: { organizationId } });
    if (!mayUseTheApi(access)) throw new ForbiddenException(whyTheApiIsRefused(access));
    return true;
  }
}
