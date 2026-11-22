import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
import { whoGroundworkCouldNotMove } from '../board/what-the-lead-reads-about-each-person';
import { aRoundIsCounted } from './a-round-that-could-be-answered';
import { whatNeedsYou } from './what-needs-you';
import { theSessionAndItsCount } from './this-sessions-count';
import { whatThePersonIsToldAboutMissing } from './missed-check-ins';
import { whatTheLeadShouldKnow } from '../board/whose-number-is-whose-business';
import { thePeriodOfARound } from '../conversation/prompt-library';

/**
 * RUN 8 (22 November), AS PEOPLE READ IT: a proof gap is a proof gap, a round in a pause is nobody's miss, and a number given each week is a weekly number.
 */
const claim = (n: number, takenBack = false) => ({ lineId: `l${n}`, sessionNumber: n, at: '2026-12-01', on: 'Tuesday 1 December', said: 'I sold 10 to Mama Njeri.', about: null, kind: 'sale', proven: false, proof: 'nothing', proofSays: null, proofIds: [], askedForProof: true, takenBack: takenBack ? 'later' : null });
const stored = (claims: any[]) => ({
  record: { claims, promises: [], changes: [], blockers: [], focus: [], checkIns: [], summary: { checkInsDone: 9, checkInsDue: 9, checkInsOnTime: 9, checkInsSpecific: 9, notDone: 0, late: 0, keptOnTime: 0, keptLate: 0 } },
  coaching: [{ about: 'proof', said: 'Add proof.', afterSession: 2, givenOn: 'Wednesday 23 December', givenAt: '2026-12-23T09:00:00Z', before: { good: 0, of: 2 }, since: { good: 0, of: 4, sessions: [3, 4] }, outcome: 'the same', done: false }],
}) as any;

describe('a proof gap is said as a proof gap', () => {
  it('Asha, who answered every round and took nothing back, reads what is missing and what would settle it, and is not told to be called', () => {
    const says = whoGroundworkCouldNotMove(stored([1, 2, 3, 4].map((n) => claim(n))), 'Asha', 'sales')!;
    expect(says).toBe('Asha said 4 times that something was sold or signed, and nothing on file shows it. Groundwork asked for the proof and has coached Asha since Wednesday 23 December, and it has not come. A slip, a bank or M-Pesa message or a signed order for any of them would settle it.');
    expect(says).not.toMatch(/so call/);
  });
  it('Joseph, who took sales back, is still told to be called, because that is about him', () => {
    const says = whoGroundworkCouldNotMove(stored([claim(1, true), claim(2, true), claim(3)]), 'Joseph', 'sales')!;
    expect(says).toMatch(/and took 2 back later\..*so call Joseph\.$/);
  });
});

describe('a round in a pause is not a round to count', () => {
  const pausedFrom = new Date('2027-01-15T00:00:00Z');
  const quiet = { status: 'COMPLETED', closedReason: CLOSED_BY_THE_CLOCK, personTurns: 0, availableFrom: '2027-01-19T00:00:00Z' };
  it('a round the clock closed with nothing said, opened in the pause, does not count; one opened before it does', () => {
    expect(aRoundIsCounted(quiet as any, { pausedFrom })).toBe(false);
    expect(aRoundIsCounted({ ...quiet, availableFrom: '2027-01-12T00:00:00Z' } as any, { pausedFrom })).toBe(true);
  });
  it('a round the person finished always counts', () => {
    expect(aRoundIsCounted({ status: 'COMPLETED', personTurns: 3, availableFrom: '2027-01-19T00:00:00Z' } as any, { pausedFrom })).toBe(true);
  });
});

describe('Joel in a pause', () => {
  const joel = { id: 'p-joel', userId: 'u-joel', partyType: 'PARTICIPANT', joinedAt: '2026-11-18T00:00:00Z', user: { firstName: 'Joel' } };
  const lucy = { id: 'p-lucy', userId: 'u-lucy', partyType: 'INITIATOR', user: { firstName: 'Lucy' } };
  const ground: any = {
    id: 'g1', organizationId: 'o1', label: 'Sales updates', status: 'ACTIVE', initiatorId: 'u-lucy', participants: [lucy, joel], cadence: 'WEEKLY',
    /* Joel's finished eighth session is on the list, so his ninth reads as his next (theirOwnSessionNumberIn), not as somebody added late. */
    checkIns: [{ id: 'c0', participantId: 'p-joel', sessionNumber: 8, status: 'COMPLETED', availableFrom: '2027-01-12T00:00:00Z', completedAt: '2027-01-13T00:00:00Z', isSetup: false, turns: [] }, { id: 'c1', participantId: 'p-joel', sessionNumber: 9, status: 'NOT_STARTED', availableFrom: '2027-01-19T00:00:00Z', isSetup: false, turns: [] }],
    glance: { progress: { openRound: 9 } },
  };
  const now = new Date('2027-01-20T10:00:00Z');
  it('reads that check-ins are paused, and is not offered a check-in that cannot open', () => {
    const t = whatNeedsYou([ground], { userId: 'u-joel', role: 'MEMBER', organizationId: 'o1', pausedFrom: new Date('2027-01-15T00:00:00Z') } as any, [], now);
    expect(t.needs.map((n) => n.title)).toEqual(['Check-ins are paused until your organisation chooses a plan, so no check-in is open here or in the app.']);
  });
  it('is offered his check-in when the organisation is not paused', () => {
    const t = whatNeedsYou([ground], { userId: 'u-joel', role: 'MEMBER', organizationId: 'o1' } as any, [], now);
    expect(t.needs.map((n) => n.title)).toEqual(['Your next check-in for Sales updates']);
  });
  it('is not told he has missed his last check-ins in a pause', async () => {
    const prisma: any = {
      groundParticipant: { findMany: async () => [{ groundId: 'g1' }] },
      ground: { findUnique: async () => ({ label: 'Sales updates', organizationId: 'o1' }) },
    };
    expect(await whatThePersonIsToldAboutMissing(prisma, 'u-joel', 'o1', now)).toEqual([]);
  });
});

describe('the count of a round that opened in a pause', () => {
  const people = [{ id: 'p-lucy', userId: 'u-lucy', partyType: 'INITIATOR' }, { id: 'p-joel', userId: 'u-joel', partyType: 'PARTICIPANT', user: { firstName: 'Joel' } }, { id: 'p-sam', userId: 'u-sam', partyType: 'PARTICIPANT', user: { firstName: 'Sam' } }];
  const rows = ['p-joel', 'p-sam'].map((participantId, i) => ({ id: `c${i}`, participantId, sessionNumber: 10, status: 'COMPLETED', closedReason: CLOSED_BY_THE_CLOCK, availableFrom: '2027-01-19T00:00:00Z', turns: [], isSetup: false }));
  const g: any = { participants: people, checkIns: rows, scenario: null, timelineDays: null, cadence: 'WEEKLY', cadenceDays: null, runsUntilEnded: true };
  it('does not say nobody checked in or who did not before it closed', () => {
    const { count } = theSessionAndItsCount(g, { now: new Date('2027-01-27T10:00:00Z'), names: { readerUserId: 'u-lucy' }, pausedFrom: new Date('2027-01-15T00:00:00Z') });
    expect(count.says).toBe('Check-ins are paused, so nobody is being asked to check in.');
    expect(count.whoSays).toBeNull();
  });
});

describe('a target with nobody’s name on it is said by its number', () => {
  it('names which one, without repeating its words', () => {
    const targets = [{ name: 'Sell 30 lanterns', target: 30, ownerParticipantId: null }, { name: 'Sam sells 10', target: 10, ownerParticipantId: 'p-sam' }];
    expect(whatTheLeadShouldKnow(targets as any, 'their own')).toBe("One target has nobody's name on it (the target of 30), so everybody on this check-in can see it. Set whose it is to keep each person's number to them.");
  });
});

describe('what each round covers, said to the model', () => {
  it('says the period once, as context, for a check-in that repeats', () => {
    expect(thePeriodOfARound('WEEKLY', null)).toMatch(/^each round covers its own week\. A number a person gives in a round is their count for that week, so a different number in the next round is a new count for a new week: it is not a change to their target/);
    expect(thePeriodOfARound('SEQUENTIAL', null)).toBeNull();
  });
});

describe('Over time says the board’s own count of who has not answered', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { overTimeAsServed } = require('../reports/what-the-record-shows-over-time');
  const stored: any = { sessions: 3, commitments: [], dependencies: [], patterns: [], gaps: [], stillOpen: [], toSettleFirst: [], cannotTellYou: ['3 of 5 people have not answered yet, so anything about them is missing rather than absent.', 'Most of what anybody did is not in here. This is what was said in the check-ins, and nothing else.'] };
  it('reads 2 of 4 when Today and the board read 2 of 4, not the five stored with the report', () => {
    const served = overTimeAsServed(stored, { answered: 2, ofPeople: 4 });
    expect(served.cannotTellYou[0]).toBe('2 of 4 people have not answered yet, so anything about them is missing rather than absent.');
  });
  it('says nothing about who has not answered once everybody has', () => {
    expect(overTimeAsServed(stored, { answered: 4, ofPeople: 4 }).cannotTellYou).toEqual([stored.cannotTellYou[1]]);
  });
});
