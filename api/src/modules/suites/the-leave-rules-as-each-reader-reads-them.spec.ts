import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LeaveBoardService } from './the-leave-board.service';
import { SuitesService } from './suites.service';
import { sayBackLeave, sendLeave } from './leave-said-in-chat';
import { LEAVE_RULES_REFUSED, LEAVE_RULES_ROW } from './the-leave-rules';
import { aRequestsHistory } from './a-request-is-recorded';

// These suites are written as of 2026-10-05. The services under test read the real clock, so freeze the
// date (and only the date: timers stay real) or the "more than a month ago" checks start failing
// the day the calendar moves on.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-10-05T09:00:00Z'),
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'performance', 'hrtime'],
  });
});
afterAll(() => jest.useRealTimers());

/**
 * THE LEAVE RULES (decision 85, item 1; build step 8), AS EACH PERSON IS SERVED THEM.
 *
 * Baridi Appliances, Monday 5 October 2026. Each person has 21 days a year; the manager approves.
 * Grace is an admin. Wairimu leads Sales and manages Aisha, Neema and Miriam. Kamau leads Operations.
 * Joy, a member in Operations, looks after HR. Aisha has been here since 2025. Neema joined on
 * 1 September 2026, 34 days ago.
 *
 * Grace sets: annual leave, 21 days a year, two weeks' notice; sick leave, no set number, a sick note
 * after two working days; compassionate leave, 5 days a year; nobody takes leave from Monday 14 to
 * Friday 18 December, because of the year-end stock count; leave after the first 90 days; HR told of
 * each approved request.
 *
 * And first, the before and after: with nothing set, every reader reads exactly what they read
 * before this change.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-10-05T09:00:00Z');
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-aisha': 'MEMBER', 'u-neema': 'MEMBER', 'u-miriam': 'MEMBER', 'u-joy': 'MEMBER' };
const joined: Record<string, string> = { 'u-neema': '2026-09-01' };
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'], 'u-aisha': ['Aisha', 'Otieno'],
  'u-neema': ['Neema', 'Wafula'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-joy': ['Joy', 'Mutua'],
};
const person = (u: string, department: string, manager: string | null) => ({
  linkedUserId: u, externalId: `p-${u.slice(2)}`, department, managerExternalId: manager, active: true, email: null,
  givenName: names[u][0], displayName: names[u].join(' '), createdAt: d(joined[u] ?? '2025-01-06'),
});
const directory = [
  person('u-grace', 'Finance', null), person('u-wairimu', 'Sales', null), person('u-kamau', 'Operations', null),
  person('u-aisha', 'Sales', 'p-wairimu'), person('u-neema', 'Sales', 'p-wairimu'), person('u-miriam', 'Sales', 'p-wairimu'),
  person('u-joy', 'Operations', 'p-kamau'),
];

/** Equality, `in`, `not`, and the date comparisons the reads use. */
function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (v === undefined) return true;
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('in' in v) return v.in.includes(row[k]);
      if ('not' in v) return row[k] !== v.not;
      return (v.lte === undefined || row[k] <= v.lte) && (v.gte === undefined || row[k] >= v.gte) && (v.lt === undefined || row[k] < v.lt);
    }
    return row[k] === v;
  });
}

const RULES = {
  kinds: [
    { name: 'Annual leave', days: 21, noticeDays: 14 },
    { name: 'Sick leave', days: null, document: 'a sick note', documentAfterDays: 2 },
    { name: 'Compassionate', days: 5 },
  ],
  blackouts: [{ from: '2026-12-14', to: '2026-12-18', why: 'the year-end stock count' }],
  eligibleAfterDays: 90,
  tellHr: 'approved',
};

function setup(opts: { rules?: unknown; hr?: string | null } = {}) {
  const suites: Record<string, any> = {
    leave: { isOn: true, answers: { days: 21, approver: 'Their manager' } },
    duties: { isOn: false, answers: opts.hr === null ? {} : { hr: opts.hr ?? 'u-joy' } },
  };
  if (opts.rules !== undefined) suites[LEAVE_RULES_ROW] = { isOn: false, answers: opts.rules };
  const rows: any[] = [
    { id: 'r-miriam-oct', organizationId: ORG, userId: 'u-miriam', startsOn: d('2026-10-09'), endsOn: d('2026-10-09'), kind: 'annual', standInUserId: null, status: 'approved', decidedById: 'u-wairimu', decidedAt: d('2026-10-01'), askedAt: d('2026-09-20') },
  ];
  const events: any[] = [];
  const changes: any[] = [];
  let n = 0;
  const prisma: any = {
    organizationSuite: {
      findUnique: jest.fn(async ({ where }: any) => suites[where.organizationId_suite.suite] ?? null),
      findMany: jest.fn(async () => Object.entries(suites).map(([suite, r]) => ({ suite, ...r }))),
      upsert: jest.fn(async ({ where, create, update }: any) => { const k = where.organizationId_suite.suite; suites[k] = suites[k] ? { ...suites[k], ...update } : create; return suites[k]; }),
    },
    suiteRuleChange: { create: jest.fn(async ({ data }: any) => { changes.push({ changedAt: TODAY, ...data }); return data; }), findMany: jest.fn(async () => [...changes].reverse()) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const u = where.userId_organizationId.userId;
        return roles[u] ? { role: roles[u], createdAt: d(joined[u] ?? '2025-01-06') } : null;
      }),
      findMany: jest.fn(async () => Object.keys(roles).map((userId) => ({ userId, user: { firstName: names[userId][0], lastName: names[userId][1] } }))),
    },
    person: {
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) => matches(p, { linkedUserId: where.linkedUserId, externalId: where.externalId })) ?? null),
      findMany: jest.fn(async ({ where }: any) => directory.filter((p) => matches(p, { linkedUserId: where.linkedUserId, department: where.department }))),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => (where.id?.in ?? []).filter((id: string) => names[id]).map((id: string) => ({ id, firstName: names[id][0], lastName: names[id][1], email: null }))),
      findUnique: jest.fn(async ({ where }: any) => (names[where.id] ? { firstName: names[where.id][0] } : null)),
    },
    leaveRequest: {
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => matches(r, where))),
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
      create: jest.fn(async ({ data }: any) => { const r = { id: `r-${++n}`, status: 'waiting', kind: 'annual', standInUserId: null, decidedById: null, decidedAt: null, askedAt: TODAY, ...data }; rows.push(r); return { id: r.id }; }),
    },
    suiteEvent: {
      create: jest.fn(async ({ data }: any) => { events.push({ at: TODAY, ...data }); return data; }),
      findMany: jest.fn(async ({ where }: any) => events.filter((e) => e.ref === where.ref)),
    },
  };
  const leave = new LeaveBoardService(prisma);
  const suitesSvc = new SuitesService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  const ask = async (userId: string, startsOn: string, endsOn: string, said?: string) => {
    const back = await sayBackLeave(prisma, leave, as(userId), { startsOn, endsOn }, TODAY, said);
    return back;
  };
  const send = async (userId: string, startsOn: string, endsOn: string, said?: string) => {
    const back: any = await ask(userId, startsOn, endsOn, said);
    await sendLeave(leave, prisma, as(userId), { startsOn, endsOn, ...(back.kind ? { kind: back.kind } : {}) });
    return rows[rows.length - 1];
  };
  return { prisma, leave, suites: suitesSvc, as, ask, send, rows, events };
}

/* ------------------------------------------- before and after ------------------------------------------- */

describe('with no leave rules set, every reader reads exactly what they read before', () => {
  for (const [label, rules] of [['no rules row at all', undefined], ['an empty rules row', {}]] as const) {
    it(`${label}: Aisha's say-back`, async () => {
      const { ask } = setup({ rules });
      expect((await ask('u-aisha', '2026-10-08', '2026-10-09', 'I need sick leave on 8 and 9 October'))).toEqual({
        ok: true,
        say: 'You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 21 days of leave left this year, and Miriam is also off then. Shall I send it to Wairimu to approve?',
      });
    });

    it(`${label}: Neema, new, is told nothing about how long she has been here`, async () => {
      const { ask } = setup({ rules });
      expect((await ask('u-neema', '2026-12-14', '2026-12-15')).say).toBe(
        'You asked for leave from Monday 14 December to Tuesday 15 December, which is 2 working days. You have 21 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?',
      );
    });

    /*
     * Changed 22 November 2026. Since Batch S, round 2, T9 (e35c4cbdb, on staging), whoever holds the HR duty reads the leave board whether or not the rules
     * tell HR anything: Peter was refused until he set leave up. This test still expected Joy to be refused, and has failed on staging since. With no
     * rules, Joy reads the board as HR, and nothing is recorded as told to her.
     */
    it(`${label}: the request is kept as annual, Wairimu reads no kind and no rule, and Joy is told nothing`, async () => {
      const { send, leave, as, events } = setup({ rules });
      const r = await send('u-aisha', '2026-10-08', '2026-10-09');
      expect(r.kind).toBe('annual');
      const board = await leave.board(as('u-wairimu'), TODAY);
      const w = board.waiting.find((x) => x.id === r.id)!;
      expect(w).toMatchObject({ daysLeft: 21, leaveKind: null, rules: [] });
      expect(w.said.slice(0, 3)).toEqual([
        'Aisha asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days.',
        'Aisha has 21 days left.',
        'Miriam is also off on some of those days. On the busiest of them, Sales would be two short.',
      ]);
      expect(board.toldToHr).toEqual([]);
      expect(board.off).toEqual([{ id: 'r-miriam-oct', name: 'Miriam Wanjiku', startsOn: '2026-10-09', endsOn: '2026-10-09', kind: 'annual' }]);
      await leave.decide(as('u-wairimu'), r.id, 'approved');
      const joy = await leave.board(as('u-joy'), TODAY);
      expect(joy.reader).toBe('hr');
      expect(joy.waiting).toEqual([]);
      expect(events.filter((e) => e.toUserId === 'u-joy')).toEqual([]);
    });

    it(`${label}: Aisha's own leave reads as before, with no kinds`, async () => {
      const { leave, as } = setup({ rules });
      expect(await leave.mine(as('u-aisha'), TODAY)).toEqual({ perYear: 21, daysLeft: 21, daysLeftSaid: 'You have 21 days of leave left this year, out of 21.', kinds: [], requests: [] });
    });
  }
});

/* ------------------------------------------- Grace, the admin ------------------------------------------- */

describe('Grace, an admin, sets the leave rules and reads them back in full sentences', () => {
  it('reads every rule said back', async () => {
    const { suites, as } = setup();
    const out = await suites.setLeaveRules(as('u-grace'), RULES);
    expect(out.hr).toBe('Joy Mutua');
    expect(out.said).toEqual([
      'Each person has 21 days of annual leave a year.',
      'Annual leave needs two weeks’ notice.',
      'Sick leave has no set number of days.',
      'Sick leave of more than two working days needs a sick note.',
      'Each person has 5 days of compassionate leave a year.',
      'When somebody does not say which kind, Groundwork takes it as annual leave.',
      'Nobody can take leave from Monday 14 December to Friday 18 December, because of the year-end stock count.',
      'Leave can be taken once somebody has been here 90 days. Groundwork counts from the day they were added to your organisation.',
      'Joy Mutua, who looks after HR, is told of each approved request, on the leave board.',
      'A rule never stops a request. The person is told when one applies, before they send it, and so is whoever decides it.',
    ]);
  });

  it('reads with nothing set what runs today', async () => {
    const { suites, as } = setup();
    expect((await suites.leaveRules(as('u-grace'))).said).toEqual([
      'There are no kinds of leave set, so every request is simply leave, and each person has 21 days a year.',
      'No notice, blackout periods or other rules are set, so Groundwork only checks the days left and who else is off. A rule never stops a request; the person and whoever decides it are told when one applies.',
    ]);
  });

  it('reads each change in the history of the rules', async () => {
    const { suites, as } = setup();
    await suites.setLeaveRules(as('u-grace'), { noticeDays: 14 });
    const { changes } = await suites.rulesHistory(as('u-grace'));
    expect(changes[0].said).toBe('Grace changed the leave rules on 5 October.');
    expect(changes[0].details).toEqual(['This was added. Leave needs two weeks’ notice.']);
  });

  it('is refused rules that do not make sense, in plain sentences', async () => {
    const { suites, as } = setup();
    await expect(suites.setLeaveRules(as('u-grace'), { kinds: [{ name: 'Sick leave' }, { name: 'sick' }] })).rejects.toThrow(new BadRequestException(LEAVE_RULES_REFUSED.sameKindTwice));
    await expect(suites.setLeaveRules(as('u-grace'), { blackouts: [{ from: '2026-12-18', to: '2026-12-14' }] })).rejects.toThrow(new BadRequestException(LEAVE_RULES_REFUSED.badBlackouts));
    await expect(suites.setLeaveRules(as('u-grace'), { tellHr: 'sometimes' })).rejects.toThrow(new BadRequestException(LEAVE_RULES_REFUSED.badTellHr));
  });

  /* Decision 85: whoever holds the HR duty sets up leave, so Joy may now read and set them. */
  it('Joy, who looks after HR, may read and set them, and the history keeps it as her change', async () => {
    const { suites, as } = setup();
    expect((await suites.setLeaveRules(as('u-joy'), { noticeDays: 14 })).said).toContain('Leave needs two weeks’ notice.');
    expect((await suites.rulesHistory(as('u-grace'))).changes[0].said).toBe('Joy changed the leave rules on 5 October.');
  });

  it('Wairimu, a lead, and Aisha may neither read nor set them', async () => {
    const { suites, as } = setup();
    for (const u of ['u-wairimu', 'u-aisha']) {
      await expect(suites.leaveRules(as(u))).rejects.toThrow(new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin));
      await expect(suites.setLeaveRules(as(u), RULES)).rejects.toThrow(new ForbiddenException(LEAVE_RULES_REFUSED.onlyAnAdmin));
    }
  });
});

/* ------------------------------------------- the person asking ------------------------------------------- */

describe('the person asking is told in their say-back when a rule applies', () => {
  it('Aisha, short notice: "Annual leave needs two weeks’ notice, and this starts in three days. Shall I still send it to Wairimu?"', async () => {
    const { ask } = setup({ rules: RULES });
    expect(await ask('u-aisha', '2026-10-08', '2026-10-09', 'I need annual leave on 8 and 9 October')).toEqual({
      ok: true, kind: 'annual',
      say: 'You asked for annual leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 21 days of annual leave left this year, and Miriam is also off then. Annual leave needs two weeks’ notice, and this starts in three days. Shall I still send it to Wairimu?',
    });
  });

  it('Aisha, in good time, with no rule that applies, is asked as before', async () => {
    const { ask } = setup({ rules: RULES });
    expect((await ask('u-aisha', '2026-11-02', '2026-11-03')).say).toBe(
      'You asked for annual leave from Monday 2 November to Tuesday 3 November, which is 2 working days. You have 21 days of annual leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?',
    );
  });

  it('Aisha, sick for four days: no days left are said, and the sick note is', async () => {
    const { ask } = setup({ rules: RULES });
    expect(await ask('u-aisha', '2026-10-06', '2026-10-09', 'I am on sick leave from 6 to 9 October')).toEqual({
      ok: true, kind: 'sick',
      say: 'You asked for sick leave from Tuesday 6 October to Friday 9 October, which is 4 working days. Miriam is also off then. Sick leave of more than two working days needs a sick note, so please have it ready. Shall I still send it to Wairimu?',
    });
  });

  it('Aisha, in the blackout', async () => {
    const { ask } = setup({ rules: RULES });
    expect((await ask('u-aisha', '2026-12-17', '2026-12-18', 'annual leave on 17 and 18 December')).say).toBe(
      'You asked for annual leave from Thursday 17 December to Friday 18 December, which is 2 working days. You have 21 days of annual leave left this year, and nobody else in Sales is off then. Nobody can take leave from Monday 14 December to Friday 18 December, because of the year-end stock count, and your days fall in that time. Shall I still send it to Wairimu?',
    );
  });

  it('Neema, here 34 days, before her first 90', async () => {
    const { ask } = setup({ rules: RULES });
    expect((await ask('u-neema', '2026-11-02', '2026-11-02')).say).toBe(
      'You asked for annual leave on Monday 2 November, which is 1 working day. You have 21 days of annual leave left this year, and nobody else in Sales is off then. Leave can be taken once somebody has been here 90 days, and you have been here 34 days. Shall I still send it to Wairimu?',
    );
  });

  it('a rule never stops the request: after her yes it is sent, as the kind she said', async () => {
    const { send } = setup({ rules: RULES });
    const r = await send('u-aisha', '2026-10-06', '2026-10-09', 'sick leave from 6 to 9 October');
    expect(r).toMatchObject({ status: 'waiting', kind: 'sick' });
  });
});

/* ------------------------------------------- whoever decides ------------------------------------------- */

describe('Wairimu, who decides, reads the kind, the days left of that kind, and each rule that applies, with Aisha’s name', () => {
  it('annual leave at short notice', async () => {
    const { send, leave, as } = setup({ rules: RULES });
    const r = await send('u-aisha', '2026-10-08', '2026-10-09', 'annual leave 8 to 9 October');
    const w = (await leave.board(as('u-wairimu'), TODAY)).waiting.find((x) => x.id === r.id)!;
    expect(w).toMatchObject({ leaveKind: 'Annual leave', daysLeft: 21, rules: ['Annual leave needs two weeks’ notice, and Aisha asked three days before it starts.'] });
    expect(w.said.slice(0, 4)).toEqual([
      'Aisha asked for annual leave from Thursday 8 October to Friday 9 October, which is 2 working days.',
      'Aisha has 21 days of annual leave left.',
      'Miriam is also off on some of those days. On the busiest of them, Sales would be two short.',
      'Groundwork found nothing Aisha owns that is due on those days.',
    ]);
    expect(w.said).toContain('Annual leave needs two weeks’ notice, and Aisha asked three days before it starts.');
  });

  it('sick leave: no days left, and the sick note to ask for', async () => {
    const { send, leave, as } = setup({ rules: RULES });
    const r = await send('u-aisha', '2026-10-06', '2026-10-09', 'sick leave 6 to 9 October');
    const w = (await leave.board(as('u-wairimu'), TODAY)).waiting.find((x) => x.id === r.id)!;
    expect(w).toMatchObject({ leaveKind: 'Sick leave', daysLeft: null, rules: ['Sick leave of more than two working days needs a sick note. Ask Aisha for it if you have not had it.'] });
    expect(w.said[0]).toBe('Aisha asked for sick leave from Tuesday 6 October to Friday 9 October, which is 4 working days.');
  });

  it('Grace, an admin, reads the same; Kamau, a lead of another team, is not served it', async () => {
    const { send, leave, as } = setup({ rules: RULES });
    const r = await send('u-aisha', '2026-10-06', '2026-10-09', 'sick leave 6 to 9 October');
    expect((await leave.board(as('u-grace'), TODAY)).waiting.find((x) => x.id === r.id)).toMatchObject({ leaveKind: 'Sick leave' });
    expect((await leave.board(as('u-kamau'), TODAY)).waiting.find((x) => x.id === r.id)).toBeUndefined();
  });
});

/* ------------------------------------------- HR ------------------------------------------- */

describe('Joy, who looks after HR', () => {
  it('is told of each approved request on the leave board, and of nothing still waiting', async () => {
    const { send, leave, as, events, prisma } = setup({ rules: RULES });
    const r = await send('u-aisha', '2026-10-06', '2026-10-09', 'sick leave 6 to 9 October');
    let joy = await leave.board(as('u-joy'), TODAY);
    expect(joy.reader).toBe('hr');
    expect(joy.waiting).toEqual([]);
    expect(joy.toldToHr.map((t) => t.id)).toEqual(['r-miriam-oct']);
    await leave.decide(as('u-wairimu'), r.id, 'approved');
    joy = await leave.board(as('u-joy'), TODAY);
    expect(joy.toldToHr.find((t) => t.id === r.id)).toEqual({
      id: r.id, name: 'Aisha Otieno', startsOn: '2026-10-06', endsOn: '2026-10-09', status: 'approved', kindName: 'Sick leave',
      said: [
        'Aisha Otieno asked for sick leave from Tuesday 6 October to Friday 9 October, which is 4 working days.',
        'Wairimu approved it.',
        'Sick leave of more than two working days needs a sick note. Ask Aisha for it if you have not had it.',
      ],
    });
    expect(events.filter((e) => e.toUserId === 'u-joy').map((e) => e.basis.onTheBoard)).toEqual(['hr']);
    expect((await aRequestsHistory(prisma, ORG, 'leave', r.id, 'u-aisha')).said).toContain('Groundwork told Joy, who looks after HR, on the leave board on 5 October.');
  });

  it('is told of each request, waiting or approved, when Grace chose that', async () => {
    const { send, leave, as } = setup({ rules: { ...RULES, tellHr: 'every' } });
    const r = await send('u-aisha', '2026-10-06', '2026-10-09', 'sick leave 6 to 9 October');
    const joy = await leave.board(as('u-joy'), TODAY);
    expect(joy.toldToHr.find((t) => t.id === r.id)?.said.slice(0, 2)).toEqual([
      'Aisha Otieno asked for sick leave from Tuesday 6 October to Friday 9 October, which is 4 working days.',
      'It is waiting for Wairimu.',
    ]);
  });

  it('reads nothing when nobody holds the HR duty, and the admin is told to name somebody', async () => {
    const { leave, as, suites } = setup({ rules: RULES, hr: null });
    await expect(leave.board(as('u-joy'), TODAY)).rejects.toThrow(ForbiddenException);
    expect((await suites.leaveRules(as('u-grace'))).said).toContain('HR is to be told of each approved request, but nobody is named for HR yet. Name somebody under who holds each duty.');
  });
});

describe('Miriam, a colleague, and Aisha herself', () => {
  it('Miriam is still refused the board, and reads nothing of Aisha’s kind of leave', async () => {
    const { send, leave, as } = setup({ rules: RULES });
    const r = await send('u-aisha', '2026-10-06', '2026-10-09', 'sick leave 6 to 9 October');
    await expect(leave.board(as('u-miriam'), TODAY)).rejects.toThrow(ForbiddenException);
    /* Her own leave lists the kinds her organisation has, and only her own requests. */
    const mine = await leave.mine(as('u-miriam'), TODAY);
    expect(mine.requests.map((x) => x.id)).toEqual(['r-miriam-oct']);
    expect(JSON.stringify(mine)).not.toContain(r.id);
    expect(JSON.stringify(mine)).not.toContain('Aisha');
  });

  it('Aisha reads her own leave with each kind and its days left', async () => {
    const { send, leave, as } = setup({ rules: RULES });
    await send('u-aisha', '2026-10-06', '2026-10-09', 'sick leave 6 to 9 October');
    const mine = await leave.mine(as('u-aisha'), TODAY);
    expect(mine.kinds).toEqual([
      { key: 'annual', name: 'Annual leave', perYear: 21, daysLeft: 21 },
      { key: 'sick', name: 'Sick leave', perYear: null, daysLeft: null },
      { key: 'compassionate', name: 'Compassionate leave', perYear: 5, daysLeft: 5 },
    ]);
    expect(mine.requests[0]).toMatchObject({ leaveKind: 'Sick leave', where: 'Your leave from Tuesday 6 October to Friday 9 October is waiting for Wairimu.' });
  });
});
