import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ApiAccessStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { whyThisRequestCannotBeRecorded, whyTheApiIsRefused } from './access-is-asked-for-not-bought';

/**
 * ASKING FOR THE API, AND DECIDING WHO GETS IT.
 *
 * Two sides of one row. The organisation asks and can see where their request
 * has got to; the platform reads what they said and decides.
 */
@Injectable()
export class ApiAccessService {
  private readonly logger = new Logger(ApiAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ask, or ask again.
   *
   * One row per organisation, and asking again REOPENS it rather than making a
   * second: a queue with two live requests from the same company is a queue
   * where one of them gets answered and the other does not.
   *
   * Asking again after approval is refused rather than reopened — it would take
   * a working integration off the air to answer a question nobody asked.
   */
  async ask(organizationId: string, userId: string, whatFor: string) {
    const wrong = whyThisRequestCannotBeRecorded(whatFor);
    if (wrong) throw new BadRequestException(wrong);

    const existing = await this.prisma.apiAccessRequest.findUnique({ where: { organizationId } });

    if (existing?.status === ApiAccessStatus.APPROVED) {
      throw new BadRequestException('This organisation already has API access.');
    }

    if (existing) {
      return this.prisma.apiAccessRequest.update({
        where: { organizationId },
        data: {
          requestedByUserId: userId,
          whatFor: whatFor.trim(),
          requestedAt: new Date(),
          status: ApiAccessStatus.PENDING,
          /* The previous decision is cleared, not kept: leaving a decline on a
             reopened request would show it as declined in the queue it is
             waiting in. What was said stays in the note until somebody decides
             again. */
          decidedByUserId: null,
          decidedAt: null,
        },
      });
    }

    return this.prisma.apiAccessRequest.create({
      data: { organizationId, requestedByUserId: userId, whatFor: whatFor.trim() },
    });
  }

  /** Where an organisation's own request has got to, in words they can act on. */
  async whereMineHasGotTo(organizationId: string) {
    const request = await this.prisma.apiAccessRequest.findUnique({ where: { organizationId } });

    return {
      status: request?.status ?? null,
      whatFor: request?.whatFor ?? null,
      requestedAt: request?.requestedAt ?? null,
      decidedAt: request?.decidedAt ?? null,
      note: request?.note ?? null,
      approved: request?.status === ApiAccessStatus.APPROVED,
      says:
        request?.status === ApiAccessStatus.APPROVED
          ? 'Approved. Issue a credential and connect.'
          : whyTheApiIsRefused(request),
    };
  }

  /** Everything waiting, and everything decided. Newest ask first. */
  async everyRequest() {
    const requests = await this.prisma.apiAccessRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      include: { organization: { select: { id: true, name: true } } },
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: requests.flatMap((r) => [r.requestedByUserId, r.decidedByUserId ?? '']) } },
      select: { id: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return requests.map((r) => ({
      id: r.id,
      organization: r.organization,
      whatFor: r.whatFor,
      status: r.status,
      requestedAt: r.requestedAt,
      /* The id where there is no account behind it — the backfill wrote
         'migration', and showing that plainly is better than an empty name that
         looks like a person we cannot find. */
      requestedBy: byId.get(r.requestedByUserId)?.email ?? r.requestedByUserId,
      decidedBy: r.decidedByUserId ? (byId.get(r.decidedByUserId)?.email ?? r.decidedByUserId) : null,
      decidedAt: r.decidedAt,
      note: r.note,
    }));
  }

  /**
   * Decide one.
   *
   * A note is required for anything that is not an approval. Somebody is going
   * to be told no, or told their working integration has been switched off, and
   * a decision with no reason recorded is one nobody can answer a question about
   * three months later.
   */
  async decide(id: string, status: ApiAccessStatus, byUserId: string, note?: string) {
    if (status === ApiAccessStatus.PENDING) {
      throw new BadRequestException('Pending is where a request starts, not something to decide it into.');
    }

    const request = await this.prisma.apiAccessRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('No such request.');

    if (status !== ApiAccessStatus.APPROVED && !note?.trim()) {
      throw new BadRequestException(
        'Say why. Somebody is being told no, or having a working integration switched off, and a decision with no reason recorded is one nobody can answer for later.',
      );
    }

    const updated = await this.prisma.apiAccessRequest.update({
      where: { id },
      data: { status, decidedByUserId: byUserId, decidedAt: new Date(), note: note?.trim() || null },
    });

    this.logger.log(`API access for ${request.organizationId} is now ${status}.`);
    return updated;
  }
}
