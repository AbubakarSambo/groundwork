import { AdminService } from './admin.service';

/**
 * ITEM 19: /admin/dashboard COUNTS WHAT THE RECORD HOLDS (2 October 2026).
 *
 * Each number on the dashboard was read against the local test database after the week's changes.
 * The rows that made a served number and the record part are seeded here, and the served number is
 * checked. The platform admin reads counts; nothing here carries what anybody said.
 */
const orgs = [
  { id: 'a', isInternal: false, subscriptionPlan: 'TEAM', subscriptionStatus: 'active' },
  { id: 'b', isInternal: false, subscriptionPlan: 'TEAM', subscriptionStatus: 'paused' },
  { id: 'c', isInternal: false, subscriptionPlan: 'GROWTH', subscriptionStatus: 'past_due' },
  { id: 'd', isInternal: false, subscriptionPlan: null, subscriptionStatus: 'cancelled' },
  { id: 'ours', isInternal: true, subscriptionPlan: 'TEAM', subscriptionStatus: 'active' },
];

/** Applies a where of plain values, `{ not: null }` and `{ not: value }` to a row, as Postgres would. */
function matches(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([k, w]: [string, any]) => {
    if (w && typeof w === 'object' && 'not' in w) return w.not === null ? row[k] !== null : row[k] !== null && row[k] !== w.not;
    return row[k] === w;
  });
}

function theDashboard(seed: { grounds?: { freeReason: string | null; isFreeGround: boolean }[] } = {}) {
  const grounds = seed.grounds ?? [];
  const prisma: any = {
    organization: { count: jest.fn(async ({ where }: any) => orgs.filter((o) => matches(o, where)).length), findMany: jest.fn().mockResolvedValue([]) },
    ground: {
      count: jest.fn(async () => grounds.length),
      aggregate: jest.fn(async () => ({ _sum: { sessionsBalance: grounds.length } })),
      groupBy: jest.fn(async ({ by }: any) => {
        const groups = new Map<string, any>();
        for (const g of grounds) {
          const key = by.map((k: string) => String((g as any)[k])).join('|');
          const row = groups.get(key) ?? { ...Object.fromEntries(by.map((k: string) => [k, (g as any)[k]])), _count: { id: 0 } };
          row._count.id++;
          groups.set(key, row);
        }
        return [...groups.values()];
      }),
    },
    contributorCode: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    contributorCodeRedemption: { count: jest.fn().mockResolvedValue(0) },
    outcomeFeedback: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
  /* The organisation count above stands in for Postgres; our own organisation is left out by A_CUSTOMER. */
  return new AdminService(prisma, { get: () => undefined } as any, {} as any);
}

describe('Subscribed orgs', () => {
  it('counts a customer paying now, not a paused or past-due subscription that kept its plan', async () => {
    const served = await theDashboard().getDashboard();
    /* It served 3: the paused and the past-due subscriptions kept their plan and were counted. */
    expect(served.overview.totalSubscribedOrgs).toBe(1);
  });
});

describe('How check-ins were covered', () => {
  it('counts a check-in as paid only when it took a paid slot, and a free one with no reason given as free', async () => {
    const free = (freeReason: string | null) => ({ freeReason, isFreeGround: true });
    const paid = { freeReason: null, isFreeGround: false };
    const served = await theDashboard({
      grounds: [free('FREE_TIER'), free('FREE_TIER'), free('ACCESS_CODE'), free('FIRST_GROUND'), free(null), free(null), paid, paid, paid],
    }).getDashboard();
    /* It served paid: 5, with the two free check-ins that name no reason counted as paid. */
    expect(served.freeReasonBreakdown).toEqual({ FIRST_GROUND: 1, FREE_TIER: 2, ACCESS_CODE: 1, paid: 3, freeNoReasonGiven: 2 });
    expect(served.overview.totalGrounds).toBe(9);
  });
});
