import { ForbiddenException } from '@nestjs/common';
import { LeaveBoardService } from './the-leave-board.service';

/**
 * WHAT THE PERSON WHO DECIDES A LEAVE REQUEST READS (decision 85, item 1; build step 7), AS EACH
 * PERSON IS SERVED IT.
 *
 * Baridi Appliances, on Monday 5 October 2026. Each person has 21 days a year; the manager approves.
 *   - Aisha, in Sales, asks for Monday 12 to Friday 16 October. Wairimu leads Sales and is her manager.
 *   - Brian (Wednesday 14 October) and Neema (Monday 12 and Tuesday 13 October), both in Sales, are
 *     already off on some of those days.
 *   - On "Sales, Q3", which Wairimu runs: Aisha said she would send the Atlas price list by Thursday
 *     15 October; her target "Sign 12 shops" is due on Friday 16 October; she owns the work-plan item
 *     "Project X milestone", due on Thursday 15 October. A commitment already kept, and one due after
 *     her leave, are not hers to cover.
 *   - On "Aisha, support plan", a performance plan Wairimu runs: a target "Close 3 overdue invoices",
 *     due on Tuesday 13 October, and a target the lead marked as a decision about Aisha.
 *   - On "Depot rollout", which Kamau (lead of Operations) runs, Aisha owns "Kisumu depot check",
 *     due on Tuesday 13 October.
 *   - The organisation's own system says Aisha owns the project "Open the Nakuru shop", due on
 *     Wednesday 14 October.
 * Grace is an admin who runs none of these. Kamau leads Operations. Miriam is in Sales.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-10-05T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-aisha': 'MEMBER', 'u-brian': 'MEMBER', 'u-neema': 'MEMBER', 'u-miriam': 'MEMBER',
};
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'], 'u-aisha': ['Aisha', 'Otieno'],
  'u-brian': ['Brian', 'Mwangi'], 'u-neema': ['Neema', 'Achieng'], 'u-miriam': ['Miriam', 'Wanjiku'],
};
const person = (u: string, department: string | null, manager: string | null) =>
  ({ linkedUserId: u, externalId: `p-${u.slice(2)}`, department, managerExternalId: manager, active: true, email: null });
const directory = [
  person('u-grace', 'Finance', null), person('u-wairimu', 'Sales', null), person('u-kamau', 'Operations', null),
  person('u-aisha', 'Sales', 'p-wairimu'), person('u-brian', 'Sales', 'p-wairimu'), person('u-neema', 'Sales', 'p-wairimu'),
  person('u-miriam', 'Sales', 'p-wairimu'),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const leave = (id: string, userId: string, from: string, to: string, status: string) =>
  ({ id, organizationId: ORG, userId, startsOn: d(from), endsOn: d(to), kind: 'annual', standInUserId: null, status, decidedById: null, decidedAt: null });

const grounds = [
  { id: 'g-sales', label: 'Sales, Q3', organizationId: ORG, initiatorId: 'u-wairimu', scenario: 'OKR_ALIGNMENT', createdByUserId: null, status: 'ACTIVE', approvedById: null, participants: [{ userId: 'u-aisha' }, { userId: 'u-miriam' }] },
  { id: 'g-pip', label: 'Aisha, support plan', organizationId: ORG, initiatorId: 'u-wairimu', scenario: 'PIP', createdByUserId: null, status: 'ACTIVE', approvedById: null, participants: [{ userId: 'u-aisha' }] },
  { id: 'g-ops', label: 'Depot rollout', organizationId: ORG, initiatorId: 'u-kamau', scenario: 'NEW_PROJECT', createdByUserId: null, status: 'ACTIVE', approvedById: null, participants: [{ userId: 'u-aisha' }] },
];
const participants = [
  { id: 'gp-aisha-sales', groundId: 'g-sales', userId: 'u-aisha' },
  { id: 'gp-aisha-pip', groundId: 'g-pip', userId: 'u-aisha' },
  { id: 'gp-aisha-ops', groundId: 'g-ops', userId: 'u-aisha' },
];
const commitments = [
  { personExternalId: 'p-aisha', text: 'Send the Atlas price list.', dueAt: d('2026-10-15'), state: 'OPEN', sourceGroundId: 'g-sales' },
  { personExternalId: 'p-aisha', text: 'Book the Mombasa trip', dueAt: d('2026-10-13'), state: 'KEPT', sourceGroundId: 'g-sales' },
  { personExternalId: 'p-aisha', text: 'Write the November plan', dueAt: d('2026-10-20'), state: 'OPEN', sourceGroundId: 'g-sales' },
];
const targets = [
  { name: 'Sign 12 shops', dueOn: d('2026-10-16'), groundId: 'g-sales', ownerParticipantId: 'gp-aisha-sales', isADecisionAboutAPerson: false },
  { name: 'Close 3 overdue invoices', dueOn: d('2026-10-13'), groundId: 'g-pip', ownerParticipantId: 'gp-aisha-pip', isADecisionAboutAPerson: false },
  { name: 'Decide whether to confirm Aisha', dueOn: d('2026-10-14'), groundId: 'g-pip', ownerParticipantId: 'gp-aisha-pip', isADecisionAboutAPerson: true },
];
const work = [
  { name: 'Project X milestone', dueAt: d('2026-10-15'), groundId: 'g-sales', ownerParticipantId: 'gp-aisha-sales' },
  { name: 'Kisumu depot check', dueAt: d('2026-10-13'), groundId: 'g-ops', ownerParticipantId: 'gp-aisha-ops' },
];
const subjects = [
  { organizationId: ORG, ownerExternalId: 'p-aisha', type: 'PROJECT', title: 'Open the Nakuru shop', dueDate: d('2026-10-14'), status: 'In progress', sourceDeletedAt: null },
  { organizationId: ORG, ownerExternalId: 'p-aisha', type: 'PROJECT', title: 'Paint the Thika shop', dueDate: d('2026-10-14'), status: 'Done', sourceDeletedAt: null },
];

const within = (x: Date, w: any) => (!w?.gte || x >= w.gte) && (!w?.lt || x < w.lt);

function setup(opts: { nothingOwned?: boolean } = {}) {
  const rows: any[] = [
    leave('r-aisha', 'u-aisha', '2026-10-12', '2026-10-16', 'waiting'),
    leave('r-brian', 'u-brian', '2026-10-14', '2026-10-14', 'approved'),
    leave('r-neema', 'u-neema', '2026-10-12', '2026-10-13', 'approved'),
  ];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) =>
      where.organizationId_suite.suite === 'leave' ? { isOn: true, answers: { days: 21, approver: 'Their manager' } } : null) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId } = where.userId_organizationId;
      return roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: {
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) =>
        (where.linkedUserId ? p.linkedUserId === where.linkedUserId : true) && (where.externalId ? p.externalId === where.externalId : true)) ?? null),
      findMany: jest.fn(async ({ where }: any) => directory.filter((p) => (where.linkedUserId?.in ?? []).includes(p.linkedUserId))),
    },
    user: { findMany: jest.fn(async ({ where }: any) => (where.id?.in ?? []).filter((id: string) => names[id]).map((id: string) => ({ id, firstName: names[id][0], lastName: names[id][1], email: null }))) },
    leaveRequest: {
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => (!where.userId || r.userId === where.userId) && (!where.status || where.status.in.includes(r.status)))),
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
    },
    commitment: { findMany: jest.fn(async ({ where }: any) => (opts.nothingOwned ? [] : commitments).filter((c) =>
      c.personExternalId === where.personExternalId && where.state.in.includes(c.state) && within(c.dueAt, where.dueAt))) },
    subject: { findMany: jest.fn(async ({ where }: any) => (opts.nothingOwned ? [] : subjects).filter((s) =>
      s.ownerExternalId === where.ownerExternalId && where.type.in.includes(s.type) && within(s.dueDate, where.dueDate))) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => (opts.nothingOwned ? [] : participants).filter((p) => p.userId === where.userId)) },
    groundObjective: { findMany: jest.fn(async ({ where }: any) => targets.filter((t) =>
      where.ownerParticipantId.in.includes(t.ownerParticipantId) && t.isADecisionAboutAPerson === where.isADecisionAboutAPerson && within(t.dueOn, where.dueOn))) },
    workItem: { findMany: jest.fn(async ({ where }: any) => work.filter((w) => where.ownerParticipantId.in.includes(w.ownerParticipantId) && within(w.dueAt, where.dueAt))) },
    ground: { findMany: jest.fn(async ({ where }: any) => grounds.filter((g) => where.id.in.includes(g.id))) },
  };
  const svc = new LeaveBoardService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as };
}

const aishaFor = async (svc: LeaveBoardService, userId: string) =>
  (await svc.board({ userId, organizationId: ORG }, TODAY)).waiting.find((w) => w.id === 'r-aisha');

describe('Wairimu, Aisha’s manager, who decides it', () => {
  it('reads the days, the days left, who else in Sales is off and everything Aisha owns then, in full sentences with names', async () => {
    const { svc } = setup();
    const w = await aishaFor(svc, 'u-wairimu');
    expect(w?.mayDecide).toBe(true);
    expect(w?.said).toEqual([
      'Aisha asked for leave from Monday 12 October to Friday 16 October, which is 5 working days.',
      'Aisha has 21 days left.',
      'Brian and Neema are also off on some of those days, so Sales would be three short.',
      'Aisha\'s target “Close 3 overdue invoices” on Aisha, support plan is due on Tuesday 13 October.',
      'Aisha owns “Open the Nakuru shop”, due on Wednesday 14 October.',
      'Aisha committed to “Send the Atlas price list”, due on Thursday 15 October.',
      'Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 15 October.',
      'Aisha\'s target “Sign 12 shops” on Sales, Q3 is due on Friday 16 October.',
    ]);
  });

  it('never reads a target the lead marked as a decision about Aisha, a commitment already kept, one due after the leave, or a project already done', async () => {
    const { svc } = setup();
    const said = (await aishaFor(svc, 'u-wairimu'))!.said.join(' ');
    for (const never of ['Decide whether to confirm Aisha', 'Book the Mombasa trip', 'Write the November plan', 'Paint the Thika shop']) expect(said).not.toContain(never);
  });

  it('does not read what Aisha owns on a check-in run in Operations that Wairimu cannot open, and is not told "nothing"', async () => {
    const { svc } = setup();
    const w = await aishaFor(svc, 'u-wairimu');
    expect(w!.said.join(' ')).not.toContain('Kisumu depot check');
    expect(w!.owns.join(' ')).not.toContain('found nothing');
  });
});

describe('Grace, an admin who runs none of these check-ins', () => {
  it('reads what Aisha owns on the ordinary check-in and from the organisation’s own system, but nothing from Aisha’s performance plan', async () => {
    const { svc } = setup();
    const w = await aishaFor(svc, 'u-grace');
    expect(w?.mayDecide).toBe(false);
    expect(w?.owns).toEqual([
      'Aisha owns “Open the Nakuru shop”, due on Wednesday 14 October.',
      'Aisha owns “Kisumu depot check” on Depot rollout, due on Tuesday 13 October.',
      'Aisha committed to “Send the Atlas price list”, due on Thursday 15 October.',
      'Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 15 October.',
      'Aisha\'s target “Sign 12 shops” on Sales, Q3 is due on Friday 16 October.',
    ].sort((a, b) => order(a) - order(b)));
    expect(w!.said.join(' ')).not.toContain('Close 3 overdue invoices');
    expect(w!.said.join(' ')).not.toContain('support plan');
  });
});

/* Sorted by the day due, as served. */
const DAYS = ['Tuesday 13', 'Wednesday 14', 'Thursday 15', 'Friday 16'];
const order = (s: string) => DAYS.findIndex((x) => s.includes(x));

describe('Kamau, who leads Operations', () => {
  it('is not served Aisha’s request at all: she is not in his team and he does not decide it', async () => {
    const { svc } = setup();
    expect(await aishaFor(svc, 'u-kamau')).toBeUndefined();
  });
});

describe('Miriam, a colleague in Sales, and Aisha herself', () => {
  it('Miriam is refused the board, so reads nothing of what Aisha owns', async () => {
    const { svc, as } = setup();
    await expect(svc.board(as('u-miriam'), TODAY)).rejects.toThrow(ForbiddenException);
  });

  it('Aisha reads her own request as before, with nothing about what she owns added to it', async () => {
    const { svc, as } = setup();
    const mine = await svc.mine(as('u-aisha'), TODAY);
    expect(mine.requests).toHaveLength(1);
    expect(JSON.stringify(mine)).not.toContain('Project X');
  });
});

describe('when Aisha owns nothing in those days', () => {
  it('Wairimu is told so plainly', async () => {
    const { svc } = setup({ nothingOwned: true });
    const w = await aishaFor(svc, 'u-wairimu');
    expect(w?.owns).toEqual(['Groundwork found nothing Aisha owns that is due on those days.']);
  });
});
