import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsIdentity } from './ops-people.service';
import { can } from './what-somebody-may-do';
import {
  OpsFundingStage,
  OpsStrategicStatus,
  OpsExpenseStatus,
  Prisma,
} from '@prisma/client';

/** Funding stages nothing is expected to move out of. */
const FUNDING_CONCLUDED: OpsFundingStage[] = ['CLOSED', 'DECLINED'];

@Injectable()
export class OpsCeoService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Fundraise ----------------------------------------------------------

  createFunding(input: {
    funderName: string;
    fundingType: string;
    ownerId: string;
    primaryContact?: string;
    source?: string;
    askAmount?: number;
    instrument?: string;
    applicationDeadline?: Date;
  }) {
    return this.prisma.opsFundingOpportunity.create({
      data: { ...input, lastActivityAt: new Date() },
    });
  }

  async advanceFunding(
    id: string,
    stage: OpsFundingStage,
    amounts: { committedAmount?: number; closedAmount?: number },
    actorPersonId: string,
  ) {
    const funding = await this.prisma.opsFundingOpportunity.findUnique({ where: { id } });
    if (!funding) throw new NotFoundException('No such funding opportunity');

    const updated = await this.prisma.opsFundingOpportunity.update({
      where: { id },
      data: {
        stage,
        lastActivityAt: new Date(),
        committedAmount: amounts.committedAmount ?? funding.committedAmount,
        closedAmount: amounts.closedAmount ?? funding.closedAmount,
        // A concluded opportunity has nothing left to chase, and the old date
        // would keep it on the overdue list for ever.
        nextAction: FUNDING_CONCLUDED.includes(stage) ? null : funding.nextAction,
        nextActionDueAt: FUNDING_CONCLUDED.includes(stage) ? null : funding.nextActionDueAt,
      },
    });

    await this.prisma.opsActivity.create({
      data: {
        domain: 'FUNDING',
        kind: `stage_${stage.toLowerCase()}`,
        actorPersonId,
        recordType: 'OpsFundingOpportunity',
        recordId: id,
        happenedAt: new Date(),
      },
    });
    return updated;
  }

  setFundingFollowUp(id: string, nextAction: string, dueAt: Date | null) {
    return this.prisma.opsFundingOpportunity.update({
      where: { id },
      data: { nextAction, nextActionDueAt: dueAt, lastActivityAt: new Date() },
    });
  }

  /**
   * The fundraise, with committed and closed kept apart.
   *
   * A pipeline that adds a signed term sheet to money in the bank tells you a
   * number you cannot spend.
   */
  async fundraise() {
    const rows = await this.prisma.opsFundingOpportunity.findMany({
      orderBy: [{ stage: 'asc' }, { nextActionDueAt: 'asc' }],
    });

    const sum = (pick: (r: (typeof rows)[number]) => Prisma.Decimal | null) =>
      rows.reduce((total, r) => total + Number(pick(r) ?? 0), 0);

    const live = rows.filter((r) => !FUNDING_CONCLUDED.includes(r.stage));

    return {
      opportunities: rows,
      totals: {
        active: live.length,
        /** What we have asked for, across everything still live. */
        askedFor: live.reduce((t, r) => t + Number(r.askAmount ?? 0), 0),
        committed: sum((r) => r.committedAmount),
        closed: sum((r) => r.closedAmount),
        overdue: rows.filter(
          (r) => !FUNDING_CONCLUDED.includes(r.stage) && r.nextActionDueAt && r.nextActionDueAt < new Date(),
        ).length,
      },
    };
  }

  // --- Strategy -----------------------------------------------------------

  createStrategic(input: {
    personOrNetwork: string;
    opportunityType: string;
    ownerId: string;
    organization?: string;
    objective?: string;
    source?: string;
  }) {
    return this.prisma.opsStrategicOpportunity.create({
      data: { ...input, lastActivityAt: new Date() },
    });
  }

  setStrategicStatus(id: string, status: OpsStrategicStatus, nextStep?: string, nextStepDueAt?: Date) {
    return this.prisma.opsStrategicOpportunity.update({
      where: { id },
      data: { status, nextStep, nextStepDueAt, lastActivityAt: new Date() },
    });
  }

  /**
   * Records that a relationship turned into something, by pointing at the record
   * it became.
   *
   * The pointer is the whole point: without it, "this network produced three
   * opportunities" is a claim, and the natural way to make it true is to create
   * a second company record — which is the exact duplication the single company
   * identity exists to stop.
   */
  async recordConversion(id: string, convertedToType: string, convertedToId: string) {
    const strategic = await this.prisma.opsStrategicOpportunity.findUnique({ where: { id } });
    if (!strategic) throw new NotFoundException('No such strategic opportunity');

    return this.prisma.opsStrategicOpportunity.update({
      where: { id },
      data: {
        status: 'OPPORTUNITY_CREATED',
        convertedToType,
        convertedToId,
        lastActivityAt: new Date(),
      },
    });
  }

  strategy() {
    return this.prisma.opsStrategicOpportunity.findMany({ orderBy: { status: 'asc' } });
  }

  // --- Resourcing ---------------------------------------------------------

  /** Anybody may ask. The decision is an approval, so it goes in one queue. */
  createResourceRequest(input: {
    requesterId: string;
    supportNeeded: string;
    reason: string;
    urgency: string;
    affectedWorkType?: string;
    affectedRecordId?: string;
    requestedByDate?: Date;
  }) {
    return this.prisma.opsResourceRequest.create({ data: input });
  }

  resourceRequests() {
    return this.prisma.opsResourceRequest.findMany({ orderBy: { createdAt: 'asc' } });
  }

  closeResourceRequest(id: string) {
    return this.prisma.opsResourceRequest.update({ where: { id }, data: { status: 'DECIDED' } });
  }

  // --- Spend --------------------------------------------------------------

  /**
   * Records a claim.
   *
   * Somebody who holds spend:approve does not need a decision on their own
   * spend - there is nobody above them to give one, and the alternative is a
   * claim that sits at REQUESTED for ever looking like an oversight. So theirs
   * is RECORDED rather than requested, and the difference is kept visible: it
   * was not reviewed by a second person, and the ledger says so rather than
   * quietly filing it among the ones that were.
   */
  async submitExpense(input: {
    requesterId: string;
    date: Date;
    description: string;
    category: string;
    amount: number;
    receiptUrl?: string;
    notes?: string;
  }) {
    const holdsTheDecision = await this.prisma.opsGrant.findFirst({
      where: { personId: input.requesterId, capability: 'spend:approve' },
    });

    return this.prisma.opsExpense.create({
      data: {
        ...input,
        status: holdsTheDecision ? 'RECORDED' : 'REQUESTED',
      },
    });
  }

  /**
   * Somebody's own spend, or everybody's with `spend:approve`.
   *
   * Their own is the default rather than the exception: an expense is a personal
   * record, and a list showing everybody's by default is one nobody wants their
   * name on.
   */
  async expensesFor(identity: OpsIdentity, personKey?: string) {
    const seeingEverybody = !personKey && can(identity.capabilities, 'spend:approve');
    if (seeingEverybody) {
      return this.prisma.opsExpense.findMany({ orderBy: { submittedAt: 'desc' } });
    }

    const key = personKey ?? identity.key;
    if (key !== identity.key && !can(identity.capabilities, 'spend:approve')) {
      throw new ForbiddenException(`${key}'s spend is theirs. This needs spend:approve.`);
    }

    const person = await this.prisma.opsPerson.findUnique({ where: { key } });
    if (!person) throw new NotFoundException(`No one here called ${key}`);

    return this.prisma.opsExpense.findMany({
      where: { requesterId: person.id },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async decideExpense(
    id: string,
    status: OpsExpenseStatus,
    identity: OpsIdentity,
    rejectedReason?: string,
  ) {
    const expense = await this.prisma.opsExpense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('No such expense');

    /**
     * Nobody approves their own spend, capability or not.
     *
     * This is the one place the CEO's grants would otherwise let her approve
     * her own reimbursement, and "the person who holds spend:approve is also
     * the person who claims" is exactly the arrangement an auditor asks about.
     */
    if (expense.requesterId === identity.personId) {
      throw new ForbiddenException(
        'Somebody else approves your spend, not you. Yours is recorded rather than approved.',
      );
    }

    return this.prisma.opsExpense.update({
      where: { id },
      data: {
        status,
        approvedById: status === 'APPROVED' ? identity.personId : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        paidAt: status === 'PAID' ? new Date() : expense.paidAt,
        rejectedReason: status === 'REJECTED' ? rejectedReason : null,
      },
    });
  }

  recordEarnings(input: {
    date: Date;
    amount: number;
    source: string;
    note?: string;
    recordedById: string;
  }) {
    return this.prisma.opsEarningsEntry.create({ data: input });
  }

  /**
   * What is left, and what it is made of.
   *
   * Approved-but-unpaid is held apart from paid, because money promised to
   * somebody is already gone in every sense that matters when deciding whether
   * to approve the next thing.
   */
  async balance() {
    const [earnings, expenses, approvers] = await Promise.all([
      this.prisma.opsEarningsEntry.findMany(),
      this.prisma.opsExpense.findMany(),
      this.prisma.opsGrant.findMany({ where: { capability: 'spend:approve' } }),
    ]);

    /**
     * Claims nobody is allowed to approve.
     *
     * Mostly answered now - somebody who holds spend:approve records their
     * spend rather than requesting it - but the check stays, because the
     * situation comes back the moment a second approver is added and then
     * removed, and a claim that can never be decided must never again look
     * like one somebody has not got round to.
     */
    const whoMayApprove = new Set(approvers.map((g) => g.personId));
    const stranded = expenses.filter(
      (e) => e.status === 'REQUESTED' && whoMayApprove.size > 0 && [...whoMayApprove].every((id) => id === e.requesterId),
    );

    const earned = earnings.reduce((t, e) => t + Number(e.amount), 0);
    const paid = expenses.filter((e) => e.status === 'PAID').reduce((t, e) => t + Number(e.amount), 0);
    /**
     * RECORDED counts here alongside APPROVED. It is money that is going out
     * whether or not a second person looked at it, and a balance that left it
     * out would be the more comfortable number rather than the true one.
     */
    const approvedNotPaid = expenses
      .filter((e) => e.status === 'APPROVED' || e.status === 'RECORDED')
      .reduce((t, e) => t + Number(e.amount), 0);
    const awaiting = expenses
      .filter((e) => e.status === 'REQUESTED')
      .reduce((t, e) => t + Number(e.amount), 0);

    return {
      earned,
      paid,
      approvedNotPaid,
      awaitingDecision: awaiting,
      /** What is actually left once everything already said yes to is gone. */
      remaining: earned - paid - approvedNotPaid,
      currency: 'USD',
      /** Named rather than counted, because each one needs a person to act. */
      nobodyCanApprove: stranded.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        why: 'The only person who may approve spend is the person who claimed it. Somebody else needs spend:approve.',
      })),
      says:
        earnings.length === 0
          ? 'Nothing has been recorded as earned, so there is no balance to give'
          : `${earned - paid - approvedNotPaid} left of ${earned} earned`,
    };
  }
}
