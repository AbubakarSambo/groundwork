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
 * pd1: Ngozi's, three periods, answered: only Ngozi reads it, with her words (the lead no longer reads stored patterns).
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
  /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
  ['the lead', 'u-tunde', { board: [], page: [], record: [] }],
  ['the person a pattern is about, who answered it', 'u-ngozi', { board: ['pd1'], page: ['pd1'], record: ['pd1'] }],
  ['a colleague, reading only his own, which only he has seen', 'u-femi', { board: ['pd2'], page: ['pd2'], record: ['pd2'] }],
  /* Decision 58 (screens request 84, 30 September 2026): an admin who does not run this check-in,
     and was not the one who set it up for its lead, reads no pattern and no answer - not even the
     lead's own, which an organisation admin used to read here under the wider `runsIt` class. */
  ['an organisation admin who is not in the check-in and did not set it up', 'u-admin', { board: [], page: [], record: null }],
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

  it('the person reads it in plain words, is told only they see it, and can answer', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-femi', groundWith(GROUNDS[0][1]));
    expect(served.record.patterns).toEqual([{
      id: 'pd2', participantId: 'p-femi', yours: true, kind: 'attention',
      heading: 'Others describe doing work they described as theirs',
      whatHappened: FEMI_SAID,
      sessions: [1, 2, 3],
      howOften: 'This came up in 3 of your check-ins, in sessions 1, 2 and 3.',
      askThem: null, theirWords: null, canAnswer: true,
      whoSeesIt: 'Only you see this. Nothing is decided from it.',
      /* Decision 57, item 2: never shown to the person it is about, however the lead marked it. */
      leadMark: null, talkedAbout: false, secondReadNote: null,
      /* Decision 67: the coaching is the lead's alone, so the person reads none of it. */
      about: 'what is said against what happened', coachTowards: null, oneStep: null,
    }]);
    /* And being shown it starts the clock on when Tunde may read it. */
    expect(served.writes.some((w) => w.where.id.in.includes('pd2') && w.data.shownToPersonAt)).toBe(true);
  });

  it('the lead reads none of it, not even after the person answered; Ngozi reads hers with her own words and no label', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const asLead = await everyPageAs(withTheSwitch(true), 'u-tunde', groundWith(GROUNDS[0][1]));
    expect(asLead.board.patterns ?? []).toEqual([]);
    expect(asLead.page.signals ?? []).toEqual([]);
    for (const said of [NGOZI_SAID, NGOZI_ANSWERED, FEMI_SAID, AMAKA_SAID]) {
      expect(JSON.stringify(asLead.board)).not.toContain(said);
      expect(JSON.stringify(asLead.page)).not.toContain(said);
    }
    /* The lead reading is never the person being shown it. */
    expect(asLead.writes).toEqual([]);
    const served = await everyPageAs(withTheSwitch(true), 'u-ngozi', groundWith(GROUNDS[0][1]));
    expect(served.board.patterns).toEqual([{
      id: 'pd1', participantId: 'p-ngozi', yours: true, kind: 'attention',
      heading: 'Problems are mostly put down to things outside the team',
      whatHappened: NGOZI_SAID,
      sessions: [1, 2, 4],
      howOften: 'This came up in 3 of your check-ins, in sessions 1, 2 and 4.',
      askThem: null,
      theirWords: NGOZI_ANSWERED,
      canAnswer: true,
      whoSeesIt: 'Only you see this. Nothing is decided from it.',
      leadMark: null, talkedAbout: false, secondReadNote: null,
      /* Decision 67: the coaching was the lead's alone, so the person reads none of it. */
      about: 'the work', coachTowards: null, oneStep: null,
    }]);
  });

  /*
   * DECISION 58: THE ONE ACCESS A CHECK-IN GIVES AN ADMIN WHO IS NOT ITS LEAD. Not every admin of
   * the organisation - the admin who set this particular check-in up and handed it to its lead
   * (`createdByUserId`), the same grant `who-may-read-this-check-in.ts` already uses for a check-in's
   * write surfaces. She reads a pattern exactly as the lead does; the u-admin above, who did not set
   * this one up, reads none.
   */
  it('the admin who set this check-in up for its lead reads no stored pattern, as the lead now does', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    USERS['u-setup-admin'] = { role: 'ADMIN', organizationId: 'org-1' };
    const ground = { ...groundWith(GROUNDS[0][1]), createdByUserId: 'u-setup-admin' };
    const served = await everyPageAs(withTheSwitch(true), 'u-setup-admin', ground);
    expect(idsOn(served)).toEqual({ board: [], page: [], record: null });
    expect(JSON.stringify(served.board)).not.toContain(NGOZI_ANSWERED);
    expect(JSON.stringify(served.page)).not.toContain(NGOZI_ANSWERED);
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

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. This block was "with the person-only reach, a pattern
 * reaches only the person it is about", where the lead read none. There is no such reach now: every
 * block above runs with nothing put in force, and this one pins that a person who has answered is
 * read by nobody but the person (Hafsah, 2 November 2026), and that the person is told only they see it.
 */
describe('with no setting at all, the lead reads no stored pattern, even after the person’s turn (decision 86, then Hafsah, 2 November 2026)', () => {
  it('the lead reads nothing of Ngozi’s, which she answered days ago, on the board or the check-in’s page', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    for (const [, shape] of GROUNDS) {
      const served = await everyPageAs(withTheSwitch(true), 'u-tunde', groundWith(shape));
      expect(idsOn(served)).toEqual({ board: [], page: [], record: [] });
      expect(JSON.stringify(served.board)).not.toContain(NGOZI_ANSWERED);
      expect(JSON.stringify(served.page)).not.toContain(NGOZI_ANSWERED);
    }
  });

  it('Femi reads his with the answer box, and is told only he sees it', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-femi', groundWith(GROUNDS[0][1]));
    const [mine] = served.record.patterns;
    expect(mine.id).toBe('pd2');
    expect(mine.canAnswer).toBe(true);
    expect(mine.whoSeesIt).toBe('Only you see this. Nothing is decided from it.');
  });

  it('Ngozi, who answered, reads her own words beside it, and that Tunde can see it', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-ngozi', groundWith(GROUNDS[0][1]));
    const [mine] = served.record.patterns;
    expect(mine.theirWords).toBe(NGOZI_ANSWERED);
    expect(mine.whoSeesIt).toBe('Only you see this. Nothing is decided from it.');
  });
});
