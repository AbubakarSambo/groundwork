import { theCountAsServed, theClocksSessionIn } from './the-count-as-served';
import { theSessionAndItsCount } from './this-sessions-count';

/*
 * THE ONE COUNT, AS EACH READER IS SERVED IT (F1 part 2, 3 November 2026). One shape, `theCount`, in place of `thisSession` beside
 * `answeredBySession`. Grace runs the check-in; Kevin and Mercy answer; Mercy has checked in for session 1 and Kevin has not.
 */
const NOW = new Date('2026-10-20T10:00:00Z');
const people = [
  { id: 'p-grace', userId: 'u-grace', partyType: 'INITIATOR', managingOnly: true, joinedAt: '2026-10-01', user: { firstName: 'Grace' } },
  { id: 'p-kevin', userId: 'u-kevin', partyType: 'PARTICIPANT', joinedAt: '2026-10-01', user: { firstName: 'Kevin' } },
  { id: 'p-mercy', userId: 'u-mercy', partyType: 'PARTICIPANT', joinedAt: '2026-10-01', user: { firstName: 'Mercy' } },
];
const rows = [
  { id: 'c1', participantId: 'p-kevin', sessionNumber: 1, status: 'IN_PROGRESS', availableFrom: '2026-10-19T05:00:00Z' },
  { id: 'c2', participantId: 'p-mercy', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-10-19T09:00:00Z', availableFrom: '2026-10-19T05:00:00Z', turns: [{ id: 't' }] },
];
const counted = theSessionAndItsCount({ participants: people, checkIns: rows, scenario: 'OKR_ALIGNMENT', timelineDays: 84, cadence: 'WEEKLY' }, { now: NOW, names: { readerUserId: 'u-grace' } });

describe('the one count, as each reader is served it', () => {
  it('Grace, who runs it, is served every session and the clock\'s session said, and the sentence and the numbers are one count', () => {
    const c = theCountAsServed({ session: counted.clock.currentSession, said: counted.count }, counted.bySession, { onlyThese: null });
    expect(c.session).toBe(1);
    expect(theClocksSessionIn(c)).toMatchObject({ onTheCheckIn: ['p-kevin', 'p-mercy'], answered: ['p-mercy'] });
    expect(c.said?.says).toBe(counted.count.says);
    expect(counted.count.answered).toBe(theClocksSessionIn(c)!.answered.length);
    expect(counted.count.ofPeople).toBe(theClocksSessionIn(c)!.onTheCheckIn.length);
  });

  it('Kevin, where people do not see each other, is served his own row and no sentence about anybody', () => {
    const c = theCountAsServed({ session: counted.clock.currentSession, said: counted.count }, counted.bySession, { onlyThese: new Set(['p-kevin']) });
    expect(c.said).toBeNull();
    expect(theClocksSessionIn(c)).toMatchObject({ onTheCheckIn: ['p-kevin'], answered: [] });
    expect(JSON.stringify(c)).not.toMatch(/p-mercy|Mercy/);
  });

  it('nobody\'s leave is in it, for any reader', () => {
    const c = theCountAsServed({ session: counted.clock.currentSession, said: counted.count }, counted.bySession, { onlyThese: null });
    expect(JSON.stringify(c)).not.toMatch(/away|awayUntil|leave/i);
  });
});
