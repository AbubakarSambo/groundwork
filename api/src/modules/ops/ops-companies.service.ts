import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsCompanyStage, OpsQualifyingStatus } from '@prisma/client';

/**
 * Companies, and who brought them.
 *
 * Every write here also writes an `OpsActivity`, because a board that shows a
 * stage without showing when it moved cannot tell a company that is progressing
 * from one that changed once in July.
 */
@Injectable()
export class OpsCompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private slug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async add(input: {
    name: string;
    sprintPeriodKey?: string;
    source?: string;
    ownerPersonId?: string;
    primaryContactName?: string;
    primaryContactEmail?: string;
    notes?: string;
  }, actorPersonId: string) {
    const key = this.slug(input.name);
    const existing = await this.prisma.opsCompany.findUnique({ where: { key } });
    if (existing) {
      throw new ConflictException(
        `${existing.name} is already here at stage ${existing.stage}. Add the use case or the attribution to that record rather than a second one.`,
      );
    }

    const sprintPeriodId = input.sprintPeriodKey
      ? (await this.prisma.opsPeriod.findUnique({ where: { key: input.sprintPeriodKey } }))?.id ?? null
      : null;

    const company = await this.prisma.opsCompany.create({
      data: {
        key,
        name: input.name,
        source: input.source,
        ownerPersonId: input.ownerPersonId,
        primaryContactName: input.primaryContactName,
        primaryContactEmail: input.primaryContactEmail,
        notes: input.notes,
        sprintPeriodId,
      },
    });

    await this.log('SALES', 'company_added', actorPersonId, company.id, company.id);
    return company;
  }

  async setStage(companyKey: string, stage: OpsCompanyStage, actorPersonId: string) {
    const company = await this.byKey(companyKey);
    const updated = await this.prisma.opsCompany.update({
      where: { id: company.id },
      data: { stage, liveAt: stage === 'LIVE' ? company.liveAt ?? new Date() : company.liveAt },
    });
    await this.log('SALES', `stage_${stage.toLowerCase()}`, actorPersonId, company.id, company.id);
    return updated;
  }

  async setNextAction(
    companyKey: string,
    nextAction: string,
    dueAt: Date | null,
    actorPersonId: string,
  ) {
    const company = await this.byKey(companyKey);
    const updated = await this.prisma.opsCompany.update({
      where: { id: company.id },
      data: { nextAction, nextActionDueAt: dueAt },
    });
    await this.log('SALES', 'next_action_set', actorPersonId, company.id, company.id, nextAction);
    return updated;
  }

  async recordBlocker(companyKey: string, summary: string | null, actorPersonId: string) {
    const company = await this.byKey(companyKey);
    const updated = await this.prisma.opsCompany.update({
      where: { id: company.id },
      data: { blockerSummary: summary },
    });
    await this.log(
      'SALES',
      summary ? 'blocker_recorded' : 'blocker_cleared',
      actorPersonId,
      company.id,
      company.id,
      summary ?? undefined,
    );
    return updated;
  }

  /**
   * Records that a contributor brought this company.
   *
   * Unique on (company, contributor), so bringing the same company twice is a
   * conflict rather than a second row — which is the only reason a target made
   * of introductions can be trusted.
   */
  async attribute(input: {
    companyKey: string;
    contributorKey: string;
    sourceType: string;
    sourceDetail?: string;
    introducedAt?: Date;
  }) {
    const company = await this.byKey(input.companyKey);
    const contributor = await this.prisma.opsPerson.findUnique({ where: { key: input.contributorKey } });
    if (!contributor) throw new NotFoundException(`No one here called ${input.contributorKey}`);

    const already = await this.prisma.opsAttribution.findUnique({
      where: { companyId_contributorId: { companyId: company.id, contributorId: contributor.id } },
    });
    if (already) {
      throw new ConflictException(
        `${contributor.displayName} already brought ${company.name}. One introduction, one row.`,
      );
    }

    const attribution = await this.prisma.opsAttribution.create({
      data: {
        companyId: company.id,
        contributorId: contributor.id,
        sourceType: input.sourceType,
        sourceDetail: input.sourceDetail,
        introducedAt: input.introducedAt ?? new Date(),
      },
    });

    await this.log('SALES', 'introduced', contributor.id, attribution.id, company.id, input.sourceType);
    return attribution;
  }

  async setQualifyingStatus(
    companyKey: string,
    contributorKey: string,
    status: OpsQualifyingStatus,
    actorPersonId: string,
  ) {
    const company = await this.byKey(companyKey);
    const contributor = await this.prisma.opsPerson.findUnique({ where: { key: contributorKey } });
    if (!contributor) throw new NotFoundException(`No one here called ${contributorKey}`);

    const updated = await this.prisma.opsAttribution.update({
      where: { companyId_contributorId: { companyId: company.id, contributorId: contributor.id } },
      data: { qualifyingStatus: status, qualifiedAt: status === 'QUALIFIED' ? new Date() : null },
    });

    await this.log('SALES', `qualifying_${status.toLowerCase()}`, actorPersonId, updated.id, company.id);
    return updated;
  }

  async list(sprintPeriodKey?: string) {
    const sprintPeriodId = sprintPeriodKey
      ? (await this.prisma.opsPeriod.findUnique({ where: { key: sprintPeriodKey } }))?.id ?? null
      : undefined;

    return this.prisma.opsCompany.findMany({
      where: sprintPeriodId === undefined ? undefined : { sprintPeriodId },
      orderBy: { name: 'asc' },
    });
  }

  private async byKey(key: string) {
    const company = await this.prisma.opsCompany.findUnique({ where: { key } });
    if (!company) throw new NotFoundException(`No company called ${key}`);
    return company;
  }

  private log(
    domain: 'SALES',
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
        recordType: 'OpsCompany',
        recordId,
        companyId,
        happenedAt: new Date(),
        note,
      },
    });
  }
}
