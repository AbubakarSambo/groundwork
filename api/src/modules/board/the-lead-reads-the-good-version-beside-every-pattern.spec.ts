import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from '../patterns/pattern-library';

/**
 * DECISION 67 (SCREENS REQUEST 82): THE SECTION A PATTERN BELONGS IN, AND THE COACHING BESIDE IT FOR THE LEAD ALONE.
 *
 * (Harness copied from the-board-serves-patterns-under-the-rules.spec.ts.)
 *
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

async function everyPageAs(mods: any, userId: string, ground: any, rows: any[] = ROWS()) {
  const db = databaseFor(ground, rows);
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


/* Femi's B3 is answered too, so under the old rule the lead would have read it. Ngozi's B11 is answered already. Amaka's D1 is a guest's own. */
const MORE_ROWS = () => ROWS().map((r) => (r.id === 'pd2' ? { ...r, shownToPersonAt: ago(9), personAnswer: 'Ngozi did the pricing and I put the deal together.', personAnsweredAt: ago(9) } : r));

const GROUNDS_TO_READ: [string, { peersVisibleToEachOther: boolean; sharedAs: string | null }][] = [
  ['people see each other', { peersVisibleToEachOther: true, sharedAs: null }],
  ['people see only themselves', { peersVisibleToEachOther: false, sharedAs: null }],
];

describe.each(GROUNDS_TO_READ)('the lead reads the good version beside every pattern (%s)', (_name, shape) => {
  it('serves the lead no stored pattern and none of the coaching that once sat beside one', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const served = await everyPageAs(withTheSwitch(true), 'u-tunde', groundWith(shape), MORE_ROWS());
    expect(served.board.patterns ?? []).toEqual([]);
    expect(served.page.signals ?? []).toEqual([]);
    const text = JSON.stringify(served);
    for (const said of [NGOZI_SAID, NGOZI_ANSWERED, FEMI_SAID, 'Ngozi did the pricing and I put the deal together.']) expect(text).not.toContain(said);
    expect(text).not.toContain('Coach them towards naming what the team itself can change when something goes wrong.');
    expect(text).not.toContain('Coach them towards saying clearly who did each piece of the work.');
    expect(text).not.toContain('One step they could take');
  });

  it('the person a pattern is about reads their own, with the part it belongs in and none of the lead\'s coaching', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-femi', groundWith(shape), MORE_ROWS());
    const own = (served.board.patterns as any[]);
    expect(own.map((p) => p.id)).toEqual(['pd2']);
    expect(own[0].about).toBe('what is said against what happened');
    expect(own[0].coachTowards).toBeNull();
    expect(own[0].oneStep).toBeNull();
    for (const p of [...(served.page.signals ?? []), ...(served.record?.patterns ?? [])]) {
      expect(p.coachTowards).toBeNull();
      expect(p.oneStep).toBeNull();
    }
    expect(JSON.stringify(served)).not.toContain('Coach them towards');
    expect(JSON.stringify(served)).not.toContain('One step they could take');
  });

  it('a colleague reads nothing about another named person, and none of the coaching', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-ngozi', groundWith(shape), MORE_ROWS());
    expect((served.board.patterns as any[]).map((p) => p.id)).toEqual(['pd1']);
    expect(JSON.stringify(served)).not.toContain('Coach them towards');
    expect(JSON.stringify(served.board.patterns)).not.toContain('p-femi');
  });

  it('an admin who does not run the check-in reads no pattern and none of the coaching', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-admin', groundWith(shape), MORE_ROWS());
    expect(served.board.patterns).toEqual([]);
    expect(JSON.stringify(served)).not.toContain('Coach them towards');
  });

  it('the admin who set the check-in up reads what the lead reads: no stored pattern and none of the coaching', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    USERS['u-setup-admin'] = { role: 'ADMIN', organizationId: 'org-1' };
    const served = await everyPageAs(withTheSwitch(true), 'u-setup-admin', { ...groundWith(shape), createdByUserId: 'u-setup-admin' }, MORE_ROWS());
    expect(served.board.patterns ?? []).toEqual([]);
    expect(JSON.stringify(served)).not.toContain('Coach them towards');
    expect(JSON.stringify(served)).not.toContain(NGOZI_ANSWERED);
  });
});

describe('a role can say the good version better, from its own map', () => {
  const { coachingForAPattern } = require('../patterns/what-to-coach-towards');
  it('in sales, K1 reads the sales map\'s own good version', () => {
    expect(coachingForAPattern('K1', { fn: 'SALES', confidence: 0.9 }).coachTowards)
      .toBe('In sales and expansion, the good version is someone who spends the week in front of buyers, and does the admin around it.');
  });
  it('with a low confidence, or no pairing, the pattern\'s own sentence stands', () => {
    expect(coachingForAPattern('K1', { fn: 'SALES', confidence: 0.2 }).coachTowards).toBe('Coach them towards speaking with named buyers directly, and not only sending decks and proposals.');
    expect(coachingForAPattern('D1', { fn: 'SALES', confidence: 0.9 }).coachTowards).toBe('Coach them towards saying something is finished only when the team who receives it has confirmed it works.');
  });
});

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. This block was "with the person-only reach, nobody reads
 * the lead's coaching beside a pattern". There is no such reach now: with nothing put in force, the
 * lead and the admin who set the check-in up read each pattern with its coaching, after the person's
 * turn, and Femi reads his own without the coaching, told Tunde reads it too.
 */
describe.each(GROUNDS_TO_READ)('with no setting at all, the lead reads no stored pattern or its coaching (%s) (decision 86, then Hafsah, 2 November 2026)', (_name, shape) => {
  it('the lead reads neither pattern nor its coaching, though both people answered', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const served = await everyPageAs(withTheSwitch(true), 'u-tunde', groundWith(shape), MORE_ROWS());
    expect(served.board.patterns ?? []).toEqual([]);
    expect(JSON.stringify(served)).not.toContain('Coach them towards');
    expect(JSON.stringify(served)).not.toContain('One step they could take');
  });

  it('the admin who set the check-in up reads none of it either', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    USERS['u-setup-admin'] = { role: 'ADMIN', organizationId: 'org-1' };
    const served = await everyPageAs(withTheSwitch(true), 'u-setup-admin', { ...groundWith(shape), createdByUserId: 'u-setup-admin' }, MORE_ROWS());
    expect(served.board.patterns ?? []).toEqual([]);
    expect(JSON.stringify(served)).not.toContain('Coach them towards');
  });

  it('Femi reads his own, with the part it belongs in, none of the coaching, and is told Tunde reads it too', async () => {
    const served = await everyPageAs(withTheSwitch(true), 'u-femi', groundWith(shape), MORE_ROWS());
    const own = served.board.patterns as any[];
    expect(own.map((p) => p.id)).toEqual(['pd2']);
    expect(own[0].about).toBe('what is said against what happened');
    expect(own[0].coachTowards).toBeNull();
    expect(own[0].whoSeesIt).toBe('Only you see this. Nothing is decided from it.');
  });
});
