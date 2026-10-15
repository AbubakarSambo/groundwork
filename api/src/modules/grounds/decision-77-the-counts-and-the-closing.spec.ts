import { recordRoundCompletion } from './round-completion';
import { GroundsService } from './grounds.service';
import { howACheckInIsGoing } from './how-a-check-in-is-going';
import { whatNeedsYou } from './what-needs-you';
import { WhatNeedsYouService } from './what-needs-you.service';
import { theWaitingToBeLetInLine, whoIsNotLetInYet } from './who-an-admin-did-not-let-in';
import { howManyHaveAnswered } from '../reports/how-many-have-answered';

/**
 * DECISION 77 (2 October 2026). In Hafsah's words: "A person an admin hasn't let in yet is left out of
 * both the 'N of M have answered' count and the count that decides when a session closes. They are
 * shown separately as waiting to be let in."
 *
 * "Sales team, Q3": Rukia runs it and checks in, Amani, Baraka and Neema check in, and Faraji Odhiambo
 * is on it but an admin has not let him in yet. All four who were let in have answered session 1.
 * Before this, the check-ins list and Today said "4 of 5", and the session never closed, because it
 * waited on a man who cannot check in.
 */

const FOUR = ['rukia', 'amani', 'baraka', 'neema'];
const NAMES: Record<string, [string, string]> = { rukia: ['Rukia', 'Otieno'], amani: ['Amani', 'Wekesa'], baraka: ['Baraka', 'Mwangi'], neema: ['Neema', 'Achieng'], faraji: ['Faraji', 'Odhiambo'] };
const person = (who: string, held = false) => ({
  id: `p-${who}`, userId: `u-${who}`, managingOnly: false, partyType: who === 'rukia' ? 'INITIATOR' : 'PARTICIPANT',
  user: { firstName: NAMES[who][0], lastName: NAMES[who][1], awaitingOrgApproval: held },
});
const people = (farajiHeld: boolean) => [...FOUR.map((w) => person(w)), person('faraji', farajiHeld)];
const sessionOne = (farajiHeld: boolean) => [
  ...FOUR.map((w) => ({ id: `c-${w}`, participantId: `p-${w}`, sessionNumber: 1, status: 'COMPLETED', isSetup: false, availableFrom: new Date('2026-09-21T09:00:00Z'), completedAt: new Date('2026-09-26T09:00:00Z') })),
  { id: 'c-faraji', participantId: 'p-faraji', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, availableFrom: new Date('2026-09-21T09:00:00Z'), completedAt: null },
].map((c) => ({ ...c, _held: farajiHeld }));

/** A database double that answers the closing rule's own queries from the people above. */
function theDatabase(farajiHeld: boolean, opts: { declined?: boolean } = {}) {
  const ps = people(farajiHeld);
  const rows = sessionOne(farajiHeld);
  const created: any[] = [];
  const answered = (where: any) => rows.filter((c) => (!where?.participantId?.in || where.participantId.in.includes(c.participantId))
    && (typeof where?.participantId !== 'string' || where.participantId === c.participantId)
    && (where?.sessionNumber === undefined || c.sessionNumber === where.sessionNumber)
    && (!where?.status?.in || where.status.in.includes(c.status))
    && (typeof where?.status !== 'string' || where.status === c.status));
  const prisma: any = {
    ground: { findUnique: async () => ({ scenario: 'OKR_ALIGNMENT' }) },
    groundParticipant: {
      findMany: async (args: any = {}) => ps.map((p) => ({ id: p.id, userId: p.userId, cameThroughTheLink: false, managingOnly: false, checkIns: answered({ ...(args?.select?.checkIns?.where ?? {}), participantId: p.id }) })),
    },
    checkIn: {
      count: async ({ where }: any) => answered(where).length,
      findMany: async ({ where }: any) => answered(where),
      findFirst: async ({ where }: any) => answered(where)[0] ?? null,
    },
    user: { findMany: async ({ where }: any) => ps.filter((p) => where.id.in.includes(p.userId) && p.user.awaitingOrgApproval).map((p) => ({ id: p.userId, awaitingOrgApproval: true })) },
    membershipRequest: { findMany: async () => (opts.declined ? [{ userId: 'u-faraji', status: 'DECLINED', decidedByUserId: 'u-juma', decidedAt: new Date() }] : [{ userId: 'u-faraji', status: 'PENDING' }]) },
    roundCompletion: { create: async (a: any) => { created.push(a.data); return a.data; } },
    groundObjective: { findMany: async () => [] },
    groundObjectiveSnapshot: { createMany: async () => ({ count: 0 }) },
    leaveRequest: { findMany: async () => [] },
  };
  return { prisma, created, ps, rows };
}

describe('decision 77: the session closes without waiting for somebody not let in', () => {
  it('closes once the four who were let in have answered, and records a round of 4', async () => {
    const { prisma, created } = theDatabase(true);
    const events: any = { emit: jest.fn() };
    await expect(recordRoundCompletion(prisma, events, 'g1', 1)).resolves.toBe(true);
    expect(created).toEqual([{ groundId: 'g1', sessionNumber: 1, participantCount: 4 }]);
  });

  it('the release rule says the session is ready for its report', async () => {
    const { prisma } = theDatabase(true);
    const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any);
    await expect(svc.isSessionReadyForReport('g1', 1)).resolves.toBe(true);
  });

  it('the same when an admin said no', async () => {
    const { prisma } = theDatabase(true, { declined: true });
    await expect(recordRoundCompletion(prisma, { emit: jest.fn() } as any, 'g1', 1)).resolves.toBe(true);
  });

  it('once he is let in, the session waits for him again', async () => {
    const { prisma, created } = theDatabase(false);
    await expect(recordRoundCompletion(prisma, { emit: jest.fn() } as any, 'g1', 1)).resolves.toBe(false);
    expect(created).toEqual([]);
    const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any);
    await expect(svc.isSessionReadyForReport('g1', 1)).resolves.toBe(false);
  });

  it('the shared count reads 4 of 4, names him as not counted, and 4 of 5 once he is let in', async () => {
    const held = await howManyHaveAnswered(theDatabase(true).prisma, 'g1', 1);
    expect([held.answered, held.expected, held.waitingOn, (held as any).notLetInIds]).toEqual([4, 4, [], ['p-faraji']]);
    const letIn = await howManyHaveAnswered(theDatabase(false).prisma, 'g1', 1);
    expect([letIn.answered, letIn.expected, letIn.waitingOn, (letIn as any).notLetInIds]).toEqual([4, 5, ['p-faraji'], []]);
  });
});

describe('decision 77: the check-ins list counts 4 of 4, and the round is done', () => {
  const going = (held: boolean) => howACheckInIsGoing({
    checkIns: sessionOne(held) as any, participants: people(held), dependencies: [], timelineDays: 84, cadence: 'WEEKLY',
    sharedPicture: null, scenario: 'OKR_ALIGNMENT', forTheList: true,
  }, new Date('2026-09-27T09:00:00Z'));

  it('with Faraji not let in: 4 of 4 answered, session 1 done', () => {
    const g = going(true).glance.progress;
    expect([g.answeredThisRound, g.ofPeople, g.waitingOn, g.roundsDone]).toEqual([4, 4, [], 1]);
  });

  it('once he is let in: 4 of 5, waiting on him, session 1 not done', () => {
    const g = going(false).glance.progress;
    expect([g.answeredThisRound, g.ofPeople, g.waitingOn, g.roundsDone]).toEqual([4, 5, ['p-faraji'], 0]);
  });
});

describe('decision 77 on Today, as Rukia', () => {
  const NOW = new Date('2026-09-27T09:00:00Z');
  const listed = (held: boolean, brianToo = false): any => {
    const ps = [...people(held), ...(brianToo ? [{ id: 'p-brian', userId: 'u-brian', managingOnly: false, user: { firstName: 'Brian', lastName: 'Kip' } }] : [])];
    const checkIns = [...sessionOne(held), ...(brianToo ? [{ id: 'c-brian', participantId: 'p-brian', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, availableFrom: new Date('2026-09-21T09:00:00Z'), completedAt: null }] : [])];
    const going = howACheckInIsGoing({ checkIns: checkIns as any, participants: ps, dependencies: [], timelineDays: 84, cadence: 'WEEKLY', sharedPicture: null, scenario: 'OKR_ALIGNMENT', forTheList: true }, NOW);
    return { id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: 'org', initiatorId: 'u-rukia', participants: ps, checkIns, glance: going.glance };
  };

  it('with Brian still to answer, reads "4 of 5" (not "4 of 6"), and names only Brian', () => {
    const r = whatNeedsYou([listed(true, true)], { userId: 'u-rukia', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line).toBe('In Sales team, Q3, 4 of 5 have checked in for the first check-in. Brian has not checked in yet.');
  });

  it('with everybody let in answered, is not told anybody is missing', () => {
    const r = whatNeedsYou([listed(true)], { userId: 'u-rukia', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line ?? '').not.toMatch(/of 5|Faraji/);
  });

  it('the service marks somebody still waiting for an admin, not only somebody declined', async () => {
    const g = listed(false, true);
    g.participants = g.participants.map((p: any) => (p.id === 'p-faraji' ? { ...p, user: { ...p.user, awaitingOrgApproval: true } } : p));
    const prisma: any = {
      /* Everybody here has come in (decision 8 redone reads that from their sign-in): only Faraji is held at the door. */
      user: { findUnique: async () => ({ awaitingOrgApproval: false }), findMany: async (a: any) => (a?.where?.awaitingOrgApproval ? [{ id: 'u-faraji', awaitingOrgApproval: true }] : (a?.where?.id?.in ?? []).map((id: string) => ({ id, passwordHash: 'set' }))) },
      membershipRequest: { findMany: async () => [] },
    };
    const svc = new WhatNeedsYouService(prisma, { list: async () => [g], listAwaitingApproval: async () => [] } as any);
    const r = await svc.forReader('u-rukia', 'rukia@example.test', 'org', 'MEMBER');
    expect(r.line).toBe('In Sales team, Q3, 4 of 5 have checked in for the first check-in. Brian has not checked in yet.');
  });
});

describe('the waiting line, in plain sentences', () => {
  it.each([
    [[{ name: 'Faraji Odhiambo', declined: false }], 'Faraji Odhiambo is waiting to be let in.'],
    [[{ name: null, declined: false }], '1 person is waiting to be let in.'],
    [[{ name: null, declined: false }, { name: null, declined: false }], '2 people are waiting to be let in.'],
    [[{ name: 'Faraji Odhiambo', declined: false }, { name: 'Zawadi Uche', declined: false }], 'Faraji Odhiambo and Zawadi Uche are waiting to be let in.'],
    [[{ name: 'Faraji Odhiambo', declined: true }], 'Faraji Odhiambo was not let in.'],
    [[{ name: 'Faraji Odhiambo', declined: false }, { name: null, declined: false }], 'Faraji Odhiambo is waiting to be let in. 1 other person is waiting to be let in.'],
    [[], null],
  ] as const)('%j reads %p', (who, says) => {
    expect(theWaitingToBeLetInLine(who as any)).toBe(says);
  });

  it('finds the hold from the database when the rows do not carry it', async () => {
    const { prisma } = theDatabase(true);
    const rows = people(true).map((p) => ({ id: p.id, userId: p.userId }));
    expect([...(await whoIsNotLetInYet(prisma, rows, 'org')).entries()]).toEqual([['p-faraji', { declined: false, decidedByUserId: null, decidedAt: null }]]);
  });
});
