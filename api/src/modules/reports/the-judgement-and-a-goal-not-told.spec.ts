import { ReportsService } from './reports.service';
import { theJudgementWithItsConversationPoints } from './the-judgement-and-a-goal-not-told';

/**
 * DECISION 56, POINT 3, IN THE LEAD'S JUDGEMENT.
 *
 * Wherever an untold goal counts against a person the lead is shown "Tobi has not been told about
 * this goal yet, so talk it through with Tobi before reading anything into it." The Context page,
 * Today, the board and the suggestions did; the judgement did not. The product writes it, the model
 * does not, and only the lead reads it, and only where the judgement rests on the goal.
 *
 * Read through the real `ReportsService.get()` as the lead, the person, a colleague, and an admin
 * who only reads.
 */

const POINT = 'Tobi has not been told about this goal yet. Talk it through together before reading anything into it.';
const TOBI_UNTOLD = { participantId: 'p2', text: 'Take over the scheduling.', awareness: 'NOT_TOLD', authoredBy: 'LEAD' };

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
        roleAsDescribed: 'Engagement Director', user: { firstName: 'Tobi', lastName: 'Adewale' },
      }),
      makeParticipant({
        id: 'p3', userId: 'user-3', partyType: 'PARTICIPANT', email: 'p3@test.com',
        roleAsDescribed: 'Account manager', user: { firstName: 'Femi', lastName: 'Okon' },
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
        theGap: 'Tobi has not started on taking over the scheduling.',
        whatToDo: [
          { move: 'Ask Tobi what stands between him and the scheduling.', because: 'Nothing has moved on it.', startWith: 'Tobi' },
          { move: 'Confirm the renewal date with the client.', because: 'It is three weeks out.', startWith: 'Amina' },
        ],
      },
      createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
    },
  };
}

function makeService(ground: any, userRole: 'ADMIN' | 'MEMBER' = 'ADMIN', untold: any[] = [TOBI_UNTOLD]) {
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
    personObjective: { findMany: jest.fn(async () => untold) },
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


describe('the lead\'s judgement carries the conversation point for an untold goal', () => {
  it('the lead reads it, in the judgement, word for word', async () => {
    const r: any = await makeService(makeGround()).get('g1', 'user-1', 'org-1');
    expect(r.theJudgement.conversationPoints).toEqual([POINT]);
    expect(r.theJudgement.theGap).toBe('Tobi has not started on taking over the scheduling.');
  });

  it('the lead reads it on a forming report too', async () => {
    const g: any = makeGround(); g.report.releasedAt = null;
    const r: any = await makeService(g).get('g1', 'user-1', 'org-1');
    expect(r.theJudgement?.conversationPoints).toEqual([POINT]);
  });

  it('not when the goal has been told', async () => {
    const r: any = await makeService(makeGround(), 'ADMIN', [{ ...TOBI_UNTOLD, awareness: 'TOLD' }]).get('g1', 'user-1', 'org-1');
    expect(r.theJudgement.conversationPoints).toBeUndefined();
  });

  it('not when the judgement is about something else', async () => {
    const g: any = makeGround();
    g.report.theJudgement = { theGap: 'Femi has not sent the invoices.', whatToDo: [{ move: 'Ask Femi about the invoices.', because: 'Two are late.', startWith: 'Femi' }] };
    const r: any = await makeService(g).get('g1', 'user-1', 'org-1');
    expect(JSON.stringify(r.theJudgement)).not.toContain('has not been told');
  });

  it('the person never reads it, and never reads the judgement', async () => {
    const r: any = await makeService(makeGround()).get('g1', 'user-2', 'org-1');
    expect(r.theJudgement).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('has not been told about this goal');
  });

  it('a colleague never reads it', async () => {
    const r: any = await makeService(makeGround()).get('g1', 'user-3', 'org-1');
    expect(r.theJudgement).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('has not been told about this goal');
  });

  it('an admin who only reads the judgement does not get the lead\'s conversation point', async () => {
    const r: any = await makeService(makeGround(), 'ADMIN').get('g1', 'user-admin', 'org-1');
    expect(r.theJudgement).toBeDefined();
    expect(JSON.stringify(r.theJudgement)).not.toContain('has not been told about this goal');
  });
});

describe('the rule that decides when the judgement rests on the goal', () => {
  const judgement = { theGap: 'Tobi has not started on the scheduling.' };
  it('needs the name and something from the goal', () => {
    expect((theJudgementWithItsConversationPoints(judgement, [{ name: 'Tobi', goal: 'Take over the scheduling.' }]) as any).conversationPoints).toEqual([POINT]);
    expect(theJudgementWithItsConversationPoints(judgement, [{ name: 'Femi', goal: 'Take over the scheduling.' }])).toBe(judgement);
    expect(theJudgementWithItsConversationPoints(judgement, [{ name: 'Tobi', goal: 'Reduce refunds by 10%.' }])).toBe(judgement);
  });
});
