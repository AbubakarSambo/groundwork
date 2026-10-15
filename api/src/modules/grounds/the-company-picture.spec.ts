import { SEED_PROMPTS } from '../conversation/prompt-library';
import {
  COMPANY_PICTURE_PROMPT_KEY,
  TAGS,
  aSentenceTheRecordSupports,
  buildPicture,
  notReachingFrom,
  tagFor,
  theInputKey,
  theRecordForTheModel,
  theShareFor,
  type PictureInput,
  type StoredPicture,
  type TheModelsPicture,
} from './the-company-picture';
import { CompanyPictureService } from './the-company-picture.service';
import { CompanyService } from './company.service';
import { EVALUATION_SCENARIOS } from '../reports/is-this-an-evaluation-check-in';

/**
 * THE COMPANY-WIDE PICTURE (request 17): each of the four parts, and each reader.
 *
 * Baridi has three priorities. Sales (priority 1) and Operations (priority 2) each have a check-in; a
 * third check-in, with Customers, feeds neither. Sales and Operations and Customers each raised a
 * handoff about not being able to order in bulk. Grace is an admin. Wairimu is a lead who runs the
 * sales check-in only. Miriam is in it. Hira is an admin who was not given a promotion check-in.
 */

const priorities: PictureInput['priorities'] = [
  { id: 's1', number: 1, title: 'Grow revenue 50%, enterprise first', ownerExternalId: 'x-wairimu', overdue: false, hasChildren: true, feedingGroundIds: ['g-sales'], finishedLast30: 1, blocked: 0, waiting: 1, teams: ['Sales'] },
  { id: 's2', number: 2, title: 'Improve delivery', ownerExternalId: 'x-otieno', overdue: false, hasChildren: true, feedingGroundIds: ['g-ops'], finishedLast30: 3, blocked: 1, waiting: 0, teams: ['Operations'] },
  { id: 's3', number: 3, title: 'Build a stronger organisation', ownerExternalId: null, overdue: false, hasChildren: false, feedingGroundIds: [], finishedLast30: 0, blocked: 0, waiting: 0, teams: [] },
];
const handoffs: PictureInput['handoffs'] = [
  { id: 'h1', groundId: 'g-sales', team: 'Sales', about: 'customers cannot place an order for many items at once', status: 'WAITING', priorityNumbers: [1] },
  { id: 'h2', groundId: 'g-ops', team: 'Operations', about: 'orders for many items are typed in again by hand', status: 'BLOCKING', priorityNumbers: [2] },
  { id: 'h3', groundId: 'g-cust', team: 'Customers', about: 'accounts ask how to order many items together', status: 'WAITING', priorityNumbers: [] },
  { id: 'h4', groundId: 'g-ops', team: 'Operations', about: 'the courier integration is not finished', status: 'WAITING', priorityNumbers: [2] },
];
const input: PictureInput = {
  priorities,
  handoffs,
  subjects: [
    { id: 's1', externalId: 'obj-revenue', type: 'OBJECTIVE', title: 'Grow revenue 50%, enterprise first', ownerExternalId: 'x-wairimu', parentExternalId: null, overdue: false },
    { id: 's2', externalId: 'obj-delivery', type: 'OBJECTIVE', title: 'Improve delivery', ownerExternalId: 'x-otieno', parentExternalId: null, overdue: false },
    { id: 's3', externalId: 'obj-org', type: 'OBJECTIVE', title: 'Build a stronger organisation', ownerExternalId: null, parentExternalId: null, overdue: false },
    { id: 's7', externalId: 'proj-portal', type: 'PROJECT', title: 'The customer portal', ownerExternalId: 'x-lina', parentExternalId: 'obj-gone', overdue: false },
    { id: 's8', externalId: 'obj-q2', type: 'OBJECTIVE', title: 'Open the second warehouse', ownerExternalId: 'x-otieno', parentExternalId: 'obj-delivery', overdue: true },
  ],
  finishedOnPriorities: 4,
  groundsOnPriorities: ['g-sales', 'g-ops'],
  names: ['wairimu', 'otieno', 'miriam', 'lina', 'grace', 'hira', 'kamau'],
};

const goodModel: TheModelsPicture = {
  readings: [
    { priorityId: 's1', says: 'One check-in feeds this priority, and 1 handoff is waiting on other work, so not much has moved in the last 30 days.' },
    { priorityId: 's2', says: 'One handoff is stopping work on this priority, and it is the missing courier integration.' },
  ],
  namedByTeams: [{
    title: 'No way for customers to order in bulk',
    handoffIds: ['h1', 'h2', 'h3'],
    teams: [
      { team: 'Sales', says: 'Customers cannot place a bulk order, which slows the enterprise deals the team is chasing.' },
      { team: 'Operations', says: 'Bulk orders are typed in a second time by hand, which is the delay behind priority 2.' },
    ],
  }],
  showing: [
    { priorityId: 's1', says: '1 of the 4 check-ins finished in the last 30 days was about this priority, because 3 went into delivery work.' },
  ],
};

describe('(a) how each priority is moving', () => {
  it('gives each priority a tag from a fixed list, about the priority and never about a person', () => {
    expect(tagFor(priorities[0])).toBe(TAGS.notEnough);
    expect(tagFor(priorities[1])).toBe(TAGS.atRisk);
    expect(tagFor(priorities[2])).toBe(TAGS.nobodyOwnsIt);
    expect(tagFor({ ...priorities[0], ownerExternalId: 'x', feedingGroundIds: [] })).toBe(TAGS.nothingMovesIt);
    expect(tagFor({ ...priorities[0], finishedLast30: 0, waiting: 0 })).toBe(TAGS.quiet);
    expect(tagFor({ ...priorities[0], finishedLast30: 5, waiting: 0 })).toBe(TAGS.moving);
    for (const tag of Object.values(TAGS)) expect(tag).not.toMatch(/\b(pip|exit|underperform|low performer|flight risk)\b/i);
  });

  it('keeps the model\'s sentence when every number in it is on the record', () => {
    const r = buildPicture(input, goodModel).readings;
    expect(r[0]).toMatchObject({ tag: 'Moving, but not enough of it', says: 'One check-in feeds this priority, and 1 handoff is waiting on other work, so not much has moved in the last 30 days.' });
  });

  it.each([
    ['a number that is not on the record', 'Sales is moving 12 enterprise deals, and 1 handoff is waiting on other work.'],
    ['a person named', 'Wairimu has let this priority slip, and 1 handoff is waiting.'],
    ['a person judged', 'The team is slow to act, and 1 handoff is waiting on other work.'],
    ['a team ranked', 'This is the best moving priority, with 1 handoff waiting on other work.'],
    ['pieces joined with a colon', 'Status: 1 handoff is waiting on other work for this priority.'],
    ['a quotation', 'People said “we are stuck” and 1 handoff is waiting on other work.'],
    ['words copied from a handoff', 'The customers cannot place an order for many items at once, and 1 handoff waits.'],
  ])('replaces a sentence with %s by a plain one written from the counts', (_why, says) => {
    const r = buildPicture(input, { readings: [{ priorityId: 's1', says }] }).readings[0];
    expect(r.says).toBe('1 check-in feeds this priority, and 1 was finished in the last 30 days. 1 handoff is waiting on other work.');
  });

  it('still says something plain when there is no model answer at all', () => {
    const r = buildPicture(input, null).readings;
    expect(r.map((x) => x.says)).toEqual([
      '1 check-in feeds this priority, and 1 was finished in the last 30 days. 1 handoff is waiting on other work.',
      '1 check-in feeds this priority, and 3 were finished in the last 30 days. 1 handoff is stopping work on it.',
      'Nobody owns this priority yet and no check-in feeds it.',
    ]);
  });
});

describe('(b) where the strategy is not reaching the work', () => {
  const items = notReachingFrom(input);
  it('reads the shape of the organisation and asks one question of the right person', () => {
    expect(items.map((i) => [i.observation, i.question, i.forWhom])).toEqual([
      ['Priority 3 has no owner and nothing underneath it.', 'Who owns priority 3, “Build a stronger organisation”?', { kind: 'leadership' }],
      ['“The customer portal” sits under no current priority.', 'Which priority does “The customer portal” serve?', { kind: 'owner', externalId: 'x-lina' }],
      ['“Open the second warehouse” is still open, and its date has passed.', 'Should “Open the second warehouse” get a new date, or be closed?', { kind: 'owner', externalId: 'x-otieno' }],
    ]);
  });
  it('rests on no check-in and holds no person\'s name', () => {
    expect(items.every((i) => i.restsOn.length === 0)).toBe(true);
    expect(JSON.stringify(items.map((i) => [i.observation, i.question])).toLowerCase()).not.toMatch(/wairimu|otieno|lina\b/);
  });
});

describe('(c) named by more than one team', () => {
  const groups = buildPicture(input, goodModel).namedByTeams;
  it('keeps a thing named in two or more teams, with what each team says, in alphabetical order', () => {
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      title: 'No way for customers to order in bulk',
      touches: 'Touches priorities 1 and 2.',
      restsOn: ['g-cust', 'g-ops', 'g-sales'],
    });
    expect(groups[0].teams.map((t) => t.team)).toEqual(['Customers', 'Operations', 'Sales']);
    expect(groups[0].teams[2].says).toBe('Customers cannot place a bulk order, which slows the enterprise deals the team is chasing.');
    /* Customers had no sentence from the model, so the plain one is written from the counts. */
    expect(groups[0].teams[0].says).toBe('Customers raised this in 1 check-in, with 1 open handoff.');
  });
  it('drops a group that one team alone raised, or that has a number the record does not have', () => {
    const one: TheModelsPicture = { namedByTeams: [{ title: 'The courier is late', handoffIds: ['h2', 'h4'], teams: [] }] };
    expect(buildPicture(input, one).namedByTeams).toEqual([]);
    const made = { namedByTeams: [{ title: 'Nine orders lost', handoffIds: ['h1', 'h2'], teams: [] }] };
    expect(buildPicture(input, made).namedByTeams).toEqual([]);
  });
  it('never puts a handoff in two groups, and never names a person in a team\'s sentence', () => {
    const twice: TheModelsPicture = { namedByTeams: [
      { title: 'No bulk ordering', handoffIds: ['h1', 'h2'], teams: [{ team: 'Sales', says: 'Wairimu says customers keep asking about bulk orders.' }] },
      { title: 'Ordering for many items', handoffIds: ['h2', 'h3'], teams: [] },
    ] };
    const g = buildPicture(input, twice).namedByTeams;
    expect(g).toHaveLength(1);
    expect(JSON.stringify(g)).not.toMatch(/wairimu/i);
    expect(g[0].teams.find((t) => t.team === 'Sales')!.says).toBe('Sales raised this in 1 check-in, with 1 open handoff.');
  });
  it('orders groups by their title and teams by their name, never by how many people or how much', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'the-company-picture.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/localeCompare/);
    expect(src).not.toMatch(/\.sort\(\(a, b\) => b\./);
  });
});

describe('(d) what leadership says, and where the time goes', () => {
  const shown = buildPicture(input, goodModel).saidAndShown;
  it('puts the priority as the organisation wrote it next to what the check-ins show, with counts and a reason', () => {
    expect(shown[0]).toMatchObject({
      area: 'Priority 1',
      youSaid: 'Grow revenue 50%, enterprise first',
      checkInsShow: '1 of the 4 check-ins finished in the last 30 days was about this priority, because 3 went into delivery work.',
    });
  });
  it('says it from the counts when the model\'s sentence has a number the record does not', () => {
    const bad = { showing: [{ priorityId: 's1', says: 'Only 9 in 10 visits went to enterprise.' }] };
    expect(buildPicture(input, bad).saidAndShown[0].checkInsShow).toBe('1 of the 4 check-ins finished in the last 30 days that belong to a priority was about this one. 1 handoff is open in them.');
  });
  it('says nothing until there are enough finished check-ins to say it from', () => {
    expect(buildPicture({ ...input, finishedOnPriorities: 2 }, goodModel).saidAndShown).toEqual([]);
  });
});

describe('a sentence from the model', () => {
  const o = { allowedNumbers: [1, 2], names: ['wairimu'], sources: ['orders are typed in again by hand on every project that ships'] };
  it('passes when it names nobody, judges nobody and copies nothing', () => {
    expect(aSentenceTheRecordSupports('Two projects are held by the same missing step', o)).toBe('Two projects are held by the same missing step.');
  });
  it('fails on an arrow, on a run of six words from the record, and on a stranger\'s address', () => {
    expect(aSentenceTheRecordSupports('Orders → typed twice by the teams', o)).toBeNull();
    expect(aSentenceTheRecordSupports('Orders are typed in again by hand here', o)).toBeNull();
    expect(aSentenceTheRecordSupports('Ask wairimu@baridi.test about the orders', o)).toBeNull();
  });
});

describe('it is written once, and only from the record', () => {
  it('has the same key for the same record and a different one when a handoff changes', () => {
    expect(theInputKey(input)).toBe(theInputKey({ ...input }));
    expect(theInputKey({ ...input, handoffs: handoffs.slice(1) })).not.toBe(theInputKey(input));
  });
  it('gives the model check-ins as numbers and teams as names, and no person', () => {
    const said = theRecordForTheModel(input);
    expect(said).toContain('check-in 1');
    expect(said.toLowerCase()).not.toMatch(/wairimu|otieno|miriam|x-lina/);
    expect(said).not.toContain('g-sales');
  });
  it('is seeded as a stored instruction, which names nobody, ranks nobody and labels nobody', () => {
    const seed = SEED_PROMPTS.find((p) => p.key === COMPANY_PICTURE_PROMPT_KEY);
    expect(seed).toBeTruthy();
    expect(seed!.content).toMatch(/NEVER write a person's name/);
    expect(seed!.content).toMatch(/NEVER rank teams or people/);
    expect(seed!.content).toMatch(/NEVER put a label on a person/);
  });
});

/* ------------------------------------------------------------------------------------------ */

describe('the builder', () => {
  const now = new Date();
  const day = (n: number) => new Date(now.getTime() - n * 86_400_000);
  function build(model: TheModelsPicture | null = goodModel) {
    const stored: any = {};
    const prisma: any = {
      subject: { findMany: jest.fn(async () => [
        { id: 's1', externalId: 'obj-revenue', type: 'OBJECTIVE', title: 'Grow revenue 50%, enterprise first', ownerExternalId: 'x-wairimu', parentExternalId: null, status: null, dueDate: null, syncedAt: day(1), sourceDeletedAt: null, createdAt: day(60) },
        { id: 's3', externalId: 'obj-org', type: 'OBJECTIVE', title: 'Build a stronger organisation', ownerExternalId: null, parentExternalId: null, status: null, dueDate: null, syncedAt: day(1), sourceDeletedAt: null, createdAt: day(58) },
      ]) },
      ground: { findMany: jest.fn(async () => [
        { id: 'g-sales', initiatorId: 'u-wairimu', subjectExternalId: 'obj-revenue', checkIns: [{ status: 'COMPLETED', completedAt: day(2), isSetup: false }, { status: 'COMPLETED', completedAt: day(40), isSetup: false }, { status: 'COMPLETED', completedAt: day(1), isSetup: true }], dependencies: [{ id: 'h1', what: 'customers cannot place an order for many items at once', status: 'WAITING' }] },
        { id: 'g-cust', initiatorId: 'u-chidi', subjectExternalId: null, checkIns: [], dependencies: [{ id: 'h3', what: 'accounts ask how to order many items together', status: 'WAITING' }] },
      ]) },
      organizationMembership: { findMany: jest.fn(async () => [
        { userId: 'u-wairimu', team: 'Sales', user: { firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@baridi.test' } },
        { userId: 'u-chidi', team: 'Customers', user: { firstName: 'Chidi', lastName: 'Eze', email: 'chidi@baridi.test' } },
      ]) },
      person: { findMany: jest.fn(async () => []) },
      groundParticipant: { findMany: jest.fn(async () => []) },
      companyPicture: {
        findUnique: jest.fn(async () => (stored.row ? { inputKey: stored.row.inputKey } : null)),
        upsert: jest.fn(async ({ create, update }: any) => { stored.row = stored.row ? { ...stored.row, ...update } : { ...create }; return stored.row; }),
      },
    };
    const prompts: any = { getActive: jest.fn(async () => ({ id: 'pv-7', content: 'STORED VERSION OF THE INSTRUCTIONS' })) };
    const anthropic: any = { extract: jest.fn(async () => model) };
    return { svc: new CompanyPictureService(prisma, prompts, anthropic), prisma, anthropic, stored };
  }

  it('writes the picture once from the record, with the stored instructions running and their version recorded', async () => {
    const { svc, anthropic, stored } = build();
    expect(await svc.rebuild('org-baridi')).toBe('built');
    expect(anthropic.extract.mock.calls[0][0]).toBe('STORED VERSION OF THE INSTRUCTIONS');
    expect(stored.row.promptVersionId).toBe('pv-7');
    expect(stored.row.readings.map((r: any) => r.tag)).toEqual(['Moving, but not enough of it', 'Nobody owns it yet']);
  });

  it('stores no name anywhere, and no exact words', async () => {
    const { svc, stored } = build();
    await svc.rebuild('org-baridi');
    const all = JSON.stringify(stored.row).toLowerCase();
    for (const n of ['wairimu', 'kamau', 'chidi', 'eze', '@baridi']) expect(all).not.toContain(n);
  });

  it('does not write again, or ask the model again, when the record has not changed', async () => {
    const { svc, anthropic, prisma } = build();
    await svc.rebuild('org-baridi');
    expect(await svc.rebuild('org-baridi')).toBe('unchanged');
    expect(anthropic.extract).toHaveBeenCalledTimes(1);
    expect(prisma.companyPicture.upsert).toHaveBeenCalledTimes(1);
  });

  it('never reads a performance plan, a promotion or a renewal into the picture', async () => {
    const { svc, prisma } = build();
    await svc.rebuild('org-baridi');
    const where = prisma.ground.findMany.mock.calls[0][0].where;
    expect(where.scenario.notIn).toEqual(EVALUATION_SCENARIOS);
    expect(EVALUATION_SCENARIOS.length).toBeGreaterThan(0);
  });

  it('still writes the plain picture when the model gives nothing', async () => {
    const { svc, stored } = build(null);
    await svc.rebuild('org-baridi');
    expect(stored.row.readings[0].says).toMatch(/^1 check-in feeds this priority/);
    expect(stored.row.namedByTeams).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------ */

describe('as each reader reads it', () => {
  const ORG = 'org-baridi';
  const stored: StoredPicture = buildPicture(input, goodModel);
  const grounds = {
    sales: { id: 'g-sales', label: 'Sales team, Q3', organizationId: ORG, initiatorId: 'u-wairimu', subjectExternalId: 'obj-revenue', participants: [{ userId: 'u-miriam' }], checkIns: [] },
    ops: { id: 'g-ops', label: 'Operations, Q3', organizationId: ORG, initiatorId: 'u-otieno', subjectExternalId: 'obj-delivery', participants: [], checkIns: [] },
    cust: { id: 'g-cust', label: 'Accounts', organizationId: ORG, initiatorId: 'u-chidi', subjectExternalId: null, participants: [], checkIns: [] },
  };
  const row = (o: any) => ({ measure: null, target: null, ownerExternalId: null, parentExternalId: null, syncedAt: new Date(), sourceDeletedAt: null, organizationId: ORG, ...o });
  const readers = {
    grace: { userId: 'u-grace', email: 'grace@baridi.test', role: 'ADMIN' },
    hira: { userId: 'u-hira', email: 'hira@baridi.test', role: 'ADMIN' },
    wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', role: 'LEAD' },
    miriam: { userId: 'u-miriam', email: 'miriam@baridi.test', role: 'MEMBER' },
  };
  /* What the list of check-ins gives each of them: the one rule's answer, which this file does not re-decide. */
  const theyMayOpen: Record<string, any[]> = {
    grace: [grounds.sales, grounds.ops, grounds.cust],
    hira: [grounds.sales, grounds.ops, grounds.cust],
    wairimu: [grounds.sales],
    miriam: [grounds.sales],
  };

  function read(who: keyof typeof readers, picture: StoredPicture | null = stored) {
    const prisma: any = {
      organization: { findUnique: async () => ({ name: 'Baridi Appliances' }) },
      subject: { findMany: async () => [
        row({ id: 's1', externalId: 'obj-revenue', type: 'OBJECTIVE', title: 'Grow revenue 50%, enterprise first', ownerExternalId: 'x-wairimu', createdAt: new Date(1) }),
        row({ id: 's2', externalId: 'obj-delivery', type: 'OBJECTIVE', title: 'Improve delivery', ownerExternalId: 'x-otieno', createdAt: new Date(2) }),
        row({ id: 's3', externalId: 'obj-org', type: 'OBJECTIVE', title: 'Build a stronger organisation', createdAt: new Date(3) }),
      ] },
      person: { findMany: async () => [
        { externalId: 'x-wairimu', displayName: 'Wairimu Kamau', title: 'Sales lead', linkedUserId: 'u-wairimu' },
        { externalId: 'x-lina', displayName: 'Lina Ali', title: 'Product lead', linkedUserId: null },
        { externalId: 'x-otieno', displayName: 'Otieno Ouma', title: null, linkedUserId: null },
      ] },
      organizationMembership: { findMany: async () => [{ team: 'Sales' }] },
      ground: { findMany: async () => [{ id: 'g-sales', subjectExternalId: 'obj-revenue' }, { id: 'g-ops', subjectExternalId: 'obj-delivery' }] },
      companyPicture: { findUnique: async () => (picture ? { ...picture } : null) },
    };
    const svc = new CompanyService(prisma, { list: async () => theyMayOpen[who] } as any);
    return svc.forReader({ ...readers[who], organizationId: ORG });
  }

  it('Grace, an admin who reads every check-in, reads all four parts', async () => {
    const page = await read('grace');
    expect(page.priorities.map((p) => p.reading)).toEqual([
      { tag: 'Moving, but not enough of it', says: expect.stringContaining('handoff is waiting') },
      { tag: 'At risk', says: expect.any(String) },
      { tag: 'Nobody owns it yet', says: 'Nobody owns this priority yet and no check-in feeds it.' },
    ]);
    expect(page.notReaching.map((n) => [n.observation, n.question, n.forWhom])).toEqual([
      ['Priority 3 has no owner and nothing underneath it.', 'Who owns priority 3, “Build a stronger organisation”?', 'For you'],
      ['“The customer portal” sits under no current priority.', 'Which priority does “The customer portal” serve?', 'For Lina Ali, Product lead'],
      ['“Open the second warehouse” is still open, and its date has passed.', 'Should “Open the second warehouse” get a new date, or be closed?', 'For Otieno Ouma'],
    ]);
    expect(page.namedByTeams).toHaveLength(1);
    expect(page.namedByTeams[0].teams.map((t) => t.team)).toEqual(['Customers', 'Operations', 'Sales']);
    expect(page.saidAndShown.map((s) => s.area)).toEqual(['Priority 1', 'Priority 2']);
  });

  it('Wairimu, a lead who runs only the sales check-in, reads only what rests on it', async () => {
    const page = await read('wairimu');
    /* Priority 1 rests on the sales check-in she runs; priority 2 on one she may not open; priority 3 on none. */
    expect(page.priorities.map((p) => p.reading?.tag ?? null)).toEqual(['Moving, but not enough of it', null, 'Nobody owns it yet']);
    expect(page.notReaching).toEqual([]);
    expect(page.namedByTeams).toEqual([]);
    expect(page.saidAndShown).toEqual([]);
  });

  it('Wairimu reads a thing two teams named when every check-in it rests on is hers to open', async () => {
    const only = buildPicture({ ...input, handoffs: [
      { ...handoffs[0], team: 'Sales' }, { ...handoffs[0], id: 'h9', groundId: 'g-sales', team: 'Design' },
    ] }, { namedByTeams: [{ title: 'No bulk ordering for customers', handoffIds: ['h1', 'h9'], teams: [] }] });
    expect(only.namedByTeams).toHaveLength(1);
    const page = await read('wairimu', only);
    expect(page.namedByTeams.map((g) => g.title)).toEqual(['No bulk ordering for customers']);
  });

  /* Decision 79, item 1: the picture is for admins, leads and whoever runs a check-in. Miriam only
     takes part, so she is given none of it, not even the reading of the priority her check-in feeds. */
  it('Miriam, who only takes part in the sales check-in, is given none of the company-wide picture', async () => {
    const page = await read('miriam');
    expect(page.priorities.map((p) => p.reading)).toEqual([null, null, null]);
    expect(page.priorities.every((p) => p.levels.length === 0)).toBe(true);
    expect(page.namedByTeams).toEqual([]);
    expect(page.notReaching).toEqual([]);
    expect(page.saidAndShown).toEqual([]);
    expect(JSON.stringify(page)).not.toContain('Who owns priority 3');
  });

  it('Hira, an admin who was not given a promotion check-in, reads nothing that rests on it', async () => {
    const withPromotion: StoredPicture = {
      ...stored,
      namedByTeams: [...stored.namedByTeams, { id: 'promo', title: 'Nobody is ready for the step up', touches: 'It does not sit under any priority yet.', teams: [{ team: 'Sales', says: 'It came up in a promotion check-in.' }, { team: 'Design', says: 'It came up too.' }], restsOn: ['g-promotion'] }],
      readings: [...stored.readings.slice(0, 2), { ...stored.readings[2], restsOn: ['g-promotion'] }],
    };
    const page = await read('hira', withPromotion);
    expect(JSON.stringify(page)).not.toContain('promotion');
    expect(page.namedByTeams.map((g) => g.id)).toEqual(stored.namedByTeams.map((g) => g.id));
    expect(page.priorities[2].reading).toBeNull();
    /* And the picture is never built from such a check-in in the first place (see "the builder"). */
  });

  it('opening the page writes nothing and asks no model: with no picture yet, the four parts are empty', async () => {
    const page = await read('grace', null);
    expect(page.priorities.every((p) => p.reading === null)).toBe(true);
    expect([page.notReaching, page.namedByTeams, page.saidAndShown]).toEqual([[], [], []]);
    const src = require('fs').readFileSync(require('path').join(__dirname, 'company.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/anthropic|buildPicture|\.upsert\(/i);
  });

  it('nobody is ever served a name the picture stored, an exact word, or a ranking', async () => {
    for (const who of Object.keys(readers) as (keyof typeof readers)[]) {
      const said = JSON.stringify(await read(who)).toLowerCase();
      expect(said).not.toMatch(/miriam|u-miriam|hira@|rank/);
    }
  });

  it('theShareFor gives an item only when every check-in it rests on can be opened', () => {
    const share = theShareFor(stored, { readsEverything: true, mayOpen: new Set(['g-sales']) });
    expect(share.namedByTeams).toEqual([]);
    expect([...share.readings.keys()]).toEqual(['s1', 's3']);
  });
});
