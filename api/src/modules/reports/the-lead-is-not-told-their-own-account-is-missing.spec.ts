import { GroundScenario } from '@prisma/client';
import { ReportsService } from './reports.service';
import { boardAs, AMINA, BARAKA, JUMA } from '../board/the-switchboards-sections-harness';
import { aJudgementThatReadsRight } from './the-judgement-reads-right';

/**
 * THE LEAD IS NOT TOLD THEIR OWN ACCOUNT IS MISSING ABOUT THEIR OWN ITEM (run of 5 October, snapshot and project).
 *
 * The snapshot's lead read, under "What this cannot tell you": "You have said that hiring is hard, but not what the
 * difficulties are." and then "Your own account of this is not in this check-in." Their account is partly there; what
 * is true is that nobody else can give it. 048cea38 fixed this only for a check-in of one. Read as the lead, an admin
 * and the participant, on the report and on the board.
 */
const THE_JUDGEMENT_OWN = {
  theGap: 'The office move is held up.',
  whatToDo: [],
  whatTheNumbersSay: [],
  whatWeFailedToAsk: [],
  whatThisCannotTellYou: [
    { why: 'The initiator has said that hiring is hard, but not what the difficulties are.', about: 'the reason it is hard to hire a senior developer', toKnow: 'Ask the initiator for an account of this.' },
    { why: 'The record does not say how the role was first described.', about: 'The role.', toKnow: 'Ask the initiator for an account of this.' },
  ],
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
      networkPicture: null, sharedAs: null, theJudgement: THE_JUDGEMENT_OWN,
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





describe('the lead\'s own item: "Only you can answer this."', () => {
  it('on the lead\'s report', async () => {
    const j: any = (await makeService(makeGround()).get('g1', 'user-1', 'org-1') as any).theJudgement;
    expect(j.whatThisCannotTellYou[0].why).toBe('You have said that hiring is hard, but not what the difficulties are.');
    expect(j.whatThisCannotTellYou[0].toKnow).toBe('Only you can answer this.');
    /* A line that is not about the lead keeps its sentence. */
    expect(j.whatThisCannotTellYou[1].toKnow).toBe('Your own account of this is not in this check-in.');
  });
  it('an admin who set it up reads the lead by name, and no "Only you"', async () => {
    const j: any = (await makeService({ ...makeGround(), createdByUserId: 'user-admin' }, 'ADMIN').get('g1', 'user-admin', 'org-1') as any).theJudgement;
    expect(JSON.stringify(j)).not.toMatch(/Only you can answer this/);
  });
  it('the participant reads no judgement', async () => {
    expect(((await makeService(makeGround()).get('g1', 'user-2', 'org-1')) as any).theJudgement).toBeUndefined();
  });
});

describe('on the board', () => {
  const report = { releasedAt: new Date('2026-09-23T17:00:00Z'), theJudgement: THE_JUDGEMENT_OWN };
  it('Amina, who runs it, reads "Only you can answer this."', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...AMINA);
    expect(b.theJudgement.whatThisCannotTellYou[0].toKnow).toBe('Only you can answer this.');
  });
  it('an admin does not', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...JUMA);
    expect(JSON.stringify(b.theJudgement ?? {})).not.toMatch(/Only you can answer this/);
  });
  it('Baraka, who checks in, is sent no judgement', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...BARAKA);
    expect(b.theJudgement ?? null).toBeNull();
  });
});

describe('what it leaves alone', () => {
  it.each([
    'Your team has not said what the difficulties are.',
    'Your staff have not said why the orders are late.',
    'Your manager has not said what the budget is.',
    'Your direct reports have not said who owns the lease.',
  ])('a line about the lead\'s people, not the lead: "%s" keeps the old sentence', (why) => {
    const j: any = aJudgementThatReadsRight({ whatThisCannotTellYou: [{ why, about: 'The difficulties.', toKnow: 'Your own account of this is not in this check-in.' }] });
    expect(j.whatThisCannotTellYou[0].toKnow).toBe('Your own account of this is not in this check-in.');
  });

  it('whose account is missing, where the thing is who somebody else is', () => {
    const j: any = aJudgementThatReadsRight({ whatThisCannotTellYou: [{ why: 'You did not say.', about: 'Who the other trader with the broken freezer is.', toKnow: 'Your own account of this is not in this check-in.' }] });
    expect(j.whatThisCannotTellYou[0].toKnow).toBe("That trader's own account is not in this check-in.");
  });
});
