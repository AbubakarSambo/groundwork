import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsDeploymentStage, OpsActivityDomain } from '@prisma/client';

@Injectable()
export class OpsPipelineService {
  constructor(private readonly prisma: PrismaService) {}

  /*
   * THE SALES HALF OF THIS FILE IS GONE.
   *
   * It ran a second pipeline beside the commercial one - same companies, same
   * stages, a different set of numbers - and two pipelines is how a company
   * ends up with two answers to "how much are we selling". The commercial
   * pipeline is the one with attribution on it, so it is the one that survived.
   *
   * What is left here is deployment and marketing, which were never duplicated.
   */

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

  /**
   * Campaigns.
   *
   * They no longer carry the opportunities they produced: that link belonged to
   * the retired pipeline, and the commercial one does not have it yet. A
   * campaign here is currently an activity record and not a claim about revenue,
   * which is worse than it was and better than a number nothing supports.
   */
  campaigns() {
    return this.prisma.opsMarketingActivity.findMany({ orderBy: { startDate: 'desc' } });
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
