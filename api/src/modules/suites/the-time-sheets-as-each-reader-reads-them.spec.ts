import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TimeSheetsService, TIME_REFUSED, mondayOf } from './the-time-sheets.service';

/**
 * TIME SHEETS, AS EACH PERSON IS SERVED THEM (E3, U.17; decisions rule 10).
 *
 * Baridi Appliances, on Sunday 27 September 2026, so this week is the week of 21 September. The clients
 * are Naivas, Lakeside and Green Mart, and "Their manager" approves. Grace is an admin. Wairimu leads
 * Sales and manages Aisha and Brian. Kamau leads Operations; Otieno is in Operations with no manager.
 * Miriam, in Sales, is a colleague. Tomas is a guest. Naivas agreed 40 hours for the whole job.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads anything while the suite is off;
 *   - an admin reads everybody's hours, and the hours against what each client agreed;
 *   - a lead reads only their own team's hours, and (decision 93, row 21) what each client agreed;
 *   - the approver approves a week, with the total they saw; hours added later make it wait again;
 *   - each person reads only their own hours; a colleague and a guest are refused the board;
 *   - hours never reach a check-in, its record or its report, and nothing rates how much anyone works.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-27T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-aisha': 'MEMBER', 'u-brian': 'MEMBER',
  'u-miriam': 'MEMBER', 'u-otieno': 'MEMBER', 'u-tomas': 'GUEST',
};
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'], 'u-aisha': ['Aisha', 'Otieno'],
  'u-brian': ['Brian', 'Mwangi'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-otieno': ['Otieno', 'Ouma'], 'u-tomas': ['Tomas', 'Guest'],
};
const person = (u: string, department: string | null, manager: string | null) =>
  ({ linkedUserId: u, externalId: `p-${u.slice(2)}`, department, managerExternalId: manager, active: true });
const directory = [
  person('u-grace', 'Finance', null), person('u-wairimu', 'Sales', null), person('u-kamau', 'Operations', null),
  person('u-aisha', 'Sales', 'p-wairimu'), person('u-brian', 'Sales', 'p-wairimu'), person('u-miriam', 'Sales', 'p-wairimu'),
  person('u-otieno', 'Operations', null),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const h = (userId: string, client: string, day: string, hours: number) => ({ organizationId: ORG, userId, client, onDay: d(day), minutes: hours * 60 });

function setup(opts: { on?: boolean } = {}) {
  const entries: any[] = [
    h('u-aisha', 'Naivas', '2026-09-21', 8), h('u-aisha', 'Naivas', '2026-09-22', 6), h('u-aisha', 'Lakeside', '2026-09-23', 6), h('u-aisha', 'Green Mart', '2026-09-24', 2),
    h('u-brian', 'Naivas', '2026-09-22', 9), h('u-brian', 'Lakeside', '2026-09-23', 12),
    h('u-otieno', 'Lakeside', '2026-09-24', 5),
    h('u-aisha', 'Naivas', '2026-09-14', 4),
    h('u-miriam', 'Naivas', '2026-08-03', 30),
  ];
  const weeks: any[] = [{ organizationId: ORG, userId: 'u-aisha', weekOf: d('2026-09-14'), approvedMinutes: 240, approvedById: 'u-wairimu' }];
  let agreements: any[] = [{ organizationId: ORG, client: 'Naivas', work: 'installing 12 freezers', hours: 40, span: 'whole', createdAt: d('2026-09-01') }];
  const inRange = (x: Date, r: any) => (!r?.gte || x >= r.gte) && (!r?.lt || x < r.lt);
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) =>
      where.organizationId_suite.organizationId === ORG && where.organizationId_suite.suite === 'time'
        ? { isOn: opts.on ?? true, answers: { clients: ['Naivas', 'Lakeside', 'Green Mart'], approver: 'Their manager' } } : null) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: {
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) =>
        (where.linkedUserId ? p.linkedUserId === where.linkedUserId : true) && (where.externalId ? p.externalId === where.externalId : true)) ?? null),
      findMany: jest.fn(async ({ where }: any) => directory.filter((p) => where.linkedUserId.in.includes(p.linkedUserId))),
    },
    user: { findMany: jest.fn(async ({ where }: any) => where.id.in.filter((id: string) => names[id]).map((id: string) => ({ id, firstName: names[id][0], lastName: names[id][1] }))) },
    timeEntry: {
      findMany: jest.fn(async ({ where }: any) => entries.filter((e) => e.organizationId === where.organizationId
        && (!where.userId || e.userId === where.userId) && (!where.client || where.client.in.includes(e.client)) && inRange(e.onDay, where.onDay))),
      createMany: jest.fn(async ({ data }: any) => { entries.push(...data); return { count: data.length }; }),
    },
    timeWeek: {
      findMany: jest.fn(async ({ where }: any) => weeks.filter((w) => w.organizationId === where.organizationId && (!where.userId || w.userId === where.userId) && inRange(w.weekOf, where.weekOf))),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_userId_weekOf;
        const w = weeks.find((x) => x.userId === k.userId && x.weekOf.getTime() === k.weekOf.getTime());
        if (w) return Object.assign(w, update);
        weeks.push(create);
        return create;
      }),
    },
    timeAgreement: {
      findMany: jest.fn(async () => agreements),
      deleteMany: jest.fn(async () => { agreements = []; return { count: 0 }; }),
      createMany: jest.fn(async ({ data }: any) => { agreements = data.map((x: any, i: number) => ({ ...x, createdAt: new Date(i) })); return { count: data.length }; }),
    },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  const svc = new TimeSheetsService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as, entries, weeks };
}
const thisWeek = (b: any) => b.weeks.find((w: any) => w.weekOf === b.thisWeek);

describe('while the time sheets suite is off', () => {
  it('nobody reads or approves anything', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'), TODAY)).rejects.toThrow(new NotFoundException(TIME_REFUSED.notOn));
    await expect(svc.mine(as('u-aisha'), TODAY)).rejects.toThrow(NotFoundException);
    await expect(svc.approve(as('u-wairimu'), 'u-aisha', '2026-09-21', TODAY)).rejects.toThrow(NotFoundException);
  });
});

describe('Grace, an admin', () => {
  it('reads this week’s hours for everybody, by client, in the order the admin listed them', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'), TODAY);
    expect(b.thisWeek).toBe('2026-09-21');
    const w = thisWeek(b);
    expect(w.clients).toEqual(['Naivas', 'Lakeside', 'Green Mart']);
    expect(w.people.map((p: any) => [p.name, p.minutes, p.total / 60, p.approved])).toEqual([
      ['Aisha Otieno', { Naivas: 840, Lakeside: 360, 'Green Mart': 120 }, 22, false],
      ['Brian Mwangi', { Naivas: 540, Lakeside: 720, 'Green Mart': 0 }, 21, false],
      ['Otieno Ouma', { Naivas: 0, Lakeside: 300, 'Green Mart': 0 }, 5, false],
    ]);
  });

  it('approves only where there is no manager who can: Otieno’s week, not Aisha’s', async () => {
    const { svc, as } = setup();
    const w = thisWeek(await svc.board(as('u-grace'), TODAY));
    expect(w.people.map((p: any) => [p.name, p.mayApprove])).toEqual([['Aisha Otieno', false], ['Brian Mwangi', false], ['Otieno Ouma', true]]);
    await expect(svc.approve(as('u-grace'), 'u-aisha', '2026-09-21', TODAY)).rejects.toThrow(new ForbiddenException(TIME_REFUSED.notYours));
  });

  it('reads the hours against what each client agreed, all of them for a whole job', async () => {
    const { svc, as } = setup();
    expect((await svc.board(as('u-grace'), TODAY)).agreements).toEqual([
      { client: 'Naivas', work: 'installing 12 freezers', hours: 40, span: 'whole', usedMinutes: (8 + 6 + 9 + 4 + 30) * 60 },
    ]);
  });

  it('says what each client agreed; the list is replaced, and checked', async () => {
    const { svc, as } = setup();
    const b = await svc.setAgreements(as('u-grace'), [{ client: 'lakeside', work: 'maintenance', hours: 60, span: 'month' }], TODAY);
    expect(b.agreements).toEqual([{ client: 'Lakeside', work: 'maintenance', hours: 60, span: 'month', usedMinutes: (6 + 12 + 5) * 60 }]);
    await expect(svc.setAgreements(as('u-grace'), [{ client: 'Carrefour', work: 'x', hours: 5, span: 'whole' }], TODAY)).rejects.toThrow(new BadRequestException(TIME_REFUSED.badAgreement));
    await expect(svc.setAgreements(as('u-grace'), [{ client: 'Naivas', work: 'x', hours: 5, span: 'year' }], TODAY)).rejects.toThrow(BadRequestException);
  });
});

describe('Wairimu, the Sales lead', () => {
  /* Changed by decision 93, row 21. This pinned "and not what the clients agreed", the restriction Hafsah removed. Her team's hours only is kept. */
  it('reads only her team’s hours, and what each client agreed', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-wairimu'), TODAY);
    expect(thisWeek(b).people.map((p: any) => p.name)).toEqual(['Aisha Otieno', 'Brian Mwangi']);
    expect(b.agreements).toEqual([
      { client: 'Naivas', work: 'installing 12 freezers', hours: 40, span: 'whole', usedMinutes: (8 + 6 + 9 + 4 + 30) * 60 },
    ]);
    expect(JSON.stringify(b)).not.toMatch(/Otieno Ouma/);
  });

  it('cannot say what a client agreed: only an admin does', async () => {
    const { svc, as } = setup();
    await expect(svc.setAgreements(as('u-wairimu'), [{ client: 'Naivas', work: 'x', hours: 5, span: 'whole' }], TODAY)).rejects.toThrow(ForbiddenException);
  });

  it('approves the weeks of the people she manages, with the total she saw; new hours make it wait again', async () => {
    const { svc, as, weeks, entries } = setup();
    const after = await svc.approve(as('u-wairimu'), 'u-aisha', '2026-09-23', TODAY);
    expect(thisWeek(after).people.find((p: any) => p.name === 'Aisha Otieno').approved).toBe(true);
    const w = weeks.find((x) => x.userId === 'u-aisha' && x.weekOf.getTime() === d('2026-09-21').getTime());
    expect(w).toMatchObject({ approvedMinutes: 22 * 60, approvedById: 'u-wairimu' });
    entries.push(h('u-aisha', 'Naivas', '2026-09-25', 1));
    expect(thisWeek(await svc.board(as('u-wairimu'), TODAY)).people.find((p: any) => p.name === 'Aisha Otieno').approved).toBe(false);
  });

  it('cannot approve outside her team, or a week with no hours', async () => {
    const { svc, as } = setup();
    await expect(svc.approve(as('u-wairimu'), 'u-otieno', '2026-09-21', TODAY)).rejects.toThrow(ForbiddenException);
    await expect(svc.approve(as('u-wairimu'), 'u-aisha', '2026-08-31', TODAY)).rejects.toThrow(new BadRequestException(TIME_REFUSED.nothingToApprove));
  });

  it('an earlier week stays on the board while it still waits, and goes once approved', async () => {
    const { svc, as, entries } = setup();
    entries.push(h('u-brian', 'Naivas', '2026-09-15', 3));
    const b = await svc.board(as('u-wairimu'), TODAY);
    /* Miriam's 30 hours in August have waited ever since, so that week is there too. */
    expect(b.weeks.map((w: any) => w.weekOf)).toEqual(['2026-08-03', '2026-09-14', '2026-09-21']);
    expect(b.weeks[1].people.map((p: any) => [p.name, p.approved])).toEqual([['Aisha Otieno', true], ['Brian Mwangi', false]]);
    const after = await svc.approve(as('u-wairimu'), 'u-brian', '2026-09-14', TODAY);
    expect(after.weeks.map((w: any) => w.weekOf)).toEqual(['2026-08-03', '2026-09-21']);
  });
});

describe('each person reads only their own hours', () => {
  it('Aisha reads her own weeks, and nobody else’s', async () => {
    const { svc, as } = setup();
    const mine = await svc.mine(as('u-aisha'), TODAY);
    expect(mine.weeks.map((w) => [w.weekOf, w.total / 60, w.approved])).toEqual([['2026-09-21', 22, false], ['2026-09-14', 4, true]]);
    expect(JSON.stringify(mine)).not.toMatch(/Brian|Otieno Ouma|approvedBy/);
  });

  it('a colleague and a guest are refused the board; a guest has no hours; nobody approves their own', async () => {
    const { svc, as } = setup();
    await expect(svc.board(as('u-miriam'), TODAY)).rejects.toThrow(new ForbiddenException(TIME_REFUSED.onlyAdminsAndLeads));
    await expect(svc.board(as('u-tomas'), TODAY)).rejects.toThrow(ForbiddenException);
    await expect(svc.mine(as('u-tomas'), TODAY)).rejects.toThrow(new ForbiddenException(TIME_REFUSED.notInIt));
    await expect(svc.approve(as('u-aisha'), 'u-aisha', '2026-09-21', TODAY)).rejects.toThrow(ForbiddenException);
    await expect(svc.approve(as('u-miriam'), 'u-brian', '2026-09-21', TODAY)).rejects.toThrow(ForbiddenException);
    await expect(svc.setAgreements(as('u-wairimu'), [], TODAY)).rejects.toThrow(new ForbiddenException(TIME_REFUSED.onlyAnAdmin));
  });
});

describe('hours given by talking to Groundwork, as the engine will record them (request 22)', () => {
  it('keep the client as the admin listed it, and refuse one not on the list, or impossible hours', async () => {
    const { svc, entries } = setup();
    await svc.record(ORG, 'u-miriam', [{ client: 'naivas', onDay: '2026-09-25', hours: 3 }, { client: 'Lakeside', onDay: '2026-09-25', hours: 1 }]);
    expect(entries.slice(-2).map((e) => [e.client, e.minutes])).toEqual([['Naivas', 180], ['Lakeside', 60]]);
    await expect(svc.record(ORG, 'u-miriam', [{ client: 'Carrefour', onDay: '2026-09-25', hours: 1 }])).rejects.toThrow(new BadRequestException(TIME_REFUSED.notAClient));
    await expect(svc.record(ORG, 'u-miriam', [{ client: 'Naivas', onDay: '2026-09-25', hours: 30 }])).rejects.toThrow(new BadRequestException(TIME_REFUSED.badHours));
    await expect(svc.record(ORG, 'u-tomas', [{ client: 'Naivas', onDay: '2026-09-25', hours: 1 }])).rejects.toThrow(ForbiddenException);
  });
});

describe('weeks', () => {
  it('start on Monday', () => {
    expect(mondayOf(d('2026-09-27')).toISOString().slice(0, 10)).toBe('2026-09-21');
    expect(mondayOf(d('2026-09-21')).toISOString().slice(0, 10)).toBe('2026-09-21');
  });
});

/** Code only: a comment that names the table is not a read of it. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('hours are for billing only, and never reach a check-in or its report (rule 10)', () => {
  it('nothing outside the suites reads hours', () => {
    const root = join(__dirname, '..');
    const faults: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { if (name !== 'suites') walk(p); }
        else if (/\.ts$/.test(name) && !/\.spec\.ts$/.test(name) && /\b(timeEntry|timeWeek|timeAgreement)\b/.test(withoutComments(readFileSync(p, 'utf8')))) faults.push(p);
      }
    };
    walk(root);
    expect(faults).toEqual([]);
    /* The pattern does find a real read: the suite's own service. A scan that matches nothing proves nothing. */
    expect(/\btimeEntry\b/.test(withoutComments(readFileSync(join(__dirname, 'the-time-sheets.service.ts'), 'utf8')))).toBe(true);
  });

  it('and nothing served rates how much anybody works, or labels anybody', async () => {
    const { svc, as } = setup();
    const served = JSON.stringify([await svc.board(as('u-grace'), TODAY), await svc.mine(as('u-aisha'), TODAY)]);
    expect(served).not.toMatch(/busiest|most|least|average|rank|score|productiv|PIP|at[- ]risk|@/i);
  });
});
