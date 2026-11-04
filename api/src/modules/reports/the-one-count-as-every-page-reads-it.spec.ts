import { whoHasAnswered, forThesePeople, whoHasAnsweredInEachSession } from './how-many-have-answered';
import { theRoundAsServed } from '../suites/who-is-away';

/**
 * WHO HAS ANSWERED, COUNTED IN ONE PLACE (Hafsah, 1 November 2026). The check-in page kept its own copy of this rule in the browser
 * (client/src/lib/who-is-in-this-round.ts) and its own tests; the copy is gone, and its cases are checked here, on the one function every
 * page now reads, served as `answeredBySession`. One rule changed, by Hafsah's approval: somebody invited who has not joined is counted,
 * as the prototype counts ("5 of 6 have checked in today; Omar hasn't yet"), and named as not joined.
 */
const answered = (n: number) => [{ status: 'COMPLETED', sessionNumber: n }];

describe('the one count: somebody not let in yet is left out (decision 77)', () => {
  it('"4 of 5", never "4 of 6", with one person held at the door', () => {
    const people = ['rukia', 'baraka', 'amani', 'neema'].map((id) => ({ id, userId: `u-${id}`, checkIns: answered(1) }));
    const c = whoHasAnswered([...people, { id: 'colleague', userId: 'u-c', checkIns: [] }, { id: 'faraji', userId: 'u-f', notLetIn: true, checkIns: [] }], 1, 'OKR_ALIGNMENT');
    expect([c.answered.length, c.onTheCheckIn.length]).toEqual([4, 5]);
    expect(c.notLetIn).toEqual(['faraji']);
  });
});

describe('the one count: the lead is in a round only when she answered it (decision 133)', () => {
  const people = (lead: unknown[]) => [
    { id: 'wairimu', userId: 'u-w', partyType: 'INITIATOR', checkIns: lead },
    { id: 'brian', userId: 'u-b', partyType: 'PARTICIPANT', checkIns: answered(3) },
    { id: 'aisha', userId: 'u-a', partyType: 'PARTICIPANT', checkIns: [] },
  ];
  it('leaves Wairimu out of round 3 when she did not check in, so the count reads "1 of 2"', () => {
    expect(whoHasAnswered(people([]) as any, 3, 'GOAL_ALIGNMENT')).toMatchObject({ onTheCheckIn: ['brian', 'aisha'], answered: ['brian'], notYet: ['aisha'] });
  });
  it('counts her in round 3 when she checked in that round', () => {
    expect(whoHasAnswered(people(answered(3)) as any, 3, 'GOAL_ALIGNMENT').onTheCheckIn).toEqual(['wairimu', 'brian', 'aisha']);
  });
  it('never counts the anchor\'s managing lead, whose set-up is not an answer', () => {
    expect(whoHasAnswered([{ id: 'grace', partyType: 'INITIATOR', managingOnly: true, checkIns: answered(1) }, { id: 'amani', userId: 'u-a', checkIns: [] }] as any, 1, 'HELP_TEAM_UNDERSTAND').onTheCheckIn).toEqual(['amani']);
  });
});

describe('the one count: everyone on the check-in, as the prototype counts (Hafsah, 1 November 2026)', () => {
  it('counts Amina, invited and not joined, names her as not joined, and never as missing an answer the page says she owes', () => {
    const c = whoHasAnswered([
      { id: 'amina', notJoinedYet: true, checkIns: [] },
      { id: 'jared', userId: 'u-j', checkIns: [] },
      { id: 'hassan', userId: 'u-h', checkIns: answered(4) },
    ] as any, 4, null);
    expect(c).toMatchObject({ onTheCheckIn: ['amina', 'jared', 'hassan'], answered: ['hassan'], notJoined: ['amina'] });
  });
});

describe('the one count, as each reader is served it', () => {
  it('a reader who may see only their own row is served only their own row\'s count', () => {
    const all = { 3: whoHasAnswered([{ id: 'me', userId: 'u', checkIns: answered(3) }, { id: 'them', userId: 'v', checkIns: [] }] as any, 3) };
    expect(forThesePeople(all, new Set(['me']))[3]).toMatchObject({ onTheCheckIn: ['me'], answered: ['me'], notYet: [] });
  });

  it('every session so far and the next are served, from one read', async () => {
    const prisma = {
      ground: { findUnique: jest.fn(async () => ({ scenario: null })) },
      groundParticipant: { findMany: jest.fn(async () => [
        { id: 'a', userId: 'ua', partyType: 'PARTICIPANT', checkIns: [{ status: 'COMPLETED', sessionNumber: 1 }, { status: 'COMPLETED', sessionNumber: 2 }] },
        { id: 'b', userId: 'ub', partyType: 'PARTICIPANT', checkIns: [{ status: 'COMPLETED', sessionNumber: 1 }, { status: 'NOT_STARTED', sessionNumber: 2 }] },
      ]) },
    };
    const each = await whoHasAnsweredInEachSession(prisma, 'g');
    expect(Object.keys(each)).toEqual(['1', '2', '3']);
    expect(each[2]).toMatchObject({ onTheCheckIn: ['a', 'b'], answered: ['a'], notYet: ['b'] });
  });
});

/*
 * NOBODY'S LEAVE RIDES ON THE SERVED COUNT (2 November 2026). The count went out with `away` and Amani's last day of leave to every
 * reader, a guest from another organisation included (a-guest-is-not-told-anybodys-leave.spec.ts). Somebody on leave is simply not
 * counted, with no reason given; who is away is served once, shaped for each reader, and the report serves the round the same way.
 */
describe('the one count, as a guest and the lead are served it while somebody is on leave', () => {
  const NOW = new Date('2026-10-01T09:00:00Z');
  beforeAll(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(NOW); });
  afterAll(() => jest.useRealTimers());
  const roles: Record<string, string> = { uWairimu: 'LEAD', uChidi: 'MEMBER', uPeter: 'GUEST' };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ scenario: 'OKR_ALIGNMENT' })) },
    groundParticipant: { findMany: jest.fn(async () => [
      { id: 'pA', userId: 'uAmani', partyType: 'PARTICIPANT', ground: { organizationId: 'baridi' }, checkIns: [] },
      { id: 'pC', userId: 'uChidi', partyType: 'PARTICIPANT', ground: { organizationId: 'baridi' }, checkIns: [] },
      { id: 'pP', userId: 'uPeter', partyType: 'PARTICIPANT', ground: { organizationId: 'baridi' }, checkIns: [] },
    ]) },
    leaveRequest: { findMany: async () => [{ userId: 'uAmani', organizationId: 'baridi', startsOn: new Date('2026-09-29T00:00:00Z'), endsOn: new Date('2026-10-02T00:00:00Z') }] },
    organizationMembership: { findUnique: async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null) },
  };

  it('the served count leaves Amani out without saying why, for everybody', async () => {
    const each = await whoHasAnsweredInEachSession(prisma, 'g1');
    expect(each[1]).toEqual({ sessionNumber: 1, onTheCheckIn: ['pC', 'pP'], answered: [], notYet: ['pC', 'pP'], notJoined: [], declined: [], notLetIn: [] });
    expect(JSON.stringify(each)).not.toMatch(/2026-10-02|away/);
  });

  it('the round the report serves: Peter, a guest, reads no dates; Wairimu, the lead, reads Amani\'s', async () => {
    const round = { sessionNumber: 1, total: 2, completed: 0, missingParticipantIds: ['pC', 'pP'], declinedParticipantIds: [], awayUntil: { pA: '2026-10-02' } };
    const peter = await theRoundAsServed(prisma, round, { userId: 'uPeter', organizationId: 'baridi', myParticipantId: 'pP' });
    expect(peter).toMatchObject({ awayUntil: {}, requestingUserIsMissing: true });
    expect(JSON.stringify(peter)).not.toMatch(/2026-10-02/);
    expect(await theRoundAsServed(prisma, round, { userId: 'uWairimu', organizationId: 'baridi', myParticipantId: null })).toMatchObject({ awayUntil: { pA: '2026-10-02' }, requestingUserIsMissing: false });
    expect((await theRoundAsServed(prisma, round, { userId: 'uChidi', organizationId: 'baridi', myParticipantId: 'pC' }))?.awayUntil).toEqual({ pA: '2026-10-02' });
  });
});
