import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SpendingService, SPEND_REFUSED } from './the-spending.service';
import { spendingSaidBack } from './spend-said-in-chat';

/**
 * SPENDING AND BUDGETS, AS EACH PERSON IS SERVED IT (E7, U.17).
 *
 * Baridi Appliances, 27 September 2026. The admin switched the suite on with KES, "the most a manager
 * may approve on their own" of 20,000, and Grace for anything above it. Fatuma leads Operations and
 * manages Kamau; Wairimu leads Sales and manages Miriam; Grace, an admin, manages Wairimu and Lina.
 * Waiting: Kamau, KES 18,000 for fuel for Kisumu deliveries; Lina, KES 95,000 for a new laptop;
 * Miriam, KES 5,000 for transport to Westgate Deli; Wairimu, KES 3,000 for a team lunch. This month's
 * budgets: Sales 400,000, Operations 250,000 (212,000 already approved) and Product 120,000 (60,000).
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads anything while the suite is off;
 *   - an admin reads every request and budget; a lead only their own team's; a member, a guest and
 *     somebody outside are refused;
 *   - up to the limit the person's lead approves, above it the person the admin named; nobody
 *     approves their own; a decision is made once;
 *   - only an admin sets a budget, for a team in the directory;
 *   - the engine can check a request against the budget before saying it back, and record it once
 *     confirmed; a guest cannot ask;
 *   - no labels on people, and nothing here reaches a check-in or its report.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-27T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-fatuma': 'LEAD', 'u-kamau': 'MEMBER', 'u-lina': 'MEMBER', 'u-miriam': 'MEMBER', 'u-tomas': 'GUEST',
};
const users: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-fatuma': ['Fatuma', 'Hassan'], 'u-kamau': ['Kamau', 'Njenga'],
  'u-lina': ['Lina', 'Mutua'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-tomas': ['Tomas', 'Guest'],
};
const dir = (u: string, department: string | null, manager: string | null) => ({ externalId: `p-${u.slice(2)}`, linkedUserId: u, department, managerExternalId: manager, active: true });
const DIRECTORY = [
  dir('u-grace', null, null), dir('u-wairimu', 'Sales', 'p-grace'), dir('u-fatuma', 'Operations', 'p-grace'),
  dir('u-kamau', 'Operations', 'p-fatuma'), dir('u-lina', 'Product', 'p-grace'), dir('u-miriam', 'Sales', 'p-wairimu'),
];
const SEPT = new Date('2026-09-01T00:00:00Z');

function setup(opts: { on?: boolean } = {}) {
  let n = 0;
  const req = (userId: string, amount: number, what: string, team: string | null, status = 'waiting', createdAt = new Date('2026-09-25T08:00:00Z')) =>
    ({ id: `s-${++n}`, organizationId: ORG, userId, amount, what, team, status, createdAt, decidedById: null, decidedAt: null });
  const requests = [
    req('u-kamau', 18000, 'fuel for Kisumu deliveries', 'Operations'),
    req('u-lina', 95000, 'a new laptop', 'Product'),
    req('u-miriam', 5000, 'transport to Westgate Deli', 'Sales'),
    req('u-wairimu', 3000, 'a team lunch', 'Sales'),
    req('u-fatuma', 212000, 'freezer parts', 'Operations', 'approved'),
    req('u-lina', 60000, 'a data licence', 'Product', 'approved'),
    req('u-kamau', 99000, 'last month’s van hire', 'Operations', 'approved', new Date('2026-08-20T08:00:00Z')),
  ];
  const budgets = [
    { organizationId: ORG, team: 'Sales', month: SEPT, amount: 400000 },
    { organizationId: ORG, team: 'Operations', month: SEPT, amount: 250000 },
    { organizationId: ORG, team: 'Product', month: SEPT, amount: 120000 },
  ];
  const matches = (r: any, w: any): boolean => Object.entries(w).every(([k, v]: [string, any]) => {
    if (k === 'OR') return v.some((x: any) => matches(r, x));
    if (v && typeof v === 'object' && 'gte' in v) return r[k] >= v.gte;
    return r[k] === v;
  });
  const prisma: any = {
    /* The limit of 20,000 and Grace above it are the lowest of the steps by amount, where they are kept (Hafsah's plan of 2 November, step 0). */
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => (
      where.organizationId_suite.organizationId !== ORG ? null
        : where.organizationId_suite.suite === 'spend' ? { isOn: opts.on ?? true, answers: { currency: 'KES' } }
          : where.organizationId_suite.suite === 'spendRules' ? { isOn: false, answers: { thresholds: [{ above: 20000, steps: [[{ named: 'u-grace' }]] }] } } : null)) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: {
      findMany: jest.fn(async () => DIRECTORY),
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => (where.linkedUserId ? p.linkedUserId === where.linkedUserId : p.externalId === where.externalId)) ?? null),
    },
    user: { findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: users[id][0], lastName: users[id][1], email: `${id}@baridi.example` }))) },
    spendRequest: {
      findMany: jest.fn(async ({ where }: any) => requests.filter((r) => matches(r, where))),
      findUnique: jest.fn(async ({ where }: any) => requests.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(requests.find((r) => r.id === where.id)!, data)),
      create: jest.fn(async ({ data }: any) => { const r = req(data.userId, data.amount, data.what, data.team); requests.push(r); return { id: r.id }; }),
    },
    teamBudget: {
      findMany: jest.fn(async ({ where }: any) => budgets.filter((b) => b.month.getTime() === where.month.getTime())),
      findUnique: jest.fn(async ({ where }: any) => {
        const k = where.organizationId_team_month;
        return budgets.find((b) => b.team === k.team && b.month.getTime() === k.month.getTime()) ?? null;
      }),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_team_month;
        const b = budgets.find((x) => x.team === k.team && x.month.getTime() === k.month.getTime());
        if (b) Object.assign(b, update); else budgets.push(create);
      }),
    },
  };
  return { svc: new SpendingService(prisma), as: (userId: string) => ({ userId, organizationId: ORG }), requests, budgets };
}

const LABELS = /\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|score|rating)\b/i;
const byName = (b: any, name: string) => b.waiting.find((w: any) => w.name === name);

describe('while the suite is off', () => {
  it('nobody reads, decides, sets a budget or asks', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'), TODAY)).rejects.toThrow(new NotFoundException(SPEND_REFUSED.notOn));
    await expect(svc.decide(as('u-grace'), 's-2', 'approved')).rejects.toThrow(NotFoundException);
    await expect(svc.setBudget(as('u-grace'), { team: 'Sales', amount: 1 })).rejects.toThrow(NotFoundException);
    await expect(svc.ask(ORG, 'u-kamau', { amount: 10, what: 'tea' })).rejects.toThrow(NotFoundException);
  });
});

describe('who may open the board', () => {
  for (const [who, userId] of [['Miriam, a member', 'u-miriam'], ['a guest', 'u-tomas'], ['somebody outside', 'u-nobody']]) {
    it(`${who} is refused`, async () => {
      const { svc, as } = setup();
      await expect(svc.board(as(userId), TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.onlyAdminsAndLeads));
    });
  }
});

describe('Grace, an admin', () => {
  it('reads every request waiting, with what its team has left and who approves it', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'), TODAY);
    expect(b.currency).toBe('KES');
    expect(b.limit).toBe(20000);
    expect(b.waiting.map((w) => w.name)).toEqual(['Kamau Njenga', 'Lina Mutua', 'Miriam Wanjiku', 'Wairimu Kamau']);
    expect(byName(b, 'Kamau Njenga')).toEqual({
      id: 's-1', name: 'Kamau Njenga', firstName: 'Kamau', amount: 18000, what: 'fuel for Kisumu deliveries', team: 'Operations',
      /* Added by request 162, item 3: the line as the prototype reads it, with the currency. */
      says: 'Kamau: KES 18,000 for fuel for Kisumu deliveries',
      left: 38000, over: false, approver: { kind: 'manager' }, mayDecide: false,
      /* Where it is, in a full sentence (decision 85, build step 4): one step, waiting for his lead. */
      where: 'It is waiting for Fatuma.',
      /* The spending rules (build step 9): none set, so no category and no evidence. */
      category: null, needs: [], attached: null,
      /* Questions about it (build step 9): none asked. */
      questions: [],
    });
    expect(byName(b, 'Lina Mutua')).toMatchObject({ amount: 95000, left: 60000, over: true, approver: { kind: 'person', firstName: 'Grace' }, mayDecide: true });
    /* Wairimu's lead is Grace, an admin, so Grace approves it as her lead. */
    expect(byName(b, 'Wairimu Kamau')).toMatchObject({ approver: { kind: 'manager' }, mayDecide: true });
  });

  it('reads each team’s budget this month against what was approved this month', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'), TODAY);
    expect(b.budgets).toEqual([
      { team: 'Operations', budget: 250000, spent: 212000, left: 38000 },
      { team: 'Product', budget: 120000, spent: 60000, left: 60000 },
      { team: 'Sales', budget: 400000, spent: 0, left: 400000 },
    ]);
    expect(b.teams).toEqual(['Operations', 'Product', 'Sales']);
  });

  it('sets a team’s budget, only for a team in the directory and never below nothing', async () => {
    const { svc, as } = setup();
    const b = await svc.setBudget(as('u-grace'), { team: 'Sales', amount: 450000 }, TODAY);
    expect(b.budgets.find((x) => x.team === 'Sales')).toEqual({ team: 'Sales', budget: 450000, spent: 0, left: 450000 });
    await expect(svc.setBudget(as('u-grace'), { team: 'Marketing', amount: 1 }, TODAY)).rejects.toThrow(new BadRequestException(SPEND_REFUSED.badTeam));
    await expect(svc.setBudget(as('u-grace'), { team: 'Sales', amount: -5 }, TODAY)).rejects.toThrow(new BadRequestException(SPEND_REFUSED.badBudget));
  });

  it('approves what is over the limit, and cannot approve Kamau’s, which is for his lead', async () => {
    const { svc, as, requests } = setup();
    const b = await svc.decide(as('u-grace'), 's-2', 'approved', TODAY);
    expect(b.budgets.find((x) => x.team === 'Product')).toMatchObject({ spent: 155000, left: -35000 });
    expect(requests[1]).toMatchObject({ status: 'approved', decidedById: 'u-grace' });
    await expect(svc.decide(as('u-grace'), 's-2', 'declined', TODAY)).rejects.toThrow(new BadRequestException(SPEND_REFUSED.alreadyDecided));
    await expect(svc.decide(as('u-grace'), 's-1', 'approved', TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.notYours));
  });

  it('never approves her own, even above the limit she approves', async () => {
    const { svc, as } = setup();
    const { id } = await svc.ask(ORG, 'u-grace', { amount: 50000, what: 'a new printer' });
    const b = await svc.board(as('u-grace'), TODAY);
    expect(b.waiting.find((w) => w.id === id)).toBeUndefined();
    await expect(svc.decide(as('u-grace'), id, 'approved', TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.notYours));
  });
});

describe('a lead', () => {
  it('Fatuma reads only Operations, and approves Kamau’s, which then counts against the budget', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-fatuma'), TODAY);
    expect(b.waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Kamau Njenga', true]]);
    expect(b.budgets).toEqual([{ team: 'Operations', budget: 250000, spent: 212000, left: 38000 }]);
    expect(b.teams).toEqual([]);
    const after = await svc.decide(as('u-fatuma'), 's-1', 'approved', TODAY);
    expect(after.waiting).toEqual([]);
    expect(after.budgets).toEqual([{ team: 'Operations', budget: 250000, spent: 230000, left: 20000 }]);
  });

  it('Wairimu reads Miriam’s but not her own, cannot decide Lina’s, and cannot set a budget', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-wairimu'), TODAY);
    expect(b.waiting.map((w) => w.name)).toEqual(['Miriam Wanjiku']);
    expect(b.budgets.map((x) => x.team)).toEqual(['Sales']);
    await expect(svc.decide(as('u-wairimu'), 's-2', 'approved', TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.notYours));
    await expect(svc.decide(as('u-wairimu'), 's-4', 'approved', TODAY)).rejects.toThrow(ForbiddenException);
    await expect(svc.setBudget(as('u-wairimu'), { team: 'Sales', amount: 1 }, TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.onlyAnAdmin));
  });
});

describe('asking, for the engine', () => {
  it('checks a request against the team’s budget before it is said back, then records it once confirmed', async () => {
    const { svc, requests } = setup();
    expect(await svc.check(ORG, 'u-kamau', 18000, TODAY)).toEqual({ currency: 'KES', team: 'Operations', left: 38000, fits: true, approver: 'manager' });
    expect(await svc.check(ORG, 'u-lina', 95000, TODAY)).toMatchObject({ team: 'Product', left: 60000, fits: false, approver: 'person' });
    await svc.ask(ORG, 'u-miriam', { amount: 2500, what: 'printing quotes' });
    expect(requests[requests.length - 1]).toMatchObject({ userId: 'u-miriam', amount: 2500, what: 'printing quotes', team: 'Sales', status: 'waiting' });
  });

  it('refuses a guest, nothing, and a request that does not say what it is for', async () => {
    const { svc } = setup();
    await expect(svc.ask(ORG, 'u-tomas', { amount: 10, what: 'tea' })).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.notInIt));
    await expect(svc.check(ORG, 'u-tomas', 10, TODAY)).rejects.toThrow(ForbiddenException);
    await expect(svc.ask(ORG, 'u-kamau', { amount: 0, what: 'tea' })).rejects.toThrow(new BadRequestException(SPEND_REFUSED.badAmount));
    await expect(svc.ask(ORG, 'u-kamau', { amount: 10, what: '  ' })).rejects.toThrow(new BadRequestException(SPEND_REFUSED.badWhat));
  });
});

describe('what the board never holds', () => {
  it('no label on anybody, and no email address', async () => {
    const { svc, as } = setup();
    const b = JSON.stringify(await svc.board(as('u-grace'), TODAY));
    expect(b).not.toMatch(LABELS);
    expect(b).not.toMatch(/@/);
  });

  it('nothing outside the suites reads a request to spend or a budget, so none reaches a check-in or report', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const faults: string[] = [];
    const walk = (d: string) => {
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        if (statSync(p).isDirectory()) { if (name !== 'suites') walk(p); }
        /* A world a test builds (a-world-for-*.ts) sets up the tables with fakes, and is not product code that could serve them (added 22 November 2026). */
        else if (/\.ts$/.test(name) && !/\.spec\.ts$/.test(name) && !/^a-world-for-/.test(name) && /\b(spendRequest|teamBudget)\b/.test(strip(readFileSync(p, 'utf8')))) faults.push(p);
      }
    };
    walk(join(__dirname, '..'));
    expect(faults).toEqual([]);
    expect(strip(readFileSync(join(__dirname, 'the-spending.service.ts'), 'utf8'))).toMatch(/\bspendRequest\b/);
  });
});

/*
 * WHAT IS ALREADY ASKED FOR COUNTS TOO (found live, 1 October 2026, item 6). Chidi asked to spend
 * KES 30,000 while KES 12,000 of the Sales budget was already asked for and waiting, and read
 * "Sales has KES 38,000 left for October, so that fits." Operations here has KES 38,000 left after
 * what was approved, and Kamau's KES 18,000 is waiting.
 */
describe('the budget left, with what is already asked for and waiting', () => {
  it('the check for the say-back counts the team’s waiting requests, as one total', async () => {
    const { svc } = setup();
    expect(await svc.checkForChat(ORG, 'u-fatuma', 30000, TODAY)).toMatchObject({ team: 'Operations', left: 38000, waiting: 18000 });
  });

  it('Fatuma reads what is free, and that hers is more than that, before the yes', async () => {
    const { svc } = setup();
    const facts = await svc.checkForChat(ORG, 'u-fatuma', 30000, TODAY);
    const said = { amount: 30000, what: 'a stand for the Nairobi show', currency: 'KES' };
    expect(spendingSaidBack(said, facts as any, 'September')).toBe(
      'You asked to spend KES 30,000 on a stand for the Nairobi show. Operations has KES 38,000 left for September, and KES 18,000 of that is already asked for and waiting, so KES 20,000 is free. This is more than that. This is over KES 20,000, so Grace must approve it. Shall I still send it to Grace to approve?');
    const small = await svc.checkForChat(ORG, 'u-fatuma', 5000, TODAY);
    expect(spendingSaidBack({ ...said, amount: 5000, what: 'airtime' }, small as any, 'September')).toContain(
      'Operations has KES 38,000 left for September, and KES 18,000 of that is already asked for and waiting, so KES 20,000 is free. That fits.');
    expect(JSON.stringify(facts)).not.toMatch(/Kamau|fuel for Kisumu/);
  });
});
