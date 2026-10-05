import { GroundScenario } from '@prisma/client';
import { ReportsService } from './reports.service';
import { aNameInTheirWordsIsTheLabel } from './a-name-in-their-words-is-the-label';
import { boardAs, AMINA, BARAKA, JUMA } from '../board/the-switchboards-sections-harness';

/**
 * THE READER'S OWN NAME IS "YOU", AND THE VERB AGREES (the 1 October review, section 2).
 *
 * Amina runs the check-in. Her judgement was written by a model that met her name in Tobi's words and
 * took her for somebody else, so she read "Ask Amina for her account of her role in the meetings." -
 * an instruction to ask herself. And where a label did become "you", the verb was left behind:
 * "You reviews the individual targets", "you stays blocked". Every test reads what a person is
 * served, through the real report read and the real board read, as the lead, the participant and an
 * admin.
 */

const THE_JUDGEMENT = {
  theGap: 'The initiator and participant A are working to two different definitions of owning a client.',
  whatToDo: [
    { move: 'Ask participant A what it would take to bring forward their plan to run the client meetings without Amina.', because: 'You are still attending meetings set up by Amina.', startWith: 'participant A' },
    { move: 'Ask Amina for her account of her role in the meetings.', because: 'Amina was not asked.', startWith: 'Amina' },
    { move: 'Decide with participant A who should be leading the client meetings that the record shows Amina is currently leading.', because: 'Participant A says Amina leads the client calls.', startWith: 'participant A' },
  ],
  whatTheNumbersSay: [],
  whatWeFailedToAsk: [],
  whatThisCannotTellYou: [
    { why: 'Amina was not part of this check-in, so her own account of the meetings is missing.', about: "Amina's role in the client meetings.", toKnow: 'Ask Amina for her account of her role in the meetings.' },
    { why: 'Amina is named by two people as arranging and running client meetings, but Amina was not asked for an account.', about: 'The meetings.', toKnow: 'Ask Amina for an account of the role they play with the five largest clients.' },
    { why: 'The record does not say how the role was first described.', about: 'The role.', toKnow: 'Ask the initiator and participant A to account for how the role was first defined.' },
  ],
};

const DIVERGENCES = [
  {
    topic: 'Which quarter-end date the team is working to.',
    atStake: 'If this holds, the churn model remains unused and participant A stays blocked.',
    settledBy: 'The initiator confirms the correct quarter-end date and shares it with the team.',
    positions: [
      { participantLabel: 'participant A', view: 'Participant A is blocked, has been waiting since the 8th, and is unsure how to proceed.' },
      { participantLabel: 'the initiator', view: 'The initiator reviews the individual targets that the participants are working towards.' },
    ],
  },
];

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
      divergences: DIVERGENCES, centralQuestion: null,
      releasedAt: new Date('2026-09-23T17:00:00Z'), engagement: {}, findings: [], overTime: null,
      networkPicture: null, sharedAs: null, theJudgement: THE_JUDGEMENT,
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



const served = (v: any) => JSON.stringify(v);

describe('Amina, who runs the check-in, reads her own judgement about "you"', () => {
  it('her name is "you", with its verb, and she is never told to ask herself', async () => {
    const r: any = await makeService(makeGround()).get('g1', 'user-1', 'org-1');
    const j = r.theJudgement;
    expect(served(j)).not.toMatch(/Amina/);
    expect(served(j)).not.toMatch(/\bAsk you\b/i);
    expect(j.whatToDo.map((m: any) => m.move)).toEqual([
      'Ask Tobi Adewale what it would take to bring forward their plan to run the client meetings without you.',
      'Decide with Tobi Adewale who should be leading the client meetings that the record shows you are currently leading.',
    ]);
    expect(j.whatToDo[0].because).toBe('You are still attending meetings set up by you.');
    expect(j.whatThisCannotTellYou.map((x: any) => x.why)).toEqual([
      'You were not part of this check-in, so your own account of the meetings is missing.',
      'You are named by two people as arranging and running client meetings, but you were not asked for an account.',
      'The record does not say how the role was first described.',
    ]);
    expect(j.whatThisCannotTellYou.map((x: any) => x.toKnow)).toEqual([
      'Your own account of your role in the meetings is not in this check-in.',
      'Your own account of the role you play with the five largest clients is not in this check-in.',
      'Ask Tobi Adewale to account for how the role was first defined.',
    ]);
    /* Changed 5 October 2026: the report now makes the same repairs as the board, so a heading that is a piece is a
       sentence here too (request 131 item 5). */
    expect(j.whatThisCannotTellYou[0].about).toBe('This check-in cannot tell you about your role in the client meetings.');
  });

  it('every verb after "you" agrees with it, in the differences she reads', async () => {
    const r: any = await makeService(makeGround()).get('g1', 'user-1', 'org-1');
    const d = r.divergences[0];
    expect(d.settledBy).toBe('You confirm the correct quarter-end date and share it with the team.');
    expect(served(d)).toContain('You review the individual targets that the participants are working towards.');
    expect(served(d)).not.toMatch(/\byou (reviews|stays|shares)\b/i);
  });
});

describe('Tobi, the participant, reads the same check-in about Amina by name', () => {
  it('Amina stays Amina for him, and his own label is "you" with its verb', async () => {
    const r: any = await makeService(makeGround()).get('g1', 'user-2', 'org-1');
    /* The judgement is the lead's alone, and still is. */
    expect(r.theJudgement).toBeUndefined();
    expect(served(r)).not.toMatch(/\bAsk you\b/i);
  });
});

describe('an admin reads the judgement with every name, and nobody is "you"', () => {
  it('Amina is named, and the step about her is kept', async () => {
    /* Changed with decision 75, item 25: this is a new hire's first 90 days, an evaluation check-in now, so the
       admin reading it is the one who set it up (given access, decision 5). An admin without access reads nothing. */
    const r: any = await makeService({ ...makeGround(), createdByUserId: 'user-admin' }, 'ADMIN').get('g1', 'user-admin', 'org-1');
    expect(served(r.theJudgement)).toContain('Ask Amina for her account of her role in the meetings.');
    expect(served(r.theJudgement)).not.toMatch(/\bAsk you\b/i);
  });
});

describe('on the board, each reader reads the difference about themselves as "you"', () => {
  const report = { divergences: DIVERGENCES, releasedAt: new Date('2026-09-23T17:00:00Z') };
  it('Baraka, the participant it is about, reads "you stay blocked" and "you have been waiting"', async () => {
    const b = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report }, ...BARAKA);
    const item = b.divergence.items[0];
    expect(item.atStake).toBe('If this holds, the churn model remains unused and you stay blocked.');
    expect(item.positions[0].view).toBe('You are blocked, have been waiting since the 8th, and are unsure how to proceed.');
  });
  it('Amina, who runs it, reads "You confirm the date and share it" and "You review"', async () => {
    const b = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report }, ...AMINA);
    const item = b.divergence.items[0];
    expect(item.settledBy).toBe('You confirm the correct quarter-end date and share it with the team.');
    expect(item.positions[1].view).toBe('You review the individual targets that the participants are working towards.');
  });
  it('an admin reads everybody by name, and the verbs stay with the names', async () => {
    const b = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, report }, ...JUMA);
    const item = b.divergence.items[0];
    expect(item.positions[0].view).toBe('Baraka Otieno is blocked, has been waiting since the 8th, and is unsure how to proceed.');
    expect(item.settledBy).toBe('Amina Wanjiru confirms the correct quarter-end date and shares it with the team.');
    expect(served(item)).not.toMatch(/\byou\b/i);
  });
});

/*
 * THE SOURCE: the model was given "Amina" in Tobi's words and "the initiator" for Amina, and nothing
 * said they were one person, because her first name was taken to be "Dr". Her name in somebody's words
 * now reaches the model as her label.
 */
describe('a name with a title in front of it, in somebody\'s words, becomes the label before a model reads it', () => {
  const people = [{ label: 'the initiator', name: 'Dr Amina Bello' }, { label: 'participant A', name: 'Tobi Adewale' }];
  it('"Amina", "Amina Bello" and "Dr Amina Bello" are all the initiator', () => {
    expect(aNameInTheirWordsIsTheLabel('Amina leads the client calls.', people)).toBe('The initiator leads the client calls.');
    expect(aNameInTheirWordsIsTheLabel('I sat in with Amina Bello and Dr Amina Bello.', people)).toBe('I sat in with the initiator and the initiator.');
    expect(aNameInTheirWordsIsTheLabel("It was Amina's call.", people)).toBe("It was the initiator's call.");
  });
  it('"Dr" on its own is not her name', () => {
    expect(aNameInTheirWordsIsTheLabel('See a Dr about it.', people)).toBe('See a Dr about it.');
  });
});
