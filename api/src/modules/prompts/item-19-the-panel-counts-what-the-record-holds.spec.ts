import { PromptsService } from './prompts.service';

/**
 * ITEM 19: THE PLATFORM PANEL COUNTS WHAT THE RECORD HOLDS (2 October 2026).
 *
 * Each number on /admin was read against the local test database after the week's changes. Where the
 * served number and the record parted, the rows that made them part are seeded here and the served
 * number is checked. These tests read what the endpoint sends, not the query that builds it.
 */

/** A fake Prisma with every read the System tab makes, answering with the rows a test seeds. */
function theSystemTab(seed: { recent?: any[]; versions?: any[]; groundsOnAVersion?: any[]; outcomes?: any[] } = {}) {
  const prisma: any = {
    organization: { count: jest.fn().mockResolvedValue(3) },
    ground: {
      count: jest.fn().mockResolvedValue(4),
      groupBy: jest.fn(async ({ by }: any) =>
        by.includes('promptVersionId') ? seed.groundsOnAVersion ?? [] : [{ status: 'ACTIVE', _count: { id: 4 } }]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    checkIn: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn(async (args: any) => (args?.take === 15 ? seed.recent ?? [] : [])),
    },
    promptVersion: { findMany: jest.fn().mockResolvedValue(seed.versions ?? []) },
    outcome: { findMany: jest.fn().mockResolvedValue(seed.outcomes ?? []) },
    outcomeFeedback: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { prisma, svc: new PromptsService(prisma, {} as any) };
}

describe('the System tab', () => {
  it('opens when a session is marked complete with no completion time, and that session is not in the feed', async () => {
    /* One row like this on the test database ("PROVE the trade", Audit Test Ltd) took the whole tab down. */
    const { prisma, svc } = theSystemTab({
      recent: [
        { completedAt: null, sessionNumber: 1, ground: { label: 'PROVE the trade', organization: { slug: 'audit-test' } } },
        { completedAt: new Date('2026-10-01T09:00:00Z'), sessionNumber: 2, ground: { label: 'Sales team, Q3', organization: { slug: 'baridi' } } },
      ],
    });
    const served = await svc.platformDashboard('all');

    expect(served.checkIns.totalCompleted).toBe(5);
    expect(served.recentActivity).toEqual([
      { type: 'checkin_completed', at: new Date('2026-10-01T09:00:00Z'), orgSlug: 'baridi', groundLabel: 'Sales team, Q3', detail: 'Session 2' },
    ]);
    const feed = prisma.checkIn.findMany.mock.calls.find(([a]: any[]) => a?.take === 15)[0];
    expect(feed.where.completedAt).toEqual({ not: null });
  });
});

describe('the prompt versions on the System tab', () => {
  it('count the check-ins that ran on each version, not the outcomes they reached', async () => {
    const v = (id: string, version: number, isActive: boolean) => ({ id, key: 'system', version, isActive, activatedAt: null, createdAt: new Date() });
    const { prisma, svc } = theSystemTab({
      versions: [v('v44', 44, true), v('v35', 35, false), v('v1', 1, false)],
      /* What Postgres hands back for customers' check-ins that record a version. */
      groundsOnAVersion: [{ promptVersionId: 'v44', _count: { id: 89 } }, { promptVersionId: 'v35', _count: { id: 29 } }],
      outcomes: [{ promptVersionId: 'v35', resolvedState: 'RESOLVED' }],
    });
    const served = await svc.platformDashboard('all');
    /* It served 0, 1 and 0: one outcome on version 35, and nothing on the version that runs. */
    expect(served.promptPerformance.map((p) => [p.version, p.groundsUsingIt, p.outcomesResolved])).toEqual([[44, 89, 0], [35, 29, 1], [1, 0, 0]]);
    const asked = prisma.ground.groupBy.mock.calls.find(([a]: any[]) => a.by.includes('promptVersionId'))[0];
    expect(asked.where).toEqual({ organization: { isInternal: false }, promptVersionId: { not: null } });
  });
});

describe('how long a session takes', () => {
  /** The funnel's reads; the raw query answers as Postgres would over the seeded sessions. */
  function theFunnel(sessions: { n: number; minutes: number; closedReason: string | null }[]) {
    const raws: any[] = [];
    const prisma: any = {
      checkIn: { count: jest.fn().mockResolvedValue(0) },
      ground: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      $queryRaw: jest.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const sql = strings.join('?');
        raws.push({ sql, values });
        if (!sql.includes('avg_minutes')) return [{ avg_days: null, n: 0 }];
        /* Postgres's own reading of the one condition this test is about. */
        const leftOut = sql.includes('closed_reason IS DISTINCT FROM') ? values.find((v) => v === 'auto_closed') : undefined;
        const kept = sessions.filter((s) => leftOut === undefined || s.closedReason !== leftOut);
        const byN = new Map<number, number[]>();
        for (const s of kept) byN.set(s.n, [...(byN.get(s.n) ?? []), s.minutes]);
        return [...byN].map(([n, m]) => ({ session_number: n, avg_minutes: m.reduce((a, b) => a + b, 0) / m.length, n: m.length }));
      }),
    };
    return { svc: new PromptsService(prisma, {} as any), raws };
  }

  it('averages only the sessions a person finished, not those the clock closed a day later', async () => {
    const { svc } = theFunnel([
      { n: 1, minutes: 12, closedReason: null },
      { n: 1, minutes: 14, closedReason: null },
      { n: 1, minutes: 1440, closedReason: 'auto_closed' },
    ]);
    const served = await svc.usageFunnel('all');
    /* It served 489 here: the clock's session counted as a day-long session. */
    expect(served.avgSessionMinutes).toEqual([{ session: 1, avgMinutes: 13, n: 2 }]);
  });
});

describe('the Usage tab\'s usage events', () => {
  /** A fake Prisma over seeded events and check-ins, applying the conditions the reads ask for. */
  function theUsageTab() {
    const orgs = [{ id: 'baridi', isInternal: false }, { id: 'ours', isInternal: true }];
    const grounds = [{ id: 'g-baridi', organizationId: 'baridi' }, { id: 'g-ours', organizationId: 'ours' }];
    const events = [
      { type: 'GROUND_CREATED', organizationId: 'baridi', groundId: 'g-baridi' },
      { type: 'GROUND_CREATED', organizationId: 'ours', groundId: 'g-ours' },
      /* A session finishing writes its check-in and no organisation. */
      { type: 'CHECK_IN_COMPLETED', organizationId: null, groundId: 'g-baridi' },
      { type: 'CHECK_IN_COMPLETED', organizationId: null, groundId: 'g-baridi' },
      { type: 'CHECK_IN_COMPLETED', organizationId: null, groundId: 'g-ours' },
      /* The /start page's model call: nobody's usage. */
      { type: 'ANONYMOUS_MODEL_CALL', organizationId: null, groundId: null },
    ];
    const matches = (e: any, where: any) =>
      (where.organizationId === null ? e.organizationId === null : true) &&
      (where.organizationId?.not === null ? e.organizationId !== null && !where.organizationId.notIn.includes(e.organizationId) : true) &&
      (where.groundId?.not === null ? e.groundId !== null : true);
    const prisma: any = {
      organization: { findMany: jest.fn(async () => orgs.filter((o) => o.isInternal)) },
      usageEvent: {
        groupBy: jest.fn(async ({ by, where }: any) => {
          const groups = new Map<string, any>();
          for (const e of events.filter((x) => matches(x, where))) {
            const key = by.map((k: string) => (e as any)[k]).join('|');
            const g = groups.get(key) ?? { ...Object.fromEntries(by.map((k: string) => [k, (e as any)[k]])), _count: { id: 0 } };
            g._count.id++;
            groups.set(key, g);
          }
          return [...groups.values()];
        }),
      },
      ground: {
        findMany: jest.fn(async ({ where }: any) =>
          grounds.filter((g) => where.id.in.includes(g.id) && !orgs.find((o) => o.id === g.organizationId)!.isInternal).map((g) => ({ id: g.id }))),
        count: jest.fn().mockResolvedValue(0),
      },
      checkIn: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    };
    return new PromptsService(prisma, {} as any);
  }

  it('counts a finished session\'s event by its check-in\'s organisation, and only a customer\'s', async () => {
    const served = await theUsageTab().usageStats('all');
    /* It served { GROUND_CREATED: 1 }: every CHECK_IN_COMPLETED was dropped for having no organisation. */
    expect(served.eventTotals).toEqual({ GROUND_CREATED: 1, CHECK_IN_COMPLETED: 2 });
  });
});

describe('the organisation list\'s people', () => {
  it('counts each organisation\'s people by the seat rule its own People page reads', async () => {
    /* Ouma Agencies on the test database: an admin who belongs there but last looked at another organisation. */
    const people = [
      { organizationId: 'ouma', memberships: [{ organizationId: 'ouma', heldForASeat: false }] },
      { organizationId: 'baridi', memberships: [{ organizationId: 'baridi', heldForASeat: false }, { organizationId: 'ouma', heldForASeat: false }] },
      /* An older account with no membership row at all still counts where it is. */
      { organizationId: 'baridi', memberships: [] },
      /* A guest held for a seat holds none. */
      { organizationId: 'baridi', memberships: [{ organizationId: 'baridi', heldForASeat: false }, { organizationId: 'ouma', heldForASeat: true }] },
    ];
    const prisma: any = {
      organization: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'ouma', name: 'Ouma Agencies', slug: 'ouma', email: null, careFeeStatus: null, createdAt: new Date(), isInternal: false, _count: { grounds: 0 } },
          { id: 'baridi', name: 'Baridi Foods', slug: 'baridi', email: null, careFeeStatus: null, createdAt: new Date(), isInternal: false, _count: { grounds: 2 } },
        ]),
      },
      user: {
        findMany: jest.fn(async ({ where }: any) => {
          /* Somebody not let in, deactivated or deleted is not a seat; the fake trusts the predicate it is given. */
          expect(where).toEqual({ isActive: true, deletedAt: null, awaitingOrgApproval: false });
          return people;
        }),
      },
      checkIn: { groupBy: jest.fn().mockResolvedValue([]) },
      ground: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const served = await new PromptsService(prisma, {} as any).orgList();
    /* It served 1 for Ouma Agencies and 3 for Baridi Foods, by the organisation each person last looked at. */
    expect(served.map((o) => [o.name, o.userCount])).toEqual([['Ouma Agencies', 2], ['Baridi Foods', 3]]);
  });
});

describe('the Feedback tab', () => {
  it('counts every customer\'s answer, not the latest fifty, and not our own', async () => {
    /* 60 customers' answers, 45 of them fair, and 4 from our own organisation. */
    const answers = [
      ...Array.from({ length: 60 }, (_, i) => ({ id: `c${i}`, feltFair: i < 45, note: null, createdAt: new Date(2026, 8, 1 + (i % 28)), ours: false, ground: { label: 'Sales team, Q3', organization: { slug: 'baridi' } } })),
      ...Array.from({ length: 4 }, (_, i) => ({ id: `o${i}`, feltFair: false, note: null, createdAt: new Date(2026, 9, 1), ours: true, ground: { label: 'Our own', organization: { slug: 'groundwork' } } })),
    ];
    const ofACustomer = (where: any) => (where?.ground?.organization?.isInternal === false ? answers.filter((a) => !a.ours) : answers);
    const prisma: any = {
      outcomeFeedback: {
        count: jest.fn(async ({ where }: any) => ofACustomer(where).filter((a) => (where.feltFair === undefined ? true : a.feltFair === where.feltFair)).length),
        findMany: jest.fn(async ({ where, take }: any) => ofACustomer(where).slice(0, take)),
      },
    };
    const served = await new PromptsService(prisma, {} as any).feedbackSummary();
    /* It served a total of 50 and a rate over those fifty alone, our own answers among them. */
    expect(served.total).toBe(60);
    expect(served.fairRate).toBe(75);
    expect(served.recent).toHaveLength(50);
    expect(served.recent.some((r) => r.orgSlug === 'groundwork')).toBe(false);
  });
});
