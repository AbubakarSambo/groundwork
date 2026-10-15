import { NotFoundException } from '@nestjs/common';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { ARequestWaitsTooLongCron } from './a-request-waits-too-long.cron';
import { LeaveBoardService, LEAVE_REFUSED } from './the-leave-board.service';
import { SpendingService } from './the-spending.service';
import { TimeSheetsService, TIME_REFUSED } from './the-time-sheets.service';
import { ReviewsService } from './the-reviews.service';
import { SuitesService } from './suites.service';

/**
 * ONE RECORD OF WHO DID WHAT (decision 85, build step 5), AS EACH READER READS IT.
 *
 * Baridi Appliances. Grace is an admin. Wairimu leads Sales and manages Aisha and Miriam. Omar is a
 * member who looks after finance. Tomas is a guest. Leave, spending and hours go first to the manager
 * and then to finance. Aisha asks for leave on Thursday 1 October, after Groundwork says it back and
 * she says yes. Wairimu approves it on 2 October, and Omar on 3 October.
 *
 * Whoever may already read the request reads its record in plain sentences, with "you" for
 * themselves. Nobody else reads anything of it, and is told it was not found.
 */

/** The day each step happens on, for the record. */
const clock = { now: new Date('2026-10-01T08:00:00Z') };
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
    reviews: { isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } },
    spend: { isOn: true, answers: opts.spend ?? { currency: 'KES', limit: 20000, above: 'u-grace' } },
    ...(opts.duties ? { duties: { isOn: false, answers: opts.duties } } : {}),
    ...(opts.workflows ? { workflows: { isOn: false, answers: opts.workflows } } : {}),
  };
  const users = Object.keys(names).map((id) => ({ id, email: null, firstName: names[id][0], lastName: names[id][1], phoneNumber: `+2547000${id.length}`, deletedAt: null }));
  const events: any[] = [];
  const dues = [{ id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: d('2026-10-05'), source: null }];
  const reviews: any[] = [];
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
    timeEntry: {
      findMany: jest.fn(async ({ where }: any) => hours.filter((h) => matches(h, where))),
      createMany: jest.fn(async ({ data }: any) => { for (const h of data) hours.push({ createdAt: clock.now, ...h }); return { count: data.length }; }),
    },
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
    suiteEvent: {
      create: jest.fn(async ({ data }: any) => { events.push({ at: clock.now, ...data }); return data; }),
      findMany: jest.fn(async ({ where }: any) => events.filter((e) => matches(e, where))),
    },
    evaluationDue: {
      findMany: jest.fn(async () => dues),
      findUnique: jest.fn(async ({ where }: any) => dues.find((x) => x.id === where.id) ?? null),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => (!where.evaluationDueId || where.evaluationDueId.in.includes(r.evaluationDueId)) && (!where.personExternalId || r.personExternalId === where.personExternalId))),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const r = { id: `r-${data.personExternalId.slice(2)}`, managersWords: null, theirView: null, decision: null, decisionReasons: null, decidedAt: null, decidedById: null, noticed: null, startedAt: clock.now, ...data };
        reviews.push(r);
        return { id: r.id };
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
  };
  /* The real sender of a request on WhatsApp, with a phone that always takes the message, so "told" is recorded as it would be. */
  const phone = { sendFor: jest.fn(async () => ({ sent: true })) };
  const told = new ARequestToldOnWhatsApp(prisma, phone as any);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return {
    prisma, told, phone, as, leaveRows: leave, spendRows: spend, weeks, events, reviews: new ReviewsService(prisma),
    leave: new LeaveBoardService(prisma, told as any), spending: new SpendingService(prisma, told as any), time: new TimeSheetsService(prisma, told as any), suites: new SuitesService(prisma),
  };
}


const MANAGER_THEN_FINANCE = { steps: [['manager', 'admin'], ['finance', 'admin']] };
const opts = { workflows: { leave: MANAGER_THEN_FINANCE, spend: MANAGER_THEN_FINANCE, time: MANAGER_THEN_FINANCE }, duties: { finance: 'u-omar' } };

async function aishasLeaveIsApprovedTwice(s: ReturnType<typeof setup>) {
  clock.now = new Date('2026-10-01T08:00:00Z');
  const { id } = await s.leave.ask(ORG, 'u-aisha', { startsOn: '2026-10-08', endsOn: '2026-10-09', proposalId: 'proposal-1' });
  clock.now = new Date('2026-10-02T08:00:00Z');
  await s.leave.decide(s.as('u-wairimu'), id, 'approved');
  clock.now = new Date('2026-10-03T08:00:00Z');
  await s.leave.decide(s.as('u-omar'), id, 'approved');
  return id;
}

describe('Aisha’s leave, approved by Wairimu and then by Omar', () => {
  it('Aisha, who asked, reads every step, with "you" for herself', async () => {
    const s = setup(opts);
    const id = await aishasLeaveIsApprovedTwice(s);
    expect((await s.leave.history(s.as('u-aisha'), id)).said).toEqual([
      'You asked for it on 1 October, after Groundwork said it back and you said yes.',
      'Groundwork told Wairimu on WhatsApp on 1 October.',
      'Wairimu approved it on 2 October.',
      'Groundwork told Omar on WhatsApp on 2 October.',
      'Omar approved it on 3 October.',
      'Groundwork told you on WhatsApp on 3 October.',
    ]);
  });

  it('Wairimu, who leads Sales and approved the first step, reads it with her own part as "you"', async () => {
    const s = setup(opts);
    const id = await aishasLeaveIsApprovedTwice(s);
    expect((await s.leave.history(s.as('u-wairimu'), id)).said).toEqual([
      'Aisha asked for it on 1 October, after Groundwork said it back and Aisha said yes.',
      'Groundwork told you on WhatsApp on 1 October.',
      'You approved it on 2 October.',
      'Groundwork told Omar on WhatsApp on 2 October.',
      'Omar approved it on 3 October.',
      'Groundwork told Aisha on WhatsApp on 3 October.',
    ]);
  });

  it('Grace, an admin, reads it with everybody’s first name', async () => {
    const s = setup(opts);
    const id = await aishasLeaveIsApprovedTwice(s);
    const said = (await s.leave.history(s.as('u-grace'), id)).said;
    expect(said).toContain('Wairimu approved it on 2 October.');
    expect(said).toContain('Omar approved it on 3 October.');
  });

  it('Omar reads it while it waits for him, and not once it no longer does', async () => {
    const s = setup(opts);
    clock.now = new Date('2026-10-01T08:00:00Z');
    const { id } = await s.leave.ask(ORG, 'u-aisha', { startsOn: '2026-10-08', endsOn: '2026-10-09' });
    await expect(s.leave.history(s.as('u-omar'), id)).rejects.toThrow(new NotFoundException(LEAVE_REFUSED.notFound));
    clock.now = new Date('2026-10-02T08:00:00Z');
    await s.leave.decide(s.as('u-wairimu'), id, 'approved');
    expect((await s.leave.history(s.as('u-omar'), id)).said).toEqual([
      'Aisha asked for it on 1 October.',
      'Groundwork told Wairimu on WhatsApp on 1 October.',
      'Wairimu approved it on 2 October.',
      'Groundwork told you on WhatsApp on 2 October.',
    ]);
    await s.leave.decide(s.as('u-omar'), id, 'approved');
    await expect(s.leave.history(s.as('u-omar'), id)).rejects.toThrow(new NotFoundException(LEAVE_REFUSED.notFound));
  });

  it('Miriam, a colleague, and Tomas, a guest, read nothing of it', async () => {
    const s = setup(opts);
    const id = await aishasLeaveIsApprovedTwice(s);
    for (const u of ['u-miriam', 'u-tomas', 'u-gone']) await expect(s.leave.history(s.as(u), id)).rejects.toThrow(new NotFoundException(LEAVE_REFUSED.notFound));
  });

  it('a decline is recorded, and the record holds references to rows, never a copy of anybody’s words', async () => {
    const s = setup(opts);
    clock.now = new Date('2026-10-01T08:00:00Z');
    const { id } = await s.leave.ask(ORG, 'u-aisha', { startsOn: '2026-10-08', endsOn: '2026-10-09' });
    clock.now = new Date('2026-10-02T08:00:00Z');
    await s.leave.decide(s.as('u-wairimu'), id, 'declined');
    expect((await s.leave.history(s.as('u-aisha'), id)).said).toContain('Wairimu declined it on 2 October.');
    expect(s.events.map((e) => [e.kind, e.byUserId ?? null, e.toUserId ?? null, e.step ?? null])).toEqual([
      ['asked', 'u-aisha', null, null], ['told', null, 'u-wairimu', null], ['declined', 'u-wairimu', null, 0], ['told', null, 'u-aisha', null],
    ]);
    for (const e of s.events) expect(Object.keys(e.basis ?? {}).every((k) => ['row', 'id', 'proposalId', 'message', 'minutes'].includes(k))).toBe(true);
  });
});

describe('a request passed on is recorded, with why', () => {
  it('Aisha reads that it went to Omar because Wairimu had not answered for two working days', async () => {
    const s = setup({ workflows: { leave: { steps: [['manager', 'finance', 'admin']], escalateAfter: 2 } }, duties: { finance: 'u-omar' } });
    clock.now = new Date('2026-09-28T08:00:00Z');
    const { id } = await s.leave.ask(ORG, 'u-aisha', { startsOn: '2026-10-08', endsOn: '2026-10-09' });
    s.leaveRows.find((r) => r.id === id)!.askedAt = clock.now;
    clock.now = new Date('2026-09-30T08:00:00Z');
    await new ARequestWaitsTooLongCron(s.prisma, s.leave, s.spending, s.time).passOnNow(clock.now);
    const said = (await s.leave.history(s.as('u-aisha'), id)).said;
    expect(said).toContain('Groundwork passed it to Omar on 30 September, because Wairimu had not answered for 2 working days.');
    expect((await s.leave.history(s.as('u-wairimu'), id)).said).toContain('Groundwork passed it to Omar on 30 September, because you had not answered for 2 working days.');
  });
});

describe('spending and hours keep the same record', () => {
  it('Aisha’s request to spend: Aisha and Omar read it, Miriam does not', async () => {
    const s = setup(opts);
    clock.now = new Date('2026-10-01T08:00:00Z');
    const { id } = await s.spending.ask(ORG, 'u-aisha', { amount: 8000, what: 'fuel', proposalId: 'proposal-2' });
    clock.now = new Date('2026-10-02T08:00:00Z');
    await s.spending.decide(s.as('u-wairimu'), id, 'approved', clock.now);
    expect((await s.spending.history(s.as('u-aisha'), id)).said).toEqual([
      'You asked for it on 1 October, after Groundwork said it back and you said yes.',
      'Groundwork told Wairimu on WhatsApp on 1 October.',
      'Wairimu approved it on 2 October.',
      'Groundwork told Omar on WhatsApp on 2 October.',
    ]);
    expect((await s.spending.history(s.as('u-omar'), id)).said[2]).toBe('Wairimu approved it on 2 October.');
    await expect(s.spending.history(s.as('u-miriam'), id)).rejects.toThrow(NotFoundException);
  });

  it('Aisha’s hours: "sent these hours", and nobody outside reads them', async () => {
    const s = setup(opts);
    clock.now = new Date('2026-09-29T08:00:00Z');
    await s.time.record(ORG, 'u-aisha', [{ client: 'Naivas', onDay: '2026-09-29', hours: 2 }], { proposalId: 'proposal-3' });
    clock.now = new Date('2026-09-30T08:00:00Z');
    await s.time.approve(s.as('u-wairimu'), 'u-aisha', '2026-09-28', clock.now);
    expect((await s.time.history(s.as('u-aisha'), 'u-aisha', '2026-09-28')).said).toEqual([
      'You sent these hours on 29 September, after Groundwork said it back and you said yes.',
      'Groundwork told Wairimu on WhatsApp on 29 September.',
      'Wairimu approved these hours on 30 September.',
      'Groundwork told Omar on WhatsApp on 30 September.',
    ]);
    await expect(s.time.history(s.as('u-miriam'), 'u-aisha', '2026-09-28')).rejects.toThrow(new NotFoundException(TIME_REFUSED.nothingToRead));
  });
});

describe('a review keeps who started and decided it, never its words', () => {
  it('Aisha reads who started and decided her review; Miriam reads nothing', async () => {
    const s = setup(opts);
    clock.now = new Date('2026-10-01T08:00:00Z');
    const { id } = await s.reviews.start(s.as('u-wairimu'), 'd-aisha');
    clock.now = new Date('2026-10-05T08:00:00Z');
    await s.reviews.decide(s.as('u-wairimu'), id, { decision: 'Carries on', reasons: 'Her shops grew.' });
    expect((await s.reviews.history(s.as('u-aisha'), id)).said).toEqual(['Wairimu started the review on 1 October.', 'Wairimu decided the review on 5 October.']);
    expect((await s.reviews.history(s.as('u-wairimu'), id)).said).toEqual(['You started the review on 1 October.', 'You decided the review on 5 October.']);
    await expect(s.reviews.history(s.as('u-miriam'), id)).rejects.toThrow();
    expect(JSON.stringify(s.events)).not.toContain('Her shops grew');
  });
});

/*
 * EACH TEAM MEMBER'S OWN DATA (9 October 2026). A lead of another team (Kamau leads Operations, not Sales) and a colleague outside the team (Otieno) are neither
 * Aisha's approver nor an admin, so they read nothing of her leave, her spending, her hours or her review: not its record, and not the review itself. The
 * ones who may read it still do. The same sweep was run on the test bed against every route that takes an id.
 */
describe('a lead who is not the approver, and a colleague, read none of a team member’s own requests', () => {
  it('leave, spending, hours and review: Aisha, her lead Wairimu and Grace, an admin, read them; Kamau and Otieno are told they are not found', async () => {
    const s = setup(opts);
    clock.now = new Date('2026-10-01T08:00:00Z');
    const leaveId = (await s.leave.ask(ORG, 'u-aisha', { startsOn: '2026-10-08', endsOn: '2026-10-09', proposalId: 'p-a' })).id;
    const spendId = (await s.spending.ask(ORG, 'u-aisha', { amount: 8000, what: 'fuel', proposalId: 'p-b' })).id;
    await s.time.record(ORG, 'u-aisha', [{ client: 'Naivas', onDay: '2026-09-29', hours: 2 }], { proposalId: 'p-c' });
    const reviewId = (await s.reviews.start(s.as('u-wairimu'), 'd-aisha')).id;
    for (const u of ['u-aisha', 'u-wairimu', 'u-grace']) {
      await expect(s.leave.history(s.as(u), leaveId)).resolves.toBeDefined();
      await expect(s.spending.history(s.as(u), spendId)).resolves.toBeDefined();
      await expect(s.time.history(s.as(u), 'u-aisha', '2026-09-28')).resolves.toBeDefined();
      await expect(s.reviews.one(s.as(u), reviewId)).resolves.toBeDefined();
    }
    for (const u of ['u-kamau', 'u-otieno']) {
      await expect(s.leave.history(s.as(u), leaveId)).rejects.toThrow(NotFoundException);
      await expect(s.spending.history(s.as(u), spendId)).rejects.toThrow(NotFoundException);
      await expect(s.time.history(s.as(u), 'u-aisha', '2026-09-28')).rejects.toThrow(NotFoundException);
      await expect(s.reviews.one(s.as(u), reviewId)).rejects.toThrow();
      await expect(s.reviews.history(s.as(u), reviewId)).rejects.toThrow();
    }
  });
});
