import { ForbiddenException } from '@nestjs/common';
import { YourBoardService, NOT_YOURS } from './your-board.service';
import { YouController } from './you.controller';

/**
 * THE YOU BOARD, AS EACH PERSON IS SERVED IT (C2, U.12).
 *
 * One organisation. Wairimu runs "Sales team, Q3" and takes part in it. Miriam and Brian take part.
 * Grace is an admin who is not in it. The check-ins list is given to each of them as the real one
 * would: an admin is given every check-in in the organisation, everybody else the ones they are in.
 *
 * The rule under test: a You board is read only by the person it belongs to. A lead, an admin and a
 * colleague asking for Miriam's are refused, and nothing of Miriam's reaches anybody else's own
 * board either, even though the lead's and the admin's lists carry her place in the check-in.
 */

const ORG = 'org-baridi';
const NOW = Date.now();
const ago = (days: number) => new Date(NOW - days * 86_400_000);

const people = {
  wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', role: 'LEAD' },
  miriam: { userId: 'u-miriam', email: 'miriam@baridi.test', role: 'MEMBER' },
  brian: { userId: 'u-brian', email: 'brian@baridi.test', role: 'MEMBER' },
  grace: { userId: 'u-grace', email: 'grace@baridi.test', role: 'ADMIN' },
};

const sales = {
  id: 'g-sales', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: ORG, initiatorId: 'u-wairimu',
  closedAt: null, resolvedAt: null,
  participants: [
    { id: 'p-wairimu', userId: 'u-wairimu' },
    { id: 'p-miriam', userId: 'u-miriam' },
    { id: 'p-brian', userId: 'u-brian' },
  ],
  checkIns: [
    { id: 'c-m1', participantId: 'p-miriam', sessionNumber: 1, status: 'COMPLETED', completedAt: ago(8), availableFrom: ago(9), isSetup: false },
    { id: 'c-m2', participantId: 'p-miriam', sessionNumber: 2, status: 'COMPLETED', completedAt: ago(1), availableFrom: ago(2), isSetup: false },
    { id: 'c-m3', participantId: 'p-miriam', sessionNumber: 3, status: 'NOT_STARTED', completedAt: null, availableFrom: ago(0.1), isSetup: false },
    { id: 'c-b1', participantId: 'p-brian', sessionNumber: 1, status: 'COMPLETED', completedAt: ago(8), availableFrom: ago(9), isSetup: false },
    { id: 'c-w1', participantId: 'p-wairimu', sessionNumber: 1, status: 'COMPLETED', completedAt: ago(8), availableFrom: ago(9), isSetup: false },
  ],
};

const rows = {
  personObjective: [
    { id: 'o-m-goal', groundId: 'g-sales', participantId: 'p-miriam', text: 'Close Westgate Deli and Lakeside Supermarket this quarter.', kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', dueSaid: null, createdAt: ago(20) },
    { id: 'o-m-said', groundId: 'g-sales', participantId: 'p-miriam', text: 'Send every quote with a photo', kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', dueSaid: 'every week', createdAt: ago(19) },
    { id: 'o-m-whole', groundId: 'g-sales', participantId: 'p-miriam', text: 'The team reaches 25 sales.', kind: 'SUCCESS_DEFINITION', status: 'OPEN', authoredBy: 'lead', dueSaid: null, createdAt: ago(19) },
    { id: 'o-m-met', groundId: 'g-sales', participantId: 'p-miriam', text: 'An old goal that was met.', kind: 'GOAL', status: 'MET', authoredBy: 'lead', dueSaid: null, createdAt: ago(40) },
    { id: 'o-b-goal', groundId: 'g-sales', participantId: 'p-brian', text: 'BRIAN-GOAL: Clean the customer records.', kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', dueSaid: null, createdAt: ago(20) },
  ],
  groundObjective: [
    { id: 't-m', groundId: 'g-sales', ownerParticipantId: 'p-miriam', name: 'Sales closed', target: 4, count: 3, sortOrder: 0, createdAt: ago(20) },
    { id: 't-b', groundId: 'g-sales', ownerParticipantId: 'p-brian', name: 'BRIAN-TARGET', target: 4, count: 1, sortOrder: 1, createdAt: ago(20) },
  ],
  groundCommitment: [
    { id: 'k-m1', groundId: 'g-sales', participantId: 'p-miriam', text: 'Visit Westgate Deli', whenSaid: 'Friday', status: 'UNKNOWN', createdAt: ago(3) },
    { id: 'k-m2', groundId: 'g-sales', participantId: 'p-miriam', text: 'Send Green Mart the quote, with a photo', whenSaid: null, status: 'DONE', createdAt: ago(6) },
    { id: 'k-m3', groundId: 'g-sales', participantId: 'p-miriam', text: 'Something she dropped', whenSaid: null, status: 'DROPPED', createdAt: ago(6) },
    { id: 'k-b1', groundId: 'g-sales', participantId: 'p-brian', text: 'BRIAN-SAID: Hand over the records', whenSaid: null, status: 'UNKNOWN', createdAt: ago(3) },
    { id: 'k-none', groundId: 'g-sales', participantId: null, text: 'NOBODY-OWNS-THIS', whenSaid: null, status: 'UNKNOWN', createdAt: ago(3) },
  ],
  coachingState: [
    { participantId: 'p-miriam', currentStep: 'Ask Westgate what would get the deposit paid this week.', updatedAt: ago(1) },
    { participantId: 'p-brian', currentStep: 'BRIAN-STEP: Call the five old customers.', updatedAt: ago(1) },
  ],
  person: [
    { organizationId: ORG, email: 'miriam@baridi.test', externalId: 'x-miriam' },
    { organizationId: ORG, email: 'brian@baridi.test', externalId: 'x-brian' },
  ],
  todo: [
    { id: 'd-m1', organizationId: ORG, personExternalId: 'x-miriam', text: 'Send a photo of Green Mart’s written order.', dueSaid: null, state: 'OPEN' },
    { id: 'd-b1', organizationId: ORG, personExternalId: 'x-brian', text: 'BRIAN-TODO', dueSaid: null, state: 'OPEN' },
  ],
  /* Everything asked of you (U.16) has its own spec: everything-asked-of-you-as-each-reader-reads-it. */
  groundDependency: [] as any[],
  /* "Something that keeps coming up" has its own tests below, own-patterns-and-nobody-elses. Empty
     here so every other test in this file, which does not care about patterns, sees none. */
  patternDetection: [] as any[],
};

/** Just enough of Prisma's `where` to filter by `in` lists and plain values. */
function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'equals' in v) return String(row[k]).toLowerCase() === String(v.equals).toLowerCase();
    return row[k] === v;
  });
}
const table = (name: keyof typeof rows) => ({
  findMany: jest.fn(async ({ where }: any) => (rows[name] as any[]).filter((r) => matches(r, where))),
  findFirst: jest.fn(async ({ where }: any) => (rows[name] as any[]).find((r) => matches(r, where)) ?? null),
});

/** `patternRows` overrides the shared empty table, for the "something that keeps coming up" tests below. */
function setup(patternRows: any[] = []) {
  rows.patternDetection = patternRows;
  const prisma: any = {
    personObjective: table('personObjective'),
    groundObjective: table('groundObjective'),
    groundCommitment: table('groundCommitment'),
    coachingState: table('coachingState'),
    person: table('person'),
    todo: table('todo'),
    groundDependency: table('groundDependency'),
    patternDetection: { ...table('patternDetection'), updateMany: jest.fn(async () => ({ count: 0 })) },
  };
  const grounds: any = {
    list: jest.fn(async (_org: string, userId: string, _email: string, role: string) =>
      role === 'ADMIN' || sales.participants.some((p) => p.userId === userId) ? [sales] : []),
  };
  const svc = new YourBoardService(prisma, grounds);
  const read = (who: keyof typeof people, askedFor?: string) =>
    svc.forReader({ ...people[who], organizationId: ORG }, askedFor);
  return { svc, prisma, grounds, read };
}

describe('Miriam reads her own You board', () => {
  it('is served what is hers, in plain sentences', async () => {
    const { read } = setup();
    const b = await read('miriam');

    expect(b.checkIns).toEqual([
      { id: 'g-sales', label: 'Sales team, Q3', youRunIt: false, line: 'You have finished two check-ins.', to: '/grounds/g-sales' },
    ]);
    expect(b.turns.map((t) => [t.title, t.action.label, t.action.to])).toEqual([
      ['Your own check-in for Sales team, Q3', 'Start it', '/checkin/c-m3'],
    ]);
    expect(b.goals.map((g) => g.says)).toEqual([
      'Close Westgate Deli and Lakeside Supermarket this quarter.',
      'Sales closed. You have 3 of 4.',
    ]);
    expect(b.saidYoudDo.map((s) => [s.text, s.when, s.checkIn, s.stateSays])).toEqual([
      ['Send every quote with a photo', 'every week', 'Sales team, Q3', 'Open'],
      ['Visit Westgate Deli', 'Friday', 'Sales team, Q3', 'Open'],
      ['Send Green Mart the quote, with a photo', null, 'Sales team, Q3', 'Kept'],
    ]);
    expect(b.todos.map((t) => t.text)).toEqual(['Send a photo of Green Mart’s written order.']);
    /* Hafsah, 29 September 2026: a full sentence spoken to "you", not "One thing for this week:"
       colon-joined onto the library's third-person text. See a-step-said-to-you.ts. */
    expect(b.coaching).toEqual({ says: 'One thing to try this week is to ask Westgate what would get the deposit paid this week.', checkIn: 'Sales team, Q3' });
    expect(b.ownReports).toEqual([{ checkIn: 'Sales team, Q3', at: ago(1).toISOString(), to: '/checkin/c-m2/report' }]);
  });

  it('holds nothing of anybody else, nothing dropped, and nothing about the whole check-in', async () => {
    const { read } = setup();
    const said = JSON.stringify(await read('miriam'));
    for (const other of ['BRIAN', 'NOBODY-OWNS-THIS', 'Something she dropped', 'The team reaches 25 sales', 'An old goal that was met']) {
      expect(said).not.toContain(other);
    }
  });

  it('never says how anybody was rated, and puts no label on anybody', async () => {
    const { read } = setup();
    const said = JSON.stringify(await read('miriam'));
    expect(said).not.toMatch(/specificity|confidence|severity|rating|score/i);
    expect(said).not.toMatch(/\bPIP\b|at risk|\bexit\b/i);
  });

  it('asking for her own by name is the same as asking for her own', async () => {
    const { read } = setup();
    expect(await read('miriam', 'u-miriam')).toEqual(await read('miriam'));
  });
});

describe('nobody else may read Miriam’s You board', () => {
  it.each([
    ['Wairimu, who runs her check-in', 'wairimu'],
    ['Grace, an admin', 'grace'],
    ['Brian, her colleague in the check-in', 'brian'],
  ] as const)('%s is refused, before anything is read', async (_who, reader) => {
    const { read, grounds, prisma } = setup();
    await expect(read(reader, 'u-miriam')).rejects.toThrow(ForbiddenException);
    await expect(read(reader, 'u-miriam')).rejects.toThrow(NOT_YOURS);
    expect(grounds.list).not.toHaveBeenCalled();
    expect(prisma.personObjective.findMany).not.toHaveBeenCalled();
    expect(prisma.todo.findMany).not.toHaveBeenCalled();
  });

  it('Wairimu’s own board carries only her own place, though her list carries Miriam’s', async () => {
    const { read } = setup();
    const b = await read('wairimu');
    expect(b.checkIns.map((c) => c.line)).toEqual(['You run this check-in. You have finished one check-in.']);
    const said = JSON.stringify(b);
    for (const hers of ['Westgate', 'Green Mart', 'Sales closed', 'c-m2', 'BRIAN']) expect(said).not.toContain(hers);
    expect(b.goals).toEqual([]);
    expect(b.coaching).toBeNull();
  });

  it('Grace’s own board is empty, though an admin’s list carries every check-in', async () => {
    const { read } = setup();
    const b = await read('grace');
    expect(b).toEqual({ checkIns: [], turns: [], goals: [], saidYoudDo: [], todos: [], coaching: null, ownReports: [], keptLately: null });
  });

  it('Brian’s own board is his, and none of Miriam’s', async () => {
    const { read } = setup();
    const b = await read('brian');
    expect(b.goals.map((g) => g.says)).toEqual(['BRIAN-GOAL: Clean the customer records.', 'BRIAN-TARGET. You have 1 of 4.']);
    expect(b.todos.map((t) => t.text)).toEqual(['BRIAN-TODO']);
    const said = JSON.stringify(b);
    for (const hers of ['Westgate', 'Green Mart', 'Sales closed', 'c-m2']) expect(said).not.toContain(hers);
  });
});

/**
 * "SOMETHING THAT KEEPS COMING UP", ON THE YOU BOARD (C2, request 79c/answers-from-engine.md,
 * "Patterns have a new shape"). Built here through the same rule as the board and the check-in's
 * own record (patterns/who-reads-a-pattern.ts), so a pattern needs three check-ins and a plain
 * name to appear, the person it is about reads it first, and nobody else's ever reaches this page -
 * not even Wairimu, who runs the check-in: the You board is always "your own", never anyone else's.
 */
describe('something that keeps coming up, on the You board', () => {
  const miriamsPattern = {
    id: 'pat-miriam', participantId: 'p-miriam', code: 'M2',
    observationText: 'Her quotes have let two colleagues move faster this month.',
    seenInSessions: [1, 2, 3], periodsObserved: 3,
    readyAt: ago(2), shownToPersonAt: null, personAnswer: null, personAnsweredAt: null,
    participant: {
      groundId: 'g-sales',
      ground: { label: 'Sales team, Q3', initiatorId: 'u-wairimu', participants: sales.participants },
    },
  };

  it('Miriam reads her own, can answer it, and it names the check-in it came from', async () => {
    const { read } = setup([miriamsPattern]);
    const b = await read('miriam');
    expect(b.patterns?.length).toBe(1);
    const p = b.patterns![0];
    expect(p.yours).toBe(true);
    expect(p.canAnswer).toBe(true);
    expect(p.checkIn).toBe('Sales team, Q3');
    expect(p.heading).toBeTruthy();
    expect(p.theirWords).toBeNull();
  });

  it('marks it as shown to her, the first time she reads it', async () => {
    const { read, prisma } = setup([miriamsPattern]);
    await read('miriam');
    expect(prisma.patternDetection.updateMany).toHaveBeenCalled();
  });

  it('is never on Wairimu’s own board, though she runs the check-in it is about', async () => {
    const { read } = setup([miriamsPattern]);
    const b = await read('wairimu');
    expect(b.patterns ?? []).toEqual([]);
    expect(JSON.stringify(b)).not.toContain('colleagues move faster');
  });

  it('is never on Brian’s own board, even though the row is right there for the same check-in', async () => {
    const { read } = setup([miriamsPattern]);
    const b = await read('brian');
    expect(b.patterns ?? []).toEqual([]);
    expect(JSON.stringify(b)).not.toContain('colleagues move faster');
  });

  it('says nothing at all before three check-ins', async () => {
    const { read } = setup([{ ...miriamsPattern, seenInSessions: [1, 2], periodsObserved: 2 }]);
    const b = await read('miriam');
    expect(b.patterns ?? []).toEqual([]);
  });
});

describe('the door: GET /you and GET /you/:userId', () => {
  const as = (who: keyof typeof people) => ({ id: people[who].userId, email: people[who].email, organizationId: ORG, role: people[who].role } as any);

  it('reads your own at /you', async () => {
    const { svc } = setup();
    const door = new YouController(svc);
    expect((await door.mine(as('miriam'))).todos.map((t) => t.text)).toEqual(['Send a photo of Green Mart’s written order.']);
  });

  it.each(['wairimu', 'grace', 'brian'] as const)('refuses %s at /you/:userId and at /you?userId= for Miriam', async (who) => {
    const { svc } = setup();
    const door = new YouController(svc);
    await expect(door.someone(as(who), 'u-miriam')).rejects.toThrow(NOT_YOURS);
    await expect(door.mine(as(who), 'u-miriam')).rejects.toThrow(NOT_YOURS);
  });
});

describe('Groundwork’s suggestions about you, on your own You board (C3, U.13)', () => {
  const aboutMiriam = {
    id: 's-1', checkIn: { id: 'g-sales', label: 'Sales team, Q3' }, leadName: 'Wairimu',
    facts: 'In the last 4 weeks, you kept 14 of your 16 commitments.', whatWouldChangeIt: null,
    decision: null, yourSide: null, yourAppeal: null, appealDecision: null, mayAppeal: false,
  };

  it('Miriam’s board carries the suggestions about her, as the person it is about reads them', async () => {
    const { prisma, grounds } = setup();
    const suggestions: any = { aboutYou: jest.fn(async (r: any) => (r.userId === 'u-miriam' ? [aboutMiriam] : [])) };
    const svc = new YourBoardService(prisma, grounds, suggestions);
    const b = await svc.forReader({ ...people.miriam, organizationId: ORG });
    expect(b.suggestionsAboutYou).toEqual([aboutMiriam]);
    expect(suggestions.aboutYou).toHaveBeenCalledWith({ userId: 'u-miriam', organizationId: ORG });
  });

  it('nobody else’s board carries them, and a board with none has no such part', async () => {
    const { prisma, grounds } = setup();
    const suggestions: any = { aboutYou: jest.fn(async (r: any) => (r.userId === 'u-miriam' ? [aboutMiriam] : [])) };
    const svc = new YourBoardService(prisma, grounds, suggestions);
    for (const who of ['wairimu', 'grace', 'brian'] as const) {
      const b = await svc.forReader({ ...people[who], organizationId: ORG });
      expect(b).not.toHaveProperty('suggestionsAboutYou');
      await expect(svc.forReader({ ...people[who], organizationId: ORG }, 'u-miriam')).rejects.toThrow(NOT_YOURS);
    }
  });
});

/**
 * EVERY GOAL ON THE YOU BOARD IS WRITTEN TO THE PERSON READING IT (request 154, item 5).
 *
 * A goal taken from a target already went through `asTheReader`. One taken from an objective did
 * not, so the page served a person their own words back in the first person while the goal
 * directly beside it said "you". Amani read "I am aiming for 3 shops in Kilimani by 20 December."
 * and "My job is to deliver every order"; Rukia read "Four shops for me by 20 December."
 *
 * On the function the page is built from, because the defect was in one branch of two.
 */
describe('a goal from an objective is written to its reader, as one from a target already was', () => {
  const { asTheReader } = require('./what-a-participant-is-told-about-this');

  it('turns the first person into the second, which is what the page did not do', () => {
    expect(asTheReader('I am aiming for 3 shops in Kilimani by 20 December.')).toBe('You are aiming for 3 shops in Kilimani by 20 December.');
    expect(asTheReader('My job is to deliver every order on the day it is placed.')).toBe('Your job is to deliver every order on the day it is placed.');
  });

  it('and the page calls it on what somebody else wrote, never on the person\'s own words', () => {
    const src = require('fs').readFileSync(__dirname + '/your-board.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    /* `authoredBy: 'self'` is the person's own sentence and is served exactly as they wrote it
       (Hafsah, 26 September). Everything else is written to the reader. */
    expect(src).toContain("const theirOwnWords = o.authoredBy === 'self'");
    expect(src).toContain('theirOwnWords ? text : asTheReader(text)');
  });
});
