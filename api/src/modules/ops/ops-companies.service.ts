import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsCompanyStage, OpsQualifyingStatus } from '@prisma/client';
import { isAKnownSource, whyThisSourceIsNotEnough } from './where-a-company-came-from';

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
    targetListKey?: string;
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

    const targetListId = input.targetListKey
      ? (await this.prisma.opsPeriod.findUnique({ where: { key: input.targetListKey } }))?.id ?? null
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
        targetListId,
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
    /*
     * FROM THE LIST, SO A NETWORK CAN BE COUNTED. Free text made "Google for
     * Startups", "google for startups network" and "GFS" three sources, and the
     * question worth asking — did that network produce anything — needs them to
     * be one.
     */
    if (!isAKnownSource(input.sourceType)) {
      throw new BadRequestException(`${input.sourceType} is not one of the ways a company reaches us.`);
    }
    const thin = whyThisSourceIsNotEnough(input.sourceType, input.sourceDetail);
    if (thin) throw new BadRequestException(thin);

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

  /**
   * Put a company on a target list, or take it off.
   *
   * A TARGET LIST IS NOT THE PIPELINE. Every company we are selling to lives in
   * `list()`; a target list is the much shorter list somebody has decided deserves
   * attention between two dates. The two were being conflated — the only way a
   * company joined a target list was the target list it happened to be created in, so the
   * list could never be revised without recreating the record.
   *
   * Passing null takes it off without deleting anything: a company dropped from
   * a target list is still a company, and losing its history because attention moved
   * elsewhere would be the software punishing a change of mind.
   */
  async setTargetList(companyKey: string, targetListKey: string | null, actorPersonId: string) {
    const company = await this.byKey(companyKey);

    let targetListId: string | null = null;
    if (targetListKey) {
      const period = await this.prisma.opsPeriod.findUnique({ where: { key: targetListKey } });
      if (!period) throw new NotFoundException(`No period called ${targetListKey}`);
      if (period.kind !== 'TARGET_LIST') {
        throw new BadRequestException(
          `${period.name} is a ${period.kind.toLowerCase()}. A company goes on a target list, not on the calendar.`,
        );
      }
      targetListId = period.id;
    }

    const updated = await this.prisma.opsCompany.update({
      where: { id: company.id },
      data: { targetListId },
    });

    await this.log(
      'SALES',
      targetListId ? 'company_added_to_target_list' : 'company_removed_from_target_list',
      actorPersonId,
      company.id,
      company.id,
    );
    return updated;
  }

  async list(targetListKey?: string) {
    const targetListId = targetListKey
      ? (await this.prisma.opsPeriod.findUnique({ where: { key: targetListKey } }))?.id ?? null
      : undefined;

    return this.prisma.opsCompany.findMany({
      where: targetListId === undefined ? undefined : { targetListId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * One company, every angle, in the order somebody actually asks.
   *
   * Who are they and who brought them, what do they want to do and can we do
   * it, where are they in the pipeline, how is the deployment going — and then
   * everything that has happened, newest first.
   *
   * The timeline is the part that cannot be assembled from the other pages. A
   * stage on a table says where something is; only the log says whether it got
   * there last week or in July, and "how far has this got" and "is this moving"
   * are different questions with different answers.
   */
  async detail(key: string) {
    const company = await this.byKey(key);

    const [attributions, useCases, opportunities, deployments, activity, people] = await Promise.all([
      this.prisma.opsAttribution.findMany({
        where: { companyId: company.id },
        include: { contributor: true },
      }),
      this.prisma.opsClientUseCase.findMany({ where: { companyId: company.id } }),
      this.prisma.opsCommercialOpportunity.findMany({
        where: { companyId: company.id },
        include: { payments: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.opsDeployment.findMany({ where: { companyId: company.id } }),
      this.prisma.opsActivity.findMany({
        where: { companyId: company.id },
        orderBy: { happenedAt: 'desc' },
        take: 100,
      }),
      this.prisma.opsPerson.findMany(),
    ]);

    const name = new Map(people.map((p) => [p.id, p.displayName]));

    return {
      company: {
        ...company,
        owner: company.ownerPersonId ? name.get(company.ownerPersonId) ?? null : null,
      },
      broughtBy: attributions.map((a) => ({
        contributor: a.contributor.displayName,
        contributorKey: a.contributor.key,
        sourceType: a.sourceType,
        sourceDetail: a.sourceDetail,
        introducedAt: a.introducedAt,
        qualifyingStatus: a.qualifyingStatus,
      })),
      useCases,
      opportunities,
      deployments,
      /** Who did it, in words. An actor id in a timeline is nobody. */
      activity: activity.map((a) => ({
        id: a.id,
        kind: a.kind,
        domain: a.domain,
        happenedAt: a.happenedAt,
        note: a.note,
        evidenceUrl: a.evidenceUrl,
        by: a.actorPersonId ? name.get(a.actorPersonId) ?? 'somebody since removed' : null,
      })),
    };
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
