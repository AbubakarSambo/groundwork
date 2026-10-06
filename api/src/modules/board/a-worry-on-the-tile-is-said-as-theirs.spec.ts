import { Logger } from '@nestjs/common';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';

/**
 * THE BLOCKERS TILE'S WORRY, AS EACH READER READS IT (review of 1 October 2026, re-d, seniorhire and
 * pip). The tile served a person's worry in their own first-person words with no name: "I still set up
 * the meetings. There are 4 more worries on record, and nobody is waiting on anybody." It is now their
 * words in quotation marks after their name, "You said, ..." for them.
 */
const at = (d: string) => new Date(`2026-09-${d}T16:00:00Z`);
const person = (id: string, userId: string, first: string, last: string, lead = false) => ({
  id, userId, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, email: `${userId}@sales.test`,
  roleAsDescribed: lead ? 'Sales manager' : 'Relationship officer', nameGiven: null, organisationGiven: null, managingOnly: lead,
  remitAsGiven: null, createdAt: new Date(`2026-09-01T${lead ? '09' : '10'}:00:00Z`), user: { firstName: first, lastName: last },
});
const PEOPLE = [person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', true), person('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze'), person('p-kwame', 'u-kwame', 'Kwame', 'Mensah')];
const CHECK_INS = ['p-ngozi', 'p-kwame'].flatMap((pid) => [1, 2].map((n) => ({
  id: `c${n}-${pid}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: at(n === 1 ? '15' : '29'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
})));
const objective = (id: string, name: string, target: number, count: number, owner: string | null, sortOrder: number) => ({
  id, groundId: 'g-sales', name, target, count, prevCount: 0, ownerParticipantId: owner, setByParticipantId: null,
  direction: null, isADecisionAboutAPerson: false, sortOrder, addedAtSession: null, assumes: [],
});

interface World { objectives: any[]; snapshots: Record<number, { objectiveId: string; count: number }[]>; worries?: any[] }

function prismaFor(w: World, role: string) {
  const ground: any = {
    id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-bisi', createdByUserId: 'u-bisi', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'FORTNIGHTLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Credit sales against this quarter target', participants: PEOPLE,
    checkIns: CHECK_INS, report: null, dependencies: [], poll: null, objectives: w.objectives, personObjectives: [],
    closedAt: null, kindOfWork: null, workStages: null,
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 2 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => structuredClone(ground)) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async (args: any) => structuredClone(CHECK_INS).filter((c: any) => args?.where?.sessionNumber == null || c.sessionNumber === args.where.sessionNumber)) }),
    groundObjective: model({ findMany: jest.fn(async () => structuredClone(w.objectives)) }),
    groundObjectiveSnapshot: model({ findMany: jest.fn(async (args: any) => structuredClone(w.snapshots[args?.where?.sessionNumber] ?? [])) }),
    recordEntry: model({ findMany: jest.fn(async (args: any) => (args?.where?.type?.in?.includes?.('WORRY') || (args?.where?.participant && !args?.where?.type) ? structuredClone(w.worries ?? []) : [])) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

async function readAs(w: World, userId: string, role = 'MEMBER'): Promise<{ blockers: { value: string; sub: string }; movement: { value: string; sub: string }; sinceLast: string }> {
  const prisma = prismaFor(w, role);
  const reports = Object.create(ReportsService.prototype) as any;
  reports.prisma = prisma;
  reports.logger = new Logger('test');
  reports.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
  const board = await new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-sales', userId) as any;
  const report = await (reports as ReportsService).get('g-sales', userId, 'org-1') as any;
  const movement = (board.quickRead ?? []).find((t: any) => t.label === 'Movement');
  const blockers = (board.quickRead ?? []).find((t: any) => t.label === 'Blockers');
  return { blockers: { value: blockers?.value, sub: blockers?.sub }, movement: { value: movement?.value, sub: movement?.sub }, sinceLast: [report.sinceLast?.says, report.sinceLast?.also].filter(Boolean).join(' ') };
}


const w: World = {
  objectives: [],
  snapshots: {},
  worries: [
    { text: 'I still set up the meetings. Nobody else does.', participantId: 'p-kwame', saidWordForWord: true },
    { text: 'The committee is slow.', participantId: 'p-ngozi', saidWordForWord: true },
  ],
};
const REST = 'There is 1 more worry on record, and nobody is waiting on anybody.';

describe('the Blockers tile says whose worry it is', () => {
  it('Bisi, who runs it, reads Kwame\'s words after his name', async () => {
    expect((await readAs(w, 'u-bisi')).blockers).toEqual({ value: '2 worries', sub: `Kwame Mensah said, "I still set up the meetings." ${REST}` });
  });
  /* Request 105 (the prototype's B5): the tiles are the team's picture, so a person who checks in is served
     none of them until it is shared, and no report is released on this board. */
  it('Kwame, who checks in, is served no tile before the team picture is shared', async () => {
    expect((await readAs(w, 'u-kwame')).blockers).toEqual({ value: undefined, sub: undefined });
  });
  it('Ngozi, a colleague, is served no tile with Kwame\'s words before the team picture is shared', async () => {
    expect((await readAs(w, 'u-ngozi')).blockers).toEqual({ value: undefined, sub: undefined });
  });
  it('an admin outside the check-in reads them after his name', async () => {
    expect((await readAs(w, 'u-grace', 'ADMIN')).blockers.sub).toBe(`Kwame Mensah said, "I still set up the meetings." ${REST}`);
  });
  it('no reader is served the bare first-person line', async () => {
    for (const [u, r] of [['u-bisi', 'MEMBER'], ['u-kwame', 'MEMBER'], ['u-ngozi', 'MEMBER'], ['u-grace', 'ADMIN']] as const) {
      expect(String((await readAs(w, u, r)).blockers.sub)).not.toMatch(/^I still/);
    }
  });
});

describe('a line the record did not keep word for word is never put in quotation marks', () => {
  it('the tile passes over it and gives the count', async () => {
    const paraphrased: World = { ...w, worries: [{ text: 'I still set up the meetings.', participantId: 'p-kwame', saidWordForWord: false }] };
    expect((await readAs(paraphrased, 'u-bisi')).blockers).toEqual({ value: '1 worry', sub: '1 worry is on record. It was not kept in the words it was said, so it is not quoted here. Nobody is waiting on anybody.' }); /* Changed 5 Oct 2026, request 127 item 7: the true reason, which is the lead's as well. */
  });
});

describe('where a colleague\'s words are walled from the reader (the person an evaluation is about)', () => {
  const { whatThisSessionHolds } = require('../reports/what-this-session-holds');
  const prisma = (rows: any[]) => ({
    checkIn: { findMany: async () => [{ id: 'c1' }] },
    groundDependency: { findMany: async () => [] },
    groundObjective: { findMany: async () => [] },
    groundObjectiveSnapshot: { findMany: async () => [] },
    ground: { findUnique: async () => ({ participants: PEOPLE, peersVisibleToEachOther: true }) },
    recordEntry: { findMany: async (args: any) => (args?.where?.type ? rows : []) },
  });
  it('reads only their own worry, as "You said"', async () => {
    const held = await whatThisSessionHolds(prisma(w.worries!), 'g-sales', 1, { participantId: 'p-ngozi', isLead: false, colleaguesWordsWalled: true });
    expect(held.theFirstWorry).toBe('You said, "The committee is slow."');
  });
  it('and with only a colleague\'s worry, no words at all, so the tile gives the count', async () => {
    const held = await whatThisSessionHolds(prisma(w.worries!.slice(0, 1)), 'g-sales', 1, { participantId: 'p-ngozi', isLead: false, colleaguesWordsWalled: true });
    expect(held.theFirstWorry).toBeNull();
    expect(held.worries).toBe(1);
    /* Request 127 item 7: the count says the true reason, which here is the wall. */
    expect(held.whyNoWorryIsShown).toBe('walled');
  });
});

/*
 * REQUEST 127 ITEM 7, AFTER REVIEW: A COUNT WITH NO WORRY SHOWN SAYS THE TRUE REASON.
 * "cannot be shown to you" was false for a lead, whose worries were simply never kept word for word.
 */
describe('request 127 (7): the Blockers tile says why no worry is named', () => {
  const notKept: World = { ...w, worries: [
    { text: 'I still set up the meetings.', participantId: 'p-kwame', saidWordForWord: false },
    { text: 'The committee is slow.', participantId: 'p-ngozi', saidWordForWord: false },
  ] };
  it.each([['Bisi, who runs it', 'u-bisi', 'MEMBER'], ['Grace, an admin', 'u-grace', 'ADMIN']])('%s reads that none was kept word for word', async (_who, u, role) => {
    expect((await readAs(notKept, u, role)).blockers).toEqual({
      value: '2 worries',
      sub: '2 worries are on record. None was kept in the words it was said, so none is quoted here. Nobody is waiting on anybody.',
    });
  });
  it('Kwame and Ngozi, who check in, are served no tile before the team picture is shared', async () => {
    for (const u of ['u-kwame', 'u-ngozi']) expect((await readAs(notKept, u)).blockers).toEqual({ value: undefined, sub: undefined });
  });

  const { whatThisSessionHolds, atAGlanceTiles } = require('../reports/what-this-session-holds');
  const prisma = (rows: any[]) => ({
    checkIn: { findMany: async () => [{ id: 'c1' }] },
    groundDependency: { findMany: async () => [] },
    groundObjective: { findMany: async () => [] },
    groundObjectiveSnapshot: { findMany: async () => [] },
    ground: { findUnique: async () => ({ participants: PEOPLE, peersVisibleToEachOther: true }) },
    recordEntry: { findMany: async (args: any) => (args?.where?.type ? rows : []) },
  });
  const tileFor = async (rows: any[]) => {
    const held = await whatThisSessionHolds(prisma(rows), 'g-sales', 1, { participantId: 'p-ngozi', isLead: false, colleaguesWordsWalled: true });
    return atAGlanceTiles({ agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: held.blocked, waiting: held.waiting, worries: held.worries, theWorry: held.theFirstWorry, whyNoWorry: held.whyNoWorryIsShown, waitsFromEarlier: held.waitsFromEarlier }).find((t: any) => t.label === 'Blockers');
  };
  it('Ngozi, walled from Kwame\'s words, reads that one is another person\'s words', async () => {
    expect((await tileFor(w.worries!.slice(0, 1))).sub).toBe('1 worry is on record. It is another person\'s words, so it is not shown to you. Nobody is waiting on anybody.');
  });
  it('and with two of them, the plural', async () => {
    const two = [w.worries![0], { text: 'The van broke down again.', participantId: 'p-kwame', saidWordForWord: true }];
    expect((await tileFor(two)).sub).toBe('2 worries are on record. They are other people\'s words, so they are not shown to you. Nobody is waiting on anybody.');
  });
  it('and where none was kept word for word, she reads that reason instead, not the wall', async () => {
    expect((await tileFor([{ ...w.worries![0], saidWordForWord: false }])).sub).toBe('1 worry is on record. It was not kept in the words it was said, so it is not quoted here. Nobody is waiting on anybody.');
  });
});

/*
 * REQUEST 127 ITEM 7, SECOND REVIEW: TWO MORE TRUE REASONS.
 * Kwame, whose own "I am tired." was not kept word for word, read "They are other people's words" when some of
 * the worries were Ngozi's (walled from him) and the rest were not kept. And the lead read "It was not kept in
 * the words it was said" about a worry that was kept, but cannot be quoted whole.
 */
describe('request 127 (7), second review: a mixed reason, and a worry that cannot be quoted whole', () => {
  const { whatThisSessionHolds, atAGlanceTiles } = require('../reports/what-this-session-holds');
  const prisma = (rows: any[]) => ({
    checkIn: { findMany: async () => [{ id: 'c1' }] },
    groundDependency: { findMany: async () => [] },
    groundObjective: { findMany: async () => [] },
    groundObjectiveSnapshot: { findMany: async () => [] },
    ground: { findUnique: async () => ({ participants: PEOPLE, peersVisibleToEachOther: true }) },
    recordEntry: { findMany: async (args: any) => (args?.where?.type ? rows : []) },
  });
  const tileFor = async (rows: any[], reader: any) => {
    const held = await whatThisSessionHolds(prisma(rows), 'g-sales', 1, reader);
    return atAGlanceTiles({ agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: held.blocked, waiting: held.waiting, worries: held.worries, theWorry: held.theFirstWorry, whyNoWorry: held.whyNoWorryIsShown, waitsFromEarlier: held.waitsFromEarlier }).find((t: any) => t.label === 'Blockers').sub;
  };
  const MIXED = [
    { text: 'The committee is slow.', participantId: 'p-ngozi', saidWordForWord: true },
    { text: 'I am tired.', participantId: 'p-kwame', saidWordForWord: false },
    { text: 'The van broke down.', participantId: 'p-ngozi', saidWordForWord: false },
  ];
  const THE_MIX = '3 worries are on record. Some are other people\'s words, which are not shown to you. The rest were not kept in the words they were said. Nobody is waiting on anybody.';
  it('Kwame, walled from Ngozi\'s words, is not told his own words are other people\'s', async () => {
    const sub = await tileFor(MIXED, { participantId: 'p-kwame', isLead: false, colleaguesWordsWalled: true });
    expect(sub).toBe(THE_MIX);
  });
  it('an admin who does not run it, and sees only their own, reads the same mix', async () => {
    expect(await tileFor(MIXED, { participantId: null, isLead: false, ownWaitsOnly: true })).toBe(THE_MIX);
  });
  it('where every worry was kept and all are walled, it is other people\'s words, as before', async () => {
    expect(await tileFor([MIXED[0]], { participantId: 'p-kwame', isLead: false, colleaguesWordsWalled: true }))
      .toBe('1 worry is on record. It is another person\'s words, so it is not shown to you. Nobody is waiting on anybody.');
  });

  const QUOTED = { text: 'He said "next week" and nothing came.', participantId: 'p-kwame', saidWordForWord: true };
  it('Bisi, who runs it, is told a kept worry cannot be quoted whole, on the served board', async () => {
    expect((await readAs({ ...w, worries: [QUOTED] }, 'u-bisi')).blockers)
      .toEqual({ value: '1 worry', sub: '1 worry is on record. It cannot be quoted here whole, so it is not shown. Nobody is waiting on anybody.' });
  });
  it('and with more than one, the plural', async () => {
    const two = [QUOTED, { ...QUOTED, text: 'She said "maybe" again.', participantId: 'p-ngozi' }];
    expect((await readAs({ ...w, worries: two }, 'u-bisi')).blockers.sub)
      .toBe('2 worries are on record. None can be quoted here whole, so none is shown. Nobody is waiting on anybody.');
  });
  it('Kwame, walled from others, reads his own unquotable worry the same way', async () => {
    expect(await tileFor([QUOTED], { participantId: 'p-kwame', isLead: false, colleaguesWordsWalled: true }))
      .toBe('1 worry is on record. It cannot be quoted here whole, so it is not shown. Nobody is waiting on anybody.');
  });
});
