import { GroundScenario } from '@prisma/client';
import { ReportsService } from '../reports/reports.service';
import { boardAs, answered, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';

/**
 * NO READER IS SENT A RATING OF A PERSON (screens request 111 (a), decisions 11, 38 and 43).
 *
 * Found on the sales board, 2 October 2026: Amani's own board answer carried her
 * `coverage.reads[].confidence: 0.15`, `pct: 0` and `contribution[].confidence: 0`, and the lead's
 * answer carried a `confidence`, a `pct`, an `evidenceCount` and a `basis` for every person. The
 * screen drew none of them; they were sent all the same.
 *
 * This serves the board and the session report as every reader, and walks the whole payload:
 *  - the lead who runs it;
 *  - Rukia and Baraka, who check in, where people see each other and where they do not;
 *  - Juma, an admin of the organisation who only reads;
 *  - the admin who set it up for its lead;
 *  - on a performance plan, Rukia as the person reviewed, and Baraka as a colleague giving a view.
 *
 * No number that rates a person may be anywhere (a confidence, a percentage, a count of evidence, a
 * score), nor any specificity or verifiability reading. A reader may read the words of the read of
 * their OWN answers (decision 38), and nobody else's, the lead included.
 */

/* Rukia said checkable things; Baraka said nothing anyone could check. */
const LINES = [
  { id: 'e1', participantId: 'p-rukia', type: 'PROGRESS', text: 'I have signed Tuskys Westgate on 3 September for 40 cookers.', verifiability: 'HIGH', checkIn: { sessionNumber: 1 }, disputedAt: null },
  { id: 'e2', participantId: 'p-rukia', type: 'PROGRESS', text: 'Karen Hardware signed on 10 September.', verifiability: 'HIGH', checkIn: { sessionNumber: 2 }, disputedAt: null },
  { id: 'e3', participantId: 'p-baraka', type: 'PROGRESS', text: 'Things are going fine.', verifiability: 'LOW', checkIn: { sessionNumber: 1 }, disputedAt: null },
  { id: 'e4', participantId: 'p-baraka', type: 'PROGRESS', text: 'Still working on it.', verifiability: 'LOW', checkIn: { sessionNumber: 2 }, disputedAt: null },
];
const CHECK_INS = [answered('p-rukia', 1), answered('p-baraka', 1), answered('p-rukia', 2), answered('p-baraka', 2)];

/** A number by one of these names, anywhere, is a rating. */
const A_RATING_NUMBER = /^(confidence|evidenceCount|pct|score)$/;
/** These name a reading of how specific or checkable somebody's answers were. */
const A_READING = /^(specificity\w*|verifiability|tiers?|pictureConfidence)$/;
/** The words of a read of somebody's answers. Only the person themselves may read their own. */
const THE_WORDS_OF_A_READ = /checkable things? named|lines? taken from what|with a name, a number or a date in|specific enough for somebody else|check-ins? on record|could be checked by anyone else/;

interface Found { path: string; what: string }

/** Every rating in the payload, with where it is, except the reader's own words about their own answers. */
function ratingsIn(payload: unknown, ownParticipantId: string | null): Found[] {
  const found: Found[] = [];
  const walk = (v: any, path: string, rowOf: string | null) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`, rowOf));
    if (!v || typeof v !== 'object' || v instanceof Date) {
      if (typeof v === 'string' && THE_WORDS_OF_A_READ.test(v) && !(rowOf && rowOf === ownParticipantId)) {
        found.push({ path, what: v });
      }
      return;
    }
    const row = typeof v.participantId === 'string' ? v.participantId : rowOf;
    for (const [k, x] of Object.entries(v)) {
      if (A_RATING_NUMBER.test(k) && typeof x === 'number') found.push({ path: `${path}.${k}`, what: String(x) });
      if (A_READING.test(k) && x != null) found.push({ path: `${path}.${k}`, what: JSON.stringify(x) });
      walk(x, `${path}.${k}`, row);
    }
  };
  walk(payload, '', null);
  return found;
}

type Reader = [string, readonly [string, string], string | null];
const READERS: Reader[] = [
  ['Amina, who runs it', AMINA, null],
  ['Rukia, who checks in', RUKIA, 'p-rukia'],
  ['Baraka, who checks in', BARAKA, 'p-baraka'],
  ['Juma, an admin who only reads', JUMA, null],
  ['the admin who set it up', SETUP_ADMIN, null],
];

describe.each([
  ['where people see each other', true],
  ['where people see only themselves', false],
])('the board, on a team check-in %s', (_how, peersVisible) => {
  const setup = { lines: LINES, checkIns: CHECK_INS, peersVisibleToEachOther: peersVisible as boolean, createdByUserId: 'u-setup' };

  it.each(READERS)('%s is sent no rating of anybody', async (_who, [userId, role], own) => {
    const board = await boardAs(setup, userId, role);
    expect(board.title ?? board.label ?? board.id ?? board).toBeTruthy();
    expect(ratingsIn(board, own)).toEqual([]);
  });

  it('the lead still reads where work is landing and the plain "Nothing checkable" line, with no number', async () => {
    const board = await boardAs(setup, ...AMINA);
    expect(board.coverage.reads.length).toBe(2);
    const baraka = board.contribution.find((r: any) => r.participantId === 'p-baraka');
    expect(baraka.reason).toBe('Nothing Baraka Otieno has said so far is checkable, because nobody else can check it yet. A number, a date or a document for what moved would change that.');
  });

  it('Rukia reads the words of the read of her own answers, and no number in it', async () => {
    const board = await boardAs(setup, ...RUKIA);
    const own = board.contribution.find((r: any) => r.participantId === 'p-rukia');
    expect(own.reason).toMatch(/2 check-ins on record\. 2 lines taken from what you said/);
    expect(own).not.toHaveProperty('confidence');
    expect(own).not.toHaveProperty('evidenceCount');
    const cov = board.coverage.reads.find((r: any) => r.participantId === 'p-rukia');
    expect(cov).not.toHaveProperty('pct');
    expect(cov).not.toHaveProperty('confidence');
  });
});

describe('the board, on a performance plan', () => {
  const setup = { lines: LINES, checkIns: CHECK_INS, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
  it.each<Reader>([
    ['Amina, the manager', AMINA, null],
    ['Rukia, the person reviewed', RUKIA, 'p-rukia'],
    ['Baraka, a colleague giving a view', BARAKA, 'p-baraka'],
    ['Juma, an admin with no access', JUMA, null],
    ['the admin who set it up', SETUP_ADMIN, null],
  ])('%s is sent no rating of anybody', async (_who, [userId, role], own) => {
    const board = await boardAs(setup, userId, role).catch((e) => ({ refused: String(e?.message ?? e) }));
    expect(ratingsIn(board, own)).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------ */
/* The session report. Its picture is read by everybody in the check-in.                             */
/* ------------------------------------------------------------------------------------------------ */

const participant = (id: string, userId: string, partyType: string, first: string, last: string, at: string) => ({
  id, userId, partyType, email: `${id}@baridi.test`, managingOnly: partyType === 'INITIATOR', roleAsDescribed: 'sales',
  remitAsGiven: null, nameGiven: null, organisationGiven: null, createdAt: new Date(at),
  user: { firstName: first, lastName: last }, detectedFunction: null, detectedFunctionConfidence: null,
});

function sessionReportAs(userId: string, role: 'ADMIN' | 'MEMBER', scenario = 'OKR_ALIGNMENT', peersVisible = true) {
  const ground = {
    id: 'g1', organizationId: 'org-1', initiatorId: 'u-amina', createdByUserId: 'u-setup', scenario, cadence: 'WEEKLY', timelineDays: 90,
    brief: 'Sign shops for kitchen appliances in Nairobi.', peersVisibleToEachOther: peersVisible, objectives: [],
    report: { agreements: [], divergences: [], centralQuestion: null, releasedAt: new Date('2026-09-23T17:00:00Z'), findings: [] },
    participants: [
      participant('p-amina', 'u-amina', 'INITIATOR', 'Amina', 'Wanjiru', '2026-09-01T09:00:00Z'),
      participant('p-rukia', 'u-rukia', 'PARTICIPANT', 'Rukia', 'Mwangi', '2026-09-01T09:05:00Z'),
      participant('p-baraka', 'u-baraka', 'PARTICIPANT', 'Baraka', 'Otieno', '2026-09-01T09:10:00Z'),
    ],
  };
  const entries = LINES.filter((l) => l.checkIn.sessionNumber === 1).map((l) => ({
    ...l, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, confirmedAt: null, anchoredDocumentId: null,
  }));
  const checkIns = [
    { id: 'c1', participantId: 'p-rukia', sessionNumber: 1, status: 'COMPLETED' },
    { id: 'c2', participantId: 'p-baraka', sessionNumber: 1, status: 'COMPLETED' },
  ];
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => structuredClone(ground)) },
    user: { findUnique: jest.fn(async ({ select }: any) => (select && 'awaitingOrgApproval' in select ? { awaitingOrgApproval: false } : { role, organizationId: 'org-1' })) },
    recordEntry: { findMany: jest.fn(async () => structuredClone(entries)), count: jest.fn(async () => entries.length) },
    checkIn: {
      findMany: jest.fn(async () => checkIns.map((c) => ({ ...c, specificityLevel: c.participantId === 'p-rukia' ? 'specific' : 'vague' }))),
      findFirst: jest.fn(async () => ({ specificityLevel: 'vague' })),
      count: jest.fn(async () => 1),
    },
    groundParticipant: {
      findMany: jest.fn(async () => ground.participants.map((p: any) => ({ id: p.id, checkIns: checkIns.filter((c) => c.participantId === p.id).map((c) => ({ status: c.status })) }))),
    },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0) };
      }
      return target[prop];
    },
  });
  const service = new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => 'http://localhost:5173' } as any, { emit: () => Promise.resolve() } as any, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);
  return service.sessionReport('g1', 1, userId, 'org-1');
}

/** The session report's own `confidence` is about the document, not a person (decision 43), so it is left out of the walk. */
const withoutTheDocumentsOwnLevel = (r: any) => (r && typeof r === 'object' ? { ...r, confidence: undefined } : r);

describe.each([
  ['a team check-in where people see each other', 'OKR_ALIGNMENT', true],
  ['a team check-in where people see only themselves', 'OKR_ALIGNMENT', false],
  ['a performance plan', 'PIP', true],
])('the check-in report, on %s', (_what, scenario, peersVisible) => {
  it.each(READERS)('%s is sent no rating of anybody', async (_who, [userId, role], own) => {
    const served = await sessionReportAs(userId, role as any, scenario as string, peersVisible as boolean).catch((e) => ({ refused: String(e?.message ?? e) }));
    expect(ratingsIn(withoutTheDocumentsOwnLevel(served), own)).toEqual([]);
  });
});
