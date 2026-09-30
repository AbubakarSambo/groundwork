import { YourBoardService, NOT_YOURS } from './your-board.service';
import { YouController } from './you.controller';

/**
 * EVERYTHING ASKED OF YOU, AS EACH PERSON IS SERVED IT (D3, U.16).
 *
 * Each person's load across check-ins is theirs alone. One organisation, three check-ins:
 *   - "Sales team, Q3": Wairimu runs it; Miriam and Brian take part. People see each other.
 *   - "Supplier review": Grace, an admin, runs it; Miriam takes part.
 *   - "Kwame, first 90 days": Wairimu runs it; Kwame and Miriam take part. People give their
 *     accounts without seeing each other.
 * A fourth, "Finance, Q3", has a request on Miriam's email in it, but Miriam is not in it.
 *
 * The rule under test: Miriam reads every open request on her, from every check-in she is in, and
 * nobody else reads it: not Wairimu who runs two of them, not Grace the admin, not Brian her
 * colleague. Where a check-in hides people from each other, the request is hers without the name.
 */

const ORG = 'org-baridi';
const NOW = Date.now();
const ago = (days: number) => new Date(NOW - days * 86_400_000);

const people = {
  wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', role: 'LEAD' },
  miriam: { userId: 'u-miriam', email: 'miriam@baridi.test', role: 'MEMBER' },
  brian: { userId: 'u-brian', email: 'brian@baridi.test', role: 'MEMBER' },
  grace: { userId: 'u-grace', email: 'grace@baridi.test', role: 'ADMIN' },
  kwame: { userId: 'u-kwame', email: 'kwame@baridi.test', role: 'MEMBER' },
};

const ground = (id: string, label: string, initiatorId: string, participants: { id: string; userId: string }[], extra: any = {}) => ({
  id, label, status: 'ACTIVE', organizationId: ORG, initiatorId, closedAt: null, resolvedAt: null, participants, checkIns: [], ...extra,
});

const sales = ground('g-sales', 'Sales team, Q3', 'u-wairimu', [
  { id: 'p-s-wairimu', userId: 'u-wairimu' }, { id: 'p-s-miriam', userId: 'u-miriam' }, { id: 'p-s-brian', userId: 'u-brian' },
]);
const supplier = ground('g-supplier', 'Supplier review', 'u-grace', [
  { id: 'p-r-grace', userId: 'u-grace' }, { id: 'p-r-miriam', userId: 'u-miriam' },
]);
const kwame90 = ground('g-kwame', 'Kwame, first 90 days', 'u-wairimu', [
  { id: 'p-k-wairimu', userId: 'u-wairimu' }, { id: 'p-k-kwame', userId: 'u-kwame' }, { id: 'p-k-miriam', userId: 'u-miriam' },
]);
const finance = ground('g-finance', 'Finance, Q3', 'u-grace', [{ id: 'p-f-grace', userId: 'u-grace' }]);
const ended = ground('g-ended', 'Old launch', 'u-wairimu', [
  { id: 'p-e-wairimu', userId: 'u-wairimu' }, { id: 'p-e-miriam', userId: 'u-miriam' },
], { status: 'CLOSED', closedAt: ago(30) });
const all: any[] = [sales, supplier, kwame90, finance, ended];

const who = (userId: string, firstName: string, lastName: string) => ({ userId, email: `${firstName.toLowerCase()}@baridi.test`, nameGiven: null, user: { firstName, lastName } });
const shown = { label: 'Sales team, Q3', initiatorId: 'u-wairimu', scenario: 'TEAM_PERFORMANCE', peersVisibleToEachOther: true };
const dep = (id: string, groundId: string, from: string, fromWho: any, on: string, what: string, createdAt: Date, g: any, extra: any = {}) => ({
  id, groundId, fromParticipantId: from, onParticipantId: on, onLabel: null, what, status: 'WAITING', namedTheThing: true,
  clearedAt: null, createdAt, fromParticipant: fromWho, ground: g, ...extra,
});

const dependencies = [
  dep('d-1', 'g-sales', 'p-s-wairimu', who('u-wairimu', 'Wairimu', 'Kamau'), 'p-s-miriam', 'What would get Westgate’s deposit paid', ago(1), shown),
  dep('d-2', 'g-sales', 'p-s-brian', who('u-brian', 'Brian', 'Otieno'), 'p-s-miriam', 'Westgate’s trade references, for Finance', ago(3), shown),
  dep('d-3', 'g-supplier', 'p-r-grace', who('u-grace', 'Grace', 'Achieng'), 'p-r-miriam', 'Delivery times you have seen from each supplier', ago(2),
    { label: 'Supplier review', initiatorId: 'u-grace', scenario: 'TEAM_PERFORMANCE', peersVisibleToEachOther: true }),
  dep('d-4', 'g-kwame', 'p-k-kwame', who('u-kwame', 'Kwame', 'Boateng'), 'p-k-miriam', 'The demo freezer booking for Thursday', ago(4),
    { label: 'Kwame, first 90 days', initiatorId: 'u-wairimu', scenario: 'PIP', peersVisibleToEachOther: false }),
  /* On Wairimu, from Miriam: Wairimu's load, never Miriam's. */
  dep('d-5', 'g-sales', 'p-s-miriam', who('u-miriam', 'Miriam', 'Wanjiku'), 'p-s-wairimu', 'The price range for Mama Fresh orders', ago(2), shown),
  /* Cleared, so no longer asked of anybody. */
  dep('d-6', 'g-sales', 'p-s-brian', who('u-brian', 'Brian', 'Otieno'), 'p-s-miriam', 'CLEARED-ONE: the old customer list', ago(9), shown, { status: 'CLEARED', clearedAt: ago(5) }),
  /* In a check-in Miriam is not in. */
  dep('d-7', 'g-finance', 'p-f-grace', who('u-grace', 'Grace', 'Achieng'), 'p-f-someone', 'FINANCE-ONLY: the credit terms for Westgate Deli', ago(2),
    { label: 'Finance, Q3', initiatorId: 'u-grace', scenario: 'TEAM_PERFORMANCE', peersVisibleToEachOther: true }),
  /* In a check-in that has ended. */
  dep('d-8', 'g-ended', 'p-e-wairimu', who('u-wairimu', 'Wairimu', 'Kamau'), 'p-e-miriam', 'ENDED-ONE: the launch photos from last month', ago(40),
    { label: 'Old launch', initiatorId: 'u-wairimu', scenario: 'TEAM_PERFORMANCE', peersVisibleToEachOther: true }),
];

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'equals' in v) return String(row[k]).toLowerCase() === String(v.equals).toLowerCase();
    return row[k] === v;
  });
}
const table = (rows: any[]) => ({
  findMany: jest.fn(async ({ where }: any) => rows.filter((r) => matches(r, where))),
  findFirst: jest.fn(async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null),
});

function setup() {
  const prisma: any = {
    /* The You board reads the person's own patterns (29 September); none here. */
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    personObjective: table([]), groundObjective: table([]), groundCommitment: table([]), coachingState: table([]),
    person: table([]), todo: table([]), groundDependency: table(dependencies),
  };
  const grounds: any = {
    list: jest.fn(async (_org: string, userId: string, _email: string, role: string) =>
      role === 'ADMIN' ? all : all.filter((g) => g.initiatorId === userId || g.participants.some((p: any) => p.userId === userId))),
  };
  const svc = new YourBoardService(prisma, grounds);
  const read = (w: keyof typeof people, askedFor?: string) => svc.forReader({ ...people[w], organizationId: ORG }, askedFor);
  return { svc, prisma, grounds, read };
}

describe('Miriam reads everything asked of her, across her check-ins', () => {
  it('is served every open request on her, oldest first, with who asked and where', async () => {
    const { read } = setup();
    const b = await read('miriam');
    expect(b.askedOfYou?.items.map((i) => [i.who, i.checkIn, i.what])).toEqual([
      [null, 'Kwame, first 90 days', 'The demo freezer booking for Thursday'],
      ['Brian Otieno', 'Sales team, Q3', 'Westgate’s trade references, for Finance'],
      ['Grace Achieng', 'Supplier review', 'Delivery times you have seen from each supplier'],
      ['Wairimu Kamau', 'Sales team, Q3', 'What would get Westgate’s deposit paid'],
    ]);
    expect(b.askedOfYou?.items[0].asked).toBe(ago(4).toISOString());
    expect(b.askedOfYou?.says).toBe('4 requests from 4 people across 3 check-ins.');
  });

  it('leaves out what is cleared, what is on somebody else, and anything from a check-in that has ended or that she is not in', async () => {
    const { read } = setup();
    const b = await read('miriam');
    const all = JSON.stringify(b);
    for (const not of ['CLEARED-ONE', 'Mama Fresh', 'FINANCE-ONLY', 'Finance, Q3', 'ENDED-ONE']) expect(all).not.toContain(not);
    /* The ended check-in is still in "Your work in each"; it simply asks nothing of her now. */
    expect(JSON.stringify(b.askedOfYou)).not.toContain('Old launch');
  });

  it('never names who asked on a check-in where people do not see each other', async () => {
    const { read } = setup();
    const b = await read('miriam');
    const hidden = b.askedOfYou!.items.find((i) => i.checkIn === 'Kwame, first 90 days')!;
    expect(hidden.who).toBeNull();
    expect(JSON.stringify(hidden)).not.toMatch(/Kwame Boateng|u-kwame|kwame@/);
  });

  it('never says how anybody was rated, and puts no label on anybody', async () => {
    const { read } = setup();
    const said = JSON.stringify((await read('miriam')).askedOfYou);
    expect(said).not.toMatch(/specificity|confidence|severity|rating|score|verifiab/i);
    expect(said).not.toMatch(/\bPIP\b|at risk|\bexit\b/i);
  });
});

describe('nobody else reads Miriam’s load', () => {
  it.each([
    ['Wairimu, who runs two of her check-ins', 'wairimu'],
    ['Grace, an admin who runs one of them', 'grace'],
    ['Brian, her colleague in Sales', 'brian'],
    ['Kwame, her colleague in his own check-in', 'kwame'],
  ] as const)('%s is refused her board, before anything is read', async (_w, reader) => {
    const { read, prisma, grounds } = setup();
    await expect(read(reader, 'u-miriam')).rejects.toThrow(NOT_YOURS);
    expect(grounds.list).not.toHaveBeenCalled();
    expect(prisma.groundDependency.findMany).not.toHaveBeenCalled();
  });

  it('Wairimu’s own board carries only what is asked of her', async () => {
    const { read } = setup();
    const b = await read('wairimu');
    expect(b.askedOfYou?.items.map((i) => [i.who, i.checkIn, i.what])).toEqual([
      ['Miriam Wanjiku', 'Sales team, Q3', 'The price range for Mama Fresh orders'],
    ]);
    expect(b.askedOfYou?.says).toBe('1 request from 1 person across 1 check-in.');
    const said = JSON.stringify(b);
    for (const hers of ['Westgate', 'freezer', 'Delivery times']) expect(said).not.toContain(hers);
  });

  it.each(['grace', 'brian', 'kwame'] as const)('%s’s own board carries nothing asked of Miriam', async (reader) => {
    const { read } = setup();
    const b = await read(reader);
    expect(b).not.toHaveProperty('askedOfYou');
    const said = JSON.stringify(b);
    for (const hers of ['Westgate', 'freezer', 'Delivery times', 'Mama Fresh']) expect(said).not.toContain(hers);
  });

  it('the door refuses everybody else at /you/:userId and /you?userId=', async () => {
    const { svc } = setup();
    const door = new YouController(svc);
    for (const w of ['wairimu', 'grace', 'brian', 'kwame'] as const) {
      const as = { id: people[w].userId, email: people[w].email, organizationId: ORG, role: people[w].role } as any;
      await expect(door.someone(as, 'u-miriam')).rejects.toThrow(NOT_YOURS);
      await expect(door.mine(as, 'u-miriam')).rejects.toThrow(NOT_YOURS);
    }
  });
});
