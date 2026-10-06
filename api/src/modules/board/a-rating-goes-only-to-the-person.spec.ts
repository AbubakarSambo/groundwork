import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { contributionAsThisReaderMayRead } from './a-rating-goes-only-to-the-person';

/**
 * DECISIONS 38, 40 AND 43: THE LEAD'S BOARD NEVER SHOWS HOW A PERSON'S ANSWERS WERE RATED.
 *
 * Read on the lead's board, 29 September: "3 check-ins on record. 37 lines taken from what they said,
 * 10 with a name, a number or a date in them, 5 of those specific enough for somebody else to go and
 * check. ... Read against Management: on track here means ...". A real board is built through
 * `BoardService.get` and read as the lead, an admin, the person, and a colleague.
 */

const person = (id: string, first: string, last: string, over: Record<string, unknown> = {}) => ({
  id, userId: `u-${id}`, partyType: PartyType.PARTICIPANT, email: `${id}@baridi.test`,
  roleAsDescribed: 'runs the regional sales office', nameGiven: null, organisationGiven: null, managingOnly: false,
  detectedFunction: 'MANAGEMENT', detectedFunctionConfidence: 0.9,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: last }, ...over,
});
const LEAD = { ...person('lead', 'Wairimu', 'Kamau'), partyType: PartyType.INITIATOR, managingOnly: true };
const MIRIAM = person('miriam', 'Miriam', 'Wanjiku');
const AISHA = person('aisha', 'Aisha', 'Otieno');

const CHECK_INS = [1, 2, 3].flatMap((n) => [
  { id: `cm${n}`, participantId: 'miriam', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: new Date(`2026-09-0${n}T16:00:00Z`) },
  { id: `ca${n}`, participantId: 'aisha', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: new Date(`2026-09-0${n}T17:00:00Z`) },
]);
const ENTRIES = [
  { checkInId: 'cm1', participantId: 'miriam', sessionNumber: 1, type: 'PROGRESS', text: 'I signed 3 new buyers at Fresh Foods on 2 September.', verifiability: 'HIGH', anchoredDocumentId: null, documentSays: null },
  { checkInId: 'cm2', participantId: 'miriam', sessionNumber: 2, type: 'PROGRESS', text: 'Grace Achieng at Tuskys confirmed an order of 40 freezers.', verifiability: 'HIGH', anchoredDocumentId: null, documentSays: null },
  { checkInId: 'ca1', participantId: 'aisha', sessionNumber: 1, type: 'PROGRESS', text: 'It was a busy week.', verifiability: 'LOW', anchoredDocumentId: null, documentSays: null },
];

const GROUND: any = {
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-lead', createdByUserId: 'u-lead', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'EVERYONE', label: 'Sales team, Q3', totalSessions: 12,
  participants: [LEAD, MIRIAM, AISHA], checkIns: CHECK_INS,
  report: null, objectives: [], dependencies: [], poll: null,
};

function boardFor(requestingUserId: string, viewerRole = 'MEMBER') {
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(GROUND))) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    recordEntry: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(ENTRIES))) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
  return svc.get('g-sales', requestingUserId, ['contribution'] as any) as Promise<any>;
}

const RATING = /lines? taken from what|with a name, a number or a date in|specific enough for somebody|Read against|on track here means|check-ins? on record/i;

describe('contribution against role, for each reader', () => {
  it('the lead reads no rating, only "Nothing checkable" beside the person it is true of', async () => {
    const b = await boardFor('u-lead');
    const rows = b.contribution ?? [];
    expect(rows.length).toBe(2);
    expect(JSON.stringify(rows)).not.toMatch(RATING);
    expect(JSON.stringify(rows)).not.toMatch(/"(confidence|evidenceCount|basis|fnLabel)"/);
    const miriam = rows.find((r: any) => r.participantId === 'miriam');
    const aisha = rows.find((r: any) => r.participantId === 'aisha');
    expect(miriam.reason).toBeNull();
    expect(aisha.reason).toBe('Nothing Aisha Otieno has said so far is checkable, because nobody else can check it yet. A number, a date or a document for what moved would change that.');
  });

  it('an admin reads what the lead reads, and no rating', async () => {
    const b = await boardFor('u-grace', 'ADMIN');
    expect(JSON.stringify(b.contribution ?? [])).not.toMatch(RATING);
  });

  it('the person may read their own', async () => {
    const b = await boardFor('u-miriam');
    const own = (b.contribution ?? []).find((r: any) => r.participantId === 'miriam');
    expect(own.reason).toMatch(/lines? taken from what you said/);
  });

  it('a colleague never reads another person\'s rating', async () => {
    const b = await boardFor('u-aisha');
    const miriam = (b.contribution ?? []).find((r: any) => r.participantId === 'miriam');
    if (miriam) expect(JSON.stringify(miriam)).not.toMatch(RATING);
  });

  it('the filter keeps the words of the reader\'s own row, takes the number off it, and takes the rating off everybody else\'s', () => {
    const rows: any[] = [
      { participantId: 'a', name: 'A B', remit: null, remitDefined: true, position: null, reason: '3 check-ins on record. 9 lines taken from what they said.', confidence: 0.8, nothingCheckable: false },
      { participantId: 'b', name: 'C D', remit: null, remitDefined: true, position: null, reason: '2 check-ins on record.', confidence: 0.2, nothingCheckable: true },
    ];
    const out = contributionAsThisReaderMayRead(rows, 'a')!;
    /* Their own words stay (decision 38); the number does not (request 111 a). */
    expect(out[0].reason).toBe(rows[0].reason);
    expect((out[0] as any).confidence).toBeUndefined();
    expect(out[1].reason).toMatch(/^Nothing C D has said so far is checkable/);
    expect((out[1] as any).confidence).toBeUndefined();
  });
});
