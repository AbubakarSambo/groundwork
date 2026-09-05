import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OpsRoadmapStatus,
  OpsWorkItemStatus,
  OpsUseCaseReadiness,
  OpsApprovalType,
  OpsApprovalStatus,
} from '@prisma/client';
import { isSolid, whatIsLeftToSay } from './what-solid-means';
import { mayMoveOutOfProposed } from './nothing-executes-until-it-is-approved';
import { OpsIdentity } from './ops-people.service';
import { decidesSomething } from './who-decides-anything';

/**
 * What we build: the roadmap, whether a client's use case is supported, the
 * technical work, the interface problems — and the one approval queue they all
 * come through.
 */
@Injectable()
export class OpsBuildService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Roadmap ------------------------------------------------------------

  propose(input: {
    title: string;
    description?: string;
    itemType: string;
    productArea?: string;
    priority?: number;
    proposedById: string;
    ownerId?: string;
    relatedCompanyId?: string;
    approvalRequired?: boolean;
    rationale?: string;
    expectedValue?: string;
    targetDate?: Date;
  }) {
    return this.prisma.opsRoadmapItem.create({
      data: { ...input, ownerId: input.ownerId ?? input.proposedById },
    });
  }

  /**
   * Moves a roadmap item, and refuses when a decision is outstanding.
   *
   * The refusal quotes the reason rather than saying "forbidden", because the
   * person hitting it is usually the person who proposed the thing and needs to
   * know which of the four waiting states they are in.
   */
  async setRoadmapStatus(itemId: string, status: OpsRoadmapStatus, actorPersonId: string) {
    const item = await this.prisma.opsRoadmapItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('No such roadmap item');

    const approvals = await this.prisma.opsApproval.findMany({
      where: { relatedRecordType: 'OpsRoadmapItem', relatedRecordId: itemId },
    });

    const gate = mayMoveOutOfProposed(item, approvals, status);
    if (!gate.allowed) throw new ForbiddenException(gate.because);

    const updated = await this.prisma.opsRoadmapItem.update({
      where: { id: itemId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });

    await this.log('PRODUCT', `roadmap_${status.toLowerCase()}`, actorPersonId, itemId, item.relatedCompanyId);
    return updated;
  }

  roadmap(filter?: { status?: OpsRoadmapStatus }) {
    return this.prisma.opsRoadmapItem.findMany({
      where: { status: filter?.status },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // --- Use-case readiness -------------------------------------------------

  async recordUseCase(input: {
    companyKey: string;
    title: string;
    description?: string;
    expectedWorkflow?: string;
    category?: string;
    ownerId?: string;
    priority?: number;
  }) {
    const company = await this.prisma.opsCompany.findUnique({ where: { key: input.companyKey } });
    if (!company) throw new NotFoundException(`No company called ${input.companyKey}`);

    return this.prisma.opsClientUseCase.create({
      data: {
        companyId: company.id,
        title: input.title,
        description: input.description,
        expectedWorkflow: input.expectedWorkflow,
        category: input.category,
        ownerId: input.ownerId,
        priority: input.priority ?? 3,
      },
    });
  }

  /**
   * Sets readiness, and refuses PRODUCT_READY while a gap is still recorded.
   *
   * Without this, "product ready" is an opinion typed over the top of three
   * written-down reasons it is not — and the readiness number on the target list
   * board goes up while the gaps sit underneath it, unchanged.
   */
  async setReadiness(
    useCaseId: string,
    readiness: OpsUseCaseReadiness,
    gaps: { productGap?: string | null; uxGap?: string | null; technicalGap?: string | null },
    actorPersonId: string,
  ) {
    const useCase = await this.prisma.opsClientUseCase.findUnique({ where: { id: useCaseId } });
    if (!useCase) throw new NotFoundException('No such use case');

    const after = {
      productGap: gaps.productGap === undefined ? useCase.productGap : gaps.productGap,
      uxGap: gaps.uxGap === undefined ? useCase.uxGap : gaps.uxGap,
      technicalGap: gaps.technicalGap === undefined ? useCase.technicalGap : gaps.technicalGap,
    };

    const stillOpen = Object.entries(after)
      .filter(([, value]) => value)
      .map(([name]) => name.replace('Gap', ''));

    if (readiness === 'PRODUCT_READY' && stillOpen.length > 0) {
      throw new ForbiddenException(
        `${useCase.title} still has a ${stillOpen.join(' and a ')} gap recorded. Clear the gap, or say it is not one.`,
      );
    }

    const updated = await this.prisma.opsClientUseCase.update({
      where: { id: useCaseId },
      data: { productReadiness: readiness, ...after },
    });

    await this.log('PRODUCT', `readiness_${readiness.toLowerCase()}`, actorPersonId, useCaseId, useCase.companyId);
    return updated;
  }

  useCases(companyKey?: string) {
    return this.prisma.opsClientUseCase.findMany({
      where: companyKey ? { company: { key: companyKey } } : undefined,
      include: { company: true, links: true },
      orderBy: [{ priority: 'asc' }],
    });
  }

  /** Points a use case at the roadmap, tech or UX item that is holding it up. */
  async linkToUseCase(useCaseId: string, targetType: string, targetId: string) {
    return this.prisma.opsUseCaseLink.upsert({
      where: { useCaseId_targetType_targetId: { useCaseId, targetType, targetId } },
      update: {},
      create: { useCaseId, targetType, targetId },
    });
  }

  // --- Tech and UX --------------------------------------------------------

  createTechItem(input: {
    title: string;
    description?: string;
    itemType: string;
    severity: string;
    ownerId?: string;
    relatedCompanyId?: string;
    relatedDeploymentId?: string;
    targetDate?: Date;
  }) {
    return this.prisma.opsTechItem.create({ data: input });
  }

  async setTechStatus(id: string, status: OpsWorkItemStatus, blockerReason: string | undefined, actorPersonId: string) {
    const item = await this.prisma.opsTechItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('No such tech item');

    const updated = await this.prisma.opsTechItem.update({
      where: { id },
      data: {
        status,
        blockerReason: status === 'BLOCKED' ? blockerReason : null,
        completedAt: status === 'RESOLVED' ? new Date() : null,
      },
    });
    await this.log('TECH', `tech_${status.toLowerCase()}`, actorPersonId, id, item.relatedCompanyId);
    return updated;
  }

  techItems(filter?: { status?: OpsWorkItemStatus; ownerId?: string }) {
    return this.prisma.opsTechItem.findMany({
      where: { status: filter?.status, ownerId: filter?.ownerId },
      orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createUXItem(input: {
    title: string;
    affectedFlow?: string;
    description?: string;
    sourceNote?: string;
    severity: string;
    ownerId?: string;
    relatedCompanyId?: string;
    relatedUseCaseId?: string;
  }) {
    return this.prisma.opsUXItem.create({ data: input });
  }

  async setUXStatus(id: string, status: OpsWorkItemStatus, actorPersonId: string) {
    const item = await this.prisma.opsUXItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('No such UX item');

    const updated = await this.prisma.opsUXItem.update({
      where: { id },
      data: { status, completedAt: status === 'RESOLVED' ? new Date() : null },
    });
    await this.log('PRODUCT', `ux_${status.toLowerCase()}`, actorPersonId, id, item.relatedCompanyId);
    return updated;
  }

  uxItems(filter?: { status?: OpsWorkItemStatus }) {
    return this.prisma.opsUXItem.findMany({
      where: { status: filter?.status },
      orderBy: [{ severity: 'asc' }],
    });
  }

  // --- Approvals ----------------------------------------------------------

  /** Asks somebody to decide. One queue for roadmap, spend, resourcing, commercial. */
  requestApproval(input: {
    approvalType: OpsApprovalType;
    requesterId: string;
    approverId: string;
    relatedRecordType: string;
    relatedRecordId: string;
    requestSummary: string;
  }) {
    return this.prisma.opsApproval.create({ data: input });
  }

  /**
   * The queue, as the approver sees it: only what is theirs to decide.
   *
   * Filtered by approver rather than showing everything pending, because a queue
   * that includes other people's decisions is a list somebody stops reading.
   *
   * Refused outright to somebody who decides nothing. It returned an empty list
   * to them instead, which leaked nothing and was still wrong: the menu hid the
   * page and the server allowed it, so "may I see this" was being answered by
   * the interface. The first person to type the address would have found a
   * page the navigation says is not theirs.
   */
  queueFor(identity: OpsIdentity, status: OpsApprovalStatus = 'PENDING') {
    if (!decidesSomething(identity)) {
      throw new ForbiddenException(
        'This is the list of decisions waiting on you, and nothing waits on you. Ask through the record instead.',
      );
    }

    return this.prisma.opsApproval.findMany({
      where: { approverId: identity.personId, status },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decide(
    approvalId: string,
    status: OpsApprovalStatus,
    decisionNote: string | undefined,
    identity: OpsIdentity,
  ) {
    const approval = await this.prisma.opsApproval.findUnique({ where: { id: approvalId } });
    if (!approval) throw new NotFoundException('No such approval');

    /**
     * Only the named approver decides. Holding the capability is not enough:
     * an approval addressed to somebody is a request of THEM, and letting
     * anybody with the capability answer it makes the queue meaningless.
     */
    if (approval.approverId !== identity.personId) {
      throw new ForbiddenException('This was asked of somebody else');
    }
    if (approval.status !== 'PENDING') {
      throw new ForbiddenException(`Already ${approval.status.toLowerCase()}. Ask again rather than deciding twice.`);
    }

    return this.prisma.opsApproval.update({
      where: { id: approvalId },
      data: { status, decisionNote, decidedAt: new Date() },
    });
  }

  approvalsFor(recordType: string, recordId: string) {
    return this.prisma.opsApproval.findMany({
      where: { relatedRecordType: recordType, relatedRecordId: recordId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * WHETHER THE PRODUCT IS SOLID, COUNTED RATHER THAN CLAIMED.
   *
   * "Every bug fixed and use case is working well. No bottlenecks." Three
   * counts, all of them already here. The standing roadmap item reads this
   * instead of carrying a status somebody moves.
   *
   * Every number opens onto its rows, like every other number on these boards —
   * "three use cases do not work" is only useful if you can see which three.
   */
  async howSolid() {
    const [bugs, useCases, blockedDeployments, blockedCompanies] = await Promise.all([
      this.prisma.opsTechItem.findMany({
        where: { status: { not: 'RESOLVED' }, itemType: { in: ['BUG', 'bug'] } },
        select: { id: true, title: true, severity: true },
      }),
      this.prisma.opsClientUseCase.findMany({
        where: { productReadiness: { not: 'PRODUCT_READY' } },
        include: { company: { select: { name: true } } },
      }),
      this.prisma.opsDeployment.findMany({
        where: { blockerType: { not: null }, stage: { not: 'LIVE' } },
        include: { company: { select: { name: true } } },
      }),
      this.prisma.opsCompany.findMany({
        where: { blockerSummary: { not: null } },
        select: { id: true, name: true, blockerSummary: true },
      }),
    ]);

    /* A company blocked in its deployment and blocked on the board is one
       bottleneck, not two. Counting it twice would make the number move when
       somebody wrote the same fact down in a second place. */
    const blocked = new Map<string, { name: string; why: string }>();
    for (const d of blockedDeployments) {
      blocked.set(d.companyId, { name: d.company.name, why: d.blockerSummary ?? d.blockerType ?? 'blocked' });
    }
    for (const c of blockedCompanies) {
      if (!blocked.has(c.id)) blocked.set(c.id, { name: c.name, why: c.blockerSummary as string });
    }

    const left = {
      bugsOpen: bugs.length,
      useCasesNotWorking: useCases.length,
      bottlenecks: blocked.size,
    };

    return {
      ...left,
      solid: isSolid(left),
      says: whatIsLeftToSay(left),
      bugs: bugs.map((b) => ({ title: b.title, severity: b.severity })),
      useCases: useCases.map((u) => ({ company: u.company.name, title: u.title, readiness: u.productReadiness })),
      blocked: [...blocked.values()],
    };
  }

  private log(
    domain: 'PRODUCT' | 'TECH',
    kind: string,
    actorPersonId: string,
    recordId: string,
    companyId: string | null,
  ) {
    return this.prisma.opsActivity.create({
      data: {
        domain,
        kind,
        actorPersonId,
        recordType: domain === 'TECH' ? 'OpsTechItem' : 'OpsRoadmapItem',
        recordId,
        companyId,
        happenedAt: new Date(),
      },
    });
  }
}
