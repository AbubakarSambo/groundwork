import { ReportsService } from './reports.service';

/**
 * DECISION 5, CLARIFIED 29 SEPTEMBER: AN ADMIN WHO DOES NOT RUN THE CHECK-IN NEVER READS THE
 * LEAD'S PRIVATE DESCRIPTION OF A PERSON, NOT EVEN INSIDE `theJudgement`.
 *
 * `whatAParticipantMayRead` was called with `isLead: isInitiator || isOrgAdmin` on the report's read
 * side, so an org admin who never ran the check-in read `theJudgement` exactly as the lead does.
 * That is correct under decision 5 for the findings, the shared picture and what people said - an
 * admin sees every board and report in full - but the room judgement is handed "taken on for:
 * <role>", where role is `remitAsGiven ?? roleAsDescribed`, the lead's own private sentence about
 * somebody, typed when they were added. What the model writes back can carry those words, and only
 * the person who runs the check-in may read that sentence (decision 30; decision 5, clarified 29
 * September).
 *
 * These tests read the report through `ReportsService.get()` as three real readers: the lead, an
 * admin of the same organisation who is not a party to the check-in, and a participant. The lead
 * keeps the private words. The admin keeps `theJudgement` - the fields, the structure, the rest of
 * its sentences - but not the six-word run that is the lead's own description. A participant never
 * gets `theJudgement` at all, as before.
 */

const THE_DESCRIPTION = 'Engagement Director. Struggles to take ownership without being chased, and needs close supervision on every account.';
const THE_PRIVATE_PHRASE = 'struggles to take ownership without being chased, and needs close supervision on every account';

function makeParticipant(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'p1', userId: 'user-1', partyType: 'INITIATOR', email: 'p1@test.com',
    soloArtifact: null, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null,
    createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Amina', lastName: 'Bello' },
    ...overrides,
  };
}

function makeGround() {
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'user-1',
    whoSeesTargets: 'THEIR_OWN',
    scenario: 'OKR_ALIGNMENT',
    peersVisibleToEachOther: true,
    objectives: [],
    participants: [
      makeParticipant({ id: 'p1', userId: 'user-1', partyType: 'INITIATOR' }),
      makeParticipant({
        id: 'p2', userId: 'user-2', partyType: 'PARTICIPANT', email: 'p2@test.com',
        roleAsDescribed: THE_DESCRIPTION, user: { firstName: 'Tobi', lastName: 'Adewale' },
      }),
    ],
    report: {
      id: 'r1', groundId: 'g1',
      sharedPicture: 'Both accounts described the same goal.',
      theOpening: null,
      agreements: ['Goal agreed'], divergences: [], centralQuestion: 'What does success look like?',
      releasedAt: new Date('2026-09-23T17:00:00Z'), engagement: {}, findings: [], overTime: null,
      networkPicture: null, sharedAs: null,
      /* The worst case, stored exactly as `judgeTheAnswers` would leave it: the model was handed
         "taken on for: <role>" and wrote it back into what to do. */
      theJudgement: {
        theGap: 'Tobi has not closed two open actions.',
        whatToDo: [
          { move: `Speak with Tobi, who ${THE_PRIVATE_PHRASE}.`, because: 'Two actions are still open.', startWith: 'Tobi' },
          { move: 'Confirm the renewal date with the client.', because: 'It is three weeks out.', startWith: 'Amina' },
        ],
      },
      createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
    },
  };
}

function makeService(ground: any, userRole: 'ADMIN' | 'MEMBER' = 'ADMIN') {
  const clone = () => structuredClone(ground);
  const prisma: any = new Proxy({
    ground: {
      findUnique: jest.fn(async () => clone()),
    },
    user: {
      findUnique: jest.fn(async ({ select }: any) => {
        if (select && 'awaitingOrgApproval' in select) return { awaitingOrgApproval: false };
        return { role: userRole, organizationId: 'org-1' };
      }),
    },
    groundDocument: { findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => []), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })), count: jest.fn(async () => 0) },
    reportActivation: { findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })), findMany: jest.fn(async () => []) },
    recordEntry: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    groundObjective: { findMany: jest.fn(async () => []) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0) };
      }
      return target[prop];
    },
  });
  const email: any = {};
  const config: any = { get: () => 'http://localhost:5173' };
  const grounds: any = { getSessionProgress: jest.fn(async () => null) };
  return new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any, grounds, { tell: async () => [] } as any);
}

describe('an admin who does not run the check-in reads theJudgement without the lead\'s private description', () => {
  it('the lead reads the private words, unchanged', async () => {
    const service = makeService(makeGround());
    const result: any = await service.get('g1', 'user-1', 'org-1');
    expect(JSON.stringify(result.theJudgement)).toContain(THE_PRIVATE_PHRASE);
  });

  /*
   * CHANGED 11 October 2026 (decision 139, item 1, building on decision 58). This said an admin who is not a party
   * keeps theJudgement without the private words. Hafsah has since ruled that an admin who only reads is never served
   * the lead's judgement at all: the final evaluation found Grace, the managing director, reading it on check-ins she
   * never ran. Stricter than before, so the private description is still never served to her. The admin who set the
   * check-in up keeps it (decision-139-an-admin-who-only-reads-gets-no-judgement-and-no-pattern.spec.ts).
   */
  it('an org admin who is not a party is served no judgement at all, so never the private description either', async () => {
    const service = makeService(makeGround(), 'ADMIN');
    const result: any = await service.get('g1', 'user-admin', 'org-1');
    expect(result.theJudgement).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(THE_PRIVATE_PHRASE);
    expect(JSON.stringify(result)).not.toContain('Tobi has not closed two open actions.');
    /* What decision 5 gives her stays: the shared picture of the check-in. */
    expect(result.sharedPicture).toBe('Both accounts described the same goal.');
  });

  it('a participant never receives theJudgement at all, as before', async () => {
    const service = makeService(makeGround());
    const result: any = await service.get('g1', 'user-2', 'org-1');
    expect(result.theJudgement).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(THE_PRIVATE_PHRASE);
  });

  it('the same holds on a forming report, before release', async () => {
    const ground: any = makeGround();
    ground.report.releasedAt = null;
    const service = makeService(ground, 'ADMIN');
    const result: any = await service.get('g1', 'user-admin', 'org-1');
    expect(result.forming).toBe(true);
    if (result.theJudgement) expect(JSON.stringify(result.theJudgement)).not.toContain(THE_PRIVATE_PHRASE);
  });

  it('the session report never carries theJudgement or the private description either', async () => {
    const service = makeService(makeGround(), 'ADMIN');
    const result: any = await service.sessionReport('g1', 1, 'user-admin', 'org-1');
    expect(result.theJudgement).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(THE_PRIVATE_PHRASE);
  });
});
