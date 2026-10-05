import { GroundScenario } from '@prisma/client';
import { ReportsService } from './reports.service';
import { boardAs, AMINA, BARAKA, JUMA } from '../board/the-switchboards-sections-harness';
import { aPromiseSaidAsWhatWasPromised, aStepThatIsAStep } from './the-judgement-reads-right';

/**
 * REQUEST 134 ITEM 4: THE JUDGEMENT'S TWO SENTENCES ABOUT THE OPEN COMMITMENTS.
 *
 * "The status of the open commitments to 'call the client' and 'file the bundle'." stood under what to do: a piece,
 * not a step. And "Ask Amani Wekesa about the open commitment to 'I will file the bundle'." quoted the promise as a
 * fragment in the first person. Narrowed after review: no step is ever dropped; only a status piece is made a step,
 * and only a quote in the shape of a promise is said as what was promised. Read through
 * the real report read and the real board read, as the lead, an admin, and the participant (who never reads it).
 */
const THE_JUDGEMENT_134_4 = {
  theGap: 'Participant A has two promises still open.',
  whatToDo: [
    { move: "Ask participant A about the open commitment to 'I will file the bundle'.", because: 'It is still open.', startWith: 'participant A' },
    { move: "The status of the open commitments to 'call the client' and 'file the bundle'.", because: 'Both are open.', startWith: 'participant A' },
  ],
  whatTheNumbersSay: [],
  whatWeFailedToAsk: [],
  whatThisCannotTellYou: [],
};

function makeParticipant(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'p1', userId: 'user-1', partyType: 'INITIATOR', email: 'amina@test.com',
    soloArtifact: null, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null,
    managingOnly: false, detectedFunction: null, detectedFunctionConfidence: null,
    createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Dr Amina', lastName: 'Bello' },
    ...overrides,
  };
}

function makeGround() {
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'user-1',
    createdByUserId: null,
    whoSeesTargets: 'THEIR_OWN',
    scenario: 'NEW_HIRE',
    peersVisibleToEachOther: null,
    objectives: [],
    participants: [
      makeParticipant({ id: 'lead', userId: 'user-1', partyType: 'INITIATOR' }),
      makeParticipant({
        id: 'subject', userId: 'user-2', partyType: 'PARTICIPANT', email: 'tobi@test.com',
        createdAt: new Date('2026-09-01T09:05:00Z'), user: { firstName: 'Tobi', lastName: 'Adewale' },
      }),
    ],
    report: {
      id: 'r1', groundId: 'g1',
      sharedPicture: 'Both people have answered.',
      theOpening: null,
      agreements: [],
      divergences: [], centralQuestion: null,
      releasedAt: new Date('2026-09-23T17:00:00Z'), engagement: {}, findings: [], overTime: null,
      networkPicture: null, sharedAs: null, theJudgement: THE_JUDGEMENT_134_4,
      createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
    },
  };
}

function makeService(ground: any, userRole: 'ADMIN' | 'MEMBER' = 'MEMBER', untold: any[] = []) {
  const clone = () => structuredClone(ground);
  const entries = [
    { id: 'e1', text: 'Amina leads the client calls.', saidWordForWord: true, participantId: 'subject' },
  ];
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => clone()) },
    user: {
      findUnique: jest.fn(async ({ select }: any) => {
        if (select && 'awaitingOrgApproval' in select) return { awaitingOrgApproval: false };
        return { role: userRole, organizationId: 'org-1' };
      }),
    },
    groundDocument: { findMany: jest.fn(async () => []) },
    personObjective: { findMany: jest.fn(async () => untold) },
    checkIn: { findMany: jest.fn(async () => []), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })), count: jest.fn(async () => 0) },
    reportActivation: { findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })), findMany: jest.fn(async () => []) },
    recordEntry: { findMany: jest.fn(async () => entries), count: jest.fn(async () => entries.length) },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundCommitment: { findMany: jest.fn(async () => []) },
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





const THE_STEPS = (who: string) => [
  `Ask ${who} about the open commitment to file the bundle.`,
  "Check the status of the open commitments to call the client and file the bundle.",
];

describe('request 134 (4): on the report', () => {
  it('the lead reads the promise as what was promised, and the status piece as a step', async () => {
    const j: any = (await makeService(makeGround()).get('g1', 'user-1', 'org-1') as any).theJudgement;
    expect(j.whatToDo.map((m: any) => m.move)).toEqual(THE_STEPS('Tobi Adewale'));
  });
  it('an admin who set it up reads the same steps', async () => {
    const j: any = (await makeService({ ...makeGround(), createdByUserId: 'user-admin' }, 'ADMIN').get('g1', 'user-admin', 'org-1') as any).theJudgement;
    expect(j.whatToDo.map((m: any) => m.move)).toEqual(THE_STEPS('Tobi Adewale'));
  });
  it('the participant reads no judgement', async () => {
    expect(((await makeService(makeGround()).get('g1', 'user-2', 'org-1')) as any).theJudgement).toBeUndefined();
  });
});

describe('request 134 (4): on the board', () => {
  const report = { releasedAt: new Date('2026-09-23T17:00:00Z'), theJudgement: THE_JUDGEMENT_134_4 };
  it('Amina, who runs it, reads both steps, with the promise in our voice', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...AMINA);
    expect(b.theJudgement.whatToDo.map((m: any) => m.move)).toEqual(THE_STEPS('Baraka Otieno'));
  });
  it('an admin reads no piece and no quoted fragment', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...JUMA);
    expect(JSON.stringify(b.theJudgement ?? {})).not.toMatch(/"The status of|'I will file/);
  });
  it('Baraka, who checks in, is sent no judgement', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...BARAKA);
    expect(b.theJudgement ?? null).toBeNull();
  });
});

describe('what the rules leave alone (every example the review sent back)', () => {
  it.each([
    'A short call with Ngozi this week settles who owns the lease.',
    'The lead confirms the price list with Amani by Friday.',
    'The warehouse question goes to Juma first.',
    'A written answer to Amani on the discount, before Friday.',
    'Speak with Ngozi Eze about the 11 applications.',
    'The status of the order is unclear, so ask Juma.',
  ])('the step "%s" is kept as it is', (move) => {
    expect(aStepThatIsAStep(move)).toBe(move);
  });
  it('only a status piece is made a step', () => {
    expect(aStepThatIsAStep("The status of the open commitments to 'call the client'.")).toBe("Check the status of the open commitments to 'call the client'.");
    expect(aStepThatIsAStep('The progress of the Kisumu groups.')).toBe('Check the progress of the Kisumu groups.');
  });
  it('only a quote in the shape of a promise is said as one', () => {
    expect(aPromiseSaidAsWhatWasPromised("the open commitments to 'call the client' and 'file the bundle'"))
      .toBe('the open commitments to call the client and file the bundle');
    expect(aPromiseSaidAsWhatWasPromised("Ask Amani about the commitment to 'Amina will send the sheets'."))
      .toBe("Ask Amani about the commitment to 'Amina will send the sheets'.");
    expect(aPromiseSaidAsWhatWasPromised("Amani said 'I will file the bundle' on Monday.")).toBe("Amani said 'I will file the bundle' on Monday.");
  });
});
