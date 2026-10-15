import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CODE_REQUIRED, mayOpen, standsBehindTheDoor } from './the-back-office-has-a-door';

/** Nest records `@UseGuards(...)` under this key. Read rather than imported from a deep path. */
const WHAT_GUARDS_THIS = '__guards__';

/**
 * GLOBAL, AFTER THE SESSION GUARD. Every request from any controller now or later meets this. The
 * decision is in the-back-office-has-a-door.ts; this only fetches the facts. The 403 carries a code
 * the client recognises, so it shows the door rather than a red toast.
 *
 * WHAT IT ASKS HAS CHANGED. It used to ask where the request was going: /ops or /admin. That is
 * where the back office mostly lives, but not where the privilege lives - the platform-admin guard
 * also sits on routes under /billing, /prompts, /patterns, /coach and /feedback, and every one of
 * those was reachable with a signed-in staff session and no code.
 *
 * So it reads the guards the handler and its controller declare, and anything a staff guard
 * protects is behind the door wherever it is mounted. A staff route written next year under a new
 * prefix is covered on the day it is written, by the guard its author already had to put on it.
 */
@Injectable()
export class BackOfficeDoorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  /** The names of the guards declared on this handler and on its controller. */
  private guardsOn(ctx: ExecutionContext): string[] {
    const off = (target: unknown) => {
      const declared = (Reflect.getMetadata(WHAT_GUARDS_THIS, target as object) ?? []) as unknown[];
      /* `@UseGuards` takes classes or instances; a class has the name, an instance's constructor does. */
      return declared.map((g: any) => (typeof g === 'function' ? g?.name : g?.constructor?.name));
    };
    return [...off(ctx.getHandler()), ...off(ctx.getClass())];
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const path: string = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (!standsBehindTheDoor(path, this.guardsOn(ctx))) return true;
    const user = req.user as { id?: string; signedInVia?: string | null } | undefined;
    if (!user?.id) return true;

    const pass = await this.prisma.backOfficePass.findUnique({ where: { userId: user.id }, select: { expiresAt: true } });
    const decision = mayOpen({
      path,
      behindTheDoor: true,
      signedIn: true,
      signedInVia: user.signedInVia,
      passExpiresAt: pass?.expiresAt ?? null,
      now: new Date(),
    });
    if (decision.open) return true;
    /* Somebody who is not staff can never be sent a code, so they are not told to look for one (B-008): the same words as when they ask for it at the door. */
    if (await this.isNotStaff(user.id)) throw new ForbiddenException('This part is for Groundwork staff.');
    throw new ForbiddenException({
      code: CODE_REQUIRED,
      message: 'The back office needs a code sent to your email. It holds for a week.',
    });
  }

  /** The same three ways of being staff as the door service reads (back-office-door.service.ts). An unreadable answer is "staff", so the old refusal stands. */
  private async isNotStaff(userId: string): Promise<boolean> {
    try {
      const [user, person, account] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId }, select: { isPlatformAdmin: true } }),
        this.prisma.opsPerson.findFirst({ where: { userId, active: true }, select: { id: true } }),
        this.prisma.opsPersonAccount.findFirst({ where: { userId, person: { active: true } }, select: { id: true } }),
      ]);
      return !user?.isPlatformAdmin && !person && !account;
    } catch {
      return false;
    }
  }
}
