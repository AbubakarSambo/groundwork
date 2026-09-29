import { BoardService } from '../board/board.service';
import { ReportsService } from './reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * OPENING A REPORT OR A BOARD NEVER ASKS A MODEL (decision 7).
 *
 * Reports and boards update only when something new comes in; opening them never rebuilds them.
 * Found 29 September 2026: the first open of the team report after every change asked the model
 * three times, to word the lead's probe list and a participant's coaching note. Now the wording is
 * done by the warm-up that runs when something new comes in (ReportsService.wordTheReadsFor), kept,
 * and served on every open. A line not worded yet is served in the engine's own words.
 *
 * Every GET here runs with a model that counts its calls: the team report, the session report and
 * the rounds, as the lead, a participant and an admin who only reads, and the board as each of
 * them. Then, after the warm-up, the lead and the participant read exactly what the model worded,
 * still with no call on open.
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

const KEPT = new Map<string, string>();
function prismaFor(viewerRole: string, ground: any = { ...GROUND, cadence: 'WEEKLY' }) {
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    /* Dates stay dates: the session report reads `releasedAt.getTime()`, and a string threw, which
       the first describe's `.catch` hid, so the session report was never really opened there. */
    ground: model({ findUnique: jest.fn(async () => {
      const g = copy(ground);
      if (g.report) for (const k of ['releasedAt', 'createdAt', 'updatedAt']) if (g.report[k]) g.report[k] = new Date(g.report[k]);
      return g;
    }) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1', awaitingOrgApproval: false })), findFirst: jest.fn(async () => ({ id: 'u-grace' })) }),
    checkIn: model({ findMany: jest.fn(async () => copy(CHECK_INS)) }),
    groundDocument: model({ findMany: jest.fn(async (q: any) => copy(q?.where?.id?.in ? DOCS.filter((d) => q.where.id.in.includes(d.id)) : DOCS)) }),
    recordEntry: model({
      findMany: jest.fn(async (q: any) => {
        const want = q?.where?.participantId;
        const ids: string[] | null = !want ? null : typeof want === 'string' ? [want] : Array.isArray(want.in) ? want.in : null;
        return revive(copy(ids ? LINES.filter((l) => ids.includes(l.participantId)) : LINES));
      }),
    }),
    groundBaseline: model({ findFirst: jest.fn(async () => ({ successLooksLike: 'Five new sales a month', conditions: [] })) }),
    reportActivation: model({ findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })) }),
    wordedLine: { findUnique: jest.fn(async ({ where }: any) => (KEPT.has(where.key) ? { text: KEPT.get(where.key) } : null)), upsert: jest.fn(async ({ where, create }: any) => { KEPT.set(where.key, create.text); return {}; }) },
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}



const respond = jest.fn(async (_system: string, msgs: any[]) => {
  const c = String(msgs[0].content);
  const m = c.match(/<draft>\n([\s\S]*)\n<\/draft>/);
  if (m) return m[1].split('\n').map((l) => l.replace(/\.$/, ', as worded.')).join('\n');
  return c.split('\n')[0] + ' (worded from context)';
});
/* The written sentence per person is the one call made through `extract`. */
const extract = jest.fn(async (_system: string, _msgs: any[], schema: any) => {
  if (schema?.name === 'emit_saying') return { saying: 'Has a quote from Green Mart and plans to visit Westgate Deli on Friday.' };
  throw new Error('no model here');
});
const theModel: any = { respond, extract };
const modelCalls = () => respond.mock.calls.length + extract.mock.calls.length;
const reportsFor = (role: string) => new ReportsService(
  prismaFor(role), {} as any, theModel, {} as any, { get: (k: string) => k === 'app.confidenceEnabled' } as any,
  { emit: async () => undefined } as any,
  { getSessionProgress: async () => ({ completed: 2, total: 2, missingParticipantIds: [], declinedParticipantIds: [] }) } as any,
  { tell: async () => [] } as any,
);
const boardFor = (role: string) => {
  const reports = reportsFor(role);
  return new BoardService(prismaFor(role), theModel, { getSessionProgress: async () => null } as any, reports);
};

const READERS: [string, string, string][] = [
  ['the lead', 'u-wairimu', 'MEMBER'],
  ['a participant', 'u-aisha', 'MEMBER'],
  ['an admin who only reads', 'u-grace', 'ADMIN'],
];

beforeEach(() => { KEPT.clear(); respond.mockClear(); extract.mockClear(); });

describe('opening asks no model, with nothing worded yet', () => {
  it.each(READERS)('%s', async (_who, userId, role) => {
    const report: any = await reportsFor(role).get('g-sales', userId, 'org-1');
    await reportsFor(role).sessionReport('g-sales', 1, userId, 'org-1').catch(() => undefined);
    await reportsFor(role).rounds('g-sales', userId, 'org-1').catch(() => undefined);
    await boardFor(role).get('g-sales', userId);
    expect(modelCalls()).toBe(0);
    /* And the report was served, in the engine's own words, not refused. */
    expect(report.sharedPicture).toContain('Three sales moved forward');
    if (userId === 'u-wairimu') {
      expect(report.probes?.[0]?.encourage?.[0]).toBe('Worth getting on record, where anyone could check it later: Green Mart has a quote and Lakeside will buy on the 29th.');
    }
    /* Nothing is written by opening, either. */
    expect(KEPT.size).toBe(0);
  });
});

describe('the wording is done when something new comes in, and served from then on', () => {
  it('the lead and the participant read the worded lines, and opening still asks nothing', async () => {
    await reportsFor('MEMBER').wordTheReadsFor('g-sales', 1);
    expect(modelCalls()).toBeGreaterThan(0);
    respond.mockClear(); extract.mockClear();

    const lead: any = await reportsFor('MEMBER').get('g-sales', 'u-wairimu', 'org-1');
    const aisha: any = await reportsFor('MEMBER').get('g-sales', 'u-aisha', 'org-1');
    const admin: any = await reportsFor('ADMIN').get('g-sales', 'u-grace', 'org-1');
    expect(modelCalls()).toBe(0);
    expect(lead.probes[0].encourage[0]).toBe('Worth getting on record, where anyone could check it later: Green Mart has a quote and Lakeside will buy on the 29th, as worded.');
    expect(lead.probes[1].triedToUnblock).toBe('Nothing recorded as blocked, so there is nothing here about unblocking, as worded.');
    /* An admin reads the same list, worded the same, from the one admin the warm-up read it as. */
    expect(admin.probes?.[0]?.encourage?.[0]).toMatch(/, as worded\.$/);
    expect(aisha.coaching.whyItMatters).toMatch(/what you can point at, as worded\.$/);
    expect(aisha.probes ?? null).toBeNull();
  });
});

describe('the written sentence per person on a session report (fillWhatEachPersonSaid)', () => {
  const aishasRow = (r: any) => (r?.whatEachPersonSaid ?? []).find((p: any) => Array.isArray(p.lines) && p.lines.length);

  it('opening the session report asks no model for it, and serves the lines without one', async () => {
    const report: any = await reportsFor('MEMBER').sessionReport('g-sales', 1, 'u-wairimu', 'org-1');
    expect(aishasRow(report)).toBeTruthy();
    expect(modelCalls()).toBe(0);
    expect(aishasRow(report).saying ?? null).toBeNull();
  });

  it('the warm-up writes it once and keeps it, and every open after serves the same sentence', async () => {
    await reportsFor('MEMBER').wordTheReadsFor('g-sales', 1);
    expect(extract.mock.calls.some((c: any[]) => c[2]?.name === 'emit_saying')).toBe(true);
    respond.mockClear(); extract.mockClear();
    const first: any = await reportsFor('MEMBER').sessionReport('g-sales', 1, 'u-wairimu', 'org-1');
    const again: any = await reportsFor('MEMBER').sessionReport('g-sales', 1, 'u-wairimu', 'org-1');
    expect(modelCalls()).toBe(0);
    expect(aishasRow(first).saying).toBe('Has a quote from Green Mart and plans to visit Westgate Deli on Friday.');
    expect(aishasRow(again).saying).toBe(aishasRow(first).saying);
  });
});
