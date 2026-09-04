import { PrismaService } from '../prisma/prisma.service';
import { OpsCapability } from './what-somebody-may-do';

/**
 * A number, and the rows that made it.
 *
 * Every metric in this system is defined here, and every one of them returns
 * its evidence alongside its value. That is the whole rule: a number nobody can
 * open is a claim, and a board full of claims is how a team ends up arguing
 * about whether a figure is right instead of about what to do.
 *
 * It also means no metric is ever typed in. If a number can be computed from
 * records it is computed on read; if it cannot, it is not a metric here.
 */

export interface MetricWindow {
  from: Date;
  to: Date;
}

export interface MetricResult {
  value: number;
  unit: string;
  /** The rows behind the value. Never a sample — this IS the number. */
  rows: Array<Record<string, unknown>>;
  /** Said in a sentence, so a board does not have to explain itself. */
  says: string;
}

/**
 * What kind of number this is.
 *
 * The evidence rule differs by shape, and pretending it does not is how a
 * guard gets loosened to accommodate the first metric that does not fit. A
 * COUNT must equal the rows it hands back — anything else is a silent count.
 * A SUM is money or time adding up across its rows, so it will not. A DERIVED
 * figure is a rate or an average over them.
 */
export type MetricShape = 'count' | 'sum' | 'derived';

export interface MetricDefinition {
  key: string;
  label: string;
  shape: MetricShape;
  /** What somebody must hold to see it. A metric obeys the caller, not the board. */
  capability: OpsCapability;
  /** What the number means, for the drill-down panel. */
  counts: string;
  compute: (prisma: PrismaService, window: MetricWindow) => Promise<MetricResult>;
}

const within = (window: MetricWindow) => ({ gte: window.from, lte: window.to });

/**
 * Turns the company ids on activity rows into names.
 *
 * The activity log holds an id rather than a relation, deliberately — an
 * activity outlives the record it describes. But a drill-down that opens onto
 * `b69a2617-856b-...` is not openable by a person, which is most of the point
 * of having one. So the names are looked up when the rows are handed over.
 */
async function withCompanyNames(
  prisma: PrismaService,
  rows: Array<{ companyId: string | null; [k: string]: unknown }>,
) {
  const ids = [...new Set(rows.map((r) => r.companyId).filter((id): id is string => id !== null))];
  const companies = ids.length
    ? await prisma.opsCompany.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const name = new Map(companies.map((c) => [c.id, c.name]));

  return rows.map(({ companyId, ...rest }) => ({
    company: companyId ? name.get(companyId) ?? 'a company since deleted' : null,
    ...rest,
  }));
}



export const METRICS: MetricDefinition[] = [
  {
    key: 'sales.new_leads_contacted',
    label: 'New leads contacted',
    shape: 'count',
    capability: 'sales:read',
    counts: 'Opportunities that reached CONTACTED for the first time inside the window.',
    async compute(prisma, window) {
      const rows = await prisma.opsActivity.findMany({
        where: { domain: 'SALES', kind: 'stage_contacted', happenedAt: within(window) },
        orderBy: { happenedAt: 'desc' },
      });
      return {
        value: rows.length,
        unit: 'leads',
        rows: await withCompanyNames(
          prisma,
          rows.map((r) => ({ when: r.happenedAt, companyId: r.companyId, note: r.note })),
        ),
        says: `${rows.length} contacted`,
      };
    },
  },
  {
    key: 'sales.meetings_held',
    label: 'Meetings held',
    shape: 'count',
    capability: 'sales:read',
    counts: 'Opportunities that reached MEETING inside the window.',
    async compute(prisma, window) {
      const rows = await prisma.opsActivity.findMany({
        where: { domain: 'SALES', kind: 'stage_meeting', happenedAt: within(window) },
        orderBy: { happenedAt: 'desc' },
      });
      return {
        value: rows.length,
        unit: 'meetings',
        rows: await withCompanyNames(prisma, rows.map((r) => ({ when: r.happenedAt, companyId: r.companyId }))),
        says: `${rows.length} meetings`,
      };
    },
  },
  {
    key: 'sales.conversions',
    label: 'Conversions',
    shape: 'count',
    capability: 'sales:read',
    counts: 'Opportunities converted inside the window.',
    async compute(prisma, window) {
      const rows = await prisma.opsSalesOpportunity.findMany({
        where: { convertedAt: within(window) },
        include: { company: true },
      });
      return {
        value: rows.length,
        unit: 'conversions',
        rows: rows.map((r) => ({ company: r.company.name, convertedAt: r.convertedAt, value: r.estimatedValue })),
        says: `${rows.length} converted`,
      };
    },
  },
  {
    key: 'sales.overdue_follow_ups',
    label: 'Overdue follow-ups',
    shape: 'count',
    capability: 'sales:read',
    counts: 'Live opportunities whose next action was due before the end of the window.',
    async compute(prisma, window) {
      const rows = await prisma.opsSalesOpportunity.findMany({
        where: {
          stage: { notIn: ['CONVERTED', 'LOST'] },
          nextActionDueAt: { lt: window.to },
        },
        include: { company: true },
        orderBy: { nextActionDueAt: 'asc' },
      });
      return {
        value: rows.length,
        unit: 'opportunities',
        rows: rows.map((r) => ({
          company: r.company.name,
          nextAction: r.nextAction,
          dueAt: r.nextActionDueAt,
          stage: r.stage,
        })),
        says: rows.length === 0 ? 'Nothing overdue' : `${rows.length} past their follow-up date`,
        // Overdue over an empty pipeline is honestly zero: there is nothing to be
        // late about. It is the reassuring sentence next door that needed care.
      };
    },
  },
  {
    key: 'sales.no_next_action',
    label: 'Opportunities with nothing planned',
    shape: 'count',
    capability: 'sales:read',
    counts: 'Live opportunities with no next action recorded at all.',
    async compute(prisma) {
      /**
       * Deliberately ignores the window. An opportunity nobody has planned a
       * next step for is not a fact about a fortnight — it is true right now,
       * and dating it would let it disappear from the very view meant to catch it.
       */
      const live = await prisma.opsSalesOpportunity.findMany({
        where: { stage: { notIn: ['CONVERTED', 'LOST'] } },
        include: { company: true },
      });
      const rows = live.filter((r) => r.nextAction === null);

      return {
        value: rows.length,
        unit: 'opportunities',
        rows: rows.map((r) => ({ company: r.company.name, stage: r.stage, since: r.createdAt })),
        /**
         * An empty pipeline is not the same as a well-tended one, and "Everything
         * has a next step" over nothing at all is the most comfortable wrong
         * sentence on the board — it reads as reassurance on the day sales dries up.
         */
        says:
          live.length === 0
            ? 'Nothing live in the pipeline'
            : rows.length === 0
              ? `All ${live.length} have a next step`
              : `${rows.length} of ${live.length} with no next step`,
      };
    },
  },
  {
    key: 'sales.conversion_rate',
    label: 'Conversion rate',
    shape: 'derived',
    capability: 'sales:read',
    counts: 'Converted, as a share of everything that reached a conclusion inside the window.',
    async compute(prisma, window) {
      const concluded = await prisma.opsSalesOpportunity.findMany({
        where: {
          OR: [{ convertedAt: within(window) }, { lostAt: within(window) }],
        },
        include: { company: true },
      });
      const won = concluded.filter((o) => o.convertedAt !== null);

      return {
        value: concluded.length === 0 ? 0 : Math.round((won.length / concluded.length) * 100),
        unit: '%',
        rows: concluded.map((o) => ({
          company: o.company.name,
          outcome: o.convertedAt ? 'converted' : 'lost',
          reason: o.lostReason,
        })),
        /**
         * A rate with no denominator is the classic dishonest metric: nothing
         * concluded reads as 0% rather than as nothing to report.
         */
        says:
          concluded.length === 0
            ? 'Nothing concluded in this window, so there is no rate to give'
            : `${won.length} of ${concluded.length} converted`,
      };
    },
  },
  {
    key: 'marketing.leads_generated',
    label: 'Leads generated by a campaign',
    shape: 'count',
    capability: 'marketing:read',
    counts: 'Opportunities created inside the window that name a campaign.',
    async compute(prisma, window) {
      const rows = await prisma.opsSalesOpportunity.findMany({
        where: { campaignId: { not: null }, createdAt: within(window) },
        include: { company: true, campaign: true },
      });
      return {
        value: rows.length,
        unit: 'leads',
        rows: rows.map((r) => ({ company: r.company.name, campaign: r.campaign?.title, stage: r.stage })),
        says: `${rows.length} from campaigns`,
      };
    },
  },
  {
    key: 'deployment.in_onboarding',
    label: 'In onboarding',
    shape: 'count',
    capability: 'deployment:read',
    counts: 'Deployments at SETUP or ONBOARDING right now.',
    async compute(prisma) {
      const rows = await prisma.opsDeployment.findMany({
        where: { stage: { in: ['SETUP', 'ONBOARDING'] } },
        include: { company: true },
      });
      return {
        value: rows.length,
        unit: 'clients',
        rows: rows.map((r) => ({
          company: r.company.name,
          stage: r.stage,
          startedAt: r.onboardingStartedAt,
          blocker: r.blockerSummary,
        })),
        says: `${rows.length} being onboarded`,
      };
    },
  },
  {
    key: 'deployment.blocked',
    label: 'Blocked deployments',
    shape: 'count',
    capability: 'deployment:read',
    counts: 'Deployments with a blocker recorded, and who it is waiting on.',
    async compute(prisma) {
      const rows = await prisma.opsDeployment.findMany({
        where: { blockerType: { not: null }, stage: { not: 'LIVE' } },
        include: { company: true },
      });
      return {
        value: rows.length,
        unit: 'deployments',
        rows: rows.map((r) => ({
          company: r.company.name,
          waitingOn: r.blockerType,
          why: r.blockerSummary,
          since: r.startDate,
        })),
        says: rows.length === 0 ? 'Nothing blocked' : `${rows.length} blocked`,
      };
    },
  },
  {
    key: 'deployment.days_to_onboard',
    label: 'Average days to onboard',
    shape: 'derived',
    capability: 'deployment:read',
    counts: 'Onboardings finished inside the window, and how long each took.',
    async compute(prisma, window) {
      const rows = await prisma.opsDeployment.findMany({
        where: { onboardingCompletedAt: within(window), onboardingStartedAt: { not: null } },
        include: { company: true },
      });

      const durations = rows.map((r) => ({
        company: r.company.name,
        days: Math.round(
          (r.onboardingCompletedAt!.getTime() - r.onboardingStartedAt!.getTime()) / 86400000,
        ),
      }));

      return {
        // An average over nothing is not zero. Zero days to onboard would be a
        // triumph; no onboardings finished is not.
        value:
          durations.length === 0
            ? 0
            : Math.round(durations.reduce((sum, d) => sum + d.days, 0) / durations.length),
        unit: 'days',
        rows: durations,
        says:
          durations.length === 0
            ? 'No onboarding finished in this window, so there is no average'
            : `${durations.length} finished, averaging ${Math.round(durations.reduce((s, d) => s + d.days, 0) / durations.length)} days`,
      };
    },
  },
  {
    key: 'sprint.companies_lined_up',
    label: 'Companies lined up',
    shape: 'count',
    capability: 'sprint:read',
    counts: 'Companies attached to a sprint, whatever stage they have reached.',
    async compute(prisma) {
      const rows = await prisma.opsCompany.findMany({
        where: { sprintPeriodId: { not: null } },
        orderBy: { name: 'asc' },
      });
      return {
        value: rows.length,
        unit: 'companies',
        rows: rows.map((r) => ({ company: r.name, stage: r.stage, owner: r.ownerPersonId })),
        says: `${rows.length} lined up`,
      };
    },
  },
  {
    key: 'sprint.companies_onboarded',
    label: 'Companies onboarded',
    shape: 'count',
    capability: 'sprint:read',
    counts: 'Companies whose deployment has reached first use or gone live.',
    async compute(prisma) {
      const rows = await prisma.opsDeployment.findMany({
        where: { stage: { in: ['FIRST_USE', 'LIVE'] } },
        include: { company: true },
      });
      return {
        value: rows.length,
        unit: 'companies',
        rows: rows.map((r) => ({ company: r.company.name, stage: r.stage, firstUseAt: r.firstUseAt })),
        says: `${rows.length} onboarded`,
      };
    },
  },
  {
    key: 'product.use_cases_supported',
    label: 'Use cases we support',
    shape: 'count',
    capability: 'product:read',
    counts: 'Use cases at PRODUCT_READY, which means no gap is recorded against them.',
    async compute(prisma) {
      const rows = await prisma.opsClientUseCase.findMany({
        where: { productReadiness: 'PRODUCT_READY' },
        include: { company: true },
      });
      return {
        value: rows.length,
        unit: 'use cases',
        rows: rows.map((r) => ({ company: r.company.name, useCase: r.title })),
        says: `${rows.length} supported`,
      };
    },
  },
  {
    key: 'tech.open_client_blockers',
    label: 'Technical blockers against a client',
    shape: 'count',
    capability: 'tech:read',
    counts: 'Unresolved technical items that name a company.',
    async compute(prisma) {
      const rows = await prisma.opsTechItem.findMany({
        where: { status: { not: 'RESOLVED' }, relatedCompanyId: { not: null } },
        orderBy: { severity: 'asc' },
      });
      return {
        value: rows.length,
        unit: 'items',
        rows: await withCompanyNames(
          prisma,
          rows.map((r) => ({ title: r.title, severity: r.severity, status: r.status, companyId: r.relatedCompanyId })),
        ),
        says: rows.length === 0 ? 'Nothing technical blocking a client' : `${rows.length} blocking a client`,
      };
    },
  },
  {
    key: 'tech.resolved_this_window',
    label: 'Technical items resolved',
    shape: 'count',
    capability: 'tech:read',
    counts: 'Technical items completed inside the window.',
    async compute(prisma, window) {
      const rows = await prisma.opsTechItem.findMany({
        where: { completedAt: { gte: window.from, lte: window.to } },
      });
      return {
        value: rows.length,
        unit: 'items',
        rows: rows.map((r) => ({ title: r.title, severity: r.severity, completedAt: r.completedAt })),
        says: `${rows.length} resolved`,
      };
    },
  },
  {
    key: 'product.roadmap_completed',
    label: 'Roadmap items completed',
    shape: 'count',
    capability: 'product:read',
    counts: 'Roadmap items finished inside the window.',
    async compute(prisma, window) {
      const rows = await prisma.opsRoadmapItem.findMany({
        where: { completedAt: { gte: window.from, lte: window.to } },
      });
      return {
        value: rows.length,
        unit: 'items',
        rows: rows.map((r) => ({ title: r.title, completedAt: r.completedAt })),
        says: `${rows.length} completed`,
      };
    },
  },
  {
    key: 'fundraise.pipeline',
    label: 'Asked for, across live conversations',
    shape: 'sum',
    capability: 'fundraise:read',
    counts: 'The ask on every funding opportunity that has not closed or been declined.',
    async compute(prisma) {
      const rows = await prisma.opsFundingOpportunity.findMany({
        where: { stage: { notIn: ['CLOSED', 'DECLINED'] } },
      });
      return {
        value: rows.reduce((t, r) => t + Number(r.askAmount ?? 0), 0),
        unit: 'USD',
        rows: rows.map((r) => ({ funder: r.funderName, stage: r.stage, ask: Number(r.askAmount ?? 0) })),
        says: rows.length === 0 ? 'No live funding conversations' : `${rows.length} live`,
      };
    },
  },
  {
    key: 'fundraise.closed',
    label: 'Money actually in',
    shape: 'sum',
    capability: 'fundraise:read',
    counts: 'Closed amounts. Not what was committed — what arrived.',
    async compute(prisma) {
      const rows = await prisma.opsFundingOpportunity.findMany({ where: { closedAmount: { not: null } } });
      return {
        value: rows.reduce((t, r) => t + Number(r.closedAmount ?? 0), 0),
        unit: 'USD',
        rows: rows.map((r) => ({ funder: r.funderName, closed: Number(r.closedAmount ?? 0) })),
        says: rows.length === 0 ? 'Nothing has closed yet' : `${rows.length} closed`,
      };
    },
  },
  {
    key: 'fundraise.overdue',
    label: 'Funding follow-ups past their date',
    shape: 'count',
    capability: 'fundraise:read',
    counts: 'Live funding opportunities whose next action was due before now.',
    async compute(prisma, window) {
      const rows = await prisma.opsFundingOpportunity.findMany({
        where: { stage: { notIn: ['CLOSED', 'DECLINED'] }, nextActionDueAt: { lt: window.to } },
        orderBy: { nextActionDueAt: 'asc' },
      });
      return {
        value: rows.length,
        unit: 'opportunities',
        rows: rows.map((r) => ({ funder: r.funderName, nextAction: r.nextAction, dueAt: r.nextActionDueAt })),
        says: rows.length === 0 ? 'Nothing overdue' : `${rows.length} past their date`,
      };
    },
  },
  {
    key: 'strategy.opportunities_created',
    label: 'Opportunities from relationships',
    shape: 'count',
    capability: 'strategy:read',
    counts: 'Strategic relationships that turned into a named record, not a claim that they did.',
    async compute(prisma) {
      const rows = await prisma.opsStrategicOpportunity.findMany({
        where: { convertedToId: { not: null } },
      });
      return {
        value: rows.length,
        unit: 'opportunities',
        rows: rows.map((r) => ({
          person: r.personOrNetwork,
          became: r.convertedToType,
          recordId: r.convertedToId,
        })),
        says: `${rows.length} turned into something`,
      };
    },
  },
  {
    key: 'spend.awaiting_decision',
    label: 'Claims waiting on a decision',
    shape: 'count',
    capability: 'spend:approve',
    counts: 'Expenses submitted and not yet decided.',
    async compute(prisma) {
      const rows = await prisma.opsExpense.findMany({ where: { status: 'REQUESTED' } });
      return {
        value: rows.length,
        unit: 'claims',
        rows: rows.map((r) => ({ description: r.description, amount: Number(r.amount), since: r.submittedAt })),
        says: rows.length === 0 ? 'Nothing waiting' : `${rows.length} waiting on you`,
      };
    },
  },
  {
    key: 'approvals.pending',
    label: 'Decisions waiting',
    shape: 'count',
    capability: 'ceo:board',
    counts: 'Approvals nobody has answered, with how long each has waited.',
    async compute(prisma) {
      const rows = await prisma.opsApproval.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      const days = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86400000);
      return {
        value: rows.length,
        unit: 'decisions',
        rows: rows.map((r) => ({
          about: r.requestSummary,
          type: r.approvalType,
          waitingDays: days(r.createdAt),
        })),
        /**
         * The oldest one is the number that matters. A count says how busy the
         * queue is; the age says whether somebody has been stuck for a fortnight.
         */
        says: (() => {
          if (rows.length === 0) return 'Nothing waiting on a decision';
          const oldest = days(rows[0].createdAt);
          /*
           * "The oldest for 0 days" is what a counter says, not what a person
           * says. Something asked for this morning has not been waiting; the
           * age only starts being the point once it is measured in days.
           */
          if (oldest === 0) return `${rows.length} waiting, all asked today`;
          return `${rows.length} waiting, the oldest for ${oldest} day${oldest === 1 ? '' : 's'}`;
        })(),
      };
    },
  },
  {
    key: 'commitments.missed_last_cycle',
    label: 'Commitments missed',
    shape: 'count',
    capability: 'commitments:read-all',
    counts: 'Commitments closed as MISSED inside the window, and what was said about each.',
    async compute(prisma, window) {
      const rows = await prisma.opsCommitment.findMany({
        where: { status: 'MISSED', closedAt: { gte: window.from, lte: window.to } },
      });
      return {
        value: rows.length,
        unit: 'commitments',
        rows: rows.map((r) => ({ title: r.title, said: r.actualResult, blocked: r.blocked })),
        says: rows.length === 0 ? 'None missed' : `${rows.length} missed`,
      };
    },
  },
  {
    key: 'commitments.blocked',
    label: 'People waiting on something',
    shape: 'count',
    capability: 'commitments:read-all',
    counts: 'Open commitments flagged as blocked, and on what.',
    async compute(prisma) {
      const rows = await prisma.opsCommitment.findMany({
        where: { blocked: true, status: { notIn: ['COMPLETED', 'MISSED'] } },
      });
      return {
        value: rows.length,
        unit: 'people',
        rows: rows.map((r) => ({ title: r.title, waitingOn: r.blockerReason, due: r.dueDate })),
        says: rows.length === 0 ? 'Nobody is blocked' : `${rows.length} blocked`,
      };
    },
  },
];

export const METRICS_BY_KEY = new Map(METRICS.map((m) => [m.key, m]));
