import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RECORDING WHEN A REVIEW FALLS DUE.
 *
 * A date held in the customer's own system, noted here so the record this
 * product already produces can arrive before the conversation rather than after
 * it. Groundwork does not evaluate anybody and this does not make it start.
 *
 * The sending lives in `reviews-coming-up.cron.ts`, beside every other thing
 * this product does on a schedule — and because a method whose only caller is a
 * scheduler is one the caller guard cannot see, which is exactly why crons live
 * in their own files here.
 */
@Injectable()
export class ReviewsComingUpService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /** Recording a date. Somebody types it, or their system sends it. */
  async note(input: {
    organizationId: string;
    personExternalId: string;
    dueOn: Date;
    kind: string;
    source: string;
  }) {
    return this.prisma.evaluationDue.upsert({
      where: {
        organizationId_personExternalId_dueOn_kind: {
          organizationId: input.organizationId,
          personExternalId: input.personExternalId,
          dueOn: input.dueOn,
          kind: input.kind,
        },
      },
      create: input,
      /* The same review recorded twice is one review. Only where it came from
         can change — a date somebody typed, later confirmed by their system. */
      update: { source: input.source },
    });
  }
}
