import { NotFoundException } from '@nestjs/common';
import { CheckInLinksService } from './check-in-links.service';
import { CheckInLinksController } from './check-in-links.controller';

/**
 * LINKS BETWEEN CHECK-INS, AS EACH READER IS SERVED THEM (D3, U.16).
 *
 * One organisation, four check-ins:
 *   - "Sales team, Q3": Wairimu runs it; Miriam and Brian take part. People see each other.
 *   - "Distribution operations": Fatuma runs it; Wairimu and Miriam take part.
 *   - "Finance, Q3": Grace, an admin, runs it; Amani takes part. Wairimu and Miriam are not in it.
 *   - "Kwame, first 90 days": Wairimu runs it; Kwame and Miriam take part. People do not see each other.
 * And Omar, a lead in another organisation.
 *
 * The rule under test: each reader sees a link only from a check-in they may already open. Never a
 * check-in's name, a person or a blocker from a check-in the reader cannot open.
 */

const ORG = 'org-baridi';
const NOW = Date.now();
const ago = (days: number) => new Date(NOW - days * 86_400_000);

const people = {
  wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', role: 'LEAD', organizationId: ORG },
  miriam: { userId: 'u-miriam', email: 'miriam@baridi.test', role: 'MEMBER', organizationId: ORG },
  brian: { userId: 'u-brian', email: 'brian@baridi.test', role: 'MEMBER', organizationId: ORG },
  fatuma: { userId: 'u-fatuma', email: 'fatuma@baridi.test', role: 'LEAD', organizationId: ORG },
  grace: { userId: 'u-grace', email: 'grace@baridi.test', role: 'ADMIN', organizationId: ORG },
  omar: { userId: 'u-omar', email: 'omar@kijani.test', role: 'LEAD', organizationId: 'org-kijani' },
};

const g = (id: string, label: string, initiatorId: string, userIds: string[], peersVisibleToEachOther = true) => ({
  id, label, organizationId: ORG, initiatorId, scenario: peersVisibleToEachOther ? 'TEAM_PERFORMANCE' : 'PIP', peersVisibleToEachOther,
  participants: userIds.map((u) => ({ id: `p-${id}-${u}`, userId: u })),
});
const sales = g('sales', 'Sales team, Q3', 'u-wairimu', ['u-wairimu', 'u-miriam', 'u-brian']);
const ops = g('ops', 'Distribution operations', 'u-fatuma', ['u-fatuma', 'u-wairimu', 'u-miriam']);
const finance = g('finance', 'Finance, Q3', 'u-grace', ['u-grace', 'u-amani']);
const kwame = g('kwame', 'Kwame, first 90 days', 'u-wairimu', ['u-wairimu', 'u-kwame', 'u-miriam'], false);
const all: any[] = [sales, ops, finance, kwame];

const from = (groundId: string, userId: string, firstName: string) => ({
  fromParticipantId: `p-${groundId}-${userId}`, fromParticipant: { userId, nameGiven: null, user: { firstName, lastName: 'X' } },
});
const link = (id: string, groundId: string, who: any, onLabel: string | null, what: string, waitingOnGroundId: string | null, days: number, extra: any = {}) => ({
  id, groundId, ...who, onParticipantId: null, onParticipant: null, onLabel, what, status: 'WAITING', namedTheThing: true,
  clearedAt: null, createdAt: ago(days), waitingOnGroundId, ...extra,
});

const rows = [
  link('l-stock', 'sales', from('sales', 'u-wairimu', 'Wairimu'), 'Operations', 'Stock for Green Mart’s January order', 'ops', 11),
  link('l-terms', 'sales', from('sales', 'u-miriam', 'Miriam'), 'Finance', 'Credit terms for Westgate Deli', 'finance', 13),
  link('l-plain', 'sales', from('sales', 'u-brian', 'Brian'), 'Mama Fresh', 'NOT-LINKED: a reply from Mama Fresh about prices', null, 5),
  link('l-cleared', 'sales', from('sales', 'u-brian', 'Brian'), 'Operations', 'CLEARED-LINK: the truck for Thursday deliveries', 'ops', 20, { status: 'CLEARED', clearedAt: ago(2) }),
  link('l-fin', 'finance', from('finance', 'u-amani', 'Amani'), 'Sales', 'FINANCE-SECRET: the enterprise pricing sheet', 'sales', 6),
  link('l-kwame', 'kwame', from('kwame', 'u-kwame', 'Kwame'), 'Operations', 'KWAME-HIDDEN: the demo freezer for Thursday', 'ops', 4),
];

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'OR') return (v as any[]).some((w) => matches(row, w));
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not;
    return row[k] === v;
  });
}

function setup() {
  const prisma: any = { groundDependency: { findMany: jest.fn(async ({ where }: any) => rows.filter((r) => matches(r, where))) } };
  const grounds: any = {
    list: jest.fn(async (org: string, userId: string, _e: string, role: string) => {
      if (org !== ORG) return [];
      return role === 'ADMIN' ? all : all.filter((x) => x.initiatorId === userId || x.participants.some((p: any) => p.userId === userId));
    }),
  };
  const svc = new CheckInLinksService(prisma, grounds);
  const read = (who: keyof typeof people, groundId: string) => svc.forReader(groundId, people[who]);
  return { svc, prisma, read };
}

const waiting = (l: any) => l.waitingOnOtherTeams.map((w: any) => [w.team, w.what, w.open?.label ?? null]);
const asked = (l: any) => l.askedOfThisCheckIn.map((a: any) => [a.team, a.what, a.askedBy, a.open.to]);

describe('the Sales board: waiting on other teams', () => {
  it('Wairimu, who runs Sales and is in Operations, reads both, with a way into Operations only', async () => {
    const { read } = setup();
    const l = await read('wairimu', 'sales');
    expect(waiting(l)).toEqual([
      ['Finance', 'Credit terms for Westgate Deli', null],
      ['Distribution operations', 'Stock for Green Mart’s January order', 'Distribution operations'],
    ]);
    expect(l.waitingOnOtherTeams[1].open).toEqual({ label: 'Distribution operations', to: '/grounds/ops/board' });
    expect(l.waitingOnOtherTeams[1].asked).toBe(ago(11).toISOString());
  });

  it('she is never told what Finance asked of Sales, because she cannot open Finance', async () => {
    const { read } = setup();
    const l = await read('wairimu', 'sales');
    expect(l.askedOfThisCheckIn).toEqual([]);
    const said = JSON.stringify(l);
    for (const not of ['FINANCE-SECRET', 'Finance, Q3', 'Amani', '/grounds/finance']) expect(said).not.toContain(not);
  });

  it('Brian, who is in neither other check-in, reads only the team as it was said in Sales', async () => {
    const { read } = setup();
    const l = await read('brian', 'sales');
    expect(waiting(l)).toEqual([
      ['Finance', 'Credit terms for Westgate Deli', null],
      ['Operations', 'Stock for Green Mart’s January order', null],
    ]);
    const said = JSON.stringify(l);
    for (const not of ['Distribution operations', 'Finance, Q3', 'FINANCE-SECRET', '/grounds/ops', '/grounds/finance']) expect(said).not.toContain(not);
  });

  it('leaves out handoffs that are cleared or that wait on nobody else’s check-in', async () => {
    const { read } = setup();
    const said = JSON.stringify(await read('grace', 'sales'));
    expect(said).not.toContain('CLEARED-LINK');
    expect(said).not.toContain('NOT-LINKED');
  });

  it('Grace, an admin, may open every check-in, so she reads both sides with who asked', async () => {
    const { read } = setup();
    const l = await read('grace', 'sales');
    expect(waiting(l).map((w: any) => w[2])).toEqual(['Finance, Q3', 'Distribution operations']);
    expect(asked(l)).toEqual([['Finance, Q3', 'FINANCE-SECRET: the enterprise pricing sheet', 'Amani', '/grounds/finance/board']]);
  });
});

describe('the Operations board: asked of it by other teams', () => {
  it('Wairimu reads what Sales and Kwame’s check-in asked, both of which she runs, with who asked', async () => {
    const { read } = setup();
    const l = await read('wairimu', 'ops');
    expect(asked(l)).toEqual([
      ['Sales team, Q3', 'Stock for Green Mart’s January order', 'Wairimu', '/grounds/sales/board'],
      ['Kwame, first 90 days', 'KWAME-HIDDEN: the demo freezer for Thursday', 'Kwame', '/grounds/kwame/board'],
    ]);
  });

  it('Miriam reads what Sales asked, but nothing from Kwame’s check-in, where people do not see each other', async () => {
    const { read } = setup();
    const l = await read('miriam', 'ops');
    expect(asked(l)).toEqual([['Sales team, Q3', 'Stock for Green Mart’s January order', 'Wairimu', '/grounds/sales/board']]);
    expect(JSON.stringify(l)).not.toMatch(/KWAME-HIDDEN|Kwame/);
  });

  it('Fatuma, who runs Operations but is in neither asking check-in, is told nothing of them', async () => {
    const { read } = setup();
    const l = await read('fatuma', 'ops');
    expect(l).toEqual({ waitingOnOtherTeams: [], askedOfThisCheckIn: [] });
  });
});

describe('who may ask at all', () => {
  it.each([
    ['Fatuma, who is not in Sales', 'fatuma', 'sales'],
    ['Brian, who is not in Operations', 'brian', 'ops'],
    ['Omar, from another organisation', 'omar', 'sales'],
  ] as const)('%s is answered Not found, before any link is read', async (_w, who, groundId) => {
    const { read, prisma } = setup();
    await expect(read(who, groundId)).rejects.toThrow(NotFoundException);
    expect(prisma.groundDependency.findMany).not.toHaveBeenCalled();
  });

  it('the door reads the signed-in person, and nothing else', async () => {
    const { svc } = setup();
    const door = new CheckInLinksController(svc);
    const l = await door.forThisCheckIn({ id: 'u-brian', email: 'brian@baridi.test', organizationId: ORG, role: 'MEMBER' } as any, 'sales');
    expect(l.askedOfThisCheckIn).toEqual([]);
    await expect(door.forThisCheckIn({ id: 'u-omar', email: 'omar@kijani.test', organizationId: 'org-kijani', role: 'LEAD' } as any, 'sales')).rejects.toThrow(NotFoundException);
  });

  it('never says how anybody was rated, and puts no label on anybody', async () => {
    const { read } = setup();
    const said = JSON.stringify(await read('grace', 'ops')) + JSON.stringify(await read('grace', 'sales'));
    expect(said).not.toMatch(/specificity|confidence|severity|rating|score|verifiab/i);
    expect(said).not.toMatch(/\bPIP\b|at risk|\bexit\b/i);
  });
});
