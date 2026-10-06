import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { labelsForParties } from '../../reports/party-labels';

/**
 * TWO CHECK-INS FROM THE RUN OF 1 OCTOBER 2026, AS THEIR BOARDS WERE BUILT FROM: the sales team
 * (api/journey/all-24/re-a/sales.json, session 3) and the contract review
 * (api/journey/all-24/run-21/contractreview.json, session 1). The words are the run's own.
 */
const person = (id: string, userId: string, first: string, last: string, lead = false) => ({
  id, userId, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, email: `${userId}@credit.test`,
  roleAsDescribed: lead ? 'runs credit sales' : 'credit sales', remitAsGiven: null, nameGiven: null, organisationGiven: null,
  managingOnly: false, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: last },
});

/** The clock these rows were written at, and the board is read at, so a date reads the same on any day the tests run. */
export const THE_CLOCK = new Date('2026-10-02T12:00:00Z');
const daysAgo = (n: number) => new Date(THE_CLOCK.getTime() - n * 86_400_000);

const BISI = person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', true);
const FEMI = person('p-femi', 'u-femi', 'Femi', 'Okonkwo');
const NGOZI = person('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze');
const KWAME = person('p-kwame', 'u-kwame', 'Kwame', 'Mensah');

/* The labels a stored report carries; every read turns them into the names its reader may see. */
const LABEL = labelsForParties([BISI, FEMI, NGOZI, KWAME] as any);

const salesCheckIns = ['p-bisi', 'p-femi', 'p-ngozi', 'p-kwame'].flatMap((pid) => [1, 2, 3].map((n) => ({
  id: `c-${pid}-${n}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: daysAgo(4 - n), createdAt: daysAgo(4 - n), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
})));

const SALES: any = {
  id: 'g-credit', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-bisi', createdByUserId: 'u-bisi', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'EVERYONE', label: 'Credit sales, Q4',
  participants: [BISI, FEMI, NGOZI, KWAME],
  checkIns: salesCheckIns,
  /* Released, as it was on the run once everybody had answered: a participant reads the team's picture only once it is shared (request 105). */
  report: {
    releasedAt: daysAgo(1),
    sharedPicture: 'All four people have answered. They disagree on three things: the definition of an "approved" sale is not the same for everyone, there is a disconnect about whether individual targets are in place, and the deadline for the work is not known by everyone.\n\nYour target for the team is 40 approved facilities. You report that the team has 11 approved facilities so far.',
    agreements: ['Everyone is working toward the team goal of 40 approved facilities.'],
    divergences: [
      {
        topic: 'What counts as an approved sale.',
        atStake: 'If the team counts sales in different ways, the count of 40 cannot be checked.',
        evidence: ['Kwame Mensah reports 22 facilities approved.', 'Kwame Mensah says that he is counting submitted applications as sales.'],
        positions: [
          { participantLabel: LABEL.get('p-bisi'), view: 'You count a facility once the credit committee has approved it.' },
          { participantLabel: LABEL.get('p-kwame'), view: `${LABEL.get('p-kwame')} counts an application taken as a sale.` },
        ],
        settledBy: 'Agreeing one meaning of an approved sale.',
      },
    ],
    centralQuestion: 'Which applications in the pipeline are approved, and which are only submitted?',
    findings: [],
  },
  /* The same 40, three times, as the run's board had it. */
  objectives: [
    { id: 'o-said', groundId: 'g-credit', name: "I'm aiming for 40 approved facilities this quarter.", target: 40, count: 0, prevCount: 0, ownerParticipantId: null, sortOrder: 0, addedAtSession: null },
    { id: 'o-team', groundId: 'g-credit', name: 'The team has a target of 40 approved facilities.', target: 40, count: 11, prevCount: 0, ownerParticipantId: null, sortOrder: 1, addedAtSession: null },
    { id: 'o-lead', groundId: 'g-credit', name: 'approved facilities', target: 40, count: 0, prevCount: 0, ownerParticipantId: 'p-bisi', sortOrder: 2, addedAtSession: null },
    { id: 'o-ngozi', groundId: 'g-credit', name: 'approved facilities', target: 14, count: 6, prevCount: 6, ownerParticipantId: 'p-ngozi', sortOrder: 3, addedAtSession: null },
    { id: 'o-kwame', groundId: 'g-credit', name: 'approved facilities', target: 14, count: 0, prevCount: 0, ownerParticipantId: 'p-kwame', sortOrder: 4, addedAtSession: null },
  ],
  dependencies: [
    { id: 'd-femi', groundId: 'g-credit', fromParticipantId: 'p-femi', onParticipantId: null, onLabel: 'the customers', blockerKind: null,
      what: "the customer's bank statements and other things we need", status: 'WAITING', then: null,
      triedSaid: 'I called the customer again to remind them about the documents. I have been following up.',
      escalatedAt: null, clearedAt: null, sourceCheckInId: 'c-p-femi-1', createdAt: daysAgo(3), updatedAt: daysAgo(1) },
    { id: 'd-ngozi', groundId: 'g-credit', fromParticipantId: 'p-ngozi', onParticipantId: null, onLabel: 'the credit committee', blockerKind: null,
      what: 'review and approval for their eleven files', status: 'WAITING', then: null,
      triedSaid: 'I have chased the committee four times in writing for all eleven files, including the oldest one. I also escalated to the Head of Credit.',
      escalatedAt: null, clearedAt: null, sourceCheckInId: 'c-p-ngozi-1', createdAt: daysAgo(3), updatedAt: daysAgo(1) },
  ],
  poll: null,
};

const ADAEZE = person('p-adaeze', 'u-adaeze', 'Adaeze', 'Obi', true);
const FRANK = person('p-frank', 'u-frank', 'Frank', 'Mbeki');
const CONTRACT: any = {
  id: 'g-contract', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-adaeze', createdByUserId: 'u-adaeze', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 30, cadence: 'WEEKLY',
  whoSeesTargets: 'EVERYONE', label: 'Supplier contract review',
  participants: [ADAEZE, FRANK],
  checkIns: ['p-adaeze', 'p-frank'].map((pid) => ({
    id: `c-${pid}-1`, participantId: pid, sessionNumber: 1, status: 'COMPLETED', isSetup: false,
    completedAt: daysAgo(1), createdAt: daysAgo(1), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
  })),
  /* Released, as it was on the run once both had answered: a participant reads the team's picture only once it is shared (request 105). */
  report: {
    releasedAt: daysAgo(1),
    sharedPicture: 'Both people have answered. They disagree on what the service agreement means. You say it is for resolving critical issues within four hours, and Frank Mbeki says it is for acknowledging all tickets within four hours.',
    agreements: [
      'Both agree the goal is to ensure the company gets the service promised in the contract.',
      "Both see the supplier's performance against the contract as the central issue.",
      'Both accounts reference a four-hour service level as a key term of the agreement.',
    ],
    divergences: [],
    centralQuestion: "When the contract specifies a 'four-hour' service level, what does the text say this applies to: acknowledging a ticket, or resolving the issue?",
    findings: [],
  },
  objectives: [],
  dependencies: [],
  poll: null,
};

const WRITES = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];

export function prismaFor(which: 'sales' | 'contract', viewerRole = 'MEMBER') {
  const ground = which === 'sales' ? SALES : CONTRACT;
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: which === 'sales' ? 3 : 1 } })),
  };
  const model = (own: Record<string, any> = {}) => new Proxy({ ...reads, ...own }, {
    get(target: any, prop: string) {
      if (WRITES.includes(prop)) return jest.fn(async () => ({}));
      return target[prop];
    },
  });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => structuredClone(ground)) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => structuredClone(ground.checkIns)) }),
    /* Where the target stood when the first round closed. */
    groundObjectiveSnapshot: model({ findMany: jest.fn(async () => (ground.objectives as any[]).map((o) => ({ objectiveId: o.id, count: 0, sessionNumber: 1 }))) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  return { prisma };
}
