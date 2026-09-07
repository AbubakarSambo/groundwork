import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MembershipRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * THE QUEUE AN ADMIN ANSWERS.
 *
 * Adding an address to a check-in used to make it a member of the organisation on acceptance, with
 * nobody asked - see nobody-joins-your-company-by-being-invited-to-a-check-in.ts for the trace.
 * This is the other end: reading who is waiting, and letting somebody in or not.
 *
 * TWO RULES THAT DECIDE THE SHAPE OF EVERY METHOD HERE.
 *
 * Only an admin OF THAT ORGANISATION may answer. Not the person who did the inviting - a lead can
 * add anybody, and if a lead's own invitation approved the membership the queue would be a
 * formality that lets the same act through twice.
 *
 * And an answer happens once. A request already decided is not re-decided by a second press, a
 * second invitation, or a race between two admins looking at the same list.
 */
@Injectable()
export class WhoIsWaitingAtTheDoorService {
  private readonly logger = new Logger(WhoIsWaitingAtTheDoorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Everybody waiting on this organisation, oldest first - a queue is answered in order. */
  async waiting(organizationId: string) {
    const rows = await this.prisma.membershipRequest.findMany({
      where: { organizationId, status: MembershipRequestStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, email: true, createdAt: true, groundId: true, requestedByUserId: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    /* Who asked for them and what for, resolved here rather than by the client making N calls. */
    const askerIds = [...new Set(rows.map((r) => r.requestedByUserId).filter((x): x is string => !!x))];
    const groundIds = [...new Set(rows.map((r) => r.groundId).filter((x): x is string => !!x))];
    const [askers, grounds] = await Promise.all([
      askerIds.length
        ? this.prisma.user.findMany({ where: { id: { in: askerIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
        : [],
      groundIds.length
        ? this.prisma.ground.findMany({ where: { id: { in: groundIds } }, select: { id: true, label: true } })
        : [],
    ]);
    const askerById = new Map(askers.map((a) => [a.id, a]));
    const groundById = new Map(grounds.map((g) => [g.id, g]));

    return rows.map((r) => {
      const asker = r.requestedByUserId ? askerById.get(r.requestedByUserId) : undefined;
      return {
        id: r.id,
        email: r.email,
        name: [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || null,
        waitingSince: r.createdAt,
        /* Named, because "somebody added them" is not something an admin can act on. */
        addedBy: asker ? ([asker.firstName, asker.lastName].filter(Boolean).join(' ') || asker.email) : null,
        forCheckIn: r.groundId ? (groundById.get(r.groundId)?.label ?? null) : null,
      };
    });
  }

  /**
   * Let them in. Clears the flag the seat count and the check-in gate both read, so this one write
   * is what makes them a person on the account and a person who can answer.
   */
  async approve(organizationId: string, requestId: string, adminUserId: string) {
    const request = await this.mine(organizationId, requestId);

    await this.prisma.$transaction(async (tx) => {
      await tx.membershipRequest.update({
        where: { id: request.id },
        data: { status: MembershipRequestStatus.APPROVED, decidedByUserId: adminUserId, decidedAt: new Date() },
      });
      await tx.user.update({ where: { id: request.userId }, data: { awaitingOrgApproval: false } });
    });

    this.email
      .sendYouAreInNow(request.email, request.organization.name)
      .catch((err: any) => this.logger.warn(`Could not tell ${request.email} they were approved: ${err.message}`));

    return { approved: true, email: request.email };
  }

  /**
   * Or do not. The account STAYS and the flag stays set, so they remain unable to check in here -
   * deleting somebody's account because one organisation said no would take their own work with it,
   * and an address that has been declined once may belong to somebody who is a member elsewhere.
   */
  async decline(organizationId: string, requestId: string, adminUserId: string, reason?: string) {
    const request = await this.mine(organizationId, requestId);

    await this.prisma.membershipRequest.update({
      where: { id: request.id },
      data: {
        status: MembershipRequestStatus.DECLINED,
        decidedByUserId: adminUserId,
        decidedAt: new Date(),
        reason: reason?.trim() || null,
      },
    });

    /* Not told by mail, deliberately. "A company you were invited to has refused you" is a message
       with nothing in it a person can act on, and the person who invited them is the one who
       should say so if anything is to be said. The lead is told instead. */
    if (request.requestedByUserId) {
      const asker = await this.prisma.user.findUnique({
        where: { id: request.requestedByUserId },
        select: { email: true, firstName: true },
      });
      if (asker?.email) {
        this.email
          .sendTheyWereNotLetIn(asker.email, asker.firstName ?? 'there', request.email, reason?.trim() || null)
          .catch((err: any) => this.logger.warn(`Could not tell ${asker.email} about the decline: ${err.message}`));
      }
    }

    return { declined: true, email: request.email };
  }

  /** The request, if it belongs to this organisation and nobody has answered it yet. */
  private async mine(organizationId: string, requestId: string) {
    const request = await this.prisma.membershipRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true, organizationId: true, userId: true, email: true, status: true, requestedByUserId: true,
        organization: { select: { name: true } },
      },
    });
    if (!request) throw new NotFoundException('That request does not exist');
    /* Not found rather than forbidden: an admin of another organisation may not learn that an id
       here is real. */
    if (request.organizationId !== organizationId) throw new NotFoundException('That request does not exist');
    if (request.status !== MembershipRequestStatus.PENDING) {
      throw new BadRequestException('Somebody has already answered this one.');
    }
    return request;
  }
}
