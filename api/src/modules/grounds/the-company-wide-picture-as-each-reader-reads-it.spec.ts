import { ForbiddenException } from '@nestjs/common';
import { CompanyPictureService } from './the-company-picture.service';
import { CompanyService, NOT_YOUR_COMPANY } from './company.service';
import type { TheModelsPicture } from './the-company-picture';

/**
 * THE COMPANY-WIDE PICTURE, FROM THE RECORD TO WHAT EACH PERSON READS (decision 79, item 1).
 *
 * The whole road: the record is read and the picture written once, as when a check-in completes
 * (CompanyPictureService.rebuild); then the page is opened by each reader (CompanyService), and the
 * test reads the sentences they are served, word for word.
 *
 * Baridi Appliances has three priorities. Priority 1, Grow revenue, is Wairimu's; the sales check-in
 * she runs feeds it, and an objective under it, Sign the Nakuru distributor, is past its date.
 * Priority 2, Improve delivery, is Otieno's; under it, Reduce delivery delays is fed by the
 * operations check-in Otieno runs, and under that, the project Buy 20 delivery vans. Priority 3 has
 * no owner and nothing under it. The customer portal, Lina's project, sits under a priority that is
 * gone. Green Mart is a customer, not an aim. Sales, Operations and Customers each raised that
 * customers cannot order in bulk, and none of them said who it waits on.
 *
 * The readers: Grace, an admin. Wairimu, a lead who runs the sales check-in. Otieno, a member who
 * runs the operations check-in. Miriam, who only takes part in the sales check-in. Kofi, a guest
 * from another company.
 */

const ORG = 'org-baridi';
const NOW = Date.now();
const ago = (days: number) => new Date(NOW - days * 86_400_000);

const subjects = [
  { id: 's1', externalId: 'obj-revenue', type: 'OBJECTIVE', title: 'Grow revenue 50%, enterprise first', measure: 'Revenue', target: '+50%', ownerExternalId: 'x-wairimu', parentExternalId: null, createdAt: ago(60) },
  { id: 's2', externalId: 'obj-delivery', type: 'OBJECTIVE', title: 'Improve delivery', measure: 'Orders delivered on time', target: '95%', ownerExternalId: 'x-otieno', parentExternalId: null, createdAt: ago(59) },
  { id: 's3', externalId: 'obj-org', type: 'OBJECTIVE', title: 'Build a stronger organisation', measure: null, target: null, ownerExternalId: null, parentExternalId: null, createdAt: ago(58) },
  { id: 's4', externalId: 'obj-delays', type: 'OBJECTIVE', title: 'Reduce delivery delays', measure: 'Orders delivered on time', target: null, ownerExternalId: 'x-otieno', parentExternalId: 'obj-delivery', createdAt: ago(50) },
  { id: 's5', externalId: 'proj-vans', type: 'PROJECT', title: 'Buy 20 delivery vans', measure: 'Vans bought', target: '20', ownerExternalId: 'x-otieno', parentExternalId: 'obj-delays', createdAt: ago(49) },
  { id: 's6', externalId: 'obj-nakuru', type: 'OBJECTIVE', title: 'Sign the Nakuru distributor', measure: null, target: null, ownerExternalId: 'x-wairimu', parentExternalId: 'obj-revenue', createdAt: ago(48), dueDate: ago(10), status: 'In progress' },
  { id: 's7', externalId: 'proj-portal', type: 'PROJECT', title: 'The customer portal', measure: null, target: null, ownerExternalId: 'x-lina', parentExternalId: 'obj-gone', createdAt: ago(47) },
  { id: 's8', externalId: 'cp-greenmart', type: 'COUNTERPARTY', title: 'Green Mart', measure: null, target: null, ownerExternalId: null, parentExternalId: null, createdAt: ago(46) },
].map((s: any) => ({ organizationId: ORG, status: null, dueDate: null, syncedAt: ago(1), sourceDeletedAt: null, ...s }));

const done = (days: number) => ({ status: 'COMPLETED', completedAt: ago(days), isSetup: false });
const grounds = [
  {
    id: 'g-sales', label: 'Sales team, Q3', organizationId: ORG, initiatorId: 'u-wairimu', subjectExternalId: 'obj-revenue', scenario: 'team_rhythm',
    participants: [{ userId: 'u-wairimu' }, { userId: 'u-miriam' }],
    checkIns: [done(2), done(5)],
    dependencies: [{ id: 'h1', what: 'customers cannot place an order for many items at once', status: 'WAITING', onParticipantId: null, onLabel: null, waitingOnGroundId: null }],
  },
  {
    id: 'g-ops', label: 'Operations, Q3', organizationId: ORG, initiatorId: 'u-otieno', subjectExternalId: 'obj-delays', scenario: 'team_rhythm',
    participants: [{ userId: 'u-otieno' }],
    checkIns: [done(1)],
    dependencies: [{ id: 'h2', what: 'orders for many items are typed in again by hand', status: 'BLOCKING', onParticipantId: null, onLabel: null, waitingOnGroundId: null }],
  },
  {
    id: 'g-cust', label: 'Accounts, Q3', organizationId: ORG, initiatorId: 'u-chidi', subjectExternalId: null, scenario: 'team_rhythm',
    participants: [{ userId: 'u-chidi' }],
    checkIns: [done(3)],
    dependencies: [{ id: 'h3', what: 'accounts ask how to order many items together', status: 'WAITING', onParticipantId: null, onLabel: null, waitingOnGroundId: null }],
  },
];

const memberships = [
  { organizationId: ORG, userId: 'u-grace', role: 'ADMIN', team: null, user: { firstName: 'Grace', lastName: 'Mutua', email: 'grace@baridi.test' } },
  { organizationId: ORG, userId: 'u-wairimu', role: 'LEAD', team: 'Sales', user: { firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@baridi.test' } },
  { organizationId: ORG, userId: 'u-otieno', role: 'MEMBER', team: 'Operations', user: { firstName: 'Otieno', lastName: 'Ouma', email: 'otieno@baridi.test' } },
  { organizationId: ORG, userId: 'u-miriam', role: 'MEMBER', team: 'Sales', user: { firstName: 'Miriam', lastName: 'Achieng', email: 'miriam@baridi.test' } },
  { organizationId: ORG, userId: 'u-chidi', role: 'MEMBER', team: 'Customers', user: { firstName: 'Chidi', lastName: 'Eze', email: 'chidi@baridi.test' } },
];
const persons = [
  { organizationId: ORG, externalId: 'x-wairimu', displayName: 'Wairimu Kamau', givenName: 'Wairimu', familyName: 'Kamau', title: 'Sales lead', linkedUserId: 'u-wairimu', email: 'wairimu@baridi.test' },
  { organizationId: ORG, externalId: 'x-otieno', displayName: 'Otieno Ouma', givenName: 'Otieno', familyName: 'Ouma', title: 'Operations lead', linkedUserId: 'u-otieno', email: 'otieno@baridi.test' },
  { organizationId: ORG, externalId: 'x-lina', displayName: 'Lina Ali', givenName: 'Lina', familyName: 'Ali', title: 'Product lead', linkedUserId: null, email: 'lina@baridi.test' },
];

/** What the model gives back. Each sentence still has to pass the checks before it is kept. */
const theModel: TheModelsPicture = {
  readings: [{ priorityId: 's2', says: 'One handoff is stopping work on this priority, so delivery is not moving yet.' }],
  namedByTeams: [{
    title: 'No way for customers to order in bulk',
    handoffIds: ['h1', 'h2', 'h3'],
    teams: [
      { team: 'Operations', says: 'Bulk orders are typed in a second time by hand, which holds up delivery.' },
      { team: 'Sales', says: 'Customers who want to buy many items at once cannot do it, which slows the bigger deals.' },
    ],
  }],
  meaningChanged: [
    { aimId: 's5', from: 'orders arriving on time', to: 'more vans' },
    /* Words that name a person never pass. */
    { aimId: 's6', from: 'more revenue', to: 'what Wairimu wants' },
  ],
};

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'notIn' in v) return !v.notIn.includes(row[k]);
    if (v && typeof v === 'object' && 'not' in v) return v.not === null ? row[k] != null : row[k] !== v.not;
    if (v && typeof v === 'object' && !(v instanceof Date)) return true; // a relation filter: every row here is the organisation's
    return row[k] === v;
  });
}
const table = (list: any[]) => ({
  findMany: jest.fn(async ({ where }: any = {}) => list.filter((r) => matches(r, where))),
  findFirst: jest.fn(async ({ where }: any = {}) => list.find((r) => matches(r, where)) ?? null),
});

const readers = {
  grace: { userId: 'u-grace', email: 'grace@baridi.test', role: 'ADMIN' },
  wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', role: 'LEAD' },
  otieno: { userId: 'u-otieno', email: 'otieno@baridi.test', role: 'MEMBER' },
  miriam: { userId: 'u-miriam', email: 'miriam@baridi.test', role: 'MEMBER' },
  kofi: { userId: 'u-kofi', email: 'kofi@elsewhere.test', role: 'GUEST' },
};
type Who = keyof typeof readers;

async function theWorld(opts: { extraGrounds?: any[]; adminMayOpen?: string[] } = {}) {
  const allGrounds: any[] = [...grounds, ...(opts.extraGrounds ?? [])];
  const stored: { row: any } = { row: null };
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ name: 'Baridi Appliances' })) },
    subject: table(subjects),
    ground: table(allGrounds),
    organizationMembership: table(memberships),
    person: table(persons),
    groundParticipant: { findMany: jest.fn(async () => []) },
    organizationMemory: table([]),
    companyPicture: {
      findUnique: jest.fn(async () => stored.row),
      upsert: jest.fn(async ({ create, update }: any) => (stored.row = stored.row ? { ...stored.row, ...update } : { ...create })),
    },
  };
  const prompts: any = { getActive: jest.fn(async () => ({ id: 'pv-company-picture-2', content: 'THE STORED INSTRUCTIONS' })) };
  const model: any = { extract: jest.fn(async () => theModel) };

  /* Something new comes in: the picture is written, once. */
  const builder = new CompanyPictureService(prisma, prompts, model);
  await builder.rebuild(ORG);

  /* The list of check-ins, as the one rule gives it: an admin every one, everybody else those they run or are in. */
  /* An admin is given every check-in but the evaluation ones, unless they were given access to those (decision 5). */
  const list = jest.fn(async (_org: string, userId: string, _email: string, role: string) =>
    role === 'ADMIN'
      ? allGrounds.filter((g) => !['PIP', 'RECOGNITION', 'CONTRACT_RENEWAL', 'NEW_HIRE'].includes(g.scenario) || (opts.adminMayOpen ?? []).includes(g.id))
      : allGrounds.filter((g) => g.initiatorId === userId || g.participants.some((p: any) => p.userId === userId)));
  const page = new CompanyService(prisma, { list } as any);
  const read = (who: Who) => page.forReader({ ...readers[who], organizationId: ORG });
  return { read, stored, model, prisma };
}

describe('the picture is written once, from the record, by the stored instructions', () => {
  it('records the version of the instructions that ran, and stores no name', async () => {
    const { stored, model } = await theWorld();
    expect(model.extract).toHaveBeenCalledTimes(1);
    expect(model.extract.mock.calls[0][0]).toBe('THE STORED INSTRUCTIONS');
    expect(stored.row.promptVersionId).toBe('pv-company-picture-2');
    /* An owner is held as the customer's own id (x-lina) and named only when served. */
    expect(JSON.stringify(stored.row).toLowerCase()).not.toMatch(/(?<!x-)(wairimu|otieno|lina)|kamau|ouma|miriam|chidi|@baridi/);
  });

  it('gives the model the aims under each priority, so it can say where the meaning changed, and no person', async () => {
    const { model } = await theWorld();
    const record = JSON.parse(model.extract.mock.calls[0][1][0].content);
    expect(record.aims).toEqual([
      { id: 's6', under: 's1', title: 'Sign the Nakuru distributor', measures: null },
      { id: 's4', under: 's2', title: 'Reduce delivery delays', measures: 'Orders delivered on time' },
      { id: 's5', under: 's4', title: 'Buy 20 delivery vans', measures: 'Vans bought' },
    ]);
    expect(JSON.stringify(record).toLowerCase()).not.toMatch(/wairimu|otieno|lina|x-/);
  });

  it('opening the page again and again asks the model nothing more', async () => {
    const { read, model } = await theWorld();
    await read('grace');
    await read('wairimu');
    expect(model.extract).toHaveBeenCalledTimes(1);
  });
});

describe('Grace, an admin, reads the whole picture', () => {
  it('reads how each priority is moving', async () => {
    const page = await (await theWorld()).read('grace');
    expect(page.priorities.map((p) => [p.title, p.reading])).toEqual([
      ['Grow revenue 50%, enterprise first', { tag: 'Moving, but not enough of it', says: '1 check-in feeds this priority, and 2 were finished in the last 30 days. People are waiting on 1 thing for it.' }],
      ['Improve delivery', { tag: 'At risk', says: 'One handoff is stopping work on this priority, so delivery is not moving yet.' }],
      ['Build a stronger organisation', { tag: 'Nobody owns it yet', says: 'Nobody owns this priority yet and no check-in feeds it.' }],
    ]);
  });

  it('reads what each level understood, from the priority down, with where the meaning changed', async () => {
    const page = await (await theWorld()).read('grace');
    expect(page.priorities[1].levels).toEqual([
      { id: 's2', depth: 0, level: 'Priority 2', title: 'Improve delivery', changedHere: null, fedBy: null },
      { id: 's4', depth: 1, level: 'Objective', title: 'Reduce delivery delays', changedHere: null, fedBy: 'Fed by Operations, Q3' },
      { id: 's5', depth: 2, level: 'Project', title: 'Buy 20 delivery vans', changedHere: 'The meaning changed here, from orders arriving on time to more vans.', fedBy: null },
    ]);
    /* The model's words for Sign the Nakuru distributor named a person, so nothing is said there. */
    expect(page.priorities[0].levels.map((l) => [l.title, l.changedHere])).toEqual([
      ['Grow revenue 50%, enterprise first', null],
      ['Sign the Nakuru distributor', null],
    ]);
    expect(page.priorities[2].levels.map((l) => l.title)).toEqual(['Build a stronger organisation']);
  });

  it('reads where the strategy is not reaching the work, each question for the person who can answer it', async () => {
    const page = await (await theWorld()).read('grace');
    expect(page.notReaching.map((n) => [n.observation, n.question, n.forWhom])).toEqual([
      ['Priority 3 has no owner and nothing underneath it.', 'Who owns priority 3, “Build a stronger organisation”?', 'For you'],
      ['“The customer portal” sits under no current priority.', 'Which priority does “The customer portal” serve?', 'For Lina Ali, Product lead'],
      ['“Sign the Nakuru distributor” is still open, and its date has passed.', 'Should “Sign the Nakuru distributor” get a new date, or be closed?', 'For Wairimu Kamau, Sales lead'],
    ]);
    /* A customer is not an aim, so it is never said to sit under no priority. */
    expect(JSON.stringify(page.notReaching)).not.toContain('Green Mart');
  });

  it('reads what three teams named, as the prototype says it, with where to read what each team said', async () => {
    const page = await (await theWorld()).read('grace');
    expect(page.namedByTeams).toEqual([{
      id: expect.any(String),
      title: 'No way for customers to order in bulk',
      touches: 'Touches priorities 1 and 2. Nobody owns it.',
      teams: [
        { team: 'Customers', says: 'Customers raised this in 1 check-in, with 1 thing people are still waiting on.', checkIns: [{ id: 'g-cust', name: 'Accounts, Q3' }] },
        { team: 'Operations', says: 'Bulk orders are typed in a second time by hand, which holds up delivery.', checkIns: [{ id: 'g-ops', name: 'Operations, Q3' }] },
        { team: 'Sales', says: 'Customers who want to buy many items at once cannot do it, which slows the bigger deals.', checkIns: [{ id: 'g-sales', name: 'Sales team, Q3' }] },
      ],
    }]);
  });

  it('reads what leadership says next to what the check-ins show', async () => {
    const page = await (await theWorld()).read('grace');
    expect(page.saidAndShown.map((s) => [s.area, s.youSaid, s.checkInsShow])).toEqual([
      ['Priority 1', 'Grow revenue 50%, enterprise first', '2 of the 3 check-ins finished in the last 30 days that belong to a priority were about this one. People are waiting on 1 thing in them.'],
      ['Priority 2', 'Improve delivery', '1 of the 3 check-ins finished in the last 30 days that belong to a priority was about this one. People are waiting on 1 thing in them.'],
    ]);
  });
});

describe('Wairimu, a lead who runs the sales check-in, reads her share', () => {
  it('reads how priorities 1 and 3 are moving, and not priority 2, which rests on a check-in she may not open', async () => {
    const page = await (await theWorld()).read('wairimu');
    expect(page.priorities.map((p) => p.reading?.tag ?? null)).toEqual(['Moving, but not enough of it', null, 'Nobody owns it yet']);
  });

  it('reads what each level understood, and never the name of a check-in she may not open', async () => {
    const page = await (await theWorld()).read('wairimu');
    expect(page.priorities[1].levels.map((l) => [l.title, l.fedBy, l.changedHere])).toEqual([
      ['Improve delivery', null, null],
      ['Reduce delivery delays', null, null],
      ['Buy 20 delivery vans', null, 'The meaning changed here, from orders arriving on time to more vans.'],
    ]);
    expect(JSON.stringify(page)).not.toContain('Operations, Q3');
  });

  it('is asked the one question that is hers to answer, and none of leadership\'s', async () => {
    const page = await (await theWorld()).read('wairimu');
    expect(page.notReaching).toEqual([{
      id: 'overdue-s6',
      observation: '“Sign the Nakuru distributor” is still open, and its date has passed.',
      question: 'Should “Sign the Nakuru distributor” get a new date, or be closed?',
      forWhom: 'For you',
    }]);
  });

  it('is not given what three teams named, because two of those check-ins are not hers to open, nor what leadership says', async () => {
    const page = await (await theWorld()).read('wairimu');
    expect(page.namedByTeams).toEqual([]);
    expect(page.saidAndShown).toEqual([]);
  });
});

describe('Otieno, a member who runs the operations check-in, reads what a person who runs a check-in reads', () => {
  it('reads how priority 2 is moving, what each level of it understood, and nothing that rests on the sales check-in', async () => {
    const page = await (await theWorld()).read('otieno');
    expect(page.priorities.map((p) => p.reading?.tag ?? null)).toEqual([null, 'At risk', 'Nobody owns it yet']);
    expect(page.priorities[1].levels[1]).toMatchObject({ title: 'Reduce delivery delays', fedBy: 'Fed by Operations, Q3' });
    expect(page.notReaching).toEqual([]);
    expect(page.namedByTeams).toEqual([]);
    expect(page.saidAndShown).toEqual([]);
    expect(JSON.stringify(page)).not.toContain('Sales team, Q3');
  });
});

describe('Miriam, who only takes part in the sales check-in, is given none of the picture', () => {
  it('reads the priorities and who owns them, and nothing the engine wrote about them', async () => {
    const page = await (await theWorld()).read('miriam');
    expect(page.priorities.map((p) => [p.title, p.owner])).toEqual([
      ['Grow revenue 50%, enterprise first', 'Wairimu Kamau'],
      ['Improve delivery', 'Otieno Ouma'],
      ['Build a stronger organisation', null],
    ]);
    expect(page.priorities.map((p) => p.reading)).toEqual([null, null, null]);
    expect(page.priorities.every((p) => p.levels.length === 0)).toBe(true);
    expect([page.notReaching, page.namedByTeams, page.saidAndShown]).toEqual([[], [], []]);
    expect(page).not.toHaveProperty('whatWeKeep');
    const said = JSON.stringify(page);
    for (const s of ['Moving', 'At risk', 'meaning changed', 'order in bulk', 'Nakuru', 'check-ins finished']) expect(said).not.toContain(s);
  });
});

describe('Kofi, a guest from another company, is refused', () => {
  it('the whole page, before anything is read', async () => {
    const { read } = await theWorld();
    await expect(read('kofi')).rejects.toThrow(new ForbiddenException(NOT_YOUR_COMPANY));
  });
});

describe('what nobody is ever served', () => {
  it('no colleague\'s words, no rating, no label on a person, no ranking', async () => {
    const { read } = await theWorld();
    for (const who of ['grace', 'wairimu', 'otieno', 'miriam'] as const) {
      const said = JSON.stringify(await read(who));
      for (const words of ['customers cannot place an order for many items at once', 'typed in again by hand', 'accounts ask how to order']) expect(said).not.toContain(words);
      expect(said).not.toMatch(/checkab|rating|score|\bPIP\b|\bexit\b|best|worst|rank/i);
      expect(said).not.toMatch(/Miriam|Chidi|@baridi/);
    }
  });
});

/**
 * DECISION 93, ROW 23 (5 October 2026): A PERFORMANCE PLAN ON THE COMPANY PAGE. "Tobi, the next six weeks" is a performance plan Wairimu
 * runs, and it feeds priority 1, Grow revenue. The picture everybody reads leaves it out, as before. Beside it, one more plain reading
 * of the priority counts it in, and it rests on the plan too, so it reaches only a reader who may open the plan: an admin who was given
 * access to it, and Wairimu, who runs it. Grace, an admin with no access to it, and Otieno and Miriam, read what they read before.
 */
const PIP = {
  id: 'g-pip', label: 'Tobi, the next six weeks', organizationId: ORG, initiatorId: 'u-wairimu', subjectExternalId: 'obj-revenue', scenario: 'PIP',
  participants: [{ userId: 'u-wairimu' }, { userId: 'u-tobi' }],
  checkIns: [done(1), done(3), done(4)],
  dependencies: [{ id: 'h9', what: 'the handover notes for the Gigiri account', status: 'BLOCKING', onParticipantId: null, onLabel: null, waitingOnGroundId: null }],
};
const BEFORE = '1 check-in feeds this priority, and 2 were finished in the last 30 days. People are waiting on 1 thing for it.';

describe('decision 93, row 23: a performance plan on the company page', () => {
  it('Grace, an admin given access to the plan, reads a reading of priority 1 that counts it in', async () => {
    const page = await (await theWorld({ extraGrounds: [PIP], adminMayOpen: ['g-pip'] })).read('grace');
    expect(page.priorities[0].reading).toEqual({
      tag: 'At risk',
      says: '2 check-ins feed this priority, and 5 were finished in the last 30 days. 1 thing people are waiting on is stopping work on it.',
    });
    /* Its name is read where she may open it, as it was before. */
    expect(page.priorities[0].fedBy).toBe('Fed by Sales team, Q3 and Tobi, the next six weeks');
  });

  it('Wairimu, who runs the plan, reads the same', async () => {
    const page = await (await theWorld({ extraGrounds: [PIP], adminMayOpen: ['g-pip'] })).read('wairimu');
    expect(page.priorities[0].reading?.says).toBe('2 check-ins feed this priority, and 5 were finished in the last 30 days. 1 thing people are waiting on is stopping work on it.');
  });

  it('Grace, an admin with no access to the plan, reads what she read before, and no word of the plan', async () => {
    const page = await (await theWorld({ extraGrounds: [PIP], adminMayOpen: [] })).read('grace');
    expect(page.priorities[0].reading).toEqual({ tag: 'Moving, but not enough of it', says: BEFORE });
    expect(JSON.stringify(page)).not.toMatch(/Tobi|six weeks|handover notes|Gigiri/);
  });

  it('Otieno reads what he read before, and Miriam none of the picture', async () => {
    const world = await theWorld({ extraGrounds: [PIP], adminMayOpen: ['g-pip'] });
    expect(JSON.stringify(await world.read('otieno'))).not.toMatch(/Tobi|six weeks|handover notes|Gigiri|5 were finished/);
    const miriam = await world.read('miriam');
    expect(miriam.priorities[0].reading).toBeNull();
    expect(JSON.stringify(miriam)).not.toMatch(/Tobi|six weeks|handover notes|Gigiri/);
  });

  it('stores no name and no word from the plan, and asks the model nothing it did not ask before', async () => {
    const world = await theWorld({ extraGrounds: [PIP], adminMayOpen: ['g-pip'] });
    const stored = JSON.stringify(world.stored.row).toLowerCase();
    expect(stored).not.toMatch(/tobi|handover|gigiri/);
    expect(world.model.extract).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(world.model.extract.mock.calls[0][1])).not.toMatch(/handover|Gigiri|g-pip|check-in 4/);
  });

  it('with no plan feeding a priority, the picture is exactly the one it was', async () => {
    const without = (await theWorld()).stored.row;
    expect(without.readings).toHaveLength(3);
  });
});

