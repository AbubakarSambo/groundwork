import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { decidesIt, theStepsFor, whoDecidesNow, whoMayDecide, type ARule, type WhoDecides } from './who-may-decide';
import { LeaveBoardService, LEAVE_REFUSED } from './the-leave-board.service';
import { SpendingService } from './the-spending.service';
import { TimeSheetsService } from './the-time-sheets.service';
import { SuitesService } from './suites.service';
import { WORKFLOWS_REFUSED } from './the-approval-steps';
import { aDecisionDone, aLeaveRequest } from './a-request-in-words';

/**
 * APPROVAL STEPS (decision 85, build step 4), AS EACH READER READS THEM.
 *
 * Baridi Appliances, Monday 28 September 2026. Grace is an admin. Wairimu leads Sales and manages Aisha
 * and Miriam. Kamau leads Operations and manages Otieno. Omar is a member in Finance, and looks after
 * finance. Tomas is a guest.
 *
 * First, the proof that nothing already switched on changes: with no steps set by an admin, every
 * suite's answers give exactly one step, the list they gave before, and for every requester and reader
 * the same people decide. Then the steps an admin can now set: leave, spending and hours go first to
 * the manager and then to finance, and each reader reads where the request is in a full sentence.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-28T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-omar': 'MEMBER', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER', 'u-otieno': 'MEMBER', 'u-tomas': 'GUEST',
};
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'], 'u-omar': ['Omar', 'Abdi'],
  'u-aisha': ['Aisha', 'Otieno'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-otieno': ['Otieno', 'Ouma'], 'u-tomas': ['Tomas', 'Guest'],
};
const READERS = [...Object.keys(roles), 'u-gone'];
const entry = (u: string, department: string | null, manager: string | null) =>
  ({ externalId: `p-${u.slice(2)}`, linkedUserId: u, email: null, displayName: names[u].join(' '), givenName: names[u][0], familyName: names[u][1], department, managerExternalId: manager, active: true, phone: null });
const DIRECTORY = [
  entry('u-grace', null, null), entry('u-wairimu', 'Sales', 'p-grace'), entry('u-kamau', 'Operations', null), entry('u-omar', 'Finance', null),
  entry('u-aisha', 'Sales', 'p-wairimu'), entry('u-miriam', 'Sales', 'p-wairimu'), entry('u-otieno', 'Operations', 'p-kamau'),
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
      if ('not' in v && row[k] === v.not) return false;
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

/** The organisation's rows. `workflows` is what an admin set; leave it out and nothing is set. */
function setup(opts: { workflows?: Record<string, unknown>; duties?: Record<string, unknown>; spend?: Record<string, unknown> } = {}) {
  const leave: any[] = [
    { id: 'l-aisha', organizationId: ORG, userId: 'u-aisha', startsOn: d('2026-10-01'), endsOn: d('2026-10-02'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null, askedAt: d('2026-09-25') },
    { id: 'l-otieno', organizationId: ORG, userId: 'u-otieno', startsOn: d('2026-10-06'), endsOn: d('2026-10-06'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null, askedAt: d('2026-09-25') },
  ];
  const spend: any[] = [
    { id: 's-aisha', organizationId: ORG, userId: 'u-aisha', amount: 12000, what: 'fuel', team: 'Sales', status: 'waiting', decidedById: null, createdAt: d('2026-09-25') },
  ];
  const hours: any[] = [
    { organizationId: ORG, userId: 'u-aisha', client: 'Naivas', onDay: d('2026-09-28'), minutes: 180, createdAt: d('2026-09-28') },
  ];
  const weeks: any[] = [];
  const suites: Record<string, any> = {
    leave: { isOn: true, answers: { days: 21, approver: 'Their manager' } },
    time: { isOn: true, answers: { clients: ['Naivas', 'Lakeside'], approver: 'Their manager' } },
    spend: { isOn: true, answers: opts.spend ?? { currency: 'KES', limit: 20000, above: 'u-grace' } },
    ...(opts.duties ? { duties: { isOn: false, answers: opts.duties } } : {}),
    ...(opts.workflows ? { workflows: { isOn: false, answers: opts.workflows } } : {}),
  };
  const users = Object.keys(names).map((id) => ({ id, email: null, firstName: names[id][0], lastName: names[id][1], phoneNumber: null, deletedAt: null }));
  const store = (rows: any[]) => ({
    findMany: jest.fn(async ({ where }: any = {}) => rows.filter((r) => matches(r, where))),
    findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
    update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
    create: jest.fn(async ({ data }: any) => { const r = { id: `new-${rows.length}`, status: 'waiting', createdAt: TODAY, askedAt: TODAY, ...data }; rows.push(r); return { id: r.id }; }),
  });
  const prisma: any = {
    organizationSuite: {
      findUnique: jest.fn(async ({ where }: any) => suites[where.organizationId_suite.suite] ?? null),
      findMany: jest.fn(async ({ where }: any = {}) => Object.entries(suites).filter(([suite]) => !where?.suite || where.suite === suite).map(([suite, r]) => ({ organizationId: ORG, suite, ...r }))),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_suite.suite;
        suites[k] = suites[k] ? { ...suites[k], ...update } : create;
        return suites[k];
      }),
    },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)),
      findMany: jest.fn(async ({ where }: any) => Object.keys(roles).filter((u) => (where.role === 'ADMIN' ? roles[u] === 'ADMIN' : roles[u] !== 'GUEST'))
        .map((u) => ({ userId: u, user: { firstName: names[u][0], lastName: names[u][1] } }))),
    },
    person: {
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => matches(p, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => DIRECTORY.filter((p) => matches(p, where))),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => users.filter((u) => matches(u, where))),
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.id === where.id) ?? null),
    },
    leaveRequest: store(leave),
    spendRequest: store(spend),
    teamBudget: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    timeEntry: { findMany: jest.fn(async ({ where }: any) => hours.filter((h) => matches(h, where))) },
    timeWeek: {
      findMany: jest.fn(async ({ where }: any) => weeks.filter((w) => matches(w, where))),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_userId_weekOf;
        const found = weeks.find((w) => w.userId === k.userId && w.weekOf.getTime() === k.weekOf.getTime());
        if (found) return Object.assign(found, update);
        weeks.push(create);
        return create;
      }),
    },
    timeAgreement: { findMany: jest.fn(async () => []) },
  };
  const told = {
    waiting: jest.fn(async () => undefined),
    decided: jest.fn(async () => true),
    approversOf: jest.fn(async (_org: string, who: any, person: string) => ('userId' in who ? [who.userId] : Object.keys(roles).filter((u) => roles[u] === 'ADMIN' && u !== person))),
    firstNameOf: jest.fn(async (u: string) => names[u]?.[0] ?? ''),
  };
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return {
    prisma, told, as, leaveRows: leave, spendRows: spend, weeks,
    leave: new LeaveBoardService(prisma, told as any), spending: new SpendingService(prisma, told as any), time: new TimeSheetsService(prisma, told as any), suites: new SuitesService(prisma),
  };
}

const MANAGER_THEN_FINANCE = { steps: [['manager', 'admin'], ['finance', 'admin']] };
const OMAR_IN_FINANCE = { finance: 'u-omar' };

/* ------------------------------ BEFORE: theStepsFor as it was on 3 October ------------------------------ */

function BEFORE_theStepsFor(suite: 'leave' | 'time' | 'reviews' | 'spend', answers?: any, amount?: number): ARule[] {
  if (suite === 'reviews') return answers?.writer === 'Their manager' ? ['manager', 'admin'] : ['admin'];
  if (suite === 'spend' && answers?.limit != null && Number(amount ?? 0) > answers.limit) {
    return ['budgetOwner', 'finance', ...(answers.above ? [{ named: answers.above as string }] : []), 'admin'];
  }
  return ['manager', 'admin'];
}

async function BEFORE_theOneWhoDecides(prisma: any, steps: ARule[], request: any): Promise<WhoDecides> {
  for (const step of steps) {
    const who = await whoMayDecide(prisma, step, request);
    if (who) return who;
  }
  return { kind: 'admin', rule: 'admin' };
}

const said = (set: string[]) => (set.length ? set.join(', ') : 'nobody');
/** Rows of [suite, answers, requester, who may decide before, who may decide after]. Printed for the report with PRINT_TABLE=1. */
const TABLE: string[][] = [];
afterAll(() => {
  if (process.env.PRINT_TABLE) console.log(TABLE.map((r) => `| ${r.join(' | ')} |`).join('\n'));
});

describe('nothing already switched on changes: today’s answers are one step each, deciding exactly as before', () => {
  const CASES: [string, 'leave' | 'time' | 'reviews' | 'spend', any, number][] = [
    ['leave, "Their manager"', 'leave', { approver: 'Their manager' }, 0],
    ['leave, "An admin"', 'leave', { approver: 'An admin' }, 0],
    ['time sheets, no answer', 'time', {}, 0],
    ['reviews, "Their manager"', 'reviews', { writer: 'Their manager' }, 0],
    ['reviews, "An admin"', 'reviews', { writer: 'An admin' }, 0],
    ['spending up to the limit', 'spend', { limit: 20000, above: 'u-omar' }, 5000],
    ['spending above the limit, Omar named', 'spend', { limit: 20000, above: 'u-omar' }, 95000],
    ['spending above the limit, nobody named', 'spend', { limit: 20000, above: null }, 95000],
    ['spending with no limit', 'spend', { limit: null, above: null }, 95000],
  ];
  for (const [label, suite, answers, amount] of CASES) {
    for (const duties of [undefined, { finance: 'u-omar', budgetOwners: { Sales: 'u-kamau' } }]) {
      it(`${label}${duties ? ', with finance and the Sales budget held' : ''}`, async () => {
        const { prisma } = setup({ duties });
        const steps = (theStepsFor as any)(suite, answers, amount);
        expect(steps).toEqual([BEFORE_theStepsFor(suite, answers, amount)]);
        for (const requester of ['u-aisha', 'u-miriam', 'u-otieno', 'u-wairimu', 'u-omar']) {
          const request = { organizationId: ORG, requesterUserId: requester };
          const before = await BEFORE_theOneWhoDecides(prisma, BEFORE_theStepsFor(suite, answers, amount), request);
          /* A request kept before steps existed has no step at all; a new one is on step one. */
          for (const where of [{}, { step: null, escalatedTo: null }, { step: 0, escalatedTo: 0 }]) {
            const now = await whoDecidesNow(prisma, steps, request, where);
            expect(now.who).toEqual(before);
            expect(now.last).toBe(true);
          }
          const now = await whoDecidesNow(prisma, steps, request);
          const b = READERS.filter((u) => decidesIt(before, { userId: u, role: roles[u] ?? null }, requester));
          const a = READERS.filter((u) => decidesIt(now.who, { userId: u, role: roles[u] ?? null }, requester));
          expect([requester, a]).toEqual([requester, b]);
          TABLE.push([label + (duties ? ', duties held' : ''), requester.slice(2), said(b.map((u) => u.slice(2))), said(a.map((u) => u.slice(2)))]);
        }
      });
    }
  }

  it('one approval still ends a leave request, and Aisha is told, exactly as before', async () => {
    const { leave, as, leaveRows, told } = setup();
    await leave.decide(as('u-wairimu'), 'l-aisha', 'approved');
    expect(leaveRows[0]).toMatchObject({ status: 'approved', decidedById: 'u-wairimu', approvedByIds: ['u-wairimu'] });
    expect(leaveRows[0].step ?? 0).toBe(0);
    expect(told.decided).toHaveBeenCalledTimes(1);
    expect(told.waiting).not.toHaveBeenCalled();
  });

  it('one approval still ends a request to spend, and one approval still approves a week of hours', async () => {
    const { spending, time, as, spendRows, weeks, told } = setup();
    await spending.decide(as('u-wairimu'), 's-aisha', 'approved', TODAY);
    expect(spendRows[0]).toMatchObject({ status: 'approved', decidedById: 'u-wairimu' });
    await time.approve(as('u-wairimu'), 'u-aisha', '2026-09-28', TODAY);
    expect(weeks[0]).toMatchObject({ approvedMinutes: 180, approvedById: 'u-wairimu' });
    expect((await time.mine(as('u-aisha'), TODAY)).weeks[0].approved).toBe(true);
    expect(told.decided).toHaveBeenCalledTimes(2);
    expect(told.waiting).not.toHaveBeenCalled();
  });

  it('with nothing set, the reader reads one step in a full sentence: Aisha’s leave waits for Wairimu', async () => {
    const { leave, as } = setup();
    expect((await leave.mine(as('u-aisha'), TODAY)).requests.find((r) => r.id === 'l-aisha')!.where)
      .toBe('Your leave from Thursday 1 October to Friday 2 October is waiting for Wairimu.');
  });
});

describe('leave, first Wairimu as Aisha’s manager, then Omar in finance', () => {
  const opts = { workflows: { leave: MANAGER_THEN_FINANCE }, duties: OMAR_IN_FINANCE };

  it('before anybody decides: Wairimu reads that it waits for her, Omar reads nothing yet, and Aisha reads that it waits for Wairimu', async () => {
    const { leave, as } = setup(opts);
    const w = (await leave.board(as('u-wairimu'), TODAY)).waiting.find((x) => x.id === 'l-aisha')!;
    expect([w.mayDecide, w.where]).toEqual([true, 'It is waiting for you.']);
    const omar = await leave.board(as('u-omar'), TODAY);
    expect([omar.reader, omar.waiting]).toEqual(['approver', []]);
    expect((await leave.mine(as('u-aisha'), TODAY)).requests[0].where).toBe('Your leave from Thursday 1 October to Friday 2 October is waiting for Wairimu.');
  });

  it('Wairimu approves: it moves to Omar, Omar is told, and Aisha is not told yet because nothing is decided', async () => {
    const { leave, as, leaveRows, told } = setup(opts);
    await leave.decide(as('u-wairimu'), 'l-aisha', 'approved');
    expect(leaveRows[0]).toMatchObject({ status: 'waiting', step: 1, escalatedTo: 0, approvedByIds: ['u-wairimu'] });
    expect(told.waiting).toHaveBeenCalledWith(ORG, ['u-omar'], aLeaveRequest('l-aisha', 'u-aisha', 'Aisha', '2026-10-01', '2026-10-02'));
    expect(told.decided).not.toHaveBeenCalled();
    expect(await leave.nowWaitingFor(ORG, 'l-aisha')).toBe('Omar in finance');
  });

  it('then each reader reads where it is, in a full sentence', async () => {
    const { leave, as } = setup(opts);
    await leave.decide(as('u-wairimu'), 'l-aisha', 'approved');
    /* Aisha, who asked: */
    expect((await leave.mine(as('u-aisha'), TODAY)).requests[0].where)
      .toBe('Your leave from Thursday 1 October to Friday 2 October is approved by Wairimu and is now waiting for Omar in finance.');
    /* Omar, in finance, who decides it now: */
    const o = (await leave.board(as('u-omar'), TODAY)).waiting;
    expect(o.map((x) => [x.name, x.mayDecide, x.where])).toEqual([['Aisha Otieno', true, 'Wairimu has approved it, and it is now waiting for you.']]);
    /* Wairimu, who leads Sales and approved it: */
    const w = (await leave.board(as('u-wairimu'), TODAY)).waiting.find((x) => x.id === 'l-aisha')!;
    expect([w.mayDecide, w.where]).toEqual([false, 'You have approved it, and it is now waiting for Omar in finance.']);
    /* Grace, an admin: */
    const g = (await leave.board(as('u-grace'), TODAY)).waiting.find((x) => x.id === 'l-aisha')!;
    expect([g.mayDecide, g.where]).toEqual([false, 'Wairimu has approved it, and it is now waiting for Omar in finance.']);
    /* Wairimu cannot decide it a second time. */
    await expect(leave.decide(as('u-wairimu'), 'l-aisha', 'approved')).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.notYours));
  });

  it('Omar approves the last step: it is approved, and Aisha is told and reads both names', async () => {
    const { leave, as, leaveRows, told } = setup(opts);
    await leave.decide(as('u-wairimu'), 'l-aisha', 'approved');
    await leave.decide(as('u-omar'), 'l-aisha', 'approved');
    expect(leaveRows[0]).toMatchObject({ status: 'approved', decidedById: 'u-omar', approvedByIds: ['u-wairimu', 'u-omar'] });
    expect(told.decided).toHaveBeenCalledTimes(1);
    expect((await leave.mine(as('u-aisha'), TODAY)).requests[0].where).toBe('Your leave from Thursday 1 October to Friday 2 October is approved by Wairimu and Omar.');
    await expect(leave.decide(as('u-omar'), 'l-aisha', 'approved')).rejects.toThrow(new BadRequestException(LEAVE_REFUSED.alreadyDecided));
    expect(await leave.nowWaitingFor(ORG, 'l-aisha')).toBeNull();
  });

  it('a decline ends it at the first step, and Aisha reads who declined it', async () => {
    const { leave, as, leaveRows, told } = setup(opts);
    await leave.decide(as('u-wairimu'), 'l-aisha', 'declined');
    expect(leaveRows[0]).toMatchObject({ status: 'declined', decidedById: 'u-wairimu' });
    expect(told.waiting).not.toHaveBeenCalled();
    expect((await leave.mine(as('u-aisha'), TODAY)).requests[0].where).toBe('Wairimu declined your leave from Thursday 1 October to Friday 2 October.');
  });

  it('Wairimu, approving by a reply in Ask Groundwork or on WhatsApp, is told who it goes to next', () => {
    expect(aDecisionDone(aLeaveRequest('l-aisha', null, 'Aisha', '2026-10-01', '2026-10-02'), 'approved', 'Omar in finance'))
      .toBe('You approved Aisha\'s leave from Thursday 1 October to Friday 2 October. It now waits for Omar in finance.');
    expect(aDecisionDone(aLeaveRequest('l-aisha', null, 'Aisha', '2026-10-01', '2026-10-02'), 'approved', null))
      .toBe('Aisha\'s leave from Thursday 1 October to Friday 2 October is approved now. I have let Aisha know.');
  });

  it('a colleague and a guest still read nothing of it', async () => {
    const { leave, as } = setup(opts);
    await leave.decide(as('u-wairimu'), 'l-aisha', 'approved');
    await expect(leave.board(as('u-miriam'), TODAY)).rejects.toThrow(ForbiddenException);
    await expect(leave.board(as('u-tomas'), TODAY)).rejects.toThrow(ForbiddenException);
    expect((await leave.mine(as('u-miriam'), TODAY)).requests).toEqual([]);
  });
});

describe('spending and hours, first the manager, then Omar in finance', () => {
  const opts = { workflows: { spend: MANAGER_THEN_FINANCE, time: MANAGER_THEN_FINANCE }, duties: OMAR_IN_FINANCE };

  it('spending: Wairimu approves, Omar reads that it waits for him, and Aisha reads where her request is', async () => {
    const { spending, as, spendRows, told } = setup(opts);
    expect((await spending.mine(as('u-aisha'))).requests[0].where).toBe('Your request to spend KES 12,000 for fuel is waiting for Wairimu.');
    await spending.decide(as('u-wairimu'), 's-aisha', 'approved', TODAY);
    expect(spendRows[0]).toMatchObject({ status: 'waiting', step: 1, approvedByIds: ['u-wairimu'] });
    expect(told.waiting).toHaveBeenCalledWith(ORG, ['u-omar'], expect.objectContaining({ kind: 'spend', ref: 's-aisha' }));
    const o = await spending.board(as('u-omar'), TODAY);
    expect(o.waiting.map((w) => [w.name, w.mayDecide, w.where])).toEqual([['Aisha Otieno', true, 'Wairimu has approved it, and it is now waiting for you.']]);
    expect((await spending.mine(as('u-aisha'))).requests[0].where).toBe('Your request to spend KES 12,000 for fuel is approved by Wairimu and is now waiting for Omar in finance.');
    await spending.decide(as('u-omar'), 's-aisha', 'approved', TODAY);
    expect((await spending.mine(as('u-aisha'))).requests[0].where).toBe('Your request to spend KES 12,000 for fuel is approved by Wairimu and Omar.');
    /* Nobody else reads Aisha's own list. */
    expect((await spending.mine(as('u-miriam'))).requests).toEqual([]);
  });

  it('hours: Wairimu approves the week, it is not approved yet, and Omar reads that it waits for him', async () => {
    const { time, as, weeks, told } = setup(opts);
    await time.approve(as('u-wairimu'), 'u-aisha', '2026-09-28', TODAY);
    expect(weeks[0]).toMatchObject({ approvedMinutes: null, seenMinutes: 180, step: 1, approvedByIds: ['u-wairimu'] });
    expect(told.waiting).toHaveBeenCalledWith(ORG, ['u-omar'], expect.objectContaining({ kind: 'hours', ref: 'u-aisha|2026-09-28' }));
    expect(told.decided).not.toHaveBeenCalled();
    const mine = (await time.mine(as('u-aisha'), TODAY)).weeks[0];
    expect([mine.approved, mine.where]).toEqual([false, 'Your hours for the week of Monday 28 September are approved by Wairimu and are now waiting for Omar in finance.']);
    const o = (await time.board(as('u-omar'), TODAY)).weeks.flatMap((w) => w.people);
    expect(o.map((p) => [p.name, p.mayApprove, p.approved, p.where])).toEqual([['Aisha Otieno', true, false, 'Wairimu has approved these hours, and they are now waiting for you.']]);
    await time.approve(as('u-omar'), 'u-aisha', '2026-09-28', TODAY);
    const done = (await time.mine(as('u-aisha'), TODAY)).weeks[0];
    expect([done.approved, done.where]).toEqual([true, 'Your hours for the week of Monday 28 September are approved by Wairimu and Omar.']);
    expect(told.decided).toHaveBeenCalledTimes(1);
  });
});

describe('the admin sets the steps, and nobody else can', () => {
  it('Grace sets leave to go to the manager and then HR, with two working days before it is passed on, and reads it back in full sentences', async () => {
    const { suites, as } = setup();
    const before = await suites.workflows(as('u-grace'));
    expect(before.suites.find((s) => s.key === 'leave')).toMatchObject({
      set: false, steps: [['manager', 'admin']], escalateAfter: null,
      said: [
        'A leave request goes to the person’s manager, or else an admin.',
        'Groundwork never passes leave requests on by itself. An admin can set a number of working days after which it does.',
      ],
    });
    expect(before.suites.find((s) => s.key === 'spend')!.said[1])
      .toBe('A request to spend above it goes to whoever holds their team’s budget, or else whoever looks after finance, or else the person named on the suite, or else an admin.');
    const after = await suites.setWorkflows(as('u-grace'), { leave: { steps: [['manager', 'departmentHead', 'admin'], ['hr', 'admin']], escalateAfter: 2 } });
    expect(after.suites.find((s) => s.key === 'leave')).toMatchObject({
      set: true, steps: [['manager', 'departmentHead', 'admin'], ['hr', 'admin']], escalateAfter: 2,
      said: [
        'A leave request goes first to the person’s manager, or else whoever heads their team, or else an admin, and then to whoever looks after HR, or else an admin.',
        'Each approval sends it to the next step, and only the last step ends it. A decline ends it at any step.',
        'If the person it waits for has not answered after 2 working days, or is on approved leave that day, it goes to the next person on that step’s list.',
      ],
    });
    /* Cleared back to how it always ran. */
    const cleared = await suites.setWorkflows(as('u-grace'), { leave: null });
    expect(cleared.suites.find((s) => s.key === 'leave')).toMatchObject({ set: false, steps: [['manager', 'admin']], escalateAfter: null });
  });

  it('a step that names a person, an unknown rule, or a wrong number of days is refused in a plain sentence', async () => {
    const { suites, as } = setup();
    await expect(suites.setWorkflows(as('u-grace'), { leave: { steps: [[{ named: 'u-omar' }]] } })).rejects.toThrow(new BadRequestException(WORKFLOWS_REFUSED.badSteps));
    await expect(suites.setWorkflows(as('u-grace'), { leave: { steps: [['boss']] } })).rejects.toThrow(new BadRequestException(WORKFLOWS_REFUSED.badSteps));
    await expect(suites.setWorkflows(as('u-grace'), { time: { escalateAfter: 0 } })).rejects.toThrow(new BadRequestException(WORKFLOWS_REFUSED.badDays));
    await expect(suites.setWorkflows(as('u-grace'), { leave: { stepsAbove: [['finance']] } })).rejects.toThrow(new BadRequestException(WORKFLOWS_REFUSED.notForThisSuite));
  });

  it('a lead, a member and a guest can neither read nor set the steps', async () => {
    const { suites, as } = setup();
    for (const u of ['u-wairimu', 'u-omar', 'u-tomas']) {
      await expect(suites.workflows(as(u))).rejects.toThrow(new ForbiddenException(WORKFLOWS_REFUSED.onlyAnAdmin));
      await expect(suites.setWorkflows(as(u), { leave: { escalateAfter: 2 } })).rejects.toThrow(new ForbiddenException(WORKFLOWS_REFUSED.onlyAnAdmin));
    }
  });

  it('switching the leave suite on again keeps the steps, because they are kept apart from its answers', async () => {
    const { suites, leave, as } = setup({ workflows: { leave: MANAGER_THEN_FINANCE }, duties: OMAR_IN_FINANCE });
    await suites.switch(as('u-grace'), 'leave', { on: true, answers: { days: 21, approver: 'Their manager' } });
    await leave.decide(as('u-wairimu'), 'l-aisha', 'approved');
    expect(await leave.nowWaitingFor(ORG, 'l-aisha')).toBe('Omar in finance');
  });
});
