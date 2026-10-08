import { recordTheStrategy } from './the-strategy-over-time';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SubjectType } from '@prisma/client';
import { freshnessOf, Freshness } from './a-pointer-goes-stale';

export interface SubjectPush {
  externalId: string;
  sourceSystem: string;
  type: string;
  title: string;
  measure?: string | null;
  target?: string | null;
  /**
   * WHY THIS NUMBER, AND HOW IT WILL BE MOVED.
   *
   * Optional, and it stays optional: an objective imported from a customer's
   * own planning tool arrives with whatever that tool holds, and refusing the
   * import for a missing sentence would mean refusing their data.
   *
   * Sent, it reaches the check-in where the target is being missed — which is
   * the moment the reason for the target is worth the most and is least likely
   * to still be in anybody's head.
   */
  justification?: string | null;
  approach?: string | null;
  ownerExternalId?: string | null;
  contributorExternalIds?: string[] | null;
  parentExternalId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  status?: string | null;
}

const TYPES: Record<string, SubjectType> = {
  objective: SubjectType.OBJECTIVE,
  project: SubjectType.PROJECT,
  decision: SubjectType.DECISION,
  /*
   * A shop, a prospect, a client. Until this existed "Shop A" was a string inside a sentence, so
   * the same shop in two weeks was two unrelated pieces of text and nothing could be attached to
   * either.
   *
   * It is not a CRM record and must not become one - a name and an id, so evidence and a
   * conversation can point at the same shop twice.
   */
  counterparty: SubjectType.COUNTERPARTY,
};

/**
 * THE CUSTOMER'S OWN WORK, TAKEN IN AND NEVER TAKEN OVER.
 *
 * Every method here is org-scoped as its first argument rather than as an afterthought, because the
 * failure this whole layer has to not have is one org reading another's objectives. See
 * tenant-isolation-is-the-invariant-that-ends-a-company.spec.ts for why that is asserted against a
 * fake Prisma that actually evaluates its where clause.
 */
@Injectable()
export class SubjectsService {
  private readonly logger = new Logger(SubjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * PUSH, NOT PULL, AND UPSERT ON THEIR KEY.
   *
   * They call us on create and change. The key is (org, source system, external id): the same
   * string may legitimately mean different things in two of their tools, so the source system is
   * part of the identity rather than a label on it.
   *
   * `syncedAt` moves on every push INCLUDING one that changes nothing, because the question it
   * answers is "when did their system last tell us", not "when did the wording last differ". A
   * no-op push is exactly how a healthy integration proves it is still alive, and treating it as
   * nothing to record would make a working connection look silent.
   */
  async push(organizationId: string, dto: SubjectPush) {
    const type = TYPES[(dto.type ?? '').toLowerCase()];
    if (!type) {
      throw new BadRequestException(`Unknown subject type "${dto.type}". Expected ${Object.keys(TYPES).join(", ")}.`);
    }
    if (!dto.externalId?.trim() || !dto.sourceSystem?.trim()) {
      throw new BadRequestException('externalId and sourceSystem are required.');
    }
    if (!dto.title?.trim()) throw new BadRequestException('Add a title and try again.');

    const wording = {
      type,
      title: dto.title.trim(),
      measure: dto.measure?.trim() || null,
      target: dto.target?.trim() || null,
      justification: dto.justification?.trim() || null,
      approach: dto.approach?.trim() || null,
      ownerExternalId: dto.ownerExternalId?.trim() || null,
      contributorExternalIds: (dto.contributorExternalIds ?? null) as Prisma.InputJsonValue | null,
      parentExternalId: dto.parentExternalId?.trim() || null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      status: dto.status?.trim() || null,
      syncedAt: new Date(),
      /*
       * A push resurrects a subject their system deleted and then restored. Clearing this on update
       * rather than leaving it is deliberate: the alternative is a row that is present in their
       * tool and permanently marked gone in ours, which nothing would ever correct.
       */
      sourceDeletedAt: null,
    };

    const saved = await this.prisma.subject.upsert({
      where: {
        organizationId_sourceSystem_externalId: {
          organizationId,
          sourceSystem: dto.sourceSystem.trim(),
          externalId: dto.externalId.trim(),
        },
      },
      create: {
        organizationId,
        externalId: dto.externalId.trim(),
        sourceSystem: dto.sourceSystem.trim(),
        ...(wording as any),
      },
      update: wording as any,
    });
    /* The organisation's priorities may have changed: keep a new version of the strategy if so (the-strategy-over-time.ts). */
    if (type === 'OBJECTIVE') await recordTheStrategy(this.prisma, organizationId);
    return saved;
  }

  /**
   * SOFT, ALWAYS. Their tool dropped it; every finding that referenced it stays readable, because
   * the objective's history is what makes the findings intelligible and deleting the row would
   * leave a set of conclusions about nothing.
   */
  async markSourceDeleted(organizationId: string, sourceSystem: string, externalId: string) {
    const { count } = await this.prisma.subject.updateMany({
      where: { organizationId, sourceSystem, externalId, sourceDeletedAt: null },
      data: { sourceDeletedAt: new Date() },
    });
    if (count > 0) await recordTheStrategy(this.prisma, organizationId);
    return { deleted: count > 0 };
  }

  /** One subject with its freshness resolved, or null. Scoped, so a wrong org gets null not a row. */
  async find(organizationId: string, sourceSystem: string, externalId: string, now = new Date()) {
    const row = await this.prisma.subject.findFirst({
      where: { organizationId, sourceSystem, externalId },
    });
    return row ? this.withFreshness(row, now) : null;
  }

  async list(
    organizationId: string,
    opts: { type?: SubjectType; includeDeleted?: boolean } = {},
    now = new Date(),
  ) {
    const rows = await this.prisma.subject.findMany({
      where: {
        organizationId,
        ...(opts.type ? { type: opts.type } : {}),
        ...(opts.includeDeleted ? {} : { sourceDeletedAt: null }),
      },
      orderBy: { syncedAt: 'desc' },
    });
    return rows.map((r) => this.withFreshness(r, now));
  }

  /*
   * A `connectionHealth` roll-up per source system was written here and deleted before it shipped.
   * It is for the admin console's staleness panel, and that console does not exist - so it was a
   * method nobody could call, written against a screen nobody had designed. `list()` already
   * carries the freshness of every row, which is what such a panel would be built from. Write it
   * when there is a page asking for it, and it will be written to fit that page rather than to fit
   * a guess at it.
   */

  private withFreshness<T extends { syncedAt: Date; sourceDeletedAt: Date | null }>(
    row: T,
    now: Date,
  ): T & { freshness: Freshness } {
    return { ...row, freshness: freshnessOf(row, now) };
  }
}
