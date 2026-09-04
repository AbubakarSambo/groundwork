import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsSettingsService, OPS_SETTINGS } from './ops-settings.service';
import { countsTowardTarget, isAQualifyingStatus } from './what-counts-toward-a-target';
import { OpsCompanyStage, OpsQualifyingStatus } from '@prisma/client';
import { OpsIdentity } from './ops-people.service';
import { can } from './what-somebody-may-do';

/** The order companies move through, so "how far has this got" is arithmetic. */
const STAGE_ORDER: OpsCompanyStage[] = [
  'LINED_UP',
  'USE_CASE_CONFIRMED',
  'PRODUCT_READY',
  'ONBOARDED',
  'LIVE',
];

@Injectable()
export class OpsSprintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: OpsSettingsService,
  ) {}

  /**
   * The sprint as one page: every company, how far it has got, what is next,
   * and who is holding it up.
   *
   * Counts are derived from the rows returned alongside them, never stored, so
   * a number on this board can always be opened onto the companies that made it.
   */
  async board(periodKey: string) {
    const period = await this.prisma.opsPeriod.findUnique({ where: { key: periodKey } });
    if (!period) throw new NotFoundException(`No period called ${periodKey}`);

    const companies = await this.prisma.opsCompany.findMany({
      where: { sprintPeriodId: period.id },
      include: {
        attributions: { include: { contributor: true } },
        useCases: true,
        deployments: true,
      },
      orderBy: { name: 'asc' },
    });

    const rows = companies.map((company) => ({
      id: company.id,
      key: company.key,
      name: company.name,
      stage: company.stage,
      stageIndex: STAGE_ORDER.indexOf(company.stage),
      owner: company.ownerPersonId,
      nextAction: company.nextAction,
      nextActionDueAt: company.nextActionDueAt,
      blockerSummary: company.blockerSummary,
      broughtBy: company.attributions.map((a) => ({
        contributor: a.contributor.displayName,
        contributorKey: a.contributor.key,
        qualifyingStatus: a.qualifyingStatus,
      })),
      useCaseReadiness: company.useCases.map((u) => ({
        title: u.title,
        readiness: u.productReadiness,
        productGap: u.productGap,
        uxGap: u.uxGap,
        technicalGap: u.technicalGap,
      })),
      deploymentStage: company.deployments[0]?.stage ?? null,
      deploymentBlocker: company.deployments[0]?.blockerType ?? null,
    }));

    const byStage = Object.fromEntries(
      STAGE_ORDER.map((stage) => [stage, rows.filter((r) => r.stage === stage).length]),
    );

    return {
      period: { key: period.key, name: period.name, startsOn: period.startsOn, endsOn: period.endsOn, goal: period.goal },
      companies: rows,
      counts: {
        total: rows.length,
        byStage,
        productReady: rows.filter((r) =>
          r.useCaseReadiness.length > 0 && r.useCaseReadiness.every((u) => u.readiness === 'PRODUCT_READY'),
        ).length,
        /**
         * Named, not just counted — a count nobody can open is a claim.
         *
         * A company with NO use case recorded belongs here, and getting that
         * wrong is how "7 of 10 are ready" becomes a lie: with the test written
         * as "has a use case that is not ready", a company nobody has asked the
         * question about is neither ready nor listed, and simply falls out of
         * both numbers. Not knowing is a reason, so it is given as one.
         */
        notProductReady: rows
          .filter(
            (r) =>
              r.useCaseReadiness.length === 0 ||
              r.useCaseReadiness.some((u) => u.readiness !== 'PRODUCT_READY'),
          )
          .map((r) => ({
            name: r.name,
            why:
              r.useCaseReadiness.length === 0
                ? ['No use case recorded, so nobody has asked whether we support them']
                : r.useCaseReadiness
                    .filter((u) => u.readiness !== 'PRODUCT_READY')
                    .map((u) => u.productGap || u.uxGap || u.technicalGap || `${u.title}: ${u.readiness}`),
          })),
        blocked: rows.filter((r) => r.blockerSummary || r.deploymentBlocker).map((r) => r.name),
        withoutANextAction: rows.filter((r) => !r.nextAction).map((r) => r.name),
      },
    };
  }

  /**
   * Where one contributor stands against their target.
   *
   * The qualifying line comes from settings on every call rather than being
   * read once, so changing the decision changes the number without a restart.
   */
  async contributorStanding(personKey: string) {
    const person = await this.prisma.opsPerson.findUnique({
      where: { key: personKey },
      include: {
        attributions: { include: { company: true } },
        contributorTargets: { include: { period: true } },
      },
    });
    if (!person) throw new NotFoundException(`No one here called ${personKey}`);

    const rawLine = await this.settings.get(OPS_SETTINGS.contributorQualifyingStatus);
    if (!isAQualifyingStatus(rawLine)) {
      throw new BadRequestException(
        `The qualifying line is set to "${rawLine}", which is not a status. Fix ${OPS_SETTINGS.contributorQualifyingStatus}.`,
      );
    }
    const line = rawLine as OpsQualifyingStatus;

    const counting = person.attributions.filter((a) => countsTowardTarget(a.qualifyingStatus, line));

    return {
      person: { key: person.key, displayName: person.displayName },
      qualifyingLine: line,
      targets: person.contributorTargets.map((t) => ({
        period: t.period.name,
        periodKey: t.period.key,
        targetCount: t.targetCount,
        dueDate: t.dueDate,
        isSprintExpectation: t.isSprintExpectation,
        countedSoFar: counting.length,
      })),
      /** The rows behind the number, so it can be checked rather than believed. */
      counted: counting.map((a) => ({
        company: a.company.name,
        qualifyingStatus: a.qualifyingStatus,
        introducedAt: a.introducedAt,
      })),
      notYetCounting: person.attributions
        .filter((a) => !countsTowardTarget(a.qualifyingStatus, line))
        .map((a) => ({ company: a.company.name, qualifyingStatus: a.qualifyingStatus })),
    };
  }

  /**
   * A contributor sees their own standing and nobody else's.
   *
   * The check is here rather than on the route because the answer depends on
   * WHOSE standing is being asked for, which a decorator cannot know.
   *
   * Refused rather than hidden: everybody here knows who their colleagues are,
   * so pretending Nate does not exist would only make Adam think the system is
   * broken. What he may not see is Nate's numbers.
   */
  standingFor(identity: OpsIdentity, personKey: string) {
    const isTheirOwn = identity.key === personKey;
    if (!isTheirOwn && !can(identity.capabilities, 'contributor:read-all')) {
      throw new ForbiddenException(`${personKey}'s standing is theirs. This needs contributor:read-all.`);
    }
    return this.contributorStanding(personKey);
  }
}
