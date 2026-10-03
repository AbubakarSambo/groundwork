import { ARequestWaitsTooLongCron } from './a-request-waits-too-long.cron';
import { workingDaysSince } from './a-request-waits-too-long';
import { LeaveBoardService } from './the-leave-board.service';
import { SpendingService } from './the-spending.service';
import { TimeSheetsService } from './the-time-sheets.service';
import { SuitesService } from './suites.service';

/**
 * A REQUEST THAT WAITS TOO LONG IS PASSED ON (decision 85, build step 4), AS EACH READER READS IT.
 *
 * Baridi Appliances. Grace is an admin. Wairimu leads Sales and manages Aisha. Omar is a member in
 * Finance who heads Sales for this test. Aisha asked for leave, to spend, and sent hours on Monday 28
 * September 2026.
 *
 * Grace sets leave, spending and hours to go to the person's manager, or else the head of their team,
 * or else an admin, and to be passed on after two working days without an answer, or at once when the
 * approver is on approved leave. Until she sets the days, nothing is ever passed on.
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


const MON = new Date('2026-09-28T09:00:00Z');
const TUE = new Date('2026-09-29T09:00:00Z');
const WED = new Date('2026-09-30T09:00:00Z');
const FRI = new Date('2026-10-02T09:00:00Z');
const PASSED_ON = { steps: [['manager', 'departmentHead', 'admin']], escalateAfter: 2 };
const OMAR_HEADS_SALES = { departmentHeads: { Sales: 'u-omar' } };

function withTheCron(s: ReturnType<typeof setup>) {
  return new ARequestWaitsTooLongCron(s.prisma, s.leave, s.spending, s.time);
}
/* Everything waiting was asked on Monday: Aisha's leave and Otieno's in Operations, Aisha's request to spend and her hours. */
function askedOnMonday(s: ReturnType<typeof setup>) {
  for (const r of s.leaveRows) r.askedAt = MON;
  s.spendRows[0].createdAt = MON;
}

describe('working days', () => {
  it('waiting since Monday is one working day on Tuesday and two on Wednesday; a weekend does not count', () => {
    expect(workingDaysSince(MON, TUE)).toBe(1);
    expect(workingDaysSince(MON, WED)).toBe(2);
    expect(workingDaysSince(new Date('2026-09-25T15:00:00Z'), MON)).toBe(1);
  });
});

describe('with no days set by an admin, nothing is ever passed on', () => {
  it('not after a week, and not when Wairimu is on leave', async () => {
    const s = setup({ workflows: { leave: { steps: PASSED_ON.steps } }, duties: OMAR_HEADS_SALES });
    askedOnMonday(s);
    s.leaveRows.push({ id: 'l-wairimu', organizationId: ORG, userId: 'u-wairimu', startsOn: new Date('2026-10-01T00:00:00Z'), endsOn: new Date('2026-10-02T00:00:00Z'), kind: 'annual', standInUserId: null, status: 'approved', decidedById: 'u-grace', decidedAt: null });
    expect(await withTheCron(s).passOnNow(FRI)).toEqual({ passedOn: 0 });
    expect(s.told.waiting).not.toHaveBeenCalled();
    expect((await s.leave.mine(s.as('u-aisha'), FRI)).requests[0].where).toBe('Your leave from Thursday 1 October to Friday 2 October is waiting for Wairimu.');
  });

  it('and with no workflow at all, the cron reads nothing else', async () => {
    const s = setup();
    expect(await withTheCron(s).passOnNow(FRI)).toEqual({ passedOn: 0 });
    expect(s.prisma.leaveRequest.findMany).not.toHaveBeenCalled();
  });
});

describe('after two working days without an answer, it goes to Omar, who heads Sales', () => {
  const opts = { workflows: { leave: PASSED_ON, spend: PASSED_ON, time: PASSED_ON }, duties: OMAR_HEADS_SALES };

  it('on Tuesday, one working day, nothing moves', async () => {
    const s = setup(opts);
    askedOnMonday(s);
    expect(await withTheCron(s).passOnNow(TUE)).toEqual({ passedOn: 0 });
    expect(s.told.waiting).not.toHaveBeenCalled();
  });

  it('on Wednesday, Aisha’s leave, her request to spend and her hours move to Omar, and Omar is told each', async () => {
    const s = setup(opts);
    askedOnMonday(s);
    /* Four: Aisha's three, and Otieno's leave, which goes from Kamau to an admin because nobody heads Operations. */
    expect(await withTheCron(s).passOnNow(WED)).toEqual({ passedOn: 4 });
    expect(s.leaveRows[0]).toMatchObject({ status: 'waiting', escalatedTo: 1, stepSince: WED });
    expect(s.told.waiting).toHaveBeenCalledWith(ORG, ['u-omar'], expect.objectContaining({ kind: 'leave', ref: 'l-aisha' }));
    expect(s.told.waiting).toHaveBeenCalledWith(ORG, ['u-omar'], expect.objectContaining({ kind: 'spend', ref: 's-aisha' }));
    expect(s.told.waiting).toHaveBeenCalledWith(ORG, ['u-omar'], expect.objectContaining({ kind: 'hours', ref: 'u-aisha|2026-09-28' }));
    expect(s.told.waiting).toHaveBeenCalledWith(ORG, ['u-grace'], expect.objectContaining({ kind: 'leave', ref: 'l-otieno' }));
  });

  it('then each reader reads who it waits for now, and only Omar may decide it', async () => {
    const s = setup(opts);
    askedOnMonday(s);
    await withTheCron(s).passOnNow(WED);
    /* Aisha, who asked: */
    expect((await s.leave.mine(s.as('u-aisha'), WED)).requests[0].where).toBe('Your leave from Thursday 1 October to Friday 2 October is waiting for Omar, who heads Sales.');
    expect((await s.spending.mine(s.as('u-aisha'))).requests[0].where).toBe('Your request to spend KES 12,000 for fuel is waiting for Omar, who heads Sales.');
    expect((await s.time.mine(s.as('u-aisha'), WED)).weeks[0].where).toBe('Your hours for the week of Monday 28 September are waiting for Omar, who heads Sales.');
    /* Omar: */
    const o = (await s.leave.board(s.as('u-omar'), WED)).waiting;
    expect(o.map((w) => [w.name, w.mayDecide, w.where])).toEqual([['Aisha Otieno', true, 'It is waiting for you.']]);
    /* Wairimu, who leads Sales, still reads it, and can no longer decide it: */
    const w = (await s.leave.board(s.as('u-wairimu'), WED)).waiting.find((x) => x.id === 'l-aisha')!;
    expect([w.mayDecide, w.where]).toEqual([false, 'It is waiting for Omar, who heads Sales.']);
    await expect(s.leave.decide(s.as('u-wairimu'), 'l-aisha', 'approved')).rejects.toThrow();
    /* Omar decides it, and Aisha is told. */
    await s.leave.decide(s.as('u-omar'), 'l-aisha', 'approved');
    expect(s.leaveRows[0]).toMatchObject({ status: 'approved', decidedById: 'u-omar' });
    expect(s.told.decided).toHaveBeenCalledTimes(1);
  });

  it('two working days later with no answer from Omar, it goes on to an admin, and stops there', async () => {
    const s = setup(opts);
    askedOnMonday(s);
    await withTheCron(s).passOnNow(WED);
    expect(await withTheCron(s).passOnNow(FRI)).toEqual({ passedOn: 3 });
    expect((await s.leave.mine(s.as('u-aisha'), FRI)).requests[0].where).toBe('Your leave from Thursday 1 October to Friday 2 October is waiting for an admin.');
    const g = (await s.leave.board(s.as('u-grace'), FRI)).waiting.find((x) => x.id === 'l-aisha')!;
    expect([g.mayDecide, g.where]).toEqual([true, 'It is waiting for you.']);
    expect(await withTheCron(s).passOnNow(new Date('2026-10-09T09:00:00Z'))).toEqual({ passedOn: 0 });
  });
});

describe('when the approver is on approved leave that day, it moves at once', () => {
  it('Wairimu is off on Tuesday, so Aisha’s leave, asked on Monday, goes to Omar on Tuesday', async () => {
    const s = setup({ workflows: { leave: PASSED_ON }, duties: OMAR_HEADS_SALES });
    askedOnMonday(s);
    s.leaveRows.push({ id: 'l-wairimu', organizationId: ORG, userId: 'u-wairimu', startsOn: new Date('2026-09-29T00:00:00Z'), endsOn: new Date('2026-09-29T00:00:00Z'), kind: 'annual', standInUserId: null, status: 'approved', decidedById: 'u-grace', decidedAt: null });
    expect(await withTheCron(s).passOnNow(TUE)).toEqual({ passedOn: 1 });
    expect((await s.leave.mine(s.as('u-aisha'), TUE)).requests.find((r) => r.id === 'l-aisha')!.where)
      .toBe('Your leave from Thursday 1 October to Friday 2 October is waiting for Omar, who heads Sales.');
  });
});

describe('once a day across every copy of the API', () => {
  it('the second copy to run on the same day does nothing, so nobody is told twice', async () => {
    const s = setup({ workflows: { leave: PASSED_ON }, duties: OMAR_HEADS_SALES });
    askedOnMonday(s);
    let claimed = false;
    s.prisma.$executeRaw = jest.fn(async () => { if (claimed) return 0; claimed = true; return 1; });
    const cron = withTheCron(s);
    expect(await cron.passOnTheRequestsThatWaitTooLong(WED)).toEqual({ passedOn: 2 });
    expect(await cron.passOnTheRequestsThatWaitTooLong(WED)).toEqual({ passedOn: 0 });
    expect(s.told.waiting).toHaveBeenCalledTimes(2);
  });
});
