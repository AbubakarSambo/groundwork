import { ForbiddenException } from '@nestjs/common';
import * as rules from './who-may-decide';
import { LeaveBoardService, LEAVE_REFUSED } from './the-leave-board.service';
import { TimeSheetsService, TIME_REFUSED } from './the-time-sheets.service';
import { ReviewsService, REVIEW_REFUSED } from './the-reviews.service';
import { whatWaitsForYouToDecide } from './what-waits-for-you-to-decide';
import { aDecisionSaidBack } from './a-request-in-words';
import { waitingForYouToApprove } from '../grounds/waiting-for-you-to-approve';
import { reviewsToStartOnToday } from '../grounds/a-review-on-today';

/**
 * WHOEVER THE RULES NAME DECIDES, AND READS WHAT WAITS FOR THEM (decision 85, build step 3), for the
 * leave, time sheets and reviews boards, as a2990939 did for spending.
 *
 * Baridi Appliances, Monday 28 September 2026. Grace is an admin. Wairimu leads Sales and manages Aisha
 * and Miriam. Kamau leads Operations and manages Otieno. Omar is a member in Finance. Tomas is a guest.
 *
 * Today's answers never name a member (a manager must be a lead or an admin, and otherwise an admin
 * decides), so for this test the rules are set the way a later workflow could set them:
 *   - "the department head, else an admin", with Omar heading Sales;
 *   - "HR, else an admin", with Kamau, a lead of another team, looking after HR.
 * Aisha asks for leave and sends hours, and her review is due. Otieno does the same in Operations.
 *
 * A member the rules name opens each board as an "approver" and reads only what waits for them. A lead
 * the rules name reads it beside their own team's. Nobody else reads anything more than before.
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
const entry = (u: string, department: string | null, manager: string | null) =>
  ({ externalId: `p-${u.slice(2)}`, linkedUserId: u, email: null, displayName: names[u].join(' '), givenName: names[u][0], familyName: names[u][1], department, managerExternalId: manager, active: true });
const DIRECTORY = [
  entry('u-grace', null, null), entry('u-wairimu', 'Sales', null), entry('u-kamau', 'Operations', null), entry('u-omar', 'Finance', null),
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

function setup(duties: Record<string, unknown>) {
  const leave: any[] = [
    { id: 'l-aisha', organizationId: ORG, userId: 'u-aisha', startsOn: d('2026-10-01'), endsOn: d('2026-10-02'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null },
    { id: 'l-miriam', organizationId: ORG, userId: 'u-miriam', startsOn: d('2026-10-02'), endsOn: d('2026-10-02'), kind: 'annual', standInUserId: null, status: 'approved', decidedById: 'u-wairimu', decidedAt: null },
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
  const reviews: any[] = [];
  const users = Object.keys(names).map((id) => ({ id, email: null, firstName: names[id][0], lastName: names[id][1], phoneNumber: null, deletedAt: null }));
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => {
      const s = where.organizationId_suite.suite;
      if (s === 'duties') return { isOn: false, answers: duties };
      if (s === 'leave') return { isOn: true, answers: { days: 21, approver: 'Their manager' } };
      if (s === 'time') return { isOn: true, answers: { clients: ['Naivas', 'Lakeside'], approver: 'Their manager' } };
      if (s === 'reviews') return { isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } };
      return null;
    }) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)) },
    person: {
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => matches(p, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => DIRECTORY.filter((p) => matches(p, where))),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => users.filter((u) => matches(u, where))),
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.id === where.id) ?? null),
    },
    leaveRequest: {
      findMany: jest.fn(async ({ where }: any) => leave.filter((r) => matches(r, where))),
      findUnique: jest.fn(async ({ where }: any) => leave.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(leave.find((r) => r.id === where.id), data)),
    },
    timeEntry: { findMany: jest.fn(async ({ where }: any) => hours.filter((h) => matches(h, where))) },
    timeWeek: {
      findMany: jest.fn(async ({ where }: any) => weeks.filter((w) => matches(w, where))),
      upsert: jest.fn(async ({ create }: any) => { weeks.push(create); return create; }),
    },
    timeAgreement: { findMany: jest.fn(async () => []) },
    evaluationDue: {
      findMany: jest.fn(async () => dues),
      findUnique: jest.fn(async ({ where }: any) => dues.find((x) => x.id === where.id) ?? null),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => (!where.evaluationDueId || where.evaluationDueId.in.includes(r.evaluationDueId)) && (!where.personExternalId || r.personExternalId === where.personExternalId))),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const r = { id: `r-${data.personExternalId.slice(2)}`, managersWords: null, theirView: null, decision: null, decisionReasons: null, decidedAt: null, decidedById: null, noticed: null, startedAt: new Date(), ...data };
        reviews.push(r);
        return { id: r.id };
      }),
    },
  };
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { leave: new LeaveBoardService(prisma), time: new TimeSheetsService(prisma), reviews: new ReviewsService(prisma), as, leaveRows: leave, weeks };
}

/** The rules as a later workflow could set them, for leave, time sheets and reviews alike. */
/* One approval step, its rules tried in order (theStepsFor gives a list of steps since build step 4). */
function theRulesAre(rulesOfTheStep: rules.Step) {
  jest.spyOn(rules, 'theStepsFor').mockImplementation((() => [rulesOfTheStep]) as any);
}
afterEach(() => jest.restoreAllMocks());

const hoursOf = (b: any) => b.weeks.flatMap((w: any) => w.people.map((p: any) => [p.name, p.mayApprove]));

describe('Omar, a member who heads Sales, where the department head decides', () => {
  beforeEach(() => theRulesAre(['departmentHead', 'admin']));

  it('leave: opens the board as an approver and reads only Aisha’s request, which waits for him, with who else in Sales is off', async () => {
    const { leave, as } = setup({ departmentHeads: { Sales: 'u-omar' } });
    const b = await leave.board(as('u-omar'), TODAY);
    expect(b.reader).toBe('approver');
    expect(b.waiting).toEqual([{
      id: 'l-aisha', name: 'Aisha Otieno', startsOn: '2026-10-01', endsOn: '2026-10-02', days: 2, daysLeft: 21, team: 'Sales', alsoOff: ['Miriam'],
      /* Added by item 5 of the suites at scale: how many and who, in the sentence the queue says too. */
      clash: { count: 1, names: ['Miriam'], says: 'Miriam is also off on some of those days, so Sales would be two short.' },
      standIn: null, mayDecide: true,
      /* Where it is, in a full sentence (decision 85, build step 4). */
      where: 'It is waiting for you.',
      /* The manager's view in full sentences (decision 85, build step 7). */
      owns: ['Groundwork found nothing Aisha owns that is due on those days.'],
      questions: [],
      /* No kinds of leave and no rules set (build step 8): none said. */
      leaveKind: null,
      rules: [],
      said: [
        'Aisha asked for leave from Thursday 1 October to Friday 2 October, which is 2 working days.',
        'Aisha has 21 days left.',
        'Miriam is also off on some of those days, so Sales would be two short.',
        'Groundwork found nothing Aisha owns that is due on those days.',
      ],
    }]);
    /* Nobody's leave beyond what waits for him: not Miriam's approved day, not Otieno's request. */
    expect(b.off).toEqual([]);
    expect(waitingForYouToApprove({ leave: b.waiting }, ORG).map((n) => [n.title, n.detail])).toEqual([
      ['Aisha asked for leave from Thursday 1 October to Friday 2 October.', 'It is waiting for you to approve.'],
    ]);
  });

  it('leave: Ask Groundwork and WhatsApp read it as waiting for him, and his yes decides it; he cannot decide Otieno’s', async () => {
    const { leave, as, leaveRows } = setup({ departmentHeads: { Sales: 'u-omar' } });
    const waiting = await whatWaitsForYouToDecide(as('u-omar'), { leave });
    expect(waiting.map((w) => aDecisionSaidBack(w, 'approved'))).toEqual([
      "You are approving Aisha's leave from Thursday 1 October to Friday 2 October. Is that right?",
    ]);
    await leave.decide(as('u-omar'), 'l-aisha', 'approved');
    expect(leaveRows[0]).toMatchObject({ status: 'approved', decidedById: 'u-omar' });
    await expect(leave.decide(as('u-omar'), 'l-otieno', 'approved')).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.notYours));
  });

  it('time sheets: reads only Aisha’s hours, approves them, and reads no client’s agreement', async () => {
    const { time, as, weeks } = setup({ departmentHeads: { Sales: 'u-omar' } });
    const b = await time.board(as('u-omar'), TODAY);
    expect(b.reader).toBe('approver');
    expect(hoursOf(b)).toEqual([['Aisha Otieno', true]]);
    expect(b.agreements).toBeNull();
    expect(waitingForYouToApprove({ hours: b.weeks[0].people.map((p: any) => ({ ...p, weekOf: b.weeks[0].weekOf })) }, ORG).map((n) => [n.title, n.detail])).toEqual([
      ['Aisha sent 3 hours on Naivas for Monday 28 September.', 'They are waiting for you to approve.'],
    ]);
    await time.approve(as('u-omar'), 'u-aisha', '2026-09-28', TODAY);
    expect(weeks).toEqual([expect.objectContaining({ userId: 'u-aisha', approvedById: 'u-omar', approvedMinutes: 180 })]);
    await expect(time.approve(as('u-omar'), 'u-otieno', '2026-09-28', TODAY)).rejects.toThrow(new ForbiddenException(TIME_REFUSED.notYours));
  });

  it('reviews: reads only Aisha’s review, which he writes, starts it, and Aisha reads that Omar started it', async () => {
    const { reviews, as } = setup({ departmentHeads: { Sales: 'u-omar' } });
    const b = await reviews.board(as('u-omar'), TODAY);
    expect(b.reader).toBe('approver');
    expect(b.next.map((x) => [x.name, x.writtenWith, x.mayStart])).toEqual([['Aisha Otieno', 'Omar Abdi', true]]);
    expect(reviewsToStartOnToday(b.next, ORG, TODAY).map((n) => n.title)).toEqual(['Aisha’s review is ready for you to start.']);
    const { id } = await reviews.start(as('u-omar'), 'd-aisha');
    expect(await reviews.one(as('u-omar'), id)).toMatchObject({ reader: 'writer', mayWrite: true });
    expect((await reviews.mine(as('u-aisha')))[0].says).toBe('Omar has started your review. You can read it and add your own view before you meet.');
    await expect(reviews.start(as('u-omar'), 'd-otieno')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyTheWriter));
  });
});

describe('everybody else, where Omar heads Sales', () => {
  beforeEach(() => theRulesAre(['departmentHead', 'admin']));

  it('Wairimu, the lead of Sales, still reads Sales, and no longer decides Aisha’s', async () => {
    const { leave, time, reviews, as } = setup({ departmentHeads: { Sales: 'u-omar' } });
    expect((await leave.board(as('u-wairimu'), TODAY)).waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Aisha Otieno', false]]);
    expect(hoursOf(await time.board(as('u-wairimu'), TODAY))).toEqual([['Aisha Otieno', false]]);
    expect((await reviews.board(as('u-wairimu'), TODAY)).next.map((x) => [x.name, x.mayStart])).toEqual([['Aisha Otieno', false]]);
  });

  it('Grace, the admin, reads everything, and decides only Otieno’s, where nobody heads Operations', async () => {
    const { leave, time, reviews, as } = setup({ departmentHeads: { Sales: 'u-omar' } });
    const l = await leave.board(as('u-grace'), TODAY);
    expect(l.reader).toBe('admin');
    expect(l.waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Aisha Otieno', false], ['Otieno Ouma', true]]);
    expect(hoursOf(await time.board(as('u-grace'), TODAY))).toEqual([['Aisha Otieno', false], ['Otieno Ouma', true]]);
    expect((await reviews.board(as('u-grace'), TODAY)).next.map((x) => [x.name, x.mayStart])).toEqual([['Aisha Otieno', false], ['Otieno Ouma', true]]);
  });

  it('Miriam, a member nobody names, and Tomas, a guest, are refused every board and have nothing to decide', async () => {
    const { leave, time, reviews, as } = setup({ departmentHeads: { Sales: 'u-omar' } });
    for (const u of ['u-miriam', 'u-tomas']) {
      await expect(leave.board(as(u), TODAY)).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.onlyAdminsAndLeads));
      await expect(time.board(as(u), TODAY)).rejects.toThrow(new ForbiddenException(TIME_REFUSED.onlyAdminsAndLeads));
      await expect(reviews.board(as(u), TODAY)).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyAdminsAndLeads));
      expect(await whatWaitsForYouToDecide(as(u), { leave, timeSheets: time })).toEqual([]);
    }
  });

  it('Aisha, the requester, never reads her own as waiting, and is refused the boards as a member nobody names', async () => {
    const { leave, as } = setup({ departmentHeads: { Sales: 'u-omar' } });
    await expect(leave.board(as('u-aisha'), TODAY)).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.onlyAdminsAndLeads));
  });
});

describe('Kamau, the lead of Operations, who looks after HR, where HR decides', () => {
  beforeEach(() => theRulesAre(['hr', 'admin']));

  it('reads Aisha’s request from Sales beside his own team’s, and decides both', async () => {
    const { leave, time, reviews, as } = setup({ hr: 'u-kamau' });
    const l = await leave.board(as('u-kamau'), TODAY);
    expect(l.reader).toBe('lead');
    expect(l.waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Aisha Otieno', true], ['Otieno Ouma', true]]);
    expect(hoursOf(await time.board(as('u-kamau'), TODAY))).toEqual([['Aisha Otieno', true], ['Otieno Ouma', true]]);
    expect((await reviews.board(as('u-kamau'), TODAY)).next.map((x) => [x.name, x.writtenWith, x.mayStart])).toEqual([['Aisha Otieno', 'Kamau Njenga', true], ['Otieno Ouma', 'Kamau Njenga', true]]);
    /* Only what waits for him from Sales: Miriam's approved day off is not in his "off" list. */
    expect(l.off.map((o) => o.name)).toEqual([]);
  });

  it('Aisha, a member who looks after HR, decides Otieno’s but never her own, which goes to an admin', async () => {
    const { leave, as } = setup({ hr: 'u-aisha' });
    const grace = await leave.board(as('u-grace'), TODAY);
    expect(grace.waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Aisha Otieno', true], ['Otieno Ouma', false]]);
    const aisha = await leave.board(as('u-aisha'), TODAY);
    expect(aisha.waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Otieno Ouma', true]]);
  });
});

describe('with today’s answers, nothing changes', () => {
  it('Omar, a member, is still refused all three boards, and Wairimu still decides Aisha’s', async () => {
    const { leave, time, reviews, as } = setup({ departmentHeads: { Sales: 'u-omar' } });
    await expect(leave.board(as('u-omar'), TODAY)).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.onlyAdminsAndLeads));
    await expect(time.board(as('u-omar'), TODAY)).rejects.toThrow(new ForbiddenException(TIME_REFUSED.onlyAdminsAndLeads));
    await expect(reviews.board(as('u-omar'), TODAY)).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyAdminsAndLeads));
    const w = await leave.board(as('u-wairimu'), TODAY);
    expect(w.reader).toBe('lead');
    expect(w.waiting.map((x) => [x.name, x.mayDecide])).toEqual([['Aisha Otieno', true]]);
    expect((await leave.board(as('u-kamau'), TODAY)).waiting.map((x) => [x.name, x.mayDecide])).toEqual([['Otieno Ouma', true]]);
  });
});
