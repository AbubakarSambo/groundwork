import { BoardService } from '../board/board.service';
import { ReportsService } from './reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * THE FOUR MARKS, AS EACH READER IS SERVED THEM (week 6b, decision 43, screens requests 2 and 7).
 *
 * The prototype marks each line a person reads (B4 team-report.txt): "Proven", "Confirmed by the
 * person who received it", "Only someone's word", "From memory only". The session report carried
 * them already. This reads the team report (`get()`) and the board through the real services, as the
 * lead, a participant and an admin who only reads, with one line of each kind on Aisha's record, and
 * checks the mark each served line carries.
 *
 * And what a mark must not do: name a file to someone who may not open it, call a line proven by
 * somebody else's document, or carry anything about how anybody's answers were rated (decision 38).
 */
const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly: partyType === PartyType.INITIATOR, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: last },
  soloArtifact: null,
});
const LEAD = person('p-lead', 'u-wairimu', 'Wairimu', 'Kamau', PartyType.INITIATOR);
const AISHA = person('p-aisha', 'u-aisha', 'Aisha', 'Otieno');
const MIRIAM = person('p-miriam', 'u-miriam', 'Miriam', 'Wanjiku');

const AISHAS_PHOTO = 'aisha-green-mart-quote.jpg';
const LEADS_PLAN = 'wairimu-private-plan.txt';
const DOCS = [
  { id: 'd-aisha', fileName: AISHAS_PHOTO, visibility: 'OWN', participantId: 'p-aisha', origin: 'photo', assessment: null, createdAt: new Date('2026-09-22T09:00:00Z') },
  { id: 'd-lead', fileName: LEADS_PLAN, visibility: 'OWN', participantId: 'p-lead', origin: 'typed', assessment: null, createdAt: new Date('2026-09-21T09:00:00Z') },
];

const line = (id: string, text: string, more: Record<string, any> = {}) => ({
  id, participantId: 'p-aisha', type: 'PROGRESS', text, checkInId: 'c1', createdAt: new Date('2026-09-22T16:00:00Z'),
  disputedAt: null, documentSays: null, recallBased: true, anchoredOrigin: null, anchoredDocumentId: null, confirmedAt: null,
  checkIn: { id: 'c1', sessionNumber: 1 }, ...more,
});
const LINES = [
  line('e-proven', 'Green Mart has a quote', { recallBased: false, anchoredDocumentId: 'd-aisha', anchoredOrigin: 'photo' }),
  line('e-confirmed', 'I sent the price list to Miriam', { confirmedAt: new Date('2026-09-23T10:00:00Z') }),
  line('e-said', 'I will visit Westgate Deli on Friday', { type: 'COMMITMENT' }),
  line('e-memory', 'I made 8 visits this week'),
  /* Backed by the lead's own plan, which proves nothing of Aisha's. */
  line('e-not-hers', 'Lakeside will buy on the 29th', { recallBased: false, anchoredDocumentId: 'd-lead', anchoredOrigin: 'typed' }),
];
const EXPECTED: Record<string, string> = {
  'Green Mart has a quote': 'proven',
  'I sent the price list to Miriam': 'confirmed',
  'I will visit Westgate Deli on Friday': 'said',
  'I made 8 visits this week': 'memory',
  'Lakeside will buy on the 29th': 'said',
};

const CHECK_INS = [
  { id: 'c1', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T16:10:00Z') },
  { id: 'c2', participantId: 'p-miriam', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-23T15:00:00Z') },
];

const GROUND: any = {
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, status: 'RESOLVED',
  initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'EVERYBODY', label: 'Sales team, Q3',
  participants: [LEAD, AISHA, MIRIAM],
  checkIns: CHECK_INS,
  report: {
    id: 'r1', groundId: 'g-sales', releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'Three sales moved forward this week.', agreements: [], divergences: [], centralQuestion: '', engagement: {},
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
  },
  objectives: [],
  dependencies: [],
  poll: null,
};

const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const revive = (rows: any[]) => rows.map((r) => ({ ...r, confirmedAt: r.confirmedAt ? new Date(r.confirmedAt) : null }));

function prismaFor(viewerRole: string, ground: any = GROUND) {
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => copy(ground)) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1', awaitingOrgApproval: false })) }),
    checkIn: model({ findMany: jest.fn(async () => copy(CHECK_INS)) }),
    groundDocument: model({ findMany: jest.fn(async (q: any) => copy(q?.where?.id?.in ? DOCS.filter((d) => q.where.id.in.includes(d.id)) : DOCS)) }),
    recordEntry: model({
      findMany: jest.fn(async (q: any) => revive(copy(q?.where?.participantId ? LINES.filter((l) => l.participantId === q.where.participantId) : LINES))),
    }),
    groundBaseline: model({ findFirst: jest.fn(async () => ({ successLooksLike: 'Five new sales a month', conditions: [] })) }),
    /* What Aisha typed in her check-in: each line is hers word for word, so each is quoted as hers. */
    conversationTurn: model({ findMany: jest.fn(async (q: any) => (q?.where?.role === 'PERSON' ? [{ checkInId: 'c1', content: LINES.filter((l) => l.participantId === 'p-aisha').map((l) => (/[.!?]$/.test(l.text) ? l.text : `${l.text}.`)).join(' ') }] : [])) }),
    reportActivation: model({ findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

const READERS: [string, string, string, string | null][] = [
  ['the lead', 'u-wairimu', 'MEMBER', 'p-lead'],
  ['a participant (Aisha, whose lines they are)', 'u-aisha', 'MEMBER', 'p-aisha'],
  ['a participant (Miriam)', 'u-miriam', 'MEMBER', 'p-miriam'],
  ['an admin who only reads', 'u-grace', 'ADMIN', null],
];

/* Each line is served as the person's words in quotation marks with their name ("Aisha Otieno said, "..."",
   "You said, "..."" to Aisha), so the words are read from inside the marks. */
const SAID_AS_THEIRS = /^(?:You|Aisha Otieno) said, "(.*?)\.?"$/;
const theirWords = (text: string): string => SAID_AS_THEIRS.exec(String(text))?.[1] ?? text;
const marksIn = (items: any[]) => Object.fromEntries((items ?? []).map((i: any) => [theirWords(i.text), i.mark]));
const RATING = /specificity|recallNote|confidence|tier|rated|score/i;

describe('the board: each line in who owns what carries its mark', () => {
  const boardAs = async (userId: string, role: string) => {
    const reports = Object.create(ReportsService.prototype) as ReportsService;
    const svc = new BoardService(prismaFor(role), { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
    return svc.get('g-sales', userId) as Promise<any>;
  };

  it.each(READERS)('%s', async (_who, userId, role) => {
    const board = await boardAs(userId, role);
    const aisha = (board.whoOwnsWhat ?? []).find((r: any) => r.participantId === 'p-aisha');
    /* Since request 105 (the prototype's B5, "Only yours") a person who checks in is served only their own row, so
       Miriam reads none of Aisha's lines; before, she read them with their marks. */
    if (userId === 'u-miriam') {
      expect(aisha).toBeUndefined();
      expect(JSON.stringify(board)).not.toContain(AISHAS_PHOTO);
      return;
    }
    expect(aisha).toBeTruthy();
    for (const item of aisha.items) expect(item.text).toMatch(SAID_AS_THEIRS);
    expect(marksIn(aisha.items)).toEqual(EXPECTED);
    /* Only the line and how it is known: no file, and nothing about how anybody's answers were rated. */
    /* `settled` is how it is known too: whether proof anywhere on the record backs the claim (fix plan, group 4), a yes or no only. */
    for (const item of aisha.items) expect(Object.keys(item).sort()).toEqual(['id', 'mark', 'markSays', 'sessionNumber', 'settled', 'text', 'type']);
    for (const item of aisha.items) expect(typeof item.settled).toBe('boolean');
    const served = JSON.stringify(board.whoOwnsWhat);
    expect(served).not.toContain(AISHAS_PHOTO);
    expect(served).not.toContain(LEADS_PLAN);
    expect(served).not.toMatch(RATING);
  });
});

describe('the team report: each record line a reader is served carries its mark', () => {
  const reportAs = async (userId: string, role: string) => {
    const grounds: any = { getSessionProgress: jest.fn(async () => ({ completed: 2, total: 2, missingParticipantIds: [], declinedParticipantIds: [] })) };
    const config: any = { get: (k: string) => k === 'app.confidenceEnabled' };
    const svc = new ReportsService(prismaFor(role), {} as any, {} as any, {} as any, config, { emit: async () => undefined } as any, grounds, { tell: async () => [] } as any);
    return svc.get('g-sales', userId, 'org-1') as Promise<any>;
  };

  it.each(READERS)('%s', async (_who, userId, role, ownId) => {
    const report = await reportAs(userId, role);
    expect(report.sharedPicture).toContain('Three sales moved forward');
    /* Their own lines, as rows, each with how it is known. Only Aisha has any. */
    if (ownId === 'p-aisha') expect(marksIn(report.myRows)).toEqual(EXPECTED);
    else expect(report.myRows ?? []).toEqual([]);
    /* What the lead weighs at the close, from the record, with the same marks. On a team check-in
       nobody but the lead reads it (see the weighing describe below). */
    const weighed = report.whatTheGroundCanTellYou?.whatTheRecordHolds;
    if (userId === 'u-wairimu') expect(marksIn(weighed)).toEqual(EXPECTED);
    else expect(weighed).toBeUndefined();
    /* The lead's private plan is never named to anyone but the lead, marks or not. */
    const served = JSON.stringify(report);
    if (userId !== 'u-wairimu') expect(served).not.toContain(LEADS_PLAN);
    /* And a mark never comes with a rating. */
    expect(JSON.stringify({ myRows: report.myRows, weighed })).not.toMatch(RATING);
  });

  it('opening the report asks no model for a mark', async () => {
    const extract = jest.fn(async () => { throw new Error('no model at read'); });
    const grounds: any = { getSessionProgress: jest.fn(async () => ({ completed: 2, total: 2, missingParticipantIds: [], declinedParticipantIds: [] })) };
    const svc = new ReportsService(prismaFor('MEMBER'), { extract } as any, {} as any, {} as any, { get: (k: string) => k === 'app.confidenceEnabled' } as any, { emit: async () => undefined } as any, grounds, { tell: async () => [] } as any);
    const report: any = await svc.get('g-sales', 'u-aisha', 'org-1');
    /* The marks are all there although every model call would fail. */
    expect(marksIn(report.myRows)).toEqual(EXPECTED);
  });
});

/*
 * WHAT THE LEAD WEIGHS REACHES ONLY THE LEAD AND THE PERSON IT IS ABOUT.
 *
 * The code always said "only for the lead or the subject - never for a colleague", and every reader
 * of a released report was served it (29 September 2026). A team check-in is about nobody in
 * particular, so only its lead reads it. A check-in about one person is read by the lead and by that
 * person. An admin reading along never gets it. Absent, never an empty section.
 */
describe('the weighing at the close, as each reader is served it', () => {
  const ONE_PERSON: any = { ...GROUND, participants: [LEAD, AISHA] };
  const reportAs = async (ground: any, userId: string, role: string) => {
    const grounds: any = { getSessionProgress: jest.fn(async () => ({ completed: 1, total: 1, missingParticipantIds: [], declinedParticipantIds: [] })) };
    const config: any = { get: (k: string) => k === 'app.confidenceEnabled' };
    const svc = new ReportsService(prismaFor(role, ground), {} as any, {} as any, {} as any, config, { emit: async () => undefined } as any, grounds, { tell: async () => [] } as any);
    return svc.get('g-sales', userId, 'org-1') as Promise<any>;
  };
  const WEIGHING = ['whatTheGroundCanTellYou', 'whatTheGroundCanTellYouNote', 'whatItRestedOn'];

  it.each([
    ['a team check-in', GROUND, 'the lead', 'u-wairimu', 'MEMBER', true],
    ['a team check-in', GROUND, 'Aisha, one of the team', 'u-aisha', 'MEMBER', false],
    ['a team check-in', GROUND, 'Miriam, one of the team', 'u-miriam', 'MEMBER', false],
    ['a team check-in', GROUND, 'an admin who only reads', 'u-grace', 'ADMIN', false],
    ['a check-in about Aisha', ONE_PERSON, 'the lead', 'u-wairimu', 'MEMBER', true],
    ['a check-in about Aisha', ONE_PERSON, 'Aisha, whom it is about', 'u-aisha', 'MEMBER', true],
    ['a check-in about Aisha', ONE_PERSON, 'an admin who only reads', 'u-grace', 'ADMIN', false],
  ])('%s: %s', async (_kind, ground, _who, userId, role, reads) => {
    const report = await reportAs(ground, userId as string, role as string);
    expect(report.sharedPicture).toContain('Three sales moved forward');
    if (reads) {
      expect(marksIn(report.whatTheGroundCanTellYou.whatTheRecordHolds)).toEqual(EXPECTED);
    } else {
      for (const k of WEIGHING) expect(k in report).toBe(false);
      /* And none of the weighed wording reaches them by another road. */
      expect(JSON.stringify(report)).not.toContain('Five new sales a month');
    }
  });
});

/*
 * WHAT AISHA KEPT OF WHAT SHE SAID SHE WOULD DO IS HERS ALONE (week 9).
 *
 * "Kept 11 of 20 in the last 4 weeks" is each person's load across check-ins, which is private. It
 * is on her own You board and nowhere else: with eleven of her commitments settled done and nine not
 * done, the report and the board served to the lead, to her, to a colleague and to an admin carry no
 * count of them.
 */
describe('the count of what Aisha kept reaches nobody through the report or the board', () => {
  const recent = new Date(Date.now() - 5 * 86_400_000);
  const row = (id: string, text: string, status: string, settledBy: string) => ({
    id, groundId: 'g-sales', participantId: 'p-aisha', text, whenSaid: null, status, settledBy, settledAt: recent, createdAt: recent,
    outcome: null, explicit: true, source: 'CHECK_IN', saidWordForWord: false, whenSaidWordForWord: false, saidAgainIn: [],
  });
  const HERS = [
    ...Array.from({ length: 11 }, (_, i) => row(`k-d${i}`, `Call customer ${i}`, 'DONE', 'PROVEN')),
    ...Array.from({ length: 9 }, (_, i) => row(`k-n${i}`, `Visit shop ${i}`, 'NOT_DONE', 'SAID')),
  ];
  const withHers = (role: string) => {
    const prisma: any = prismaFor(role);
    prisma.groundCommitment.findMany = jest.fn(async () => copy(HERS));
    prisma.groundCommitment.count = jest.fn(async () => HERS.length);
    return prisma;
  };
  const A_COUNT = /kept \S+ of|\b11 of (your |her |the )?20\b|of (your|her) \S+ commitments|keptLately|kept all|kept none/i;

  it.each(READERS)('%s', async (_who, userId, role) => {
    const grounds: any = { getSessionProgress: jest.fn(async () => ({ completed: 2, total: 2, missingParticipantIds: [], declinedParticipantIds: [] })) };
    const config: any = { get: (k: string) => k === 'app.confidenceEnabled' };
    const reports = new ReportsService(withHers(role), {} as any, {} as any, {} as any, config, { emit: async () => undefined } as any, grounds, { tell: async () => [] } as any);
    const report = await reports.get('g-sales', userId, 'org-1');
    const board = await new BoardService(withHers(role), { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, Object.create(ReportsService.prototype)).get('g-sales', userId);
    expect(JSON.stringify(report)).not.toMatch(A_COUNT);
    expect(JSON.stringify(board)).not.toMatch(A_COUNT);
  });
});
