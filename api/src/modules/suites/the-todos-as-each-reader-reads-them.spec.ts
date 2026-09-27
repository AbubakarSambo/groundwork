import { readFileSync } from 'fs';
import { join } from 'path';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TodosService, TODOS_REFUSED } from './the-todos.service';

/**
 * TO-DOS, AS EACH PERSON IS SERVED THEM (E8, U.17).
 *
 * Baridi Appliances, 27 September 2026. Four check-ins:
 *   - "Sales team, Q3", run by Wairimu (Sales lead), with Miriam and Aisha. Miriam said she will visit
 *     Westgate Deli on Friday, and sent Green Mart's photo (done). Aisha will ask John Butchery's owner
 *     for a buying date. Wairimu will decide whether a price range counts as money ready.
 *   - "Operations weekly", run by Kamau (Operations lead), with Kwame, who will book the Kisumu van.
 *   - "Product course", a cohort run by Grace (admin), with Wairimu and Miriam, where people are not
 *     named to each other. Miriam will finish the course.
 *   - "Lakeside", run by Brian, another Sales lead, with Aisha, who will call Lakeside's buyer.
 * Miriam has a to-do of her own from chat, "buy milk", which nobody else reads.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads anything while the suite is off; a member, a guest and somebody outside are refused;
 *   - an admin reads every open line in every check-in, in one list for each person;
 *   - a lead reads only lines from check-ins they run or take part in, only for their own team and
 *     themselves, never one from a check-in where people are not named to each other, and never one
 *     from a check-in they read only because it is run from their department;
 *   - a line somebody said is done is not on it; a to-do from chat is never on it;
 *   - nothing is written, no label, no address.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-brian': 'LEAD', 'u-miriam': 'MEMBER', 'u-aisha': 'MEMBER', 'u-kwame': 'MEMBER', 'u-tomas': 'GUEST',
};
const users: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'], 'u-brian': ['Brian', 'Mwangi'],
  'u-miriam': ['Miriam', 'Wanjiku'], 'u-aisha': ['Aisha', 'Otieno'], 'u-kwame': ['Kwame', 'Boateng'], 'u-tomas': ['Tomas', 'Guest'],
};
const dir = (u: string, department: string | null, manager: string | null = null) => ({ externalId: `p-${u.slice(2)}`, linkedUserId: u, department, managerExternalId: manager });
const DIRECTORY = [
  dir('u-grace', null), dir('u-wairimu', 'Sales', 'p-grace'), dir('u-kamau', 'Operations', 'p-grace'), dir('u-brian', 'Sales', 'p-grace'),
  dir('u-miriam', 'Sales', 'p-wairimu'), dir('u-aisha', 'Sales', 'p-wairimu'), dir('u-kwame', 'Operations', 'p-kamau'),
];
const GROUNDS = [
  { id: 'g-sales', organizationId: ORG, initiatorId: 'u-wairimu', createdByUserId: null, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, participants: ['u-wairimu', 'u-miriam', 'u-aisha'] },
  { id: 'g-ops', organizationId: ORG, initiatorId: 'u-kamau', createdByUserId: null, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, participants: ['u-kwame'] },
  { id: 'g-cohort', organizationId: ORG, initiatorId: 'u-grace', createdByUserId: null, scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, participants: ['u-wairimu', 'u-miriam'] },
  { id: 'g-lakeside', organizationId: ORG, initiatorId: 'u-brian', createdByUserId: null, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, participants: ['u-aisha'] },
];
const c = (id: string, groundId: string, userId: string, text: string, day: string, status = 'UNKNOWN') =>
  ({ id, groundId, participantId: `pt-${groundId}-${userId}`, text, status, source: 'CHECK_IN', createdAt: new Date(`${day}T10:00:00Z`), participant: { userId } });
const COMMITMENTS = [
  c('c-1', 'g-sales', 'u-miriam', 'Visit Westgate Deli on Friday', '2026-09-24'),
  c('c-2', 'g-sales', 'u-miriam', 'Send a photo of Green Mart’s written order', '2026-09-22', 'DONE'),
  c('c-3', 'g-sales', 'u-aisha', 'Ask John Butchery’s owner for a buying date on Friday', '2026-09-23'),
  c('c-4', 'g-sales', 'u-wairimu', 'Decide whether a price range counts as money ready', '2026-09-24'),
  c('c-5', 'g-ops', 'u-kwame', 'Book the Kisumu van', '2026-09-21'),
  c('c-6', 'g-cohort', 'u-miriam', 'Finish the product course', '2026-09-20'),
  c('c-7', 'g-lakeside', 'u-aisha', 'Call Lakeside’s buyer on Tuesday', '2026-09-25'),
];

function setup(opts: { on?: boolean } = {}) {
  const writes: string[] = [];
  const todoRead = { count: 0 };
  const inList = (g: any, w: any) => {
    if (w.organizationId !== g.organizationId) return false;
    if (!w.OR) return true;
    return w.OR.some((x: any) => (x.initiatorId && (typeof x.initiatorId === 'string' ? x.initiatorId === g.initiatorId : x.initiatorId.in.includes(g.initiatorId)))
      || (x.createdByUserId && x.createdByUserId === g.createdByUserId)
      || (x.participants && g.participants.includes(x.participants.some.userId)));
  };
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => (
      where.organizationId_suite.organizationId === ORG && where.organizationId_suite.suite === 'todos' ? { isOn: opts.on ?? true } : null)) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: { findMany: jest.fn(async () => DIRECTORY) },
    ground: { findMany: jest.fn(async ({ where }: any) => GROUNDS.filter((g) => inList(g, where))) },
    groundCommitment: {
      findMany: jest.fn(async ({ where }: any) => COMMITMENTS
        .filter((x) => where.groundId.in.includes(x.groundId) && x.status === where.status)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
      update: jest.fn(async () => { writes.push('groundCommitment'); }),
      create: jest.fn(async () => { writes.push('groundCommitment'); }),
    },
    todo: { findMany: jest.fn(async () => { todoRead.count++; return [{ text: 'buy milk' }]; }) },
    user: { findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: users[id][0], lastName: users[id][1], email: `${id}@baridi.example` }))) },
  };
  return { svc: new TodosService(prisma), as: (userId: string) => ({ userId, organizationId: ORG }), writes, todoRead };
}

const LABELS = /\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|score|rating)\b/i;
const shape = (b: any) => b.people.map((p: any) => [p.name, p.todos.map((t: any) => t.text)]);

describe('while the suite is off', () => {
  it('nobody reads the list, not even an admin', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'))).rejects.toThrow(new NotFoundException(TODOS_REFUSED.notOn));
  });
});

describe('who may open the list', () => {
  for (const [who, userId] of [['Miriam, a member', 'u-miriam'], ['a guest', 'u-tomas'], ['somebody outside', 'u-nobody']]) {
    it(`${who} is refused`, async () => {
      const { svc, as } = setup();
      await expect(svc.board(as(userId))).rejects.toThrow(new ForbiddenException(TODOS_REFUSED.onlyAdminsAndLeads));
    });
  }
});

describe('Grace, an admin', () => {
  it('reads every open line in every check-in, in one list for each person, newest first', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'));
    expect(shape(b)).toEqual([
      ['Aisha Otieno', ['Call Lakeside’s buyer on Tuesday', 'Ask John Butchery’s owner for a buying date on Friday']],
      ['Kwame Boateng', ['Book the Kisumu van']],
      ['Miriam Wanjiku', ['Visit Westgate Deli on Friday', 'Finish the product course']],
      ['Wairimu Kamau', ['Decide whether a price range counts as money ready']],
    ]);
    expect(b.people[2].todos[0]).toEqual({ id: 'c-1', text: 'Visit Westgate Deli on Friday', source: 'check-in', on: '2026-09-24' });
  });
});

describe('a lead', () => {
  it('Wairimu reads her team’s lines from the check-in she runs, and her own, and nothing from the cohort or Brian’s', async () => {
    const { svc, as } = setup();
    expect(shape(await svc.board(as('u-wairimu')))).toEqual([
      ['Aisha Otieno', ['Ask John Butchery’s owner for a buying date on Friday']],
      ['Miriam Wanjiku', ['Visit Westgate Deli on Friday']],
      ['Wairimu Kamau', ['Decide whether a price range counts as money ready']],
    ]);
  });

  it('Kamau reads only Kwame’s, and Brian only Aisha’s from the check-in he runs', async () => {
    const { svc, as } = setup();
    expect(shape(await svc.board(as('u-kamau')))).toEqual([['Kwame Boateng', ['Book the Kisumu van']]]);
    /* Aisha is in Brian's department, so in his team, but he reads only the check-in he runs. */
    expect(shape(await svc.board(as('u-brian')))).toEqual([['Aisha Otieno', ['Call Lakeside’s buyer on Tuesday']]]);
  });
});

describe('what the list never holds or does', () => {
  it('never a line somebody said is done, never a to-do from chat, no label and no address', async () => {
    const { svc, as, todoRead } = setup();
    const b = JSON.stringify(await svc.board(as('u-grace')));
    expect(b).not.toMatch(/Green Mart|buy milk/);
    expect(todoRead.count).toBe(0);
    expect(b).not.toMatch(LABELS);
    expect(b).not.toMatch(/@/);
  });

  it('writes nothing, so a check-in’s record is never changed from here', async () => {
    const { svc, as, writes } = setup();
    await svc.board(as('u-grace'));
    expect(writes).toEqual([]);
    const own = readFileSync(join(__dirname, 'the-todos.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(own).not.toMatch(/\.(create|update|upsert|delete)(Many)?\(/);
    expect(own).not.toMatch(/\bprisma\.todo\b/);
  });
});
