import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface PanelCaller {
  organizationId: string;
  personId: string;
  externalId: string;
}

/**
 * THE PANEL'S OWN TOKEN, WHICH IS A THIRD AUDIENCE.
 *
 * There are now three kinds of token signed with the same key: a person's browser session, a
 * machine credential, and this - a panel acting for one named person inside a customer's app. All
 * three verify identically, so the marker is what keeps them apart, and it is checked before
 * anything else is read.
 *
 * The one that matters most here: a MACHINE token must not reach this. A machine token carries an
 * organisation and no person, so without the check a customer's integration credential would be
 * able to ask the assistant questions as nobody in particular - and every lane is scoped to the
 * person asking.
 */
@Injectable()
export class EmbedSessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const [kind, token] = (req.headers?.authorization ?? '').split(' ');
    if (kind !== 'Bearer' || !token) throw new UnauthorizedException('This panel has no session, so close it and open it again.');

    let claims: any;
    try {
      claims = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('That session has expired. The panel is asking the page it sits on for another one.');
    }
    if (claims.typ !== 'embed') throw new UnauthorizedException('That token is not a panel session.');
    if (!claims.pid || !claims.org) throw new UnauthorizedException('That session is missing who it is for.');
    /* A person deactivated on the roster stops now, not when the panel session expires (B16, P2-026). */
    const person = await this.prisma.person.findUnique({ where: { id: claims.pid }, select: { deactivatedAt: true } });
    if (!person || person.deactivatedAt) throw new UnauthorizedException('That person is no longer on the roster.');

    req.panel = { organizationId: claims.org, personId: claims.pid, externalId: claims.sub } satisfies PanelCaller;
    return true;
  }
}
