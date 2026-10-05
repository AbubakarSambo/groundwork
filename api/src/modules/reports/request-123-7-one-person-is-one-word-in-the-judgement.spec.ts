import { GroundScenario } from '@prisma/client';
import { ReportsService } from './reports.service';
import { boardAs, AMINA, BARAKA, JUMA } from '../board/the-switchboards-sections-harness';
import { theReaderAloneSaysYou } from './a-stored-sentence-reads-right';

/**
 * REQUEST 123 ITEM 7: THE LEAD'S JUDGEMENT MIXED "YOU", "THEY" AND "SHE" FOR ONE PERSON.
 *
 * The model wrote about the lead's label, and serving turned the label into "you" and left the pronoun and
 * the verb behind. Three shapes, where the pronoun is certainly the reader, now say "you" through. A sentence
 * where it is not certain ("ask you if she has received ...") is left as it is. Read through the real report
 * read and the real board read, as the lead, an admin, and the participant (who never reads the judgement).
 */
const THE_JUDGEMENT_123_7 = {
  theGap: "The initiator's own record says they have not given participant A the authority to renew contracts.",
  whatToDo: [
    { move: 'Agree a date for participant A to take over renewals, until the initiator clarifies the role and provides the necessary authority.', because: 'The initiator set the targets and is still handling key client meetings themselves.', startWith: 'participant A' },
  ],
  whatTheNumbersSay: [],
  whatWeFailedToAsk: [{ what: 'Someone would need to ask the initiator if she has received participant A\'s request.', missedIn: 1 }],
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
      networkPicture: null, sharedAs: null, theJudgement: THE_JUDGEMENT_123_7,
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




describe('request 123 (7): Amina reads her own judgement as "you" throughout, where it is certainly her', () => {
  it('on her report', async () => {
    const j: any = (await makeService(makeGround()).get('g1', 'user-1', 'org-1') as any).theJudgement;
    expect(j.theGap).toBe('Your own record says you have not given Tobi Adewale the authority to renew contracts.');
    expect(j.whatToDo[0].because).toBe('You set the targets and are still handling key client meetings yourself.');
    expect(j.whatToDo[0].move).toBe('Agree a date for Tobi Adewale to take over renewals, until you clarify the role and provide the necessary authority.');
    /* Not certain, so left for the writer. */
    expect(JSON.stringify(j.whatWeFailedToAsk)).toContain('ask you if she has received');
  });

  it('an admin who set it up reads the names, and no "you"', async () => {
    const j: any = (await makeService({ ...makeGround(), createdByUserId: 'user-admin' }, 'ADMIN').get('g1', 'user-admin', 'org-1') as any).theJudgement;
    expect(JSON.stringify(j)).not.toMatch(/\byou\b|yourself/i);
    expect(j.whatToDo[0].because).toMatch(/is still handling key client meetings themselves\.$/);
  });

  it('Tobi, the participant, reads no judgement at all', async () => {
    const r: any = await makeService(makeGround()).get('g1', 'user-2', 'org-1');
    expect(r.theJudgement).toBeUndefined();
  });
});

describe('request 123 (7), on the board', () => {
  const report = { releasedAt: new Date('2026-09-23T17:00:00Z'), theJudgement: {
    ...THE_JUDGEMENT_123_7,
    theGap: "The initiator's own record says she has not given participant A the authority to renew contracts.",
  } };
  it('Amina, who runs it, reads "you" with its verb', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...AMINA);
    expect(b.theJudgement.theGap).toBe('Your own record says you have not given Baraka Otieno the authority to renew contracts.');
    expect(b.theJudgement.whatToDo[0].because).toBe('You set the targets and are still handling key client meetings yourself.');
  });
  it('an admin reads Amina by name, and the pronoun is left', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...JUMA);
    expect(JSON.stringify(b.theJudgement ?? {})).not.toMatch(/\byou\b|yourself/i);
  });
  it('Baraka, who checks in, is sent no judgement', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...BARAKA);
    expect(b.theJudgement ?? null).toBeNull();
  });
});

describe('the rule leaves alone what it cannot be sure of', () => {
  it.each([
    'Your manager says she has not decided.',
    'You asked the supplier whether they could deliver it themselves.',
    'You and Tobi Adewale handle the meetings themselves.',
    'Someone would need to ask you if she has received the request.',
  ])('%s', (line) => {
    expect(theReaderAloneSaysYou(line)).toBe(line);
  });
});
