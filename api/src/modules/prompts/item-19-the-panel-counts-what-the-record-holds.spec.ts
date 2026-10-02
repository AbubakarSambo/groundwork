import { PromptsService } from './prompts.service';

/**
 * ITEM 19: THE PLATFORM PANEL COUNTS WHAT THE RECORD HOLDS (2 October 2026).
 *
 * Each number on /admin was read against the local test database after the week's changes. Where the
 * served number and the record parted, the rows that made them part are seeded here and the served
 * number is checked. These tests read what the endpoint sends, not the query that builds it.
 */

/** A fake Prisma with every read the System tab makes, answering with the rows a test seeds. */
function theSystemTab(seed: { recent?: any[] } = {}) {
  const prisma: any = {
    organization: { count: jest.fn().mockResolvedValue(3) },
    ground: {
      count: jest.fn().mockResolvedValue(4),
      groupBy: jest.fn().mockResolvedValue([{ status: 'ACTIVE', _count: { id: 4 } }]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    checkIn: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn(async (args: any) => (args?.take === 15 ? seed.recent ?? [] : [])),
    },
    promptVersion: { findMany: jest.fn().mockResolvedValue([]) },
    outcome: { findMany: jest.fn().mockResolvedValue([]) },
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
