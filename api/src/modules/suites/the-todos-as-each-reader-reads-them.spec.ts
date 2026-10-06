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
  { id: 'g-sales', label: 'Sales team, Q3', organizationId: ORG, initiatorId: 'u-wairimu', createdByUserId: null, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, participants: ['u-wairimu', 'u-miriam', 'u-aisha'] },
  { id: 'g-ops', label: 'Operations weekly', organizationId: ORG, initiatorId: 'u-kamau', createdByUserId: null, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, participants: ['u-kwame'] },
  { id: 'g-cohort', label: 'Product course', organizationId: ORG, initiatorId: 'u-grace', createdByUserId: null, scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, participants: ['u-wairimu', 'u-miriam'] },
  { id: 'g-lakeside', label: 'Lakeside', organizationId: ORG, initiatorId: 'u-brian', createdByUserId: null, scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, participants: ['u-aisha'] },
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
/** A self-authored commitment or to-do on PersonObjective, the second table "What you said you'd
 *  do" (your-board.ts) and this board now both read, for the same reason - request 96's fuller
 *  copy sometimes lives here, not on GroundCommitment at all. */
const o = (id: string, groundId: string, userId: string, text: string, day: string, kind: 'COMMITMENT' | 'TODO' = 'COMMITMENT') =>
  ({ id, groundId, text, kind, authoredBy: 'self', status: 'OPEN', createdAt: new Date(`${day}T10:00:00Z`), participant: { userId } });

function setup(opts: { on?: boolean; grounds?: typeof GROUNDS; commitments?: typeof COMMITMENTS; objectives?: any[]; users?: typeof users } = {}) {
  const writes: string[] = [];
  const todoRead = { count: 0 };
  const grounds = opts.grounds ?? GROUNDS;
  const commitments = opts.commitments ?? COMMITMENTS;
  const objectives = opts.objectives ?? [];
  const theUsers = opts.users ?? users;
  const inList = (g: any, w: any) => {
    if (w.organizationId !== g.organizationId) return false;
    if (!w.OR) return true;
    /* An admin's list also carries the scenario clause of request 78: everything but the three evaluation kinds. */
    return w.OR.some((x: any) => (x.scenario && !x.scenario.notIn.includes(g.scenario))
      || (x.initiatorId && (typeof x.initiatorId === 'string' ? x.initiatorId === g.initiatorId : x.initiatorId.in.includes(g.initiatorId)))
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
    ground: { findMany: jest.fn(async ({ where }: any) => grounds.filter((g) => inList(g, where))) },
    groundCommitment: {
      findMany: jest.fn(async ({ where }: any) => commitments
        .filter((x) => where.groundId.in.includes(x.groundId) && x.status === where.status)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
      update: jest.fn(async () => { writes.push('groundCommitment'); }),
      create: jest.fn(async () => { writes.push('groundCommitment'); }),
    },
    personObjective: {
      findMany: jest.fn(async ({ where }: any) => objectives.filter((x) =>
        where.groundId.in.includes(x.groundId) && where.kind.in.includes(x.kind) && x.authoredBy === where.authoredBy && x.status === where.status)),
    },
    todo: { findMany: jest.fn(async () => { todoRead.count++; return [{ text: 'buy milk' }]; }) },
    user: { findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: theUsers[id][0], lastName: theUsers[id][1], email: `${id}@baridi.example` }))) },
  };
  return { svc: new TodosService(prisma), as: (userId: string) => ({ userId, organizationId: ORG }), writes, todoRead };
}

const LABELS = /\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|score|rating)\b/i;
/* CHANGED 7 October 2026 (decision 110, P8): the board is one list for each check-in, with each person's lines inside it, so these cases read the lines of every check-in one after another. */
const flat = (b: any): any[] => b.checkIns.flatMap((c: any) => c.people);
const shape = (b: any) => flat(b).map((p: any) => [p.name, p.todos.map((t: any) => t.text)]);

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
  /* CHANGED 7 October 2026 (decision 110, P8; decision 4). This case read "one list for each person" across check-ins, with Aisha's lines from two
     check-ins joined: one person's load across check-ins, which is private unless they share it. It reads one list for each check-in now. */
  it('reads every open line in every check-in, one list for each check-in with each person inside it, and never one person\'s lines joined across check-ins', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'));
    expect(b.checkIns.map((c: any) => [c.label, c.people.map((p: any) => [p.name, p.todos.map((t: any) => t.text)])])).toEqual([
      ['Lakeside', [['Aisha Otieno', ['Call Lakeside’s buyer on Tuesday']]]],
      ['Operations weekly', [['Kwame Boateng', ['Book the Kisumu van']]]],
      ['Product course', [['Miriam Wanjiku', ['Finish the product course']]]],
      ['Sales team, Q3', [
        ['Aisha Otieno', ['Ask John Butchery’s owner for a buying date on Friday']],
        ['Miriam Wanjiku', ['Visit Westgate Deli on Friday']],
        ['Wairimu Kamau', ['Decide whether a price range counts as money ready']],
      ]],
    ]);
    /* Nobody appears twice inside one check-in, and no list carries a line from a check-in other than its own. */
    for (const c of b.checkIns) {
      expect(new Set(c.people.map((p: any) => p.name)).size).toBe(c.people.length);
      for (const p of c.people) for (const t of p.todos) expect(t.checkIn).toBe(c.label);
    }
    /* The same person is in two lists (Aisha, in two check-ins), and nothing says so. */
    expect(b.checkIns.filter((c: any) => c.people.some((p: any) => p.name === 'Aisha Otieno')).length).toBeGreaterThan(1);
    expect(b).not.toHaveProperty('people');
    expect(JSON.stringify(b)).not.toMatch(/"total"|"across"|"load"/);
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

describe('each line, as an action, with where it came from (fault B)', () => {
  it('takes off a leading "I will" and capitalises what is left, and names the check-in it came from', async () => {
    const extra = c('c-9', 'g-sales', 'u-aisha', 'I will take Lakeside the signed order form', '2026-09-26');
    const { svc, as } = setup({ commitments: [...COMMITMENTS, extra] });
    const b = await svc.board(as('u-wairimu'));
    const aisha = flat(b).find((p) => p.name === 'Aisha Otieno')!;
    expect(aisha.todos[0]).toEqual({ id: 'c-9', text: 'Take Lakeside the signed order form', source: 'check-in', on: '2026-09-26', checkIn: 'Sales team, Q3' });
    /* "Ask John Butchery's owner..." carries no leading "I will", so it is unchanged but for the
       check-in it names. */
    expect(aisha.todos[1]).toEqual({ id: 'c-3', text: 'Ask John Butchery’s owner for a buying date on Friday', source: 'check-in', on: '2026-09-23', checkIn: 'Sales team, Q3' });
  });

  it('where the same promise is written twice, a short one and a fuller dated one, shows only the fuller one', async () => {
    const extra = c('c-8', 'g-sales', 'u-miriam', 'I will visit Westgate Deli on Friday to show them the fridges', '2026-09-26');
    const { svc, as } = setup({ commitments: [...COMMITMENTS, extra] });
    const b = await svc.board(as('u-wairimu'));
    const miriam = flat(b).find((p) => p.name === 'Miriam Wanjiku')!;
    expect(miriam.todos.map((t: any) => t.text)).not.toContain('Visit Westgate Deli on Friday');
    expect(miriam.todos.map((t: any) => t.text)).toContain('Visit Westgate Deli on Friday to show them the fridges');
    expect(miriam.todos).toHaveLength(1);
  });

  /* Signup stores whatever was typed for "Your name" whole, in `firstName` (AuthPage.tsx), so an
     account like Rukia's carries "Rukia Otieno" there. The source line used to read "From Rukia
     Otieno's check-in..." - group 2's review found this live. Only the first word is used. */
  it('names the person by the first word of their first name, when the account holds a whole name', async () => {
    const { svc, as } = setup({ users: { ...users, 'u-miriam': ['Rukia Otieno', 'Wanjiku'] } });
    const b = await svc.board(as('u-wairimu'));
    const miriam = flat(b).find((p) => p.name === 'Rukia Otieno Wanjiku')!;
    expect(miriam.firstName).toBe('Rukia');
  });

  /* The re-review: the board still showed the short copy ("File the bundle", "Call the client",
     "Plan shorter routes") because it only read GroundCommitment, while the fuller, dated copy of
     the same promise is sometimes a self-authored PersonObjective instead - exactly what the You
     board's "What you said you'd do" already reads both tables for. */
  it('where the fuller copy of a promise is a self-authored objective and the short copy a commitment, shows only the fuller one', async () => {
    const objectives = [o('o-1', 'g-sales', 'u-miriam', 'I will file the bundle once the reply is settled', '2026-09-26')];
    const extra = c('c-9', 'g-sales', 'u-miriam', 'I will file the bundle', '2026-09-20');
    const { svc, as } = setup({ commitments: [...COMMITMENTS, extra], objectives });
    const b = await svc.board(as('u-wairimu'));
    const miriam = flat(b).find((p) => p.name === 'Miriam Wanjiku')!;
    expect(miriam.todos.map((t: any) => t.text)).not.toContain('File the bundle');
    expect(miriam.todos.map((t: any) => t.text)).toContain('File the bundle once the reply is settled');
  });

  it('an objective from a check-in the reader may not read never appears', async () => {
    /* Aisha is in Wairimu's team, but "Lakeside" is run by Brian, not Wairimu, and Wairimu does
       not take part in it - the same check-in the existing commitment test already shows is
       withheld from her (c-7, "Call Lakeside's buyer"). */
    const objectives = [o('o-2', 'g-lakeside', 'u-aisha', 'I will send Lakeside the trade references', '2026-09-26')];
    const { svc, as } = setup({ objectives });
    const b = await svc.board(as('u-wairimu'));
    expect(JSON.stringify(b)).not.toContain('trade references');
    /* Grace, an admin, reads every check-in, so she does see it. */
    const forGrace = await svc.board(as('u-grace'));
    expect(JSON.stringify(forGrace)).toContain('trade references');
  });
});

/**
 * PRIVACY, THE MORE PRIVATE OPTION (decision 5, request 78): the to-dos board reads the same list of
 * check-ins any read of the organisation does (`groundsAViewerMayList`,
 * grounds/who-may-read-this-check-in.ts), so an admin who was not given access to a performance plan,
 * a promotion or a renewal never has its lines reach this board either - the same rule the engine
 * already proved for grounds and the board (an-admin-does-not-read-an-evaluation-check-in-in-grounds-
 * or-on-the-board.spec.ts).
 */
describe('an admin does not read an evaluation check-in’s to-dos, without access', () => {
  const evalGrounds = [
    { id: 'g-plan', label: 'Faith, first 90 days', organizationId: ORG, initiatorId: 'u-wairimu', createdByUserId: null, scenario: 'PIP', peersVisibleToEachOther: null, participants: ['u-wairimu', 'u-miriam'] },
  ];
  const evalCommitments = [
    c('c-plan', 'g-plan', 'u-miriam', 'I will bring proof of the five visits', '2026-09-24'),
  ];

  it('Grace, an admin with no access to the plan, reads nothing from it', async () => {
    const { svc, as } = setup({ grounds: evalGrounds, commitments: evalCommitments });
    const b = await svc.board(as('u-grace'));
    expect(b.checkIns).toEqual([]);
  });

  it('Wairimu, who runs it, still reads Miriam’s line', async () => {
    const { svc, as } = setup({ grounds: evalGrounds, commitments: evalCommitments });
    const b = await svc.board(as('u-wairimu'));
    expect(flat(b).map((p) => p.name)).toEqual(['Miriam Wanjiku']);
  });
});
