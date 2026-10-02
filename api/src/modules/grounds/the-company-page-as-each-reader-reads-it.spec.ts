import { ForbiddenException } from '@nestjs/common';
import { CompanyService, NOT_YOUR_COMPANY } from './company.service';
import { CompanyController } from './company.controller';

/**
 * THE COMPANY PAGE, AS EACH PERSON IS SERVED IT (D2, U.15).
 *
 * One organisation, Baridi. Its own system has given it three priorities. "Grow revenue" has
 * Wairimu's "Sales team, Q3" under it; "Improve delivery" has an objective under it and Otieno's
 * "Operations, Q3" under that; "Build a stronger organisation" has nothing and nobody.
 *
 * Grace is an admin, in no check-in. Wairimu is a lead who runs the sales check-in. Miriam is in
 * the sales check-in. Amani is the chief executive, and a member: her title gives her nothing
 * (decision 3). Kofi is a guest from another company.
 *
 * The rules under test: everybody in the organisation reads the priorities and who owns them; what
 * success looks like is for admins only; a check-in that feeds a priority is named only to somebody
 * who may open it; the week's count of check-ins is given only to a reader who may read every
 * check-in; a guest is refused; and nothing on it is anybody's words, rating or label.
 */

const ORG = 'org-baridi';
const NOW = Date.now();
const ago = (days: number) => new Date(NOW - days * 86_400_000);

const people = {
  grace: { userId: 'u-grace', email: 'grace@baridi.test', role: 'ADMIN' },
  wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', role: 'LEAD' },
  miriam: { userId: 'u-miriam', email: 'miriam@baridi.test', role: 'MEMBER' },
  amani: { userId: 'u-amani', email: 'amani@baridi.test', role: 'MEMBER' },
  kofi: { userId: 'u-kofi', email: 'kofi@elsewhere.test', role: 'GUEST' },
};

const sales = {
  id: 'g-sales', label: 'Sales team, Q3', organizationId: ORG, initiatorId: 'u-wairimu', subjectExternalId: 'obj-revenue',
  participants: [{ id: 'p-w', userId: 'u-wairimu' }, { id: 'p-m', userId: 'u-miriam' }],
  checkIns: [
    { status: 'COMPLETED', completedAt: ago(2), isSetup: false },
    { status: 'COMPLETED', completedAt: ago(3), isSetup: false },
    { status: 'COMPLETED', completedAt: ago(20), isSetup: false },
    { status: 'COMPLETED', completedAt: ago(1), isSetup: true },
  ],
};
const operations = {
  id: 'g-ops', label: 'Operations, Q3', organizationId: ORG, initiatorId: 'u-otieno', subjectExternalId: 'obj-ops-delays',
  participants: [{ id: 'p-o', userId: 'u-otieno' }],
  checkIns: [{ status: 'COMPLETED', completedAt: ago(1), isSetup: false }],
};
const elsewhere = {
  id: 'g-elsewhere', label: 'SOMEBODY-ELSES-COMPANY', organizationId: 'org-other', initiatorId: 'u-x', subjectExternalId: null,
  participants: [{ id: 'p-k', userId: 'u-kofi' }], checkIns: [],
};

const subject = (s: any) => ({
  measure: null, target: null, ownerExternalId: null, parentExternalId: null,
  syncedAt: ago(1), sourceDeletedAt: null, organizationId: ORG, ...s,
});
const rows = {
  subject: [
    subject({ id: 's1', externalId: 'obj-revenue', type: 'OBJECTIVE', title: 'Grow revenue 50%, enterprise first', measure: 'Qualified enterprise deals', target: '12 this quarter', ownerExternalId: 'x-wairimu', createdAt: ago(60) }),
    subject({ id: 's2', externalId: 'obj-delivery', type: 'OBJECTIVE', title: 'Improve delivery', measure: 'On-time delivery', target: '95%', ownerExternalId: 'x-otieno', createdAt: ago(59), syncedAt: ago(30) }),
    subject({ id: 's3', externalId: 'obj-org', type: 'OBJECTIVE', title: 'Build a stronger organisation', createdAt: ago(58) }),
    subject({ id: 's4', externalId: 'obj-ops-delays', type: 'OBJECTIVE', title: 'Reduce delivery delays', parentExternalId: 'obj-delivery', createdAt: ago(50) }),
    subject({ id: 's5', externalId: 'obj-gone', type: 'OBJECTIVE', title: 'DELETED-IN-THEIR-SYSTEM', createdAt: ago(70), sourceDeletedAt: ago(5) }),
    subject({ id: 's6', externalId: 'proj-1', type: 'PROJECT', title: 'A-PROJECT-IS-NOT-A-PRIORITY', createdAt: ago(40) }),
  ],
  person: [
    { organizationId: ORG, externalId: 'x-wairimu', displayName: 'Wairimu Kamau', givenName: 'Wairimu', familyName: 'Kamau' },
    { organizationId: ORG, externalId: 'x-otieno', displayName: null, givenName: 'Otieno', familyName: 'Ouma' },
  ],
  organizationMembership: [
    { organizationId: ORG, role: 'ADMIN', team: null },
    { organizationId: ORG, role: 'LEAD', team: 'Sales' },
    { organizationId: ORG, role: 'MEMBER', team: 'sales' },
    { organizationId: ORG, role: 'MEMBER', team: null },
    { organizationId: ORG, role: 'LEAD', team: 'Operations' },
    { organizationId: ORG, role: 'GUEST', team: null },
  ],
};

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not && !(v.not === null && row[k] == null);
    return row[k] === v;
  });
}
const table = (list: any[]) => ({
  findMany: jest.fn(async ({ where }: any) => list.filter((r) => matches(r, where))),
  findFirst: jest.fn(async ({ where }: any) => list.find((r) => matches(r, where)) ?? null),
});

/* What a lead confirmed is true of the whole company (week 20). One kept, one only offered. */
const memory = [
  { id: 'mem1', organizationId: ORG, kind: 'rule', text: "Every quote over 1 million needs Amina's sign-off", status: 'KEPT', sourceLine: 'Picked up from your check-in on 22 September', keptAt: ago(9) },
  { id: 'mem2', organizationId: ORG, kind: 'owner', text: 'THIS-WAS-ONLY-OFFERED', status: 'OFFERED', sourceLine: 'Picked up from your check-in on 23 September', keptAt: null },
  { id: 'mem3', organizationId: 'org-other', kind: 'rule', text: 'SOMEBODY-ELSES-RULE', status: 'KEPT', sourceLine: 'x', keptAt: ago(1) },
];

function setup() {
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ name: 'Baridi Appliances' })) },
    subject: table(rows.subject),
    person: table(rows.person),
    organizationMembership: table(rows.organizationMembership),
    ground: table([sales, operations, elsewhere]),
    companyPicture: { findUnique: jest.fn(async () => null) },
    organizationMemory: table(memory),
  };
  /* The check-ins list, as the real one gives it: an admin every check-in in the organisation,
     everybody else the ones they run or are in (and a guest the other company's one they are in). */
  const grounds: any = {
    list: jest.fn(async (_org: string, userId: string, _email: string, role: string) => {
      if (role === 'ADMIN') return [sales, operations];
      return [sales, operations, elsewhere].filter((g) => g.initiatorId === userId || g.participants.some((p) => p.userId === userId));
    }),
  };
  const svc = new CompanyService(prisma, grounds);
  const read = (who: keyof typeof people) => svc.forReader({ ...people[who], organizationId: ORG });
  return { svc, prisma, grounds, read };
}

describe('Grace, an admin, reads the whole company page', () => {
  it('is served every priority with what success looks like, and the week in one sentence', async () => {
    const { read } = setup();
    const page = await read('grace');
    expect(page.name).toBe('Baridi Appliances');
    expect(page.line).toBe('2 teams and 5 people work here, and there were 3 check-ins this week.');
    expect(page.readsTargets).toBe(true);
    expect(page.priorities).toEqual([
      { id: 's1', number: 1, title: 'Grow revenue 50%, enterprise first', owner: 'Wairimu Kamau', tag: null, fedBy: 'Fed by Sales team, Q3', staleSays: null, reading: null, levels: [], measure: 'Qualified enterprise deals', target: '12 this quarter' },
      { id: 's2', number: 2, title: 'Improve delivery', owner: 'Otieno Ouma', tag: null, fedBy: 'Fed by Operations, Q3', staleSays: expect.stringMatching(/^This was last updated on \d{1,2} [A-Z][a-z]+\.$/), reading: null, levels: [], measure: 'On-time delivery', target: '95%' },
      { id: 's3', number: 3, title: 'Build a stronger organisation', owner: null, tag: 'Nobody owns it yet', fedBy: 'No team feeds it', staleSays: null, reading: null, levels: [], measure: null, target: null },
    ]);
  });

  it('leaves out a priority deleted in the organisation\'s own system, and anything that is not an objective', async () => {
    const said = JSON.stringify(await setup().read('grace'));
    expect(said).not.toContain('DELETED-IN-THEIR-SYSTEM');
    expect(said).not.toContain('A-PROJECT-IS-NOT-A-PRIORITY');
  });
});

describe('Miriam, a member, reads the priorities and only what she may open', () => {
  it('reads each priority and its owner, but not what success looks like', async () => {
    const page = await setup().read('miriam');
    expect(page.readsTargets).toBe(false);
    expect(page.priorities.map((p) => [p.title, p.owner, p.tag])).toEqual([
      ['Grow revenue 50%, enterprise first', 'Wairimu Kamau', null],
      ['Improve delivery', 'Otieno Ouma', null],
      ['Build a stronger organisation', null, 'Nobody owns it yet'],
    ]);
    for (const p of page.priorities) {
      expect(p).not.toHaveProperty('measure');
      expect(p).not.toHaveProperty('target');
    }
    const said = JSON.stringify(page);
    expect(said).not.toContain('12 this quarter');
    expect(said).not.toContain('95%');
  });

  it('is told the sales check-in she is in feeds a priority, and never the name of one she is not in', async () => {
    const page = await setup().read('miriam');
    expect(page.priorities.map((p) => p.fedBy)).toEqual(['Fed by Sales team, Q3', null, 'No team feeds it']);
    expect(JSON.stringify(page)).not.toContain('Operations, Q3');
  });

  it('is given no count of check-ins: she reads her own, not the organisation\'s', async () => {
    expect((await setup().read('miriam')).line).toBe('2 teams and 5 people work here.');
  });
});

describe('Wairimu, a lead, reads what a lead may open', () => {
  it('reads her own check-in as feeding priority 1, no targets, and no count of check-ins', async () => {
    const page = await setup().read('wairimu');
    expect(page.readsTargets).toBe(false);
    expect(page.line).toBe('2 teams and 5 people work here.');
    expect(page.priorities.map((p) => p.fedBy)).toEqual(['Fed by Sales team, Q3', null, 'No team feeds it']);
  });
});

describe('Amani, the chief executive, is served what her role gives her, not her title', () => {
  it('as a member, reads exactly what Miriam\'s role would give, less the check-ins she is not in', async () => {
    const page = await setup().read('amani');
    expect(page.readsTargets).toBe(false);
    expect(page.priorities.map((p) => p.fedBy)).toEqual([null, null, 'No team feeds it']);
    expect(JSON.stringify(page)).not.toContain('Sales team, Q3');
  });
});

describe('Kofi, a guest from another company, is refused', () => {
  it('before anything is read', async () => {
    const { read, prisma, grounds } = setup();
    await expect(read('kofi')).rejects.toThrow(new ForbiddenException(NOT_YOUR_COMPANY));
    expect(grounds.list).not.toHaveBeenCalled();
    expect(prisma.subject.findMany).not.toHaveBeenCalled();
  });

  it('through the route, too', async () => {
    const { svc } = setup();
    const route = new CompanyController(svc);
    await expect(route.page({ id: 'u-kofi', email: 'kofi@elsewhere.test', organizationId: ORG, role: 'GUEST' } as any)).rejects.toThrow(NOT_YOUR_COMPANY);
  });
});

describe('what nobody is served', () => {
  it('no words, ratings, labels, or another company\'s check-in, whoever reads it', async () => {
    const { read } = setup();
    for (const who of ['grace', 'wairimu', 'miriam', 'amani'] as const) {
      const said = JSON.stringify(await read(who));
      expect(said).not.toContain('SOMEBODY-ELSES-COMPANY');
      expect(said).not.toMatch(/checkab|rating|score|\bPIP\b|at risk|exit/i);
      expect(said).not.toMatch(/participants|checkIns|email/);
    }
  });
});


describe('what the lead confirmed for the organisation, on the company page (week 20)', () => {
  const kept = {
    readBy: 'Admins, leads and anyone who runs a check-in can read this. Everyone else cannot.',
    items: [{ id: 'mem1', kind: 'rule', says: "Every quote over 1 million needs Amina's sign-off", source: 'Picked up from your check-in on 22 September' }],
  };

  it('Grace, an admin, reads it with its source line, and who can read it', async () => {
    expect((await setup().read('grace')).whatWeKeep).toEqual(kept);
  });

  it('Wairimu, a lead, reads it too', async () => {
    expect((await setup().read('wairimu')).whatWeKeep).toEqual(kept);
  });

  it('Miriam, who only takes part in a check-in, is given no such part at all, not an empty one', async () => {
    const page = await setup().read('miriam');
    expect(page).not.toHaveProperty('whatWeKeep');
    expect(JSON.stringify(page)).not.toContain('sign-off');
  });

  it('a question that was only asked, and another company\'s rule, are served to nobody', async () => {
    for (const who of ['grace', 'wairimu'] as const) {
      const said = JSON.stringify(await setup().read(who));
      expect(said).not.toContain('THIS-WAS-ONLY-OFFERED');
      expect(said).not.toContain('SOMEBODY-ELSES-RULE');
    }
  });

  it('Kofi, a guest from another company, is refused the whole page', async () => {
    await expect(setup().read('kofi')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('opening the page reads what was kept and writes nothing', async () => {
    const { read, prisma } = setup();
    await read('grace');
    expect(prisma.organizationMemory.findMany).toHaveBeenCalled();
    expect(prisma.organizationMemory).not.toHaveProperty('create');
  });
});
