import { WhatNeedsYouService } from './what-needs-you.service';
import * as rules from '../suites/who-may-decide';
import { LeaveBoardService } from '../suites/the-leave-board.service';
import { TimeSheetsService } from '../suites/the-time-sheets.service';
import { SpendingService } from '../suites/the-spending.service';
import { ReviewsService } from '../suites/the-reviews.service';

/**
 * TODAY SHOWS WHAT WAITS FOR WHOEVER THE RULES NAME, MEMBERS INCLUDED (decisions 85 and 86).
 *
 * Ask Groundwork, WhatsApp and the daily summary told a member named to decide that something waited
 * for them, but Today asked the boards only for an admin or a lead, so the member found nothing there.
 * Today now asks every reader's boards, and each board's own refusal decides: a member nobody names is
 * refused, which Today reads as "nothing waiting", and Today still opens.
 *
 * Everything here goes through the real Today service and the real leave, time sheets, spending and
 * reviews boards. Only the database is a fake.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-28T09:00:00Z');
const SEPT = new Date('2026-09-01T00:00:00Z');

const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-fatuma': 'LEAD', 'u-omar': 'MEMBER', 'u-aisha': 'MEMBER',
  'u-miriam': 'MEMBER', 'u-otieno': 'MEMBER', 'u-lina': 'MEMBER', 'u-tomas': 'GUEST',
};
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'], 'u-fatuma': ['Fatuma', 'Hassan'],
  'u-omar': ['Omar', 'Abdi'], 'u-aisha': ['Aisha', 'Otieno'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-otieno': ['Otieno', 'Ouma'],
  'u-lina': ['Lina', 'Mutua'], 'u-tomas': ['Tomas', 'Guest'],
};
const entry = (u: string, department: string | null, manager: string | null) =>
  ({ externalId: `p-${u.slice(2)}`, linkedUserId: u, email: null, displayName: names[u].join(' '), givenName: names[u][0], familyName: names[u][1], department, managerExternalId: manager, active: true });
const DIRECTORY = [
  entry('u-grace', null, null), entry('u-wairimu', 'Sales', 'p-grace'), entry('u-kamau', 'Operations', 'p-grace'), entry('u-fatuma', 'Operations', 'p-grace'),
  entry('u-omar', 'Finance', 'p-grace'), entry('u-aisha', 'Sales', 'p-wairimu'), entry('u-miriam', 'Sales', 'p-wairimu'),
  entry('u-otieno', 'Operations', 'p-kamau'), entry('u-lina', 'Product', 'p-grace'),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'OR') return v.some((w: any) => matches(row, w));
    if (k === 'AND') return v.every((w: any) => matches(row, w));
    if (k === 'memberships') return !!roles[row.id];
    if (!(k in row)) return true;
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('in' in v && !v.in.includes(row[k])) return false;
      if ('gte' in v && !(row[k] >= v.gte)) return false;
      if ('lte' in v && !(row[k] <= v.lte)) return false;
      if ('lt' in v && !(row[k] < v.lt)) return false;
      if ('equals' in v && String(row[k] ?? '').toLowerCase() !== String(v.equals).toLowerCase()) return false;
      return true;
    }
    if (v instanceof Date) return row[k]?.getTime() === v.getTime();
    return row[k] === v;
  });
}

/**
 * Baridi Appliances, Monday 28 September 2026. Every suite is on. Spending has a limit of KES 20,000
 * and names `above` for anything over it. Leave, hours and reviews go to "their manager" by today's
 * answers, unless a test sets the rules the way a later workflow could.
 */
function setup(opts: { above?: string; duties?: Record<string, unknown> } = {}) {
  const leave: any[] = [
    { id: 'l-aisha', organizationId: ORG, userId: 'u-aisha', startsOn: d('2026-10-01'), endsOn: d('2026-10-02'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null },
    { id: 'l-otieno', organizationId: ORG, userId: 'u-otieno', startsOn: d('2026-10-06'), endsOn: d('2026-10-06'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null },
  ];
  const hours: any[] = [
    { organizationId: ORG, userId: 'u-aisha', client: 'Naivas', onDay: d('2026-09-28'), minutes: 180 },
    { organizationId: ORG, userId: 'u-otieno', client: 'Lakeside', onDay: d('2026-09-28'), minutes: 240 },
  ];
  const weeks: any[] = [];
  const dues = [
    { id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: d('2026-10-05'), source: null },
    { id: 'd-otieno', organizationId: ORG, personExternalId: 'p-otieno', dueOn: d('2026-10-05'), source: null },
  ];
  const spend = [
    { id: 's-1', organizationId: ORG, userId: 'u-lina', amount: 95000, what: 'a new laptop', team: 'Product', status: 'waiting', createdAt: new Date('2026-09-25T08:00:00Z'), decidedById: null, decidedAt: null },
    { id: 's-2', organizationId: ORG, userId: 'u-miriam', amount: 5000, what: 'transport to Westgate Deli', team: 'Sales', status: 'waiting', createdAt: new Date('2026-09-25T08:00:00Z'), decidedById: null, decidedAt: null },
  ];
  const budgets = [
    { organizationId: ORG, team: 'Sales', month: SEPT, amount: 400000 },
    { organizationId: ORG, team: 'Product', month: SEPT, amount: 120000 },
  ];
  const users = Object.keys(names).map((id) => ({ id, email: null, firstName: names[id][0], lastName: names[id][1], phoneNumber: null, deletedAt: null, awaitingOrgApproval: false }));
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => {
      const s = where.organizationId_suite.suite;
      if (s === 'duties') return opts.duties ? { isOn: false, answers: opts.duties } : null;
      if (s === 'leave') return { isOn: true, answers: { days: 21, approver: 'Their manager' } };
      if (s === 'time') return { isOn: true, answers: { clients: ['Naivas', 'Lakeside'], approver: 'Their manager' } };
      if (s === 'reviews') return { isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } };
      if (s === 'spend') return { isOn: true, answers: { currency: 'KES', limit: 20000, above: opts.above ?? 'An admin' } };
      return null;
    }) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)),
      findMany: jest.fn(async () => []),
    },
    person: {
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => matches(p, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => DIRECTORY.filter((p) => matches(p, where))),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => users.filter((u) => matches(u, where))),
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.id === where.id) ?? null),
    },
    leaveRequest: { findMany: jest.fn(async ({ where }: any) => leave.filter((r) => matches(r, where))) },
    timeEntry: { findMany: jest.fn(async ({ where }: any) => hours.filter((h) => matches(h, where))) },
    timeWeek: { findMany: jest.fn(async ({ where }: any) => weeks.filter((w) => matches(w, where))) },
    timeAgreement: { findMany: jest.fn(async () => []) },
    evaluationDue: { findMany: jest.fn(async () => dues) },
    performanceReview: { findMany: jest.fn(async () => []) },
    spendRequest: { findMany: jest.fn(async ({ where }: any) => spend.filter((r) => matches(r, where))) },
    teamBudget: { findMany: jest.fn(async ({ where }: any) => budgets.filter((b) => b.month.getTime() === where.month.getTime())) },
  };
  /* No check-ins: only what waits to be decided reaches Today here. */
  const grounds: any = { list: jest.fn(async () => []), listAwaitingApproval: jest.fn(async () => []) };
  const svc = new WhatNeedsYouService(prisma, grounds, new LeaveBoardService(prisma), new TimeSheetsService(prisma), new SpendingService(prisma), new ReviewsService(prisma));
  /* What a person reads on Today: each line, and the sentence under it. */
  const today = async (userId: string) => {
    const read = await svc.forReader(userId, `${userId}@baridi.example`, ORG, roles[userId]);
    return read.needs.map((n) => [n.title, n.detail]);
  };
  return { today };
}

/* One approval step, its rules tried in order (theStepsFor gives a list of steps since build step 4). */
function theRulesAre(rulesOfTheStep: rules.Step) {
  jest.spyOn(rules, 'theStepsFor').mockImplementation((() => [rulesOfTheStep]) as any);
  /* Spending asks theStepsADecisionFollows since B-004 (09b14bd7), which calls theStepsFor inside its own module, out of the spy's reach. */
  jest.spyOn(rules, 'theStepsADecisionFollows').mockImplementation((() => [rulesOfTheStep]) as any);
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.setSystemTime(TODAY);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Omar, a member named for spending over KES 20,000', () => {
  it('reads Lina’s request on Today, and not Miriam’s, which is under the limit', async () => {
    const { today } = setup({ above: 'u-omar' });
    expect(await today('u-omar')).toEqual([
      ['Lina asked to spend KES 95,000 on a new laptop.', 'It is waiting for you to approve.'],
    ]);
  });
});

describe('Omar, a member who heads Sales, where the department head decides leave, hours and reviews', () => {
  beforeEach(() => theRulesAre(['departmentHead', 'admin']));

  it('reads Aisha’s leave, her hours and her review to write on Today, and nothing of Operations', async () => {
    const { today } = setup({ duties: { departmentHeads: { Sales: 'u-omar' } } });
    expect(await today('u-omar')).toEqual([
      ['Aisha’s review is ready for you to start.', 'It is due on Monday 5 October.'],
      ['Aisha asked for leave from Thursday 1 October to Friday 2 October.', 'It is waiting for you to approve.'],
      ['Aisha sent 3 hours on Naivas for Monday 28 September.', 'They are waiting for you to approve.'],
    ]);
  });

  it('Miriam, a member nobody names, and Tomas, a guest, read nothing waiting, and Today still opens', async () => {
    const { today } = setup({ duties: { departmentHeads: { Sales: 'u-omar' } } });
    expect(await today('u-miriam')).toEqual([]);
    expect(await today('u-tomas')).toEqual([]);
  });

  it('Grace, the admin, still reads only Otieno’s, where nobody heads Operations', async () => {
    const { today } = setup({ duties: { departmentHeads: { Sales: 'u-omar' } } });
    expect(await today('u-grace')).toEqual([
      ['Otieno’s review is ready for you to start.', 'It is due on Monday 5 October.'],
      ['Otieno asked for leave on Tuesday 6 October.', 'It is waiting for you to approve.'],
      ['Otieno sent 4 hours on Lakeside for Monday 28 September.', 'They are waiting for you to approve.'],
      ['Lina asked to spend KES 95,000 on a new laptop.', 'It is waiting for you to approve.'],
    ]);
  });

  it('Wairimu, the lead of Sales, no longer decides Aisha’s, so Today has nothing for her to decide', async () => {
    const { today } = setup({ duties: { departmentHeads: { Sales: 'u-omar' } } });
    expect((await today('u-wairimu')).filter(([, detail]) => /approve/.test(String(detail)))).toEqual([]);
  });
});

describe('with today’s answers, where nobody names a member', () => {
  it('a member reads nothing waiting, and Today still opens', async () => {
    const { today } = setup();
    expect(await today('u-omar')).toEqual([]);
    expect(await today('u-aisha')).toEqual([]);
  });

  it('Wairimu, the lead of Sales, reads Aisha’s and Miriam’s, as before', async () => {
    const { today } = setup();
    expect(await today('u-wairimu')).toEqual([
      ['Aisha’s review is ready for you to start.', 'It is due on Monday 5 October.'],
      ['Aisha asked for leave from Thursday 1 October to Friday 2 October.', 'It is waiting for you to approve.'],
      ['Aisha sent 3 hours on Naivas for Monday 28 September.', 'They are waiting for you to approve.'],
      ['Miriam asked to spend KES 5,000 on transport to Westgate Deli.', 'It is waiting for you to approve.'],
    ]);
  });

  it('Grace, the admin, reads Lina’s request, which waits for an admin, as before', async () => {
    const { today } = setup();
    expect((await today('u-grace')).filter(([t]) => /spend/.test(String(t)))).toEqual([
      ['Lina asked to spend KES 95,000 on a new laptop.', 'It is waiting for you to approve.'],
    ]);
  });
});
