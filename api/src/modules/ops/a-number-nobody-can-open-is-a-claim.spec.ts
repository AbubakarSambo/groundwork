/**
 * Every number on every board opens onto the rows that made it.
 *
 * This is the rule the whole detection layer rests on, and it is easy to break
 * one metric at a time: somebody adds a count that returns a total, the board
 * renders it, and now there is one figure on the page that cannot be checked.
 * Nobody notices until it is wrong and an argument starts about whether it is.
 *
 * So the registry is checked as a whole rather than metric by metric — a new
 * metric that returns no evidence fails this the day it is written.
 */
import { METRICS, METRICS_BY_KEY } from './a-number-you-can-open';
import { OPS_CAPABILITIES } from './what-somebody-may-do';
import { OpsMetricsService } from './ops-metrics.service';
import { ForbiddenException } from '@nestjs/common';

const WINDOW = { from: new Date('2026-09-01'), to: new Date('2026-09-30') };

const aRow = { happenedAt: new Date('2026-09-10'), companyId: 'c1', note: 'called them' };
/** Enough fields for any metric that reads a company, a use case, a roadmap or a tech row. */
const aGenericRow = {
  name: 'A Company',
  title: 'A thing',
  stage: 'LINED_UP',
  severity: 'high',
  status: 'OPEN',
  ownerPersonId: null,
  relatedCompanyId: 'c1',
  completedAt: new Date('2026-09-14'),
  company: { name: 'A Company' },
};
const anOpportunity = {
  id: 'o1',
  stage: 'MEETING',
  createdAt: new Date('2026-09-02'),
  convertedAt: new Date('2026-09-15'),
  lostAt: null,
  lostReason: null,
  nextAction: 'send the proposal',
  nextActionDueAt: new Date('2026-09-08'),
  estimatedValue: null,
  company: { name: 'A Company' },
  campaign: { title: 'A Campaign' },
};
const aDeployment = {
  stage: 'ONBOARDING',
  company: { name: 'A Company' },
  onboardingStartedAt: new Date('2026-09-01'),
  onboardingCompletedAt: new Date('2026-09-09'),
  blockerType: 'Product',
  blockerSummary: 'waiting on the export',
  blockerSummaryText: null,
  startDate: new Date('2026-09-01'),
};

/**
 * A Prisma stand-in that answers for any table.
 *
 * Listing them by hand meant every new metric turned five unrelated tests red
 * for a reason that had nothing to do with what they assert. A spec that breaks
 * when you add a feature it does not cover is a spec people start ignoring.
 */
const prismaReturning = (rows: () => unknown[]) =>
  new Proxy({}, { get: () => ({ findMany: async () => rows() }) }) as never;

const emptyPrisma = prismaReturning(() => []);

describe('the metric registry', () => {
  it('has metrics in it, so nothing below passes on an empty list', () => {
    expect(METRICS.length).toBeGreaterThan(0);
  });

  it('gives every metric a capability that actually exists', () => {
    const unknown = METRICS.filter(
      (m) => !(OPS_CAPABILITIES as readonly string[]).includes(m.capability),
    ).map((m) => `${m.key} -> ${m.capability}`);
    expect(unknown).toEqual([]);
  });

  it('and every key is unique', () => {
    expect(METRICS_BY_KEY.size).toBe(METRICS.length);
  });

  it('and every metric says what it counts, in words', () => {
    const silent = METRICS.filter((m) => !m.counts || m.counts.length < 20).map((m) => m.key);
    expect(silent).toEqual([]);
  });
});

describe('every metric returns its evidence', () => {
  /**
   * Run against a database with rows in it, not an empty one.
   *
   * The first version of this test used the empty stand-in, so a metric that
   * counted a hundred things and returned no rows passed — `[]` was the correct
   * answer to a question with no data behind it. It caught nothing, and it
   * looked exactly like a test that did. A count has to be shown its own rows,
   * which only happens when there are some.
   */
  const populated = new Proxy(
    {},
    {
      get: (_t, table: string) => ({
        findMany: async () => {
          if (table === 'opsSalesOpportunity') {
            return [anOpportunity, { ...anOpportunity, convertedAt: null, lostAt: new Date('2026-09-12') }];
          }
          if (table === 'opsDeployment') return [aDeployment, aDeployment];
          if (table === 'opsActivity') return [aRow, aRow, aRow];
          return [aGenericRow, aGenericRow];
        },
      }),
    },
  ) as never;

  it.each(METRICS.map((m) => [m.key, m]))('%s comes back with a rows array', async (_key, metric) => {
    const result = await (metric as (typeof METRICS)[number]).compute(emptyPrisma, WINDOW);
    expect(Array.isArray(result.rows)).toBe(true);
    expect(typeof result.value).toBe('number');
    expect(result.says.length).toBeGreaterThan(0);
  });

  it.each(METRICS.map((m) => [m.key, m]))(
    '%s shows the rows behind a number that is not zero',
    async (_key, metric) => {
      const m = metric as (typeof METRICS)[number];
      const result = await m.compute(populated, WINDOW);
      if (result.value === 0) return; // nothing to show is allowed; a silent count is not
      expect(result.rows.length).toBeGreaterThan(0);
    },
  );

  it.each(METRICS.map((m) => [m.key, m]))(
    '%s counts exactly as many rows as it returns',
    async (_key, metric) => {
    const m = metric as (typeof METRICS)[number];
    const result = await m.compute(populated, WINDOW);
    // A derived figure (a rate, an average) is not a count of its rows; a count is.
    if (result.unit === '%' || result.unit === 'days') return;
    expect(result.value).toBe(result.rows.length);
    },
  );
});

describe('a metric with nothing to report says so rather than saying zero', () => {
  /**
   * Zero and nothing-happened are different facts and a board cannot tell them
   * apart from a number alone. A 0% conversion rate over an empty window reads
   * as a catastrophe; "nothing concluded" reads as what it is.
   */
  it.each(['sales.conversion_rate', 'deployment.days_to_onboard'])(
    '%s explains an empty window in its sentence',
    async (key) => {
      const metric = METRICS_BY_KEY.get(key)!;
      const result = await metric.compute(emptyPrisma, WINDOW);
      expect(result.says).toMatch(/no (rate|average)/i);
    },
  );
});

describe('a metric obeys the caller, not the board it is on', () => {
  const service = new OpsMetricsService(emptyPrisma);
  const contributor = { personId: 'p', key: 'adam', displayName: 'Adam', functionalRole: 'CONTRIBUTOR' as const, capabilities: ['contributor:self'] };
  const sales = { ...contributor, key: 'sahar', capabilities: ['sales:read'] };

  it('refuses a metric the caller cannot hold', async () => {
    await expect(service.read(contributor, 'sales.conversions', WINDOW)).rejects.toThrow(ForbiddenException);
  });

  it('allows the one they can', async () => {
    await expect(service.read(sales, 'sales.conversions', WINDOW)).resolves.toMatchObject({ value: 0 });
  });

  it('and does not even list what they cannot open', () => {
    const listed = service.catalogue(contributor).map((m) => m.key);
    expect(listed).toEqual([]);
    expect(service.catalogue(sales).length).toBeGreaterThan(0);
  });
});

describe('a comfortable sentence over an empty pipeline', () => {
  /**
   * "Everything has a next step" is the most comfortable wrong sentence a board
   * can carry: it says the same thing whether sales is well tended or has dried
   * up entirely, and it reads as praise on the worst possible day.
   */
  const noPipeline = prismaReturning(() => []);
  const tended = prismaReturning(() => [
    { nextAction: 'call them', stage: 'MEETING', createdAt: new Date(), company: { name: 'A' } },
  ]);

  const metric = METRICS_BY_KEY.get('sales.no_next_action')!;

  it('says the pipeline is empty rather than that everything is fine', async () => {
    const result = await metric.compute(noPipeline, WINDOW);
    expect(result.says).toMatch(/Nothing live/);
    expect(result.says).not.toMatch(/has a next step/);
  });

  it('and only reassures when there is something to be reassured about', async () => {
    const result = await metric.compute(tended, WINDOW);
    expect(result.says).toMatch(/All 1 have a next step/);
  });
});

describe('evidence a person can actually read', () => {
  /**
   * The activity log holds a company id rather than a relation, on purpose: an
   * activity outlives the record it describes. But the first live drill-down
   * came back as `{"companyId": "b69a2617-856b-4bfb-..."}`, which is not
   * evidence — nobody opens a number to be shown a UUID. Found by reading the
   * commitments board, not the code.
   */
  const withActivity = prismaReturning(() => [
    { happenedAt: new Date('2026-09-10'), companyId: 'c1', note: null },
    { happenedAt: new Date('2026-09-11'), companyId: 'c1', note: null },
  ]);

  it.each(['sales.new_leads_contacted', 'sales.meetings_held', 'tech.open_client_blockers'])(
    "%s names the company rather than handing over its id",
    async (key) => {
      const result = await METRICS_BY_KEY.get(key)!.compute(withActivity, WINDOW);
      for (const row of result.rows) {
        expect(row).not.toHaveProperty('companyId');
        expect(row).toHaveProperty('company');
      }
    },
  );

  it('and says so plainly when the company is gone, rather than showing nothing', async () => {
    const orphaned = new Proxy(
      {},
      {
        get: (_t, table: string) => ({
          findMany: async () =>
            table === 'opsCompany' ? [] : [{ happenedAt: new Date(), companyId: 'deleted', note: null }],
        }),
      },
    ) as never;

    const result = await METRICS_BY_KEY.get('sales.new_leads_contacted')!.compute(orphaned, WINDOW);
    expect(result.rows[0].company).toMatch(/since deleted/);
  });
});
