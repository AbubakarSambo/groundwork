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

  /**
   * THE PERSON WAITING, READING THEIR OWN REQUEST (U.3, #/join/waiting, "Almost in").
   *
   * Only their own, and only while it is pending. The admin is named only when they came through a
   * real invitation (Hafsah, 26 September); a link shared with many people names nobody. Which admin:
   * the one who holds the organisation (its owner) when they are an active admin, otherwise the
   * admin who has been one longest. "Remind" reaches that same person.
   */
  async myOwnRequest(userId: string) {
    const request = await this.prisma.membershipRequest.findFirst({
      where: { userId, status: MembershipRequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, createdAt: true, lastRemindedAt: true, viaInvitation: true, organizationId: true, requestedByUserId: true,
        organization: { select: { name: true } },
      },
    });
    if (!request) return { waiting: false as const };
    const admin = request.viaInvitation ? await this.theAdminAsked(request.organizationId) : null;
    const inviter = request.requestedByUserId
      ? await this.prisma.user.findUnique({ where: { id: request.requestedByUserId }, select: { firstName: true } })
      : null;
    return {
      waiting: true as const,
      organisationName: request.organization.name,
      askedAt: request.createdAt.toISOString(),
      admin: admin ? { name: [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim(), firstName: admin.firstName } : null,
      inviterFirstName: request.viaInvitation ? (inviter?.firstName ?? null) : null,
      canRemindFrom: this.nextRemindAt(request).toISOString(),
    };
  }

  /** "Remind": once a day, counted from the ask or the last reminder, and only to the admin named. */
  async remind(userId: string, now: Date = new Date()) {
    const request = await this.prisma.membershipRequest.findFirst({
      where: { userId, status: MembershipRequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, lastRemindedAt: true, viaInvitation: true, organizationId: true, email: true, groundId: true, requestedByUserId: true },
    });
    if (!request) throw new NotFoundException('You are not waiting to be let in anywhere.');
    if (!request.viaInvitation) throw new BadRequestException('There is nobody to remind for this request. The admins have already been asked.');
    const next = this.nextRemindAt(request);
    if (now < next) {
      throw new BadRequestException('You can send a reminder once a day. You can send the next one tomorrow.');
    }
    const admin = await this.theAdminAsked(request.organizationId);
    if (!admin) throw new BadRequestException('There is nobody to remind yet. The organisation has no admin who can let you in.');
    await this.prisma.membershipRequest.update({ where: { id: request.id }, data: { lastRemindedAt: now } });
    const [inviter, ground] = await Promise.all([
      request.requestedByUserId ? this.prisma.user.findUnique({ where: { id: request.requestedByUserId }, select: { firstName: true, lastName: true, email: true } }) : null,
      request.groundId ? this.prisma.ground.findUnique({ where: { id: request.groundId }, select: { label: true } }) : null,
    ]);
    const addedBy = inviter ? ([inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || inviter.email) : 'somebody on your team';
    await this.email
      .sendSomebodyIsWaiting(admin.email, admin.firstName ?? 'there', request.email, addedBy, ground?.label ?? null)
      .catch((err: any) => this.logger.warn(`Reminder to ${admin.email} failed: ${err?.message}`));
    return { reminded: true, canRemindFrom: this.nextRemindAt({ createdAt: request.createdAt, lastRemindedAt: now }).toISOString() };
  }

  private nextRemindAt(r: { createdAt: Date; lastRemindedAt: Date | null }): Date {
    const last = r.lastRemindedAt && r.lastRemindedAt > r.createdAt ? r.lastRemindedAt : r.createdAt;
    return new Date(last.getTime() + 24 * 60 * 60 * 1000);
  }

  /** The owner when they are an active admin; otherwise the admin who has been one longest. */
  private async theAdminAsked(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { ownerUserId: true } });
    const admins = await this.prisma.user.findMany({
      where: { organizationId, role: 'ADMIN', isActive: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    return admins.find((a) => a.id === org?.ownerUserId) ?? admins[0] ?? null;
  }

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
        /* Two things wait at this door now. See `waitingForASeat` below. */
        kind: 'MEMBERSHIP' as const,
      };
    });
  }

  /**
   * AND THE OTHER QUEUE AT THE SAME DOOR: PEOPLE ADDED TO A CHECK-IN WITH NO SEAT FOR THEM.
   *
   * Adding somebody when the account is full no longer refuses the lead - the person is added and
   * simply not written to, because the lead usually cannot fix a seat cap and the person who can is
   * somebody else. This is that somebody else's list.
   *
   * They are NOT membership requests and are deliberately not folded into that table. A membership
   * request is a person from outside asking to join; these are people the lead has already decided
   * on, waiting only on room. The difference matters to the admin answering: one is a judgement
   * about a person, the other is a purchase.
   */
  async waitingForASeat(organizationId: string) {
    const rows = await this.prisma.groundParticipant.findMany({
      where: { awaitingSeat: true, ground: { organizationId } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, email: true, createdAt: true,
        ground: { select: { label: true, initiator: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: null,
      waitingSince: r.createdAt,
      addedBy: r.ground?.initiator
        ? ([r.ground.initiator.firstName, r.ground.initiator.lastName].filter(Boolean).join(' ') || r.ground.initiator.email)
        : null,
      forCheckIn: r.ground?.label ?? null,
      kind: 'SEAT' as const,
      /* The one line an admin needs to know what pressing the button does. */
      saying: 'On the check-in and not yet written to. Their invitation goes out when there is a seat.',
    }));
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

    /* And whoever invited them (U.4): the People page promises both are told. */
    if (request.requestedByUserId && request.requestedByUserId !== adminUserId) {
      const [asker, person, ground] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: request.requestedByUserId }, select: { email: true, firstName: true } }),
        this.prisma.user.findUnique({ where: { id: request.userId }, select: { firstName: true, lastName: true } }),
        request.groundId ? this.prisma.ground.findUnique({ where: { id: request.groundId }, select: { label: true } }) : null,
      ]);
      const who = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() || request.email;
      if (asker?.email) {
        this.email
          .sendTheyAreInNow(asker.email, asker.firstName ?? 'there', who, ground?.label ?? null)
          .catch((err: any) => this.logger.warn(`Could not tell ${asker.email} that ${request.email} was let in: ${err.message}`));
      }
    }

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
        id: true, organizationId: true, userId: true, email: true, status: true, requestedByUserId: true, groundId: true,
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
