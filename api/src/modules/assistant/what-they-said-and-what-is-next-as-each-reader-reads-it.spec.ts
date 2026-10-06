import { readFileSync } from 'fs';
import { join } from 'path';
import { AssistantService } from './assistant.service';
import { route } from './the-router-is-deterministic';
import { safeToUse } from './the-model-words-it-and-nothing-more';
import { nameMatches, theNameAsked, whenTheyAsked, I_CANNOT_SHOW_YOU_THAT } from './what-they-said-that-you-may-read';
import { theOneToDoFirst, NOTHING_TO_PUT_FIRST } from './what-to-do-next';
import { whichQuestion, answerAGuest, fromTheServedReport } from '../ask/a-guest-asks-only-about-their-own-check-in';

/**
 * WEEK 17: "WHAT DID FEMI SAY LAST WEEK?" AND "WHAT SHOULD I DO NEXT?", AS EACH PERSON READS THEM.
 *
 * One organisation, Baridi. Wairimu leads "Sales team, Q3" (Miriam and Femi are in it) and leads "Performance plan,
 * Femi" (only Femi is in it). Yemi has answered "Kilimani launch" while it is still open. Grace is an admin who is in
 * none of them. Lola is an admin too, and she was not given access to the performance plan. Tom is a member who is in
 * no check-in. Kofi is a guest.
 *
 * The assistant is the real one. The database is pretend, and so is the report: the pretend report serves each
 * reader what the real one serves them (the lead everything, a colleague a finished round's lines and an open
 * round's wall, a stranger nothing), and records who it was called for. What is tested is what each person READS.
 */
const ORG = 'org-baridi';
const NOW = new Date('2026-10-01T09:00:00Z');
const LAST_WEEK = new Date('2026-09-24T10:00:00Z');
const SALES = 'Sales team, Q3';

const people = {
  wairimu: { id: 'pe-wairimu', externalId: 'x-wairimu', email: 'wairimu@baridi.test', linkedUserId: 'u-wairimu', role: 'LEAD' },
  miriam: { id: 'pe-miriam', externalId: 'x-miriam', email: 'miriam@baridi.test', linkedUserId: 'u-miriam', role: 'MEMBER' },
  femi: { id: 'pe-femi', externalId: 'x-femi', email: 'femi@baridi.test', linkedUserId: 'u-femi', role: 'MEMBER' },
  yemi: { id: 'pe-yemi', externalId: 'x-yemi', email: 'yemi@baridi.test', linkedUserId: 'u-yemi', role: 'MEMBER' },
  grace: { id: 'pe-grace', externalId: 'x-grace', email: 'grace@baridi.test', linkedUserId: 'u-grace', role: 'ADMIN' },
  lola: { id: 'pe-lola', externalId: 'x-lola', email: 'lola@baridi.test', linkedUserId: 'u-lola', role: 'ADMIN' },
  tom: { id: 'pe-tom', externalId: 'x-tom', email: 'tom@baridi.test', linkedUserId: 'u-tom', role: 'MEMBER' },
} as const;
type Who = keyof typeof people;

const GROUNDS = [
  { id: 'g-sales', organizationId: ORG, label: SALES, scenario: 'REALIGN_TEAM', initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', createdAt: new Date(3), participants: [{ userId: 'u-wairimu' }, { userId: 'u-miriam' }, { userId: 'u-femi' }] },
  { id: 'g-pip', organizationId: ORG, label: 'Performance plan, Femi', scenario: 'PIP', initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', createdAt: new Date(2), participants: [{ userId: 'u-femi' }] },
  { id: 'g-open', organizationId: ORG, label: 'Kilimani launch', scenario: 'REALIGN_TEAM', initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', createdAt: new Date(1), participants: [{ userId: 'u-wairimu' }, { userId: 'u-miriam' }, { userId: 'u-yemi' }] },
];

/** The rounds finished on each check-in, and the day. */
const ROUNDS: Record<string, { sessionNumber: number; completedAt: Date }[]> = {
  'g-sales': [{ sessionNumber: 1, completedAt: new Date('2026-09-10T10:00:00Z') }, { sessionNumber: 2, completedAt: LAST_WEEK }],
  'g-pip': [{ sessionNumber: 1, completedAt: new Date('2026-09-28T10:00:00Z') }],
  'g-open': [{ sessionNumber: 1, completedAt: new Date('2026-09-30T10:00:00Z') }],
};

const FEMI_LINES = ['Shipped the price list to Harbor Foods.', 'Still waiting on finance for the Green Mart terms.'];
const MIRIAM_LINES = ['Called Westgate Deli and they want January.'];
const PIP_LINES = ['PIP-FEMI-LINE: I missed the July target.'];
const YEMI_LINES = ['YEMI-OPEN-LINE: the Kilimani shop is not ready.'];
const WALL = 'This person has answered, and what they said opens to you when the report is released.';

/** Who each reader is called for, so a test can say the report was only ever read AS the asker. */
const readsMadeFor: { groundId: string; sessionNumber: number; userId: string }[] = [];

/** What the real served report gives each reader of a round: the lead every line, the others only what is released. */
const report = {
  sessionReport: jest.fn(async (groundId: string, sessionNumber: number, userId: string) => {
    readsMadeFor.push({ groundId, sessionNumber, userId });
    const ground = GROUNDS.find((g) => g.id === groundId)!;
    const inIt = ground.participants.some((p) => p.userId === userId);
    const runsIt = ground.initiatorId === userId;
    const isAdmin = userId === 'u-grace' || userId === 'u-lola';
    if (!inIt && !runsIt && !isAdmin) throw new Error('Check-in not found');
    const released = groundId !== 'g-open';
    const rows: Record<string, { name: string; lines: string[] }[]> = {
      'g-sales': [{ name: 'Femi', lines: FEMI_LINES }, { name: 'Miriam', lines: MIRIAM_LINES }],
      'g-pip': [{ name: 'Femi', lines: PIP_LINES }],
      'g-open': [{ name: 'Yemi', lines: YEMI_LINES }],
    };
    const theirs: Record<string, string> = { 'u-femi': 'Femi', 'u-miriam': 'Miriam', 'u-yemi': 'Yemi' };
    return {
      whatEachPersonSaid: rows[groundId].map((r) => {
        const isYou = theirs[userId] === r.name;
        const reads = runsIt || isAdmin || isYou || released;
        return reads
          ? { who: r.name, isYou, lines: r.lines }
          : { who: r.name, isYou, lines: [], saying: WALL };
      }),
    };
  }),
};

function harness(as: Who, opts: { commitments?: any[]; toDos?: any[]; waiting?: any[]; model?: string } = {}) {
  const tables: string[] = [];
  const turns: any[] = [];
  const me = people[as];
  const allowed = new Set(['person', 'organizationMembership', 'ground', 'checkIn', 'assistantProposal', 'assistantTurn', 'commitment', 'todo']);
  const prisma: any = new Proxy({
    person: {
      findFirst: jest.fn(async ({ where }: any) => {
        const p = Object.values(people).find((x) => (where.id ? x.id === where.id : x.externalId === where.externalId));
        return p ? { ...p, active: true } : null;
      }),
      findMany: jest.fn(async () => Object.values(people).map((p) => ({ linkedUserId: p.linkedUserId, department: null }))),
    },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const p = Object.values(people).find((x) => x.linkedUserId === where.userId_organizationId.userId);
      return p ? { role: p.role } : null;
    }) },
    ground: { findMany: jest.fn(async () => GROUNDS) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => ROUNDS[where.groundId] ?? []) },
    assistantProposal: { findFirst: jest.fn(async () => null) },
    assistantTurn: { createMany: jest.fn(async ({ data }: any) => { turns.push(...data); return { count: data.length }; }) },
    commitment: { findMany: jest.fn(async ({ where }: any) => (where.personExternalId === me.externalId ? opts.commitments ?? [] : [{ text: 'SOMEBODY-ELSES-COMMITMENT', state: 'OPEN', dueAt: null, dueSaid: null, statedAt: new Date(0), lastFollowedUpAt: null }])) },
    todo: { findMany: jest.fn(async ({ where }: any) => (where.personExternalId === me.externalId ? opts.toDos ?? [] : [{ text: 'SOMEBODY-ELSES-TODO', dueAt: null, dueSaid: null, createdAt: new Date(0) }])) },
  }, {
    get(target: any, name: string) {
      if (typeof name === 'string' && !(name in target) && !name.startsWith('$') && name !== 'then') {
        tables.push(name);
        throw new Error(`a table this answer must never read: ${name}`);
      }
      if (typeof name === 'string' && target[name]) tables.push(name);
      return target[name];
    },
  });
  void allowed;
  const engine: any = { respond: jest.fn(async () => { if (opts.model) return opts.model; throw new Error('model off for these tests'); }) };
  const board: any = { whoNeedsYouThisWeek: jest.fn(async () => ({ buckets: opts.waiting?.length ? [{ kind: 'WAITING_ON_YOU', asks: 'x', needs: opts.waiting }] : [], whatThisIsNot: ['Nobody is scored here.'] })) };
  const service = new AssistantService(
    prisma, engine, { retrieve: jest.fn() } as any, board, {} as any, { pendingFor: async () => [] } as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, report as any,
  );
  const ask = async (message: string) => service.respond(ORG, me.id, message);
  return { ask, prisma, turns, tables, board };
}

const bodyOf = (r: any) => (r.blocks[0] as { body: string }).body;
const sourceOf = (r: any) => r.blocks.find((b: any) => b.type === 'source');

beforeEach(() => {
  readsMadeFor.length = 0;
  report.sessionReport.mockClear();
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'performance', 'hrtime'] });
});
afterEach(() => jest.useRealTimers());

describe('the router', () => {
  it('sends the two new questions to their own lanes and leaves the old ones where they were', () => {
    expect(route('What should I do next?').lane).toBe('what_next');
    expect(route('What did Femi say last week?')).toEqual({ lane: 'what_did_they_say', subject: 'Femi' });
    expect(route('what did I say about pricing').lane).toBe('what_did_i_say');
    expect(route('what did we agree').lane).toBe('what_came_of_it');
    expect(route('what should I do this week').lane).toBe('where_am_i_needed');
    expect(route('what did the team say').lane).toBe('unplaced');
  });
  it('reads the name and the time out of the sentence', () => {
    expect(theNameAsked('Femi Adeyemi last week')).toBe('Femi Adeyemi');
    expect(whenTheyAsked('What did Femi say last week?')).toBe('last_week');
    expect(nameMatches('Femi Adeyemi', 'femi')).toBe(true);
    expect(nameMatches('Miriam', 'femi')).toBe(false);
  });
});

describe('as the lead who runs the check-in (Wairimu)', () => {
  it('reads Femi\'s words word for word from every check-in of theirs she runs, newest first, each with where it came from', async () => {
    const { ask } = harness('wairimu');
    const r = await ask('What did Femi say last week?');
    expect(bodyOf(r)).toBe([
      'Here is what Femi said in their check-in of 28 September on Performance plan, Femi.',
      '- "PIP-FEMI-LINE: I missed the July target."',
      "This is from Femi's check-in of 28 September on Performance plan, Femi.",
      '',
      `Here is what Femi said in their check-in of 24 September on ${SALES}.`,
      '- "Shipped the price list to Harbor Foods."',
      '- "Still waiting on finance for the Green Mart terms."',
      `This is from Femi's check-in of 24 September on ${SALES}.`,
    ].join('\n'));
    const sources = r.blocks.filter((b: any) => b.type === 'source');
    expect(sources).toEqual([
      { type: 'source', label: "Femi's check-in of 28 September on Performance plan, Femi", says: "This is from Femi's check-in of 28 September on Performance plan, Femi.", href: '/grounds/g-pip/session/1', kind: 'check_in', id: 'g-pip' },
      { type: 'source', label: `Femi's check-in of 24 September on ${SALES}`, says: `This is from Femi's check-in of 24 September on ${SALES}.`, href: '/grounds/g-sales/session/2', kind: 'check_in', id: 'g-sales' },
    ]);
  });

  it('is told plainly when nothing fits the time she named, and given the most recent, dated', async () => {
    const { ask } = harness('wairimu');
    const r = await ask('What did Femi say today?');
    expect(bodyOf(r)).toContain('I cannot find anything Femi said today in a check-in you can read. The most recent I can show you is below.');
    expect(bodyOf(r)).toContain('28 September');
  });
});

describe('as a participant asking about a colleague (Miriam)', () => {
  it('reads what the round serves her of Femi, in the check-in they are both in', async () => {
    const { ask } = harness('miriam');
    const r = await ask('What did Femi say last week?');
    expect(bodyOf(r)).toContain('"Shipped the price list to Harbor Foods."');
    expect(bodyOf(r)).toContain(`This is from Femi's check-in of 24 September on ${SALES}.`);
    /* Femi's performance plan is one she is not in: nothing from it, not even that it exists. */
    expect(bodyOf(r)).not.toContain('PIP');
    expect(bodyOf(r)).not.toContain('Performance plan');
    expect(readsMadeFor.filter((x) => x.groundId === 'g-pip')).toHaveLength(0);
  });

  it('is told the wall, not the words, while the colleague\'s round is still open', async () => {
    const { ask } = harness('miriam');
    const r = await ask('What did Yemi say?');
    expect(bodyOf(r)).not.toContain('YEMI-OPEN-LINE');
    expect(bodyOf(r)).toContain(WALL);
    expect(bodyOf(r)).toContain("I cannot show you Yemi's words from their check-in of 30 September on Kilimani launch.");
    expect(sourceOf(r).href).toBe('/grounds/g-open/session/1');
  });

  it('is told "I cannot show you that" about somebody she shares no check-in with', async () => {
    const { ask } = harness('miriam');
    const r = await ask('What did Kofi say last week?');
    expect(bodyOf(r)).toContain(I_CANNOT_SHOW_YOU_THAT);
    expect(sourceOf(r)).toBeUndefined();
  });

  it('reads her own words as "you"', async () => {
    const { ask } = harness('miriam');
    const r = await ask('What did Miriam say last week?');
    expect(bodyOf(r)).toContain(`Here is what you said in your check-in of 24 September on ${SALES}.`);
    expect(sourceOf(r).label).toBe(`your check-in of 24 September on ${SALES}`);
  });
});

describe('as a colleague who is in no check-in with Femi (Tom)', () => {
  it('gets the same plain refusal, which says nothing about whether Femi said anything', async () => {
    const { ask } = harness('tom');
    const r = await ask('What did Femi say last week?');
    expect(bodyOf(r)).toBe(`${I_CANNOT_SHOW_YOU_THAT} I have nothing from Femi in the check-ins you can read.`);
    expect(bodyOf(r)).not.toContain('Shipped');
    expect(report.sessionReport).not.toHaveBeenCalled();
  });
});

describe('as an admin', () => {
  it('reads an ordinary check-in, as the report serves an admin', async () => {
    const { ask } = harness('grace');
    const r = await ask('What did Miriam say?');
    expect(bodyOf(r)).toContain('"Called Westgate Deli and they want January."');
  });

  it('gets nothing at all from an evaluation check-in she was not given access to, and the report is never even asked', async () => {
    const { ask } = harness('lola');
    const r = await ask('What did Femi say this week?');
    expect(bodyOf(r)).not.toContain('PIP-FEMI-LINE');
    expect(bodyOf(r)).not.toContain('Performance plan');
    expect(readsMadeFor.filter((x) => x.groundId === 'g-pip')).toHaveLength(0);
    /* What she does read of Femi is the ordinary check-in, which an admin may read. */
    expect(bodyOf(r)).toContain(SALES);
  });
});

describe('what is never opened, and whose questions these are', () => {
  it('reads the report only as the person asking', async () => {
    for (const who of ['wairimu', 'miriam', 'grace'] as Who[]) {
      readsMadeFor.length = 0;
      const { ask } = harness(who);
      await ask('What did Femi say last week?');
      expect(readsMadeFor.length).toBeGreaterThan(0);
      expect(new Set(readsMadeFor.map((x) => x.userId))).toEqual(new Set([people[who].linkedUserId]));
    }
  });

  it('touches no table that holds anybody\'s questions, private report or notes', async () => {
    /* The pretend database throws on any table it was not built with. The ones it has are the check-ins, rounds, people and roles. */
    const { ask, tables } = harness('wairimu');
    await ask('What did Femi say last week?');
    expect(tables).not.toContain('assistantTurn-for-femi');
    const SRC = readFileSync(join(__dirname, 'what-they-said-that-you-may-read.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const forbidden of ['assistantTurn', 'assistantProposal', 'leadNote', 'LeadNote', 'theJudgement', 'transcript', 'report.findFirst', 'prisma.report']) {
      expect(SRC).not.toContain(forbidden);
    }
  });

  it('keeps the question under the asker\'s own name and nobody else\'s', async () => {
    const { ask, turns } = harness('miriam');
    await ask('What did Femi say last week?');
    expect(turns.length).toBe(2);
    expect(new Set(turns.map((t) => t.personExternalId))).toEqual(new Set(['x-miriam']));
  });

  it('without the served report it says it cannot show that, and guesses nothing', async () => {
    const { prisma } = harness('wairimu');
    const bare = new AssistantService(prisma, { respond: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    const r = await bare.respond(ORG, people.wairimu.id, 'What did Femi say last week?');
    expect(bodyOf(r)).toContain(I_CANNOT_SHOW_YOU_THAT);
  });
});

describe('as a guest from another organisation (Kofi)', () => {
  it('is answered only about his own check-in: a question about a colleague says so, and nothing is read', () => {
    expect(whichQuestion('What did Femi say last week?')).toBe('help');
    const served = fromTheServedReport({ theOpening: 'Three people have checked in.', agreements: ['Deposits come before delivery'] }, 'p-kofi');
    const said = answerAGuest('help', SALES, { report: served });
    expect(JSON.stringify(said)).not.toContain('Shipped the price list');
    expect(JSON.stringify(said)).toContain('I can answer questions about Sales team, Q3');
  });

  it('is answered what to do next from his own commitments only', () => {
    /* Week 24: "what should I do next" is its own question for a guest now, one thing put first from his own commitments. This pinned the older answer, which listed them all. */
    expect(whichQuestion('What should I do next?')).toBe('next_step');
    expect(whichQuestion('What did I commit to?')).toBe('mine');
    const served = fromTheServedReport({
      overTime: { commitments: [
        { participantId: 'p-kofi', say: 'You said in session 1 that you would send the Harbor Foods price list by Friday.' },
        { participantId: 'p-miriam', say: 'MIRIAM-COMMITMENT: Miriam said she would call Westgate Deli.' },
      ], dependencies: [] },
    }, 'p-kofi');
    const said = answerAGuest('mine', SALES, { report: served });
    expect(JSON.stringify(said)).toContain('send the Harbor Foods price list');
    expect(JSON.stringify(said)).not.toContain('MIRIAM-COMMITMENT');
  });
});

describe('"What should I do next?", as each person reads it', () => {
  const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

  it('puts a commitment whose date has passed first, says why, and says where it came from', async () => {
    const { ask } = harness('miriam', {
      commitments: [{ id: 'c1', text: 'Send the Westgate price list', dueSaid: 'Friday', dueAt: day(-3), state: 'OPEN', statedAt: day(-20), lastFollowedUpAt: null }],
      toDos: [{ id: 't1', text: 'Book the room', dueSaid: null, dueAt: null, createdAt: day(-5) }],
    });
    const r = await ask('What should I do next?');
    expect(bodyOf(r)).toBe([
      'Start with "Send the Westgate price list". You said you would do it by Friday, and the date you gave has passed, so whoever is counting on it is still waiting. Either do it, or tell them when it will happen. After that, one more thing is open. Ask me what is on your list, or where you are needed, to see them.',
      '',
      'This is from the commitments you have made in your check-ins.',
    ].join('\n'));
    expect(sourceOf(r)).toMatchObject({ kind: 'commitments', href: '/you' });
  });

  it('puts somebody waiting on you first when nothing of yours has slipped', async () => {
    const { ask } = harness('wairimu', { waiting: [{ kind: 'WAITING_ON_YOU', who: 'Femi', says: 'waiting on you for the discount approval', waitingDays: 6, sinceSays: 'since 27 September' }] });
    const r = await ask('what do I do next');
    /* The day the wait began, not a count of days from the asking (request 117, part 9; 3 October). */
    expect(bodyOf(r)).toContain('Start with Femi. Femi has been waiting on you for the discount approval since 27 September. Nobody else can clear this one.');
    expect(sourceOf(r)).toMatchObject({ kind: 'today', href: '/today' });
  });

  it('falls to your to-do list, and says so', async () => {
    const { ask } = harness('tom', { toDos: [{ id: 't1', text: 'Renew the domain', dueSaid: null, dueAt: null, createdAt: day(-5) }] });
    const r = await ask('What should I do next?');
    expect(bodyOf(r)).toContain('Start with "Renew the domain". It is the oldest thing on your to-do list.');
    expect(bodyOf(r)).toContain('This is from your to-do list.');
  });

  it('says so plainly when nothing supports an answer', async () => {
    const { ask } = harness('tom');
    const r = await ask('What should I do next?');
    expect(bodyOf(r)).toBe(NOTHING_TO_PUT_FIRST);
    expect(sourceOf(r)).toBeUndefined();
  });

  it('reads nobody else\'s commitments, to-dos or queue', async () => {
    const { ask, prisma } = harness('miriam', { toDos: [{ id: 't1', text: 'Book the room', dueSaid: null, dueAt: null, createdAt: day(-5) }] });
    const r = await ask('What should I do next?');
    expect(bodyOf(r)).not.toContain('SOMEBODY-ELSES');
    for (const call of [...prisma.commitment.findMany.mock.calls, ...prisma.todo.findMany.mock.calls]) {
      expect(call[0].where.personExternalId).toBe('x-miriam');
    }
  });

  it('never ranks anybody\'s load: the pure read takes only the reader\'s own three lists', () => {
    const r = theOneToDoFirst({ commitments: [], toDos: [], waitingOnYou: [], now: NOW });
    expect(JSON.stringify(r)).toContain('nothing to put first');
  });
});

describe('the wording may change, but the record may not', () => {
  const draft = 'Here is what Femi said in their check-in of 24 September on Sales team, Q3.\n- "Shipped the price list to Harbor Foods."\nThis is from Femi\'s check-in of 24 September on Sales team, Q3.';
  it('refuses a rewording that changes a quoted line', () => {
    const changed = 'Femi said "Shipped the pricing sheet to Harbor Foods." in their check-in of 24 September on Sales team, Q3. This is from Femi\'s check-in.';
    expect(safeToUse(draft, changed)).toBe(false);
  });
  it('refuses a name, a number or a date the record did not give', () => {
    expect(safeToUse(draft, draft.replace('Femi said', 'Femi and Kemi said'))).toBe(false);
    expect(safeToUse(draft, draft.replace('24 September', '25 September'))).toBe(false);
  });
  it('allows a rewording that keeps every quote, name, number and date', () => {
    const fine = 'In their check-in of 24 September on Sales team, Q3, Femi said:\n- "Shipped the price list to Harbor Foods."\nThis is from Femi\'s check-in of 24 September on Sales team, Q3.';
    expect(safeToUse(draft, fine, ['"Shipped the price list to Harbor Foods."'.slice(1, -1)])).toBe(true);
  });
  it('keeps the quoted lines and the source sentence when a model has reworded the answer', async () => {
    const reworded = 'In their check-in of 24 September on Sales team, Q3, Femi said:\n- "Shipped the price list to Harbor Foods."\n- "Still waiting on finance for the Green Mart terms."\nThis is from Femi\'s check-in of 24 September on Sales team, Q3.';
    const r = await harness('miriam', { model: reworded }).ask('What did Femi say last week?');
    expect(r.composedBy).toBe('model');
    expect(bodyOf(r)).toBe(reworded);
    expect(sourceOf(r)).toBeDefined();
  });
  it('ships the record\'s own words when a model has changed a quote', async () => {
    const changed = 'Femi said:\n- "Shipped the pricing sheet to Harbor Foods."\n- "Still waiting on finance for the Green Mart terms."\nThis is from Femi\'s check-in of 24 September on Sales team, Q3.';
    const r = await harness('miriam', { model: changed }).ask('What did Femi say last week?');
    expect(r.composedBy).toBe('rules');
    expect(bodyOf(r)).toContain('"Shipped the price list to Harbor Foods."');
  });
});

describe('the older lanes that read a record now say where it came from too', () => {
  it('your to-do list, your commitments and what needs you', async () => {
    const day = new Date(NOW.getTime() - 86_400_000);
    const h = harness('wairimu', {
      toDos: [{ id: 't1', text: 'Renew the domain', dueSaid: null, dueAt: null, createdAt: day }],
      commitments: [{ id: 'c1', text: 'Send the rota', dueSaid: null, dueAt: null, state: 'OPEN', statedAt: day, lastFollowedUpAt: null }],
      waiting: [{ kind: 'WAITING_ON_YOU', who: 'Femi', says: 'waiting on you for the discount approval', waitingDays: 6 }],
    });
    const todos = await h.ask('what is on my list?');
    expect(bodyOf(todos)).toMatch(/This is from your to-do list\.$/);
    expect(sourceOf(todos)).toMatchObject({ kind: 'to_dos', href: '/suite/todos' });

    const commitments = await h.ask('what did I commit to');
    expect(bodyOf(commitments)).toMatch(/This is from the commitments you have made in your check-ins\.$/);

    const needed = await h.ask('where am I needed');
    expect(bodyOf(needed)).toMatch(/This is from what needs you on Today\.$/);
    expect(sourceOf(needed)).toMatchObject({ kind: 'today', href: '/today' });
  });
});
