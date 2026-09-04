import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsIdentity } from './ops-people.service';
import { can } from './what-somebody-may-do';
import { attributionIsOpen, isQualified } from './only-the-originator-gets-origination';
import {
  OpsCommercialStage,
  OpsPositioningStage,
  OpsContributionRole,
  OpsAttributionState,
} from '@prisma/client';

/** Writing to the commercial record: opportunities, payments, claims, positioning. */
@Injectable()
export class OpsCommercialService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Opportunities -------------------------------------------------------

  /**
   * Opens an opportunity with NO attribution.
   *
   * Deliberately: whoever types the record is not thereby its originator, and
   * offering the field at creation is how the person entering data becomes the
   * person credited. Somebody claims it afterwards and somebody else approves.
   */
  async open(input: {
    companyKey: string;
    name: string;
    opportunityType?: string;
    estimatedMrr?: number;
    estimatedContractValue?: number;
  }) {
    const company = await this.prisma.opsCompany.findUnique({ where: { key: input.companyKey } });
    if (!company) throw new NotFoundException(`No company called ${input.companyKey}`);

    return this.prisma.opsCommercialOpportunity.create({
      data: {
        companyId: company.id,
        name: input.name,
        opportunityType: input.opportunityType,
        estimatedMrr: input.estimatedMrr,
        estimatedContractValue: input.estimatedContractValue,
      },
    });
  }

  async advance(id: string, stage: OpsCommercialStage, lostReason?: string) {
    const opportunity = await this.prisma.opsCommercialOpportunity.findUnique({ where: { id } });
    if (!opportunity) throw new NotFoundException('No such opportunity');

    return this.prisma.opsCommercialOpportunity.update({
      where: { id },
      data: {
        stage,
        lostAt: stage === 'LOST' ? new Date() : opportunity.lostAt,
        lostReason: stage === 'LOST' ? lostReason : opportunity.lostReason,
        /* Stamped when it first becomes worth claiming, so the lock has a date
           somebody can point at rather than an inference from the stage. */
        attributionLockedAt:
          isQualified(stage) && !opportunity.attributionLockedAt
            ? new Date()
            : opportunity.attributionLockedAt,
        nextAction: ['LOST'].includes(stage) ? null : opportunity.nextAction,
      },
    });
  }

  /** Operational. Creates no attribution of any kind. */
  setNextAction(id: string, nextAction: string, ownerId?: string, dueAt?: Date) {
    return this.prisma.opsCommercialOpportunity.update({
      where: { id },
      data: { nextAction, nextActionOwnerId: ownerId, nextActionDueAt: dueAt },
    });
  }

  /**
   * Records money that actually arrived.
   *
   * Also stamps the first payment date and the actual MRR on the opportunity,
   * because those two are read constantly and recomputing them from the whole
   * payment history on every read would be the same answer, slower.
   */
  async recordPayment(input: {
    opportunityId: string;
    amount: number;
    paidAt: Date;
    reference?: string;
    recordedById: string;
  }) {
    const opportunity = await this.prisma.opsCommercialOpportunity.findUnique({
      where: { id: input.opportunityId },
      include: { payments: true },
    });
    if (!opportunity) throw new NotFoundException('No such opportunity');

    const payment = await this.prisma.opsCommercialPayment.create({
      data: {
        opportunityId: input.opportunityId,
        amount: input.amount,
        paidAt: input.paidAt,
        reference: input.reference,
        recordedById: input.recordedById,
      },
    });

    const firstPaymentAt =
      opportunity.firstPaymentAt === null || input.paidAt < opportunity.firstPaymentAt
        ? input.paidAt
        : opportunity.firstPaymentAt;

    await this.prisma.opsCommercialOpportunity.update({
      where: { id: input.opportunityId },
      data: {
        firstPaymentAt,
        /* Moved to PAYING on the first payment. A client who has paid is a
           paying client, and leaving somebody to remember to move the stage is
           how the pipeline stops matching the bank. */
        stage: opportunity.stage === 'LOST' ? opportunity.stage : 'PAYING',
      },
    });

    return payment;
  }

  // --- Attribution ---------------------------------------------------------

  /**
   * Somebody claims they created this.
   *
   * Refused once the opportunity is qualified, which is the point at which a
   * deal becomes worth claiming. That is the whole mechanism against
   * retrospective claims - an admin can still set attribution afterwards, and
   * the history keeps every version.
   */
  async claim(input: {
    opportunityId: string;
    claimantId: string;
    role: OpsContributionRole;
    claimedBasis: string;
    evidenceUrl?: string;
  }) {
    const opportunity = await this.prisma.opsCommercialOpportunity.findUnique({
      where: { id: input.opportunityId },
    });
    if (!opportunity) throw new NotFoundException('No such opportunity');

    if (!attributionIsOpen(opportunity, input.role)) {
      throw new ForbiddenException(
        'This opportunity is past qualified, so attribution is closed. An admin can still set it, and the change stays in the history.',
      );
    }

    const claim = await this.prisma.opsAttributionClaim.create({ data: input });
    await this.prisma.opsCommercialOpportunity.update({
      where: { id: input.opportunityId },
      data: input.role === 'OPPORTUNITY_ORIGINATOR' ? { originatorState: 'CLAIMED' } : { positioningState: 'CLAIMED' },
    });
    return claim;
  }

  /**
   * Somebody decides. Approve, reject, or approve it as somebody else.
   *
   * The original claim is never overwritten. A modified decision records who it
   * was moved to alongside who claimed it, because the history is what makes
   * the attribution defensible later and a record holding only the current
   * answer cannot support that conversation.
   */
  async decideClaim(
    claimId: string,
    decision: { state: Exclude<OpsAttributionState, 'NEEDS_REVIEW' | 'CLAIMED'>; note?: string; insteadPersonId?: string },
    identity: OpsIdentity,
  ) {
    if (!can(identity.capabilities, 'commercial:approve')) {
      throw new ForbiddenException('Deciding attribution needs commercial:approve');
    }

    const claim = await this.prisma.opsAttributionClaim.findUnique({
      where: { id: claimId },
      include: { opportunity: true },
    });
    if (!claim) throw new NotFoundException('No such claim');
    if (claim.state !== 'CLAIMED') {
      throw new ForbiddenException(`Already ${claim.state.toLowerCase()}. Decide it once.`);
    }

    const creditedTo = decision.insteadPersonId ?? claim.claimantId;

    await this.prisma.opsAttributionClaim.update({
      where: { id: claimId },
      data: {
        state: decision.state,
        decidedById: identity.personId,
        decidedAt: new Date(),
        decisionNote: decision.note,
        modifiedToPersonId: decision.insteadPersonId ?? null,
      },
    });

    if (decision.state === 'APPROVED') {
      await this.prisma.opsCommercialOpportunity.update({
        where: { id: claim.opportunityId },
        data:
          claim.role === 'OPPORTUNITY_ORIGINATOR'
            ? { originatorState: 'APPROVED', opportunityOriginatorId: creditedTo }
            : { positioningState: 'APPROVED', positioningSourceId: creditedTo },
      });
    } else {
      /*
       * A rejected claim returns THAT ROLE to unattributed - but only if nobody
       * is credited for it. Two people claiming the same role is the ordinary
       * case, not the exception: Hafsah originated, Sahar believed she had, and
       * rejecting Sahar's claim must not take the credit off Hafsah.
       *
       * Both halves of this were found by running the worked example rather than
       * reading it. First a single shared state let a rejection wipe the OTHER
       * role; then, with the states split, a rejection still wiped the same role
       * somebody was already approved for. Every write was correct on its own,
       * and only the ledgers showed it, as rows of zeroes.
       */
      /* `!= null` rather than `!== null`: an absent field is undefined, and
         `undefined !== null` is true - which read as "already credited" for
         every opportunity and stopped the reset from ever running. */
      const alreadyCredited =
        claim.role === 'OPPORTUNITY_ORIGINATOR'
          ? claim.opportunity.opportunityOriginatorId != null
          : claim.opportunity.positioningSourceId != null;

      if (!alreadyCredited) {
        await this.prisma.opsCommercialOpportunity.update({
          where: { id: claim.opportunityId },
          data:
            claim.role === 'OPPORTUNITY_ORIGINATOR'
              ? { originatorState: 'NEEDS_REVIEW' }
              : { positioningState: 'NEEDS_REVIEW' },
        });
      }
    }

    return this.prisma.opsAttributionClaim.findUnique({ where: { id: claimId } });
  }

  /** Everything waiting on a decision, with the claim and the evidence. */
  async claimsAwaiting() {
    const [claims, people] = await Promise.all([
      this.prisma.opsAttributionClaim.findMany({
        where: { state: 'CLAIMED' },
        include: { opportunity: { include: { company: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.opsPerson.findMany(),
    ]);
    const name = new Map(people.map((p) => [p.id, p.displayName]));

    return claims.map((c) => ({
      id: c.id,
      claimant: name.get(c.claimantId) ?? 'somebody since removed',
      role: c.role,
      company: c.opportunity.company.name,
      opportunity: c.opportunity.name,
      claimedBasis: c.claimedBasis,
      evidenceUrl: c.evidenceUrl,
      recordCreatedAt: c.opportunity.createdAt,
      claimedAt: c.createdAt,
    }));
  }

  /** The history for one opportunity: every claim, decided or not. */
  async attributionHistory(opportunityId: string) {
    const [claims, people] = await Promise.all([
      this.prisma.opsAttributionClaim.findMany({
        where: { opportunityId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.opsPerson.findMany(),
    ]);
    const name = new Map(people.map((p) => [p.id, p.displayName]));

    return claims.map((c) => ({
      claimant: name.get(c.claimantId) ?? null,
      role: c.role,
      claimedBasis: c.claimedBasis,
      state: c.state,
      decidedBy: c.decidedById ? name.get(c.decidedById) ?? null : null,
      decidedAt: c.decidedAt,
      decisionNote: c.decisionNote,
      creditedInsteadTo: c.modifiedToPersonId ? name.get(c.modifiedToPersonId) ?? null : null,
      claimedAt: c.createdAt,
    }));
  }

  // --- Positioning ---------------------------------------------------------

  openPositioning(input: {
    contributorId: string;
    personOrNetwork: string;
    organization?: string;
    accessType: string;
    openedAt?: Date;
    evidenceUrl?: string;
  }) {
    return this.prisma.opsPositioningRecord.create({
      data: { ...input, openedAt: input.openedAt ?? new Date() },
    });
  }

  advancePositioning(id: string, stage: OpsPositioningStage) {
    return this.prisma.opsPositioningRecord.update({ where: { id }, data: { stage } });
  }

  async positioning(contributorId?: string) {
    const [records, people] = await Promise.all([
      this.prisma.opsPositioningRecord.findMany({
        where: contributorId ? { contributorId } : undefined,
        orderBy: { openedAt: 'desc' },
      }),
      this.prisma.opsPerson.findMany(),
    ]);
    const name = new Map(people.map((p) => [p.id, p.displayName]));
    return records.map((r) => ({ ...r, contributor: name.get(r.contributorId) ?? null }));
  }

  pipeline(filter?: { stage?: OpsCommercialStage }) {
    return this.prisma.opsCommercialOpportunity.findMany({
      where: { stage: filter?.stage },
      include: { company: true, payments: true },
      orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
