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

export interface MetricDefinition {
  key: string;
  label: string;
  /** What somebody must hold to see it. A metric obeys the caller, not the board. */
  capability: OpsCapability;
  /** What the number means, for the drill-down panel. */
  counts: string;
  compute: (prisma: PrismaService, window: MetricWindow) => Promise<MetricResult>;
}

const within = (window: MetricWindow) => ({ gte: window.from, lte: window.to });

export const METRICS: MetricDefinition[] = [
  {
    key: 'sales.new_leads_contacted',
    label: 'New leads contacted',
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
        rows: rows.map((r) => ({ when: r.happenedAt, companyId: r.companyId, note: r.note })),
        says: `${rows.length} contacted`,
      };
    },
  },
  {
    key: 'sales.meetings_held',
    label: 'Meetings held',
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
        rows: rows.map((r) => ({ when: r.happenedAt, companyId: r.companyId })),
        says: `${rows.length} meetings`,
      };
    },
  },
  {
    key: 'sales.conversions',
    label: 'Conversions',
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
];

export const METRICS_BY_KEY = new Map(METRICS.map((m) => [m.key, m]));
