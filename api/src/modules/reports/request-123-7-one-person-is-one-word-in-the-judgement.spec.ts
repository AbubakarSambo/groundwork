import { GroundScenario } from '@prisma/client';
import { ReportsService } from './reports.service';
import { boardAs, AMINA, BARAKA, JUMA } from '../board/the-switchboards-sections-harness';
import { oldWordingPutPlain } from './a-stored-sentence-reads-right';
import { theVerbAgreesWithYou } from './party-labels';

/**
 * REQUEST 123 ITEM 7: THE LEAD'S JUDGEMENT MIXED "YOU", "THEY" AND "SHE" FOR ONE PERSON.
 *
 * The model wrote about the lead's label, and serving turned the label into "you" and left the pronoun and
 * the verb behind. What is repaired at the read is only the verb that shares "you" in its clause ("until you
 * clarify the role and provide ..."). Rules for "she"/"he", for "they", and for a reflexive were each tried and
 * taken out after review, because each could put a false sentence about the lead on the page. Those go to the
 * judgement's prompt. Every sentence the reviews sent back is pinned here as left as it is. Read through the real report
 * read and the real board read, as the lead, an admin, and the participant (who never reads the judgement).
 */
const THE_JUDGEMENT_123_7 = {
  theGap: "The initiator's own record says they were late on three deliveries.",
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
    /* Changed after the second review: no "they" is turned into "you". It may be somebody else, and "you were late" would be false. */
    expect(j.theGap).toBe('Your own record says they were late on three deliveries.');
    /* Changed after the third review: no reflexive is rewritten; the verb after "and" still agrees. */
    expect(j.whatToDo[0].because).toBe('You set the targets and are still handling key client meetings themselves.');
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
  } };
  it('Amina, who runs it, reads "you" with its verb', async () => {
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report } as any, ...AMINA);
    expect(b.theJudgement.theGap).toBe('Your own record says they were late on three deliveries.');
    expect(b.theJudgement.whatToDo[0].because).toBe('You set the targets and are still handling key client meetings themselves.');
  });
  it('with "she" in place of "they", the lead\'s board leaves it, because "she" is never rewritten', async () => {
    const withShe = { ...report, theJudgement: { ...report.theJudgement, theGap: "The initiator's own record says she has not given participant A the authority to renew contracts." } };
    const b: any = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report: withShe } as any, ...AMINA);
    expect(b.theJudgement.theGap).toBe('Your own record says she has not given Baraka Otieno the authority to renew contracts.');
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

describe('the rules leave alone what they cannot be sure of (every example the review sent back)', () => {
  it.each([
    "Your own record says they were late on three deliveries.",
    'Your own answers show she was late on three deliveries.',
    'Your own check-ins show he has missed the last two reviews.',
    'Your own record says she is ready to lead the Mombasa accounts.',
    'Your own record says they have not been told.',
  ])('after the names, the stored-sentence repair leaves "%s" as it is', (line) => {
    expect(oldWordingPutPlain(line)).toBe(line);
  });

  it.each([
    'You asked her to handle the client calls herself.',
    'You told him to fix the report himself.',
    'You have left the team to sort it out themselves.',
    'You asked the supplier whether they could deliver it themselves.',
    'You and Tobi Adewale handle the meetings themselves.',
    'You said you would do it yourself and that they would do it themselves.',
    'You expect the new hires will train themselves.',
    'You saw the drivers load the vans themselves.',
    'You think they did it themselves.',
    'You heard the agents talk among themselves.',
    'You watched the sales staff close the deals themselves.',
    'You left the drivers alone with the clients themselves.',
    'You made the managers write the plans themselves.',
    'You are still handling key client meetings themselves.',
  ])('no reflexive is rewritten: "%s"', (line) => {
    expect(oldWordingPutPlain(line)).toBe(line);
  });

  it.each([
    'Nothing will move until you hire someone who knows the market and provides training.',
    'Nothing will move until you meet the team that runs logistics and sets the routes.',
  ])('a verb another person could own is left: "%s"', (line) => {
    expect(theVerbAgreesWithYou(line)).toBe(line);
  });

  it('Someone would need to ask you if she has received the request.', () => {
    const line = 'Someone would need to ask you if she has received the request.';
    expect(oldWordingPutPlain(line)).toBe(line);
  });
});
