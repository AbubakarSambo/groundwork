import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { whenTheBoardLastChanged, whatAReaderWhoOnlyReadsIsTold } from './when-the-board-last-changed';

/**
 * SCREENS REQUEST 85: THE BOARD DOES NOT ASK THE LEAD TO CHASE SOMEBODY AN ADMIN DID NOT LET IN.
 *
 * Read through the real board as the lead, the admin who set it up, and a participant.
 *
 * (Harness copied from the contribution spec.)
 *
 * A real board is assembled through `BoardService.get`, with the report's real name resolution,
 * and the test reads what each person is served:
 *  - when it last changed, taken from the record, the same for everybody;
 *  - the read-only note, only for an admin who neither runs the check-in nor takes part;
 *  - what a target assumes, only to whoever may read the target;
 *  - never how a person's answers were rated, not even to the lead;
 *  - and opening it rebuilds nothing: no write to the record, no report written, and the model
 *    is not asked for anything.
 */

const LEAD = {
  id: 'p-lead', userId: 'u-wairimu', partyType: PartyType.INITIATOR, email: 'w@baridi.test',
  roleAsDescribed: 'runs the sales team', nameGiven: null, organisationGiven: null, managingOnly: true,
  createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Kamau' },
};
const MIRIAM = {
  id: 'p-miriam', userId: 'u-miriam', partyType: PartyType.PARTICIPANT, email: 'm@baridi.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Miriam', lastName: 'Wanjiku' },
};
const AISHA = {
  id: 'p-aisha', userId: 'u-aisha', partyType: PartyType.PARTICIPANT, email: 'a@baridi.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Aisha', lastName: 'Otieno' },
};

const CHECK_INS = [
  /* Miriam's answers were rated "vague". The lead must never be able to read that. */
  { id: 'c1', participantId: 'p-miriam', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T16:10:00Z'), specificityLevel: 'vague', specificityDimensions: { checkable: 'vague' } },
  { id: 'c2', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-23T15:00:00Z'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } },
];

const GROUND: any = {
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-wairimu', createdByUserId: 'u-setup', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3',
  participants: [LEAD, MIRIAM, AISHA],
  checkIns: CHECK_INS,
  report: {
    releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'Both have checked in.', agreements: [],
    divergences: [{ topic: 'Whether a price range counts as a budget', positions: [
      { participantLabel: 'Participant A', view: 'A range is a budget.' },
      { participantLabel: 'Participant Z', view: 'Only a figure is a budget.' },
    ] }], centralQuestion: null,
    engagement: {}, findings: [],
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
  },
  objectives: [
    { id: 'o-team', name: 'Sales', target: 25, count: 21, prevCount: 20, ownerParticipantId: null, sortOrder: 0,
      assumes: ['6 reps each close about 4 sales.', 'Stock arrives within a week of an order.'],
      createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-10T09:00:00Z') },
    { id: 'o-aisha', name: 'Aisha’s sales', target: 5, count: 4, prevCount: 4, ownerParticipantId: 'p-aisha', sortOrder: 1,
      assumes: ['Aisha keeps her two supermarket buyers.'],
      createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') },
  ],
  dependencies: [],
  poll: null,
};

const WRITES = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];

function boardFor(requestingUserId: string, viewerRole = 'MEMBER', opts: { mayWordNewLines?: boolean } = {}, theGround: any = GROUND) {
  const writes: string[] = [];
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (name: string, own: Record<string, any> = {}) => new Proxy({ ...reads, ...own }, {
    get(target: any, prop: string) {
      if (WRITES.includes(prop)) return jest.fn(async () => { writes.push(`${name}.${prop}`); return {}; });
      return target[prop];
    },
  });
  const prisma: any = new Proxy({
    ground: model('ground', { findUnique: jest.fn(async () => JSON.parse(JSON.stringify(theGround))) }),
    user: model('user', {
      findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })),
      findMany: jest.fn(async () => [{ id: 'u-juma', firstName: 'Juma', lastName: 'Mwangi' }]),
    }),
    /* Everyone here is a member of the organisation, so nobody reads as a guest from outside (decision 93, row 4). */
    organizationMembership: model('organizationMembership', { findUnique: jest.fn(async () => ({ role: viewerRole === 'ADMIN' ? 'ADMIN' : 'MEMBER' })) }),
    membershipRequest: model('membershipRequest', {
      findMany: jest.fn(async () => [{ userId: 'u-faraji', status: 'DECLINED', decidedByUserId: 'u-juma', decidedAt: new Date('2026-09-29T10:00:00Z') }]),
    }),
    checkIn: model('checkIn', { findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    groundDocument: model('groundDocument', {
      findMany: jest.fn(async () => [{ createdAt: new Date('2026-09-21T09:00:00Z') }]),
    }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model(prop);
      return target[prop];
    },
  });
  const respond = jest.fn(async () => null);
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma, { respond } as any, { getSessionProgress: async () => null } as any, reports);
  return { board: svc.get('g-sales', requestingUserId, undefined, opts) as Promise<any>, writes, respond, prisma };
}



const FARAJI = {
  id: 'p-faraji', userId: 'u-faraji', partyType: PartyType.PARTICIPANT, email: 'f@baridi.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Faraji', lastName: 'Odhiambo', awaitingOrgApproval: true },
};
const withFaraji = { ...GROUND, participants: [...GROUND.participants, FARAJI] };

describe.each([[true, 'people see each other'], [false, 'people see only themselves']])('somebody the organisation did not let in (%s, %s)', (peers) => {
  const g = { ...withFaraji, peersVisibleToEachOther: peers, peopleWorkTogether: peers };
  const farajiRow = (b: any) => (b.eachPerson ?? []).find((r: any) => r.participantId === 'p-faraji');

  it('the lead reads what happened, and is not asked to chase him', async () => {
    const b = await boardFor('u-wairimu', 'MEMBER', {}, g).board;
    const row = farajiRow(b);
    expect(row.says).toBe('Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask.');
    expect(row.ask).toBeNull();
    expect(row.notLetIn).toBe(true);
    expect(row.notLetInBy).toBe('Juma Mwangi');
    expect(JSON.stringify(b)).not.toContain('Ask Faraji Odhiambo to check in');
    expect(JSON.stringify(b)).not.toMatch(/Faraji Odhiambo has not checked in/);
  });

  it('the admin who set it up reads the same', async () => {
    const b = await boardFor('u-setup', 'ADMIN', {}, g).board;
    expect(farajiRow(b).says).toBe('Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask.');
    expect(farajiRow(b).ask).toBeNull();
  });

  it('a participant is served no row about him and no decider name', async () => {
    const b = await boardFor('u-miriam', 'MEMBER', {}, g).board;
    expect(farajiRow(b)).toBeUndefined();
    expect(JSON.stringify(b)).not.toContain('Juma Mwangi');
    expect(JSON.stringify(b)).not.toContain('not let in');
  });

  it('somebody who simply has not answered is still asked to check in', async () => {
    const plain = { ...g, participants: [...GROUND.participants, { ...FARAJI, user: { firstName: 'Faraji', lastName: 'Odhiambo' } }] };
    const b = await boardFor('u-wairimu', 'MEMBER', {}, plain).board;
    expect(farajiRow(b).ask).toBe('Ask Faraji Odhiambo to check in.');
    expect(farajiRow(b).notLetIn).toBe(false);
  });
});

/*
 * DECISION 77 (2 October 2026): "A person an admin hasn't let in yet is left out of both the 'N of M have
 * answered' count and the count that decides when a session closes. They are shown separately as waiting
 * to be let in." Miriam and Aisha have answered session 1; Faraji has not been let in.
 */
describe('decision 77 on the board: Faraji is not counted, and is said apart', () => {
  const STILL_WAITING = { findMany: jest.fn(async () => []) };
  const pending = (b: { prisma: any }) => { b.prisma.membershipRequest = STILL_WAITING; return b; };

  it.each([['the lead', 'u-wairimu', 'MEMBER'], ['the admin who set it up', 'u-setup', 'ADMIN'], ['an admin', 'u-other-admin', 'ADMIN'], ['Miriam, who checks in', 'u-miriam', 'MEMBER']])(
    '%s reads 2 of 2 answered this round (Wairimu, the lead, has not checked in, so is not counted), not 2 of 3',
    async (_who, userId, role) => {
      const b = await boardFor(userId, role, {}, withFaraji).board;
      expect(b.howItIsGoing.glance.progress.answeredThisRound).toBe(2);
      /* Change 5: the lead is counted only once she checks in. */
      expect(b.howItIsGoing.glance.progress.ofPeople).toBe(2);
      expect(b.howItIsGoing.glance.progress.waitingOn).not.toContain('p-faraji');
    },
  );

  it.each([['the lead', 'u-wairimu', 'MEMBER'], ['the admin who set it up', 'u-setup', 'ADMIN'], ['an admin', 'u-other-admin', 'ADMIN']])(
    'still waiting for an admin, %s reads "Faraji Odhiambo is waiting to be let in."',
    async (_who, userId, role) => {
      const h = boardFor(userId, role, {}, withFaraji);
      pending(h);
      expect((await h.board).waitingToBeLetIn).toBe('Faraji Odhiambo is waiting to be let in.');
    },
  );

  /* Changed by decision 93, row 4. This pinned "Miriam reads nothing about it", the restriction Hafsah removed. */
  it('still waiting, Miriam reads that Faraji is waiting where people see each other, and a count where they see only themselves', async () => {
    const seen = boardFor('u-miriam', 'MEMBER', {}, withFaraji);
    pending(seen);
    expect((await seen.board).waitingToBeLetIn).toBe('Faraji Odhiambo is waiting to be let in.');
    const hidden = boardFor('u-miriam', 'MEMBER', {}, { ...withFaraji, peersVisibleToEachOther: false, peopleWorkTogether: false });
    pending(hidden);
    const b = await hidden.board;
    expect(b.waitingToBeLetIn).toBe('1 person is waiting to be let in.');
    expect(JSON.stringify(b)).not.toContain('Faraji');
  });

  it('a guest from another organisation, still waiting, reads nothing about who is let in', async () => {
    const guest = boardFor('u-miriam', 'MEMBER', {}, withFaraji);
    pending(guest);
    guest.prisma.organizationMembership = { findUnique: jest.fn(async () => ({ role: 'GUEST' })) };
    const b = await guest.board;
    expect(b.waitingToBeLetIn ?? null).toBeNull();
    expect(JSON.stringify(b)).not.toContain('let in');
  });

  it('declined by an admin, the lead and the admins read "Faraji Odhiambo was not let in." and Miriam reads nothing about him', async () => {
    expect((await boardFor('u-wairimu', 'MEMBER', {}, withFaraji).board).waitingToBeLetIn).toBe('Faraji Odhiambo was not let in.');
    expect((await boardFor('u-setup', 'ADMIN', {}, withFaraji).board).waitingToBeLetIn).toBe('Faraji Odhiambo was not let in.');
    const b = await boardFor('u-miriam', 'MEMBER', {}, withFaraji).board;
    expect(b.waitingToBeLetIn ?? null).toBeNull();
    expect(JSON.stringify(b)).not.toContain('not let in');
  });

  it('once he is let in, he is counted again: 2 of 3 (the lead is not counted until she checks in), and nobody is told he is waiting', async () => {
    const letIn = { ...withFaraji, participants: [...GROUND.participants, { ...FARAJI, user: { firstName: 'Faraji', lastName: 'Odhiambo', awaitingOrgApproval: false } }] };
    const b = await boardFor('u-wairimu', 'MEMBER', {}, letIn).board;
    expect(b.howItIsGoing.glance.progress.answeredThisRound).toBe(2);
    expect(b.howItIsGoing.glance.progress.ofPeople).toBe(3);
    expect(b.howItIsGoing.glance.progress.waitingOn).toContain('p-faraji');
    expect(b.waitingToBeLetIn).toBeNull();
  });
});
