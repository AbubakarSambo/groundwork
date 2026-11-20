import { theSessionAndItsCount } from './this-sessions-count';
import { howThisHasMoved } from '../reports/how-this-has-moved';
import { theirDay } from '../engagement/who-answers-and-when';
import { theCheckInLines } from '../engagement/the-direct-morning';

/**
 * Run 10 (cycle 11): rounds that opened in a pause were still counted. The board header read "Check-in 12 of 12", Today read "1 of 4 has checked in" beside "No check-ins
 * open", Over time dated a line "On 4 December", and the lead's row read "has checked in" beside "hasn't checked in since 13 January". These read what a person reads.
 */
const NOW = new Date('2027-02-15T07:00:00Z');
const PAUSED_FROM = new Date('2027-01-16T00:00:00Z');
const people = ['lucy', 'sam', 'asha'].map((id, i) => ({
  id, userId: `u-${id}`, partyType: i === 0 ? 'INITIATOR' : 'PARTICIPANT', managingOnly: false, acceptedAt: new Date('2026-11-01'), notJoinedYet: false,
  user: { firstName: id, awaitingOrgApproval: false },
}));
const row = (participantId: string, n: number, day: string, answered: boolean) => ({
  participantId, sessionNumber: n, isSetup: false, availableFrom: new Date(`${day}T07:00:00Z`), startedAt: answered ? new Date(`${day}T08:00:00Z`) : null,
  completedAt: new Date(`${day}T09:00:00Z`), status: 'COMPLETED', closedReason: answered ? null : 'auto_closed', turns: answered ? [{ id: `${participantId}${n}` }] : [],
});
const ROWS = ['sam', 'asha'].flatMap((id) => [row(id, 1, '2027-01-06', true), row(id, 2, '2027-01-13', true), row(id, 3, '2027-01-20', false), row(id, 4, '2027-01-27', false)]);
const GROUND = { scenario: 'PULSE_CHECK', timelineDays: 84, cadence: 'WEEKLY', runsUntilEnded: false, participants: people, checkIns: ROWS };

describe('the board header and Today in a pause', () => {
  it('count the last round that could be answered, never a round the pause opened', () => {
    const { clock } = theSessionAndItsCount(GROUND as any, { now: NOW, pausedFrom: PAUSED_FROM });
    expect(clock.currentSession).toBe(2);
    expect(clock.says).toBe('Check-in 2 of 12.');
    expect(theSessionAndItsCount(GROUND as any, { now: NOW }).clock.currentSession).toBe(4);
  });
  it('say that check-ins are paused, with no "n of 4", while paused', () => {
    const { count, bySession } = theSessionAndItsCount(GROUND as any, { now: NOW, pausedFrom: PAUSED_FROM, names: { readerUserId: 'u-lucy' } });
    expect(count.says).toBe('Check-ins are paused, so nobody is being asked to check in.');
    expect(count.whoSays).toBeNull();
    /* The next round is served too (as ever), but the round the pause opened with rows is not. */
    expect(Object.keys(bySession).map(Number)).not.toContain(4);
  });
});

describe('Over time', () => {
  it('dates a round by its check-in number, never "On 4 December", a day that is no round’s', () => {
    const moved = howThisHasMoved([{ round: 3, sharedPicture: 'Sales are slow. Nobody is sure why.', divergences: [], takenAt: '2026-12-04T09:00:00Z' }]);
    expect(moved[0].sessionNumber).toBe(3);
  });
});

describe('the lead’s row about a person in a pause', () => {
  it('says nothing about a check-in not made, so it never sits beside "has checked in"', () => {
    const sessions = ROWS.filter((r) => r.participantId === 'asha').map((r) => ({ ...r, pausedFrom: PAUSED_FROM, opensDaily: false }));
    const day = theirDay('asha', sessions as any, NOW, 'Africa/Nairobi');
    expect(day.paused).toBe(true);
    const lines = theCheckInLines('asha', 'Asha', day, { asha: new Date('2027-01-13T09:00:00Z') }, { asha: new Date('2027-01-06T07:00:00Z') }, '2027-02-15', '2027-02-12', null, 'Africa/Nairobi');
    expect(lines).toEqual([]);
  });
});
