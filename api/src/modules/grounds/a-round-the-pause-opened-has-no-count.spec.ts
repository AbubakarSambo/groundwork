import { sessionsAPauseOpened } from './a-round-that-could-be-answered';
import { eachSessionsServedCount } from '../reports/how-many-have-answered';

/** Run 9: the Reports list read "0 of 3 checked in" for two check-ins that opened in the pause. */
describe('a round the pause opened', () => {
  const pausedFrom = '2027-01-14T00:00:00Z';
  const rows = [
    { sessionNumber: 9, availableFrom: '2027-01-13T07:00:00Z' },
    { sessionNumber: 10, availableFrom: '2027-01-20T07:00:00Z' },
    { sessionNumber: 11, availableFrom: '2027-01-27T07:00:00Z' },
  ];
  it('is told apart from one that opened before it', () => {
    expect([...sessionsAPauseOpened(rows, pausedFrom)]).toEqual([10, 11]);
    expect(sessionsAPauseOpened(rows, null).size).toBe(0);
  });
  it('has no "0 of 3 checked in" in the count of every session', () => {
    const people = ['a', 'b', 'c'].map((id) => ({ id, partyType: 'PARTICIPANT', checkIns: rows.map((r) => ({ ...r, status: 'NOT_STARTED' })) }));
    const counted = eachSessionsServedCount(people as any, null, 0, pausedFrom);
    const listed = Object.keys(counted).map(Number);
    expect(listed).toContain(9);
    expect(listed).not.toContain(10);
    expect(listed).not.toContain(11);
    expect(Object.keys(eachSessionsServedCount(people as any, null, 0)).map(Number)).toContain(10);
  });
});
