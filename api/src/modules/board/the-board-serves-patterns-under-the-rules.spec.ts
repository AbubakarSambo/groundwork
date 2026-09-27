import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from '../patterns/pattern-library';

/**
 * WITH THE SWITCH ON, EVERY READER READS PATTERNS UNDER HAFSAH'S RULES, AND NOTHING ELSE.
 *
 * Hafsah, 27 September 2026: "Patterns are built, so they are not hidden at release. They stay
 * switched off only until they follow Hafsah's rules": a plain name for each, never a label beside
 * a name, a participant never sees a colleague's, three periods, and the person sees it first and
 * can answer before the lead sees it.
 *
 * So this turns PATTERNS_ARE_SERVED on and reads what is actually served, through the real
 * BoardService.get, the real GroundsService.get (the check-in's own page) and the real
 * GroundsService.getMyRecord (the person's own record), as the lead, the person a pattern is about,
 * a colleague, an admin of the organisation who is not in the check-in, a guest from another
 * organisation, and every participant again on a report shared without names. With it off, the
 * same reads carry nothing (the-board-serves-no-pattern.spec.ts proves the board; this proves the
 * other two pages too).
 */

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const LEAD = { id: 'p-lead', userId: 'u-tunde', partyType: PartyType.INITIATOR, email: 't@meridian.test', roleAsDescribed: 'runs Atlas', nameGiven: null, organisationGiven: null, managingOnly: true, createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Tunde', lastName: 'Bakare' } };
const NGOZI = { id: 'p-ngozi', userId: 'u-ngozi', partyType: PartyType.PARTICIPANT, email: 'n@meridian.test', roleAsDescribed: 'finance', nameGiven: null, organisationGiven: null, managingOnly: false, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Ngozi', lastName: 'Eke' } };
const FEMI = { id: 'p-femi', userId: 'u-femi', partyType: PartyType.PARTICIPANT, email: 'f@meridian.test', roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Femi', lastName: 'Okonkwo' } };
const AMAKA = { id: 'p-amaka', userId: 'u-amaka', partyType: PartyType.PARTICIPANT, email: 'a@harbor.test', roleAsDescribed: 'buyer at Harbor Foods', nameGiven: 'Amaka Obi', organisationGiven: 'Harbor Foods', managingOnly: false, createdAt: new Date('2026-09-01T11:00:00Z'), user: { firstName: 'Amaka', lastName: 'Obi' } };
const PEOPLE = [LEAD, NGOZI, FEMI, AMAKA];

const CHECK_INS = [1, 2, 3].flatMap((n) => [NGOZI, FEMI, AMAKA].map((p) => ({
  id: `${p.id}-${n}`, participantId: p.id, sessionNumber: n, status: 'COMPLETED', isSetup: false, isFinal: false, completedAt: new Date(`2026-09-0${n + 1}T16:00:00Z`),
})));

const NGOZI_SAID = 'The failure to secure approvals is attributed entirely to the credit committee not clearing submitted files.';
const NGOZI_ANSWERED = 'The committee only meets on the last Friday of the month, so nothing I send after that waits four weeks.';
const FEMI_SAID = 'Femi described the Harbor Foods deal as his own although Ngozi prepared the pricing.';
const AMAKA_SAID = 'The delivery schedule was called final and the warehouse changed it twice afterwards.';

/*
 * pd1: Ngozi's, three periods, answered: the lead reads it with her words.
 * pd2: Femi's, three periods, ready today and never shown: only Femi reads it.
 * pd3: Femi's good news, one period: nobody.  pd4: Ngozi's, two periods: nobody.
 * pd5: Ngozi's E4, never named to a person: nobody.  pd6: the guest's, shown yesterday: only her.
 */
const ROWS = () => [
  { id: 'pd1', participantId: 'p-ngozi', code: 'B11', status: 'SURFACED', observationText: NGOZI_SAID, periodsObserved: 1, seenInSessions: [1, 2, 4], readyAt: ago(10), shownToPersonAt: ago(9), personAnswer: NGOZI_ANSWERED, personAnsweredAt: ago(9), lastSeenAt: ago(9), createdAt: ago(30) },
  { id: 'pd2', participantId: 'p-femi', code: 'B3', status: 'SURFACED', observationText: FEMI_SAID, periodsObserved: 3, seenInSessions: [1, 2, 3], readyAt: ago(0), shownToPersonAt: null, personAnswer: null, personAnsweredAt: null, lastSeenAt: ago(0), createdAt: ago(30) },
  { id: 'pd3', participantId: 'p-femi', code: 'R3', status: 'SURFACED', observationText: 'Femi credited Ngozi by name for the pricing sheet.', periodsObserved: 1, seenInSessions: [2], readyAt: null, shownToPersonAt: null, personAnswer: null, personAnsweredAt: null, lastSeenAt: ago(5), createdAt: ago(5) },
  { id: 'pd4', participantId: 'p-ngozi', code: 'E1', status: 'CANDIDATE', observationText: 'Named the new analyst as the reason the forecast was late.', periodsObserved: 1, seenInSessions: [2, 3], readyAt: null, shownToPersonAt: null, personAnswer: null, personAnsweredAt: null, lastSeenAt: ago(5), createdAt: ago(5) },
  { id: 'pd5', participantId: 'p-ngozi', code: 'E4', status: 'SURFACED', observationText: 'Absorbs operational load relative to the other founder.', periodsObserved: 3, seenInSessions: [1, 2, 3], readyAt: ago(20), shownToPersonAt: null, personAnswer: null, personAnsweredAt: null, lastSeenAt: ago(5), createdAt: ago(30) },
  { id: 'pd6', participantId: 'p-amaka', code: 'D1', status: 'SURFACED', observationText: AMAKA_SAID, periodsObserved: 3, seenInSessions: [1, 2, 3], readyAt: ago(1), shownToPersonAt: ago(1), personAnswer: null, personAnsweredAt: null, lastSeenAt: ago(1), createdAt: ago(30) },
];

function groundWith(o: { peersVisibleToEachOther: boolean; sharedAs: string | null }): any {
  return {
    id: 'g-atlas', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-tunde', createdByUserId: 'u-tunde', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: o.peersVisibleToEachOther, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Atlas delivery',
    participants: PEOPLE, checkIns: CHECK_INS,
    report: {
      releasedAt: new Date('2026-09-04T17:00:00Z'), sharedAs: o.sharedAs, theOpening: null, networkPicture: null,
      sharedPicture: 'Everybody has checked in three times.', agreements: [], divergences: [], centralQuestion: null,
      engagement: {}, findings: [], overTime: null,
      createdAt: new Date('2026-09-02T09:00:00Z'), updatedAt: new Date('2026-09-04T17:00:00Z'),
    },
    objectives: [], dependencies: [], poll: null, roundCompletions: [], resolution: null,
    organization: { name: 'Meridian', whatsappConnection: null },
  };
}

const USERS: Record<string, { role: string; organizationId: string }> = {
  'u-tunde': { role: 'MEMBER', organizationId: 'org-1' },
  'u-ngozi': { role: 'MEMBER', organizationId: 'org-1' },
  'u-femi': { role: 'MEMBER', organizationId: 'org-1' },
  'u-admin': { role: 'ADMIN', organizationId: 'org-1' },
  'u-amaka': { role: 'MEMBER', organizationId: 'org-2' },
};

/** A database that answers every read the three pages make, and records every write to a pattern. */
function databaseFor(ground: any, rows: any[]) {
  const writes: any[] = [];
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })),
    update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({ count: 0 })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const copy = (x: any) => JSON.parse(JSON.stringify(x));
  const withPatterns = () => ({ ...copy(ground), patternDetections: copy(rows) });
  return {
    writes,
    prisma: new Proxy({
      ground: model({
        findUnique: jest.fn(async () => withPatterns()),
        findFirst: jest.fn(async () => withPatterns()),
      }),
      user: model({ findUnique: jest.fn(async (a: any) => USERS[a?.where?.id] ?? null) }),
      checkIn: model({ findMany: jest.fn(async () => copy(CHECK_INS)) }),
      groundParticipant: model({
        findFirst: jest.fn(async (a: any) => {
          const p = PEOPLE.find((x) => x.userId === a?.where?.userId);
          if (!p) return null;
          return {
            ...copy(p),
            specificityHistory: [],
            checkIns: copy(CHECK_INS.filter((c) => c.participantId === p.id)),
            patternDetections: copy(rows.filter((r) => r.participantId === p.id)),
            ground: { initiatorId: ground.initiatorId, participants: copy(PEOPLE) },
          };
        }),
      }),
      patternDetection: model({
        findMany: jest.fn(async (a: any) => copy(rows.filter((r) => !a?.where?.groundId || a.where.groundId === 'g-atlas'))),
        updateMany: jest.fn(async (a: any) => { writes.push(a); return { count: a?.where?.id?.in?.length ?? 0 }; }),
      }),
    }, {
      get(target: any, prop: string) {
        if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
        return target[prop];
      },
    }) as any,
  };
}

function withTheSwitch(on: boolean) {
  let mods: any;
  jest.isolateModules(() => {
    jest.doMock('../patterns/patterns-are-served', () => ({ PATTERNS_ARE_SERVED: on }));
    mods = {
      BoardService: require('./board.service').BoardService,
      ReportsService: require('../reports/reports.service').ReportsService,
      GroundsService: require('../grounds/grounds.service').GroundsService,
    };
  });
  jest.dontMock('../patterns/patterns-are-served');
  return mods;
}

async function everyPageAs(mods: any, userId: string, ground: any) {
  const db = databaseFor(ground, ROWS());
  const reports = Object.create(mods.ReportsService.prototype);
  const board = await new mods.BoardService(db.prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-atlas', userId, undefined);
  const grounds = new mods.GroundsService(db.prisma, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { respond: async () => '' } as any);
  (grounds as any).assertMaySeeGround = async () => ({});
  const page = await grounds.get('g-atlas', USERS[userId].organizationId, userId);
  const isInIt = PEOPLE.some((p) => p.userId === userId);
  const record = isInIt ? await grounds.getMyRecord('g-atlas', userId) : null;
  return { board, page, record, writes: db.writes };
}

const INTERNAL = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES];
/** On the whole page: no internal name, code, library signal or early pattern. On a pattern list, no label field either. */
function whatBreaksARule(served: any, isAPatternList = true): string[] {
  const text = JSON.stringify(served ?? null);
  const found: string[] = [];
  for (const c of INTERNAL) {
    if (text.includes(c.name)) found.push(`the internal name "${c.name}"`);
    if (text.includes(`"${c.code}"`)) found.push(`the code ${c.code}`);
    if (text.includes(c.signal)) found.push(`the library's signal for ${c.code}`);
  }
  if (isAPatternList) for (const key of ['"label"', '"code"', '"who"', '"name"']) if (text.includes(key)) found.push(`a ${key} field`);
  if (/Blame|not yet a pattern/.test(text)) found.push('a label or an early pattern');
  return found;
}

const idsOn = (served: { board: any; page: any; record: any }) => ({
  board: (served.board.patterns ?? []).map((p: any) => p.id).sort(),
  page: (served.page.signals ?? []).map((p: any) => p.id).sort(),
  record: served.record ? (served.record.patterns ?? []).map((p: any) => p.id).sort() : null,
});

const GROUNDS: [string, { peersVisibleToEachOther: boolean; sharedAs: string | null }][] = [
  ['people see each other, report shared named', { peersVisibleToEachOther: true, sharedAs: null }],
  ['people see each other, report shared without names', { peersVisibleToEachOther: true, sharedAs: 'ANONYMOUS' }],
  ['people see only themselves', { peersVisibleToEachOther: false, sharedAs: null }],
];

/* What each reader may read, and nothing else, on every page. */
const EXPECTED: [string, string, { board: string[]; page: string[]; record: string[] | null }][] = [
  ['the lead', 'u-tunde', { board: ['pd1'], page: ['pd1'], record: [] }],
  ['the person a pattern is about, who answered it', 'u-ngozi', { board: ['pd1'], page: ['pd1'], record: ['pd1'] }],
  ['a colleague, reading only his own, which only he has seen', 'u-femi', { board: ['pd2'], page: ['pd2'], record: ['pd2'] }],
  ['an organisation admin who is not in the check-in', 'u-admin', { board: ['pd1'], page: ['pd1'], record: null }],
  ['a guest from another organisation', 'u-amaka', { board: ['pd6'], page: ['pd6'], record: ['pd6'] }],
];

describe('with the switch on, every reader reads patterns under the rules', () => {
  for (const [groundIs, shape] of GROUNDS) {
    for (const [reader, userId, expected] of EXPECTED) {
      it(`as ${reader}, when ${groundIs}`, async () => {
        const served = await everyPageAs(withTheSwitch(true), userId, groundWith(shape));
        expect(served.board.renders).toBe(true);
        expect(idsOn(served)).toEqual(expected);
        expect(whatBreaksARule(served.board, false)).toEqual([]);
        expect(whatBreaksARule(served.board.patterns)).toEqual([]);
        expect(whatBreaksARule(served.page, false)).toEqual([]);
        expect(whatBreaksARule(served.page.signals)).toEqual([]);
        expect(whatBreaksARule(served.record, false)).toEqual([]);
        expect(whatBreaksARule(served.record?.patterns ?? [])).toEqual([]);
      });
    }
  }

  it('the person reads it in plain words, is told they are seeing it first, and can answer', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-femi', groundWith(GROUNDS[0][1]));
    expect(served.record.patterns).toEqual([{
      id: 'pd2', participantId: 'p-femi', yours: true, kind: 'attention',
      heading: 'Claimed work somebody else did',
      whatHappened: FEMI_SAID,
      sessions: [1, 2, 3],
      howOften: 'This came up in 3 of your check-ins, in sessions 1, 2 and 3.',
      askThem: null, theirWords: null, canAnswer: true,
      whoSeesIt: 'You are seeing this first. Tunde will see it too, with anything you say about it. Nothing is decided from it.',
    }]);
    /* And being shown it starts the clock on when Tunde may read it. */
    expect(served.writes.some((w) => w.where.id.in.includes('pd2') && w.data.shownToPersonAt)).toBe(true);
  });

  it('the lead reads it only after the person, with the person’s own words beside it and no label', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-tunde', groundWith(GROUNDS[0][1]));
    expect(served.board.patterns).toEqual([{
      id: 'pd1', participantId: 'p-ngozi', yours: false, kind: 'attention',
      heading: 'Problems are always put down to something outside',
      whatHappened: NGOZI_SAID,
      sessions: [1, 2, 4],
      howOften: 'This came up in 3 check-ins, in sessions 1, 2 and 4.',
      askThem: 'What was within your control in this situation?',
      theirWords: NGOZI_ANSWERED,
      canAnswer: false,
      whoSeesIt: 'Ngozi saw this first and said what is behind it.',
    }]);
    /* The lead reading is never the person being shown it. */
    expect(served.writes).toEqual([]);
  });
});

describe('and with the switch off, none of the three pages carries one, for anybody', () => {
  for (const [reader, userId] of EXPECTED) {
    it(`as ${reader}`, async () => {
      const served = await everyPageAs(withTheSwitch(false), userId, groundWith(GROUNDS[0][1]));
      expect(idsOn(served)).toEqual({ board: [], page: [], record: served.record ? [] : null });
      expect(served.writes).toEqual([]);
    });
  }
});
