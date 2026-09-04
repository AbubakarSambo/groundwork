import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsSalesStage, OpsDeploymentStage, OpsActivityDomain } from '@prisma/client';

/** Terminal stages. Nothing moves out of one without somebody saying so. */
const CONCLUDED: OpsSalesStage[] = ['CONVERTED', 'LOST'];

@Injectable()
export class OpsPipelineService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Sales --------------------------------------------------------------

  /**
   * One live opportunity per company.
   *
   * A second one is nearly always two people working the same account without
   * knowing, which is the thing the single company identity exists to prevent.
   * Won and lost deals do not count, so a company we lost can be reopened.
   */
  async openOpportunity(input: {
    companyKey: string;
    salesOwnerId: string;
    source?: string;
    campaignId?: string;
    estimatedValue?: number;
    useCaseSummary?: string;
  }) {
    const company = await this.company(input.companyKey);

    const live = await this.prisma.opsSalesOpportunity.findFirst({
      where: { companyId: company.id, stage: { notIn: CONCLUDED } },
    });
    if (live) {
      throw new ConflictException(
        `${company.name} already has a live opportunity at ${live.stage}. Work that one rather than opening a second.`,
      );
    }

    const opportunity = await this.prisma.opsSalesOpportunity.create({
      data: {
        companyId: company.id,
        salesOwnerId: input.salesOwnerId,
        source: input.source,
        campaignId: input.campaignId,
        estimatedValue: input.estimatedValue,
        useCaseSummary: input.useCaseSummary,
        lastActivityAt: new Date(),
      },
    });

    await this.log('SALES', 'opportunity_opened', input.salesOwnerId, opportunity.id, company.id);
    return opportunity;
  }

  /**
   * Moves a deal, and records that it moved.
   *
   * The activity row is what every stage metric counts: without it, "five leads
   * contacted this cycle" would have to be read off the current stage, and a
   * deal that went LEAD → CONTACTED → MEETING inside one fortnight would show
   * up as a meeting and never as a lead.
   */
  async advance(opportunityId: string, stage: OpsSalesStage, actorPersonId: string, lostReason?: string) {
    const opportunity = await this.prisma.opsSalesOpportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!opportunity) throw new NotFoundException('No such opportunity');

    const updated = await this.prisma.opsSalesOpportunity.update({
      where: { id: opportunityId },
      data: {
        stage,
        lastActivityAt: new Date(),
        convertedAt: stage === 'CONVERTED' ? new Date() : opportunity.convertedAt,
        lostAt: stage === 'LOST' ? new Date() : opportunity.lostAt,
        lostReason: stage === 'LOST' ? lostReason ?? opportunity.lostReason : opportunity.lostReason,
        // A concluded deal has nothing left to chase, and leaving the old date
        // in place would keep it on the overdue list for ever.
        nextAction: CONCLUDED.includes(stage) ? null : opportunity.nextAction,
        nextActionDueAt: CONCLUDED.includes(stage) ? null : opportunity.nextActionDueAt,
      },
    });

    await this.log(
      'SALES',
      `stage_${stage.toLowerCase()}`,
      actorPersonId,
      opportunity.id,
      opportunity.companyId,
      lostReason,
    );
    return updated;
  }

  async setFollowUp(opportunityId: string, nextAction: string, dueAt: Date | null, actorPersonId: string) {
    const updated = await this.prisma.opsSalesOpportunity.update({
      where: { id: opportunityId },
      data: { nextAction, nextActionDueAt: dueAt, lastActivityAt: new Date() },
    });
    await this.log('SALES', 'follow_up_set', actorPersonId, opportunityId, updated.companyId, nextAction);
    return updated;
  }

  async logActivity(input: {
    opportunityId: string;
    kind: string;
    actorPersonId: string;
    note?: string;
    evidenceUrl?: string;
    happenedAt?: Date;
  }) {
    const opportunity = await this.prisma.opsSalesOpportunity.findUnique({
      where: { id: input.opportunityId },
    });
    if (!opportunity) throw new NotFoundException('No such opportunity');

    await this.prisma.opsSalesOpportunity.update({
      where: { id: opportunity.id },
      data: { lastActivityAt: input.happenedAt ?? new Date() },
    });

    return this.prisma.opsActivity.create({
      data: {
        domain: 'SALES',
        kind: input.kind,
        actorPersonId: input.actorPersonId,
        recordType: 'OpsSalesOpportunity',
        recordId: opportunity.id,
        companyId: opportunity.companyId,
        happenedAt: input.happenedAt ?? new Date(),
        note: input.note,
        evidenceUrl: input.evidenceUrl,
      },
    });
  }

  pipeline(filter?: { stage?: OpsSalesStage; ownerId?: string }) {
    return this.prisma.opsSalesOpportunity.findMany({
      where: {
        stage: filter?.stage,
        salesOwnerId: filter?.ownerId,
      },
      include: { company: true, campaign: true },
      orderBy: [{ stage: 'asc' }, { nextActionDueAt: 'asc' }],
    });
  }

  // --- Deployment ---------------------------------------------------------

  async startDeployment(input: {
    companyKey: string;
    deploymentOwnerId: string;
    productOwnerId?: string;
    technicalOwnerId?: string;
    targetLiveDate?: Date;
  }) {
    const company = await this.company(input.companyKey);
    const existing = await this.prisma.opsDeployment.findFirst({
      where: { companyId: company.id, stage: { not: 'LIVE' } },
    });
    if (existing) {
      throw new ConflictException(`${company.name} is already being deployed, at ${existing.stage}.`);
    }

    const deployment = await this.prisma.opsDeployment.create({
      data: {
        companyId: company.id,
        deploymentOwnerId: input.deploymentOwnerId,
        productOwnerId: input.productOwnerId,
        technicalOwnerId: input.technicalOwnerId,
        startDate: new Date(),
        targetLiveDate: input.targetLiveDate,
      },
    });

    await this.log('DEPLOYMENT', 'deployment_started', input.deploymentOwnerId, deployment.id, company.id);
    return deployment;
  }

  /**
   * Moves a deployment, and stamps the date the stage is named after.
   *
   * Stamping on arrival rather than asking somebody to fill a date in later is
   * the difference between "average days to onboard" being computed and being
   * guessed.
   */
  async advanceDeployment(deploymentId: string, stage: OpsDeploymentStage, actorPersonId: string) {
    const deployment = await this.prisma.opsDeployment.findUnique({ where: { id: deploymentId } });
    if (!deployment) throw new NotFoundException('No such deployment');

    const now = new Date();
    const stamps: Record<string, Date | null> = {};
    if (stage === 'ONBOARDING' && !deployment.onboardingStartedAt) stamps.onboardingStartedAt = now;
    if (stage === 'FIRST_USE') {
      if (!deployment.onboardingCompletedAt) stamps.onboardingCompletedAt = now;
      if (!deployment.firstUseAt) stamps.firstUseAt = now;
    }
    if (stage === 'LIVE' && !deployment.actualLiveDate) stamps.actualLiveDate = now;

    const updated = await this.prisma.opsDeployment.update({
      where: { id: deploymentId },
      data: { stage, ...stamps },
    });

    await this.log(
      'DEPLOYMENT',
      `stage_${stage.toLowerCase()}`,
      actorPersonId,
      deployment.id,
      deployment.companyId,
    );
    return updated;
  }

  async setDeploymentBlocker(
    deploymentId: string,
    blocker: { type: string | null; summary: string | null },
    actorPersonId: string,
  ) {
    const deployment = await this.prisma.opsDeployment.findUnique({ where: { id: deploymentId } });
    if (!deployment) throw new NotFoundException('No such deployment');

    const updated = await this.prisma.opsDeployment.update({
      where: { id: deploymentId },
      data: { blockerType: blocker.type, blockerSummary: blocker.summary },
    });

    await this.log(
      'DEPLOYMENT',
      blocker.type ? 'blocked' : 'unblocked',
      actorPersonId,
      deployment.id,
      deployment.companyId,
      blocker.summary ?? undefined,
    );
    return updated;
  }

  deployments(filter?: { blockedOnly?: boolean }) {
    return this.prisma.opsDeployment.findMany({
      where: filter?.blockedOnly ? { blockerType: { not: null }, stage: { not: 'LIVE' } } : undefined,
      include: { company: true },
      orderBy: { startDate: 'asc' },
    });
  }

  // --- Marketing ----------------------------------------------------------

  createCampaign(input: {
    title: string;
    activityType: string;
    channel?: string;
    objective?: string;
    ownerId: string;
    startDate: Date;
    endDate?: Date;
    campaignSource?: string;
  }) {
    return this.prisma.opsMarketingActivity.create({ data: input });
  }

  /** A campaign with the opportunities that name it, so its number is checkable. */
  campaigns() {
    return this.prisma.opsMarketingActivity.findMany({
      include: { opportunities: { include: { company: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  // --- Shared -------------------------------------------------------------

  private async company(key: string) {
    const company = await this.prisma.opsCompany.findUnique({ where: { key } });
    if (!company) throw new NotFoundException(`No company called ${key}`);
    return company;
  }

  private log(
    domain: OpsActivityDomain,
    kind: string,
    actorPersonId: string,
    recordId: string,
    companyId: string,
    note?: string,
  ) {
    return this.prisma.opsActivity.create({
      data: {
        domain,
        kind,
        actorPersonId,
        recordType: domain === 'SALES' ? 'OpsSalesOpportunity' : 'OpsDeployment',
        recordId,
        companyId,
        happenedAt: new Date(),
        note,
      },
    });
  }
}
