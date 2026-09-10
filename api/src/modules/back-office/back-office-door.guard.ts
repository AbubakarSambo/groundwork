import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CODE_REQUIRED, isTheBackOffice, mayOpen } from './the-back-office-has-a-door';

/**
 * GLOBAL, AFTER THE SESSION GUARD. Every request to /ops or /admin, from any controller now or
 * later, meets this. The decision is in the-back-office-has-a-door.ts; this only fetches the facts.
 * The 403 carries a code the client recognises, so it shows the door rather than a red toast.
 */
@Injectable()
export class BackOfficeDoorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const path: string = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (!isTheBackOffice(path)) return true;
    const user = req.user as { id?: string; signedInVia?: string | null } | undefined;
    if (!user?.id) return true;

    const pass = await this.prisma.backOfficePass.findUnique({ where: { userId: user.id }, select: { expiresAt: true } });
    const decision = mayOpen({ path, signedIn: true, signedInVia: user.signedInVia, passExpiresAt: pass?.expiresAt ?? null, now: new Date() });
    if (decision.open) return true;
    throw new ForbiddenException({
      code: CODE_REQUIRED,
      message: 'The back office needs a code sent to your email. It holds for a week.',
    });
  }
}
