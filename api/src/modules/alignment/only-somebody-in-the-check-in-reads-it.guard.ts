import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS, readsAsAnAdmin, runsOrSetItUp } from '../grounds/who-may-read-this-check-in';

/**
 * A READ ON A CHECK-IN ASKS WHO IS READING BEFORE IT READS ANYTHING (B-149).
 *
 * The figures, claims, differences, obligations and sides of a check-in answered 200, with an empty
 * list, to somebody who is not in the check-in and to an admin of a different organisation, while
 * the board and the report answered 404. Nothing leaked only because nothing was stored; the first
 * row would have been served to a stranger.
 *
 * The rule is the board's, not a new one: somebody in the check-in, the lead who runs it, the person
 * who set it up, or an admin of this organisation (or the admin asked to approve it). Everybody
 * else is told the check-in is not there, never that it exists and is not theirs.
 */
@Injectable()
export class OnlySomebodyInTheCheckInReadsIt implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    const groundId: string | undefined = req.params?.groundId;
    if (!userId || !groundId) throw new NotFoundException('Check-in not found');

    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { organizationId: true, initiatorId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const viewer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true, email: true, awaitingOrgApproval: true },
    });
    if (!viewer || viewer.awaitingOrgApproval) throw new NotFoundException('Check-in not found');

    const asViewer = { ...viewer, userId };
    const here =
      (ground.participants ?? []).some((p) => p.userId === userId) ||
      runsOrSetItUp(userId, ground as any) ||
      readsAsAnAdmin(asViewer, ground as any);
    if (!here) throw new NotFoundException('Check-in not found');
    return true;
  }
}
