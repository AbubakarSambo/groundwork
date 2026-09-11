import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ApiAccessStatus } from '@prisma/client';
import { API_TERMS_VERSION } from './the-api-terms';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { API_ACCESS_ASKED_EVENT, ApiAccessAskedEvent } from '../../common/events';
import { PrismaService } from '../prisma/prisma.service';
import { whyThisRequestCannotBeRecorded, whyTheApiIsRefused } from './access-is-asked-for-not-bought';
import { EmailService } from '../email/email.service';

/**
 * ASKING FOR THE API, AND DECIDING WHO GETS IT.
 *
 * Two sides of one row. The organisation asks and can see where their request
 * has got to; the platform reads what they said and decides.
 */
@Injectable()
export class ApiAccessService {
  private readonly logger = new Logger(ApiAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly email: EmailService,
  ) {}

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
  async ask(organizationId: string, userId: string, whatFor: string, acceptedTerms = false) {
    const wrong = whyThisRequestCannotBeRecorded(whatFor);
    if (wrong) throw new BadRequestException(wrong);
    if (!acceptedTerms) {
      throw new BadRequestException('The API terms have to be accepted before access can be asked for. They are short; read them on the Connect page.');
    }
    const terms = { acceptedTermsAt: new Date(), termsVersion: API_TERMS_VERSION };

    const existing = await this.prisma.apiAccessRequest.findUnique({ where: { organizationId } });

    if (existing?.status === ApiAccessStatus.APPROVED) {
      throw new BadRequestException('This organisation already has API access.');
    }

    /* The back office hears about it now, not when somebody happens to open the queue. */
    this.events.emit(API_ACCESS_ASKED_EVENT, { organizationId, askedByUserId: userId, whatFor: whatFor.trim() } satisfies ApiAccessAskedEvent);

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
          ...terms,
        },
      });
    }

    return this.prisma.apiAccessRequest.create({
      data: { organizationId, requestedByUserId: userId, whatFor: whatFor.trim(), ...terms },
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

    /* WHAT THE WATCH SAW, beside the decision it informs. Open flags first, then a day's counts. */
    const orgIds = requests.map((r) => r.organizationId);
    const openFlags = await this.prisma.apiUsageFlag.findMany({
      where: { organizationId: { in: orgIds }, clearedAt: null },
      orderBy: { raisedAt: 'desc' },
    });
    const flagsByOrg = new Map<string, typeof openFlags>();
    for (const f of openFlags) (flagsByOrg.get(f.organizationId) ?? flagsByOrg.set(f.organizationId, []).get(f.organizationId)!).push(f);
    const since = new Date(Date.now() - 24 * 3600_000);
    const lastDayRows = await this.prisma.apiCall.groupBy({
      by: ['organizationId', 'method'],
      where: { organizationId: { in: orgIds }, at: { gte: since } },
      _count: { _all: true },
    });
    const lastDayByOrg = new Map<string, { calls: number; reads: number; writes: number }>();
    for (const row of lastDayRows) {
      const d = lastDayByOrg.get(row.organizationId) ?? { calls: 0, reads: 0, writes: 0 };
      d.calls += row._count._all;
      if (row.method === 'GET' || row.method === 'HEAD') d.reads += row._count._all; else d.writes += row._count._all;
      lastDayByOrg.set(row.organizationId, d);
    }

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
      acceptedTermsAt: r.acceptedTermsAt,
      termsVersion: r.termsVersion,
      lastDay: lastDayByOrg.get(r.organizationId) ?? null,
      flags: flagsByOrg.get(r.organizationId) ?? [],
    }));
  }

  /** The admin has looked and decided it is fine, or has acted on it. */
  async clearFlag(flagId: string) {
    return this.prisma.apiUsageFlag.update({ where: { id: flagId }, data: { clearedAt: new Date() } });
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
    /*
     * SOMEBODY IS TOLD. The comment on the note said "somebody is going to be told no", and nothing
     * told them: a customer who asked waited with no answer, or found out a working integration was
     * off when their calls began failing. The person who asked hears, and so does every admin of the
     * organisation, with the note that was made mandatory so that they could be told.
     */
    void this.tellThem(request.organizationId, request.requestedByUserId, status, updated.note ?? null)
      .catch((err: any) => this.logger.warn(`Could not tell ${request.organizationId} about the API access decision: ${err?.message}`));
    return updated;
  }

  private async tellThem(organizationId: string, requestedByUserId: string, status: ApiAccessStatus, note: string | null): Promise<void> {
    const people = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null, isActive: true, OR: [{ id: requestedByUserId }, { role: 'ADMIN' }] },
      select: { email: true, firstName: true },
    });
    const link = `${this.email.frontendUrlForLinks().replace(/\/$/, '')}/org/integrations`;
    for (const p of people) {
      if (status === ApiAccessStatus.APPROVED) await this.email.sendApiAccessApproved(p.email, p.firstName, link);
      else if (status === ApiAccessStatus.DECLINED) await this.email.sendApiAccessDeclined(p.email, p.firstName, note ?? '', link);
      else await this.email.sendApiAccessWithdrawn(p.email, p.firstName, note ?? '', link);
    }
  }
}
