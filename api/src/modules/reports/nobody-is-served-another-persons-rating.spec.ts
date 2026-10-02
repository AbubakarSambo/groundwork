import { ReportsService } from './reports.service';
import { labelsForParties } from './party-labels';

/**
 * NOBODY IS SERVED ANOTHER PERSON'S RATING, READ FROM WHAT get() HANDS EACH READER.
 *
 * Screens requests 43 and 52, decisions 38, 40 and 43 (docs/decisions-merged.md). The rule-level
 * tests (every-report-read-strips-other-peoples-ratings.spec.ts) call the filter directly and check
 * every call site wraps it. This one reads the served report itself, as the lead, an admin of the
 * organisation who gave no account, and a participant who has answered, on a forming report and on
 * a released one. Every rating field carries a token naming whose it is, so any one of them reaching
 * the wrong reader shows up in the served JSON.
 *
 * "Nothing checkable" beside a name on the lead's board (decision 40) is the board's, not the
 * report's, and is not tested here.
 */
const PARTICIPANTS = [
  { id: 'p-lead', userId: 'lead-user', partyType: 'INITIATOR', createdAt: new Date('2026-09-01T09:00:00Z') },
  { id: 'p-amani', userId: 'amani-user', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-01T10:00:00Z') },
  { id: 'p-juma', userId: 'juma-user', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-01T11:00:00Z') },
];
const IDS = PARTICIPANTS.map((p) => p.id);

function ratedReport(released: boolean) {
  const labels = labelsForParties(PARTICIPANTS as any);
  const L = (id: string) => labels.get(id)!;
  return {
    id: 'r1', groundId: 'g1', createdAt: new Date(), releasedAt: released ? new Date() : null,
    sharedPicture: 'Everybody describes the stock count as late.', agreements: [], divergences: [],
    engagement: {
      specificityNotes: IDS.map((id) => ({ label: L(id), note: `NOTE-${id}` })),
      recallNotes: IDS.map((id) => ({ label: L(id), note: `RECALL-${id}` })),
      specificityCauses: IDS.map((id) => ({ label: L(id), cause: `CAUSE-${id}`, note: 'n' })),
      specificitySignal: Object.fromEntries(IDS.map((id) => [L(id), `SIGNAL-${id}`])),
      pictureConfidence: Object.fromEntries(IDS.map((id) => [L(id), `BAND-${id}`])),
      parties: IDS.map((id) => ({ label: L(id), contributed: true, specificityLabel: `LABEL-${id}`, confidence: `CONF-${id}` })),
    },
    finalSynthesis: { tiers: Object.fromEntries(IDS.map((id) => [id, `TIER-${id}`])) },
  };
}

function serviceFor(released: boolean) {
  const ground = { id: 'g1', scenario: 'NEW_PROJECT', initiatorId: 'lead-user', organizationId: 'org1', participants: PARTICIPANTS, report: ratedReport(released) };
  const prisma: any = {
    groundDocument: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(async () => ground) },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ role: where.id === 'org-admin' ? 'ADMIN' : 'MEMBER', organizationId: 'org1', awaitingOrgApproval: false })) },
    reportActivation: { findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })), findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => []) },
  };
  const grounds: any = {
    getSessionProgress: jest.fn(async () => ({ completed: 3, total: 3, missingParticipantIds: [], declinedParticipantIds: [] })),
  };
  return new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => false } as any, { emit: async () => undefined } as any, grounds, { tell: async () => [] } as any);
}

const READERS: Array<[string, string, string | null]> = [
  ['the lead', 'lead-user', 'p-lead'],
  ['an admin of the organisation who gave no account', 'org-admin', null],
  ['a participant who has answered', 'amani-user', 'p-amani'],
];
const TOKENS = ['NOTE', 'RECALL', 'CAUSE', 'SIGNAL', 'BAND', 'LABEL', 'CONF', 'TIER'];

describe.each([['a forming report', false], ['a released report', true]])('%s, as served by get()', (_what, released) => {
  it.each(READERS)('%s is sent no rating of anybody else\'s answers', async (_who, userId, ownId) => {
    const served = JSON.stringify(await serviceFor(released as boolean).get('g1', userId, 'org1'));
    /* Decision 76, item 4: a participant reads no team picture of a session not released yet, so
       on a forming report they are told it is not shared yet instead, and the ratings check below
       still runs on everything they are sent. Everybody else is served the report itself. */
    if (!released && userId === 'amani-user') {
      expect(served).toContain("The team's picture of session 1 is not shared yet.");
      expect(served).not.toContain('stock count as late');
    } else {
      /* The report itself was served, not a refusal. */
      expect(served).toContain('stock count as late');
      /* And the filter is not passing by stripping everything: a reader keeps their own. */
      if (ownId) expect(served).toContain(`SIGNAL-${ownId}`);
    }
    for (const id of IDS.filter((x) => x !== ownId)) {
      for (const t of TOKENS) expect(served).not.toContain(`${t}-${id}`);
    }
  });
});
