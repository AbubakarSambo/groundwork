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

function prismaFor(viewerRole: string) {
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => copy(GROUND)) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1', awaitingOrgApproval: false })) }),
    checkIn: model({ findMany: jest.fn(async () => copy(CHECK_INS)) }),
    groundDocument: model({ findMany: jest.fn(async (q: any) => copy(q?.where?.id?.in ? DOCS.filter((d) => q.where.id.in.includes(d.id)) : DOCS)) }),
    recordEntry: model({
      findMany: jest.fn(async (q: any) => revive(copy(q?.where?.participantId ? LINES.filter((l) => l.participantId === q.where.participantId) : LINES))),
    }),
    groundBaseline: model({ findFirst: jest.fn(async () => ({ successLooksLike: 'Five new sales a month', conditions: [] })) }),
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

const marksIn = (items: any[]) => Object.fromEntries((items ?? []).map((i: any) => [i.text, i.mark]));
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
    expect(aisha).toBeTruthy();
    expect(marksIn(aisha.items)).toEqual(EXPECTED);
    /* Only the line and how it is known: no file, and nothing about how anybody's answers were rated. */
    for (const item of aisha.items) expect(Object.keys(item).sort()).toEqual(['id', 'mark', 'sessionNumber', 'text', 'type']);
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
    /* What the lead weighs at the close, from the record, with the same marks. */
    const weighed = report.whatTheGroundCanTellYou?.whatTheRecordHolds;
    expect(weighed).toBeTruthy();
    expect(marksIn(weighed)).toEqual(EXPECTED);
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
