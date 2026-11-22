import { theirDay, twoMissedDaysSaid, type ASessionOnRecord } from './who-answers-and-when';
import { A_SESSION_OF_THEIRS } from '../grounds/the-sessions-done';

/**
 * THE LEAD'S MORNING, ON A WEEKLY CHECK-IN, FROM THE RECORD AS THE RELEASE TEST LEFT IT (21 November 2026, bugs 85 and 87).
 *
 * 87: Wairimu read every morning "Your team: Amani hasn't checked in for 2 days, on Sunday 22 November and Monday 23 November, so call
 * Amani." about a weekly check-in Amani had answered on Saturday. 85: Baraka read "Kito hasn't checked in the last 5 times the check-in
 * opened" while his board said Kito had checked in: Kito's earlier check-ins were finished without a typed answer, and the morning
 * counted typed answers while the board counted finished check-ins.
 *
 * The morning reads only the rows that are a person's sessions (A_SESSION_OF_THEIRS: a clarification or a correction is not a check-in
 * opened), answered by the one rule the board's count reads (a finished check-in is answered unless the clock closed it with nothing
 * from them), and says a weekly check-in's misses as times it opened, never days.
 */
const ZONE = 'Africa/Nairobi';
const TUESDAY = new Date('2026-11-24T06:00:00Z');
const at = (s: string) => new Date(s);
const base = { participantId: 'amani', opensDaily: false, workingDays: [1, 2, 3, 4, 5], isSetup: false, isSelfCorrection: false, isClarification: false, isPostSignOff: false, optional: false };
const said = (when: string) => [{ id: `t-${when}`, createdAt: at(when) }];

/* The rows the database hands the morning: only those matching the one query of a person's sessions. */
const asQueried = (rows: any[]) => rows.filter((r) => Object.entries(A_SESSION_OF_THEIRS).every(([k, v]) => (r[k] ?? false) === v));

describe('the lead’s morning on a weekly check-in', () => {
  it('a clarification and a correction on Sunday and Monday are not check-ins she missed (87)', () => {
    const rows = [
      { ...base, sessionNumber: 1, status: 'COMPLETED', availableFrom: at('2026-11-14T05:00:00Z'), completedAt: at('2026-11-14T09:00:00Z'), turns: said('2026-11-14T08:00:00Z') },
      { ...base, sessionNumber: 2, status: 'COMPLETED', availableFrom: at('2026-11-21T05:00:00Z'), completedAt: at('2026-11-21T19:00:00Z'), turns: said('2026-11-21T18:00:00Z') },
      { ...base, sessionNumber: 2, isClarification: true, status: 'NOT_STARTED', availableFrom: at('2026-11-22T06:00:00Z'), turns: [] },
      { ...base, sessionNumber: 2, isSelfCorrection: true, status: 'IN_PROGRESS', availableFrom: at('2026-11-23T06:00:00Z'), turns: [] },
      { ...base, sessionNumber: 3, status: 'NOT_STARTED', availableFrom: at('2026-11-28T05:00:00Z'), turns: [] },
    ];
    const day = theirDay('amani', asQueried(rows) as ASessionOnRecord[], TUESDAY, ZONE);
    expect(day.missedDays).toEqual([]);
    expect(twoMissedDaysSaid('Amani', day, [1, 2, 3, 4, 5])).toBeNull();
  });

  it('two sessions of a weekly check-in that opened on Sunday and Monday and went unanswered are two times it opened, not "2 days" (87)', () => {
    const rows = [
      { ...base, sessionNumber: 3, status: 'COMPLETED', availableFrom: at('2026-11-21T05:00:00Z'), completedAt: at('2026-11-21T20:39:00Z'), turns: said('2026-11-21T20:00:00Z') },
      { ...base, sessionNumber: 4, status: 'COMPLETED', closedReason: 'auto_closed', availableFrom: at('2026-11-21T21:12:00Z'), completedAt: at('2026-11-22T09:30:00Z'), turns: [] },
      { ...base, sessionNumber: 5, status: 'NOT_STARTED', availableFrom: at('2026-11-23T05:00:00Z'), turns: [] },
    ];
    const day = theirDay('amani', asQueried(rows) as ASessionOnRecord[], TUESDAY, ZONE);
    expect(twoMissedDaysSaid('Amani', day, [1, 2, 3, 4, 5])).toBe('Amani hasn\'t checked in the last 2 times the check-in opened, on Sunday 22 November and Monday 23 November, so call Amani.');
  });

  it('check-ins finished without a typed answer are check-ins made, as the board counts them, so nobody is told to call Kito (85)', () => {
    const kito = (n: number, d: string) => ({ ...base, participantId: 'kito', sessionNumber: n, status: 'COMPLETED', closedReason: null, availableFrom: at(`${d}T05:00:00Z`), completedAt: at(`${d}T09:00:00Z`), turns: [] });
    const rows = [kito(1, '2026-10-24'), kito(2, '2026-10-31'), kito(3, '2026-11-07'), kito(4, '2026-11-14'), kito(5, '2026-11-21')];
    const day = theirDay('kito', asQueried(rows) as ASessionOnRecord[], TUESDAY, ZONE);
    expect(day.missedDays).toEqual([]);
    expect(day.lastCheckedIn).toBe('2026-11-21');
    expect(twoMissedDaysSaid('Kito', day, [1, 2, 3, 4, 5])).toBeNull();
  });

  it('a weekly check-in missed two weeks running is said as the times it opened, on a team that works every weekday', () => {
    const rows = [
      { ...base, sessionNumber: 1, status: 'COMPLETED', availableFrom: at('2026-11-02T05:00:00Z'), completedAt: at('2026-11-02T09:00:00Z'), turns: said('2026-11-02T08:00:00Z') },
      { ...base, sessionNumber: 2, status: 'COMPLETED', closedReason: 'auto_closed', availableFrom: at('2026-11-09T05:00:00Z'), completedAt: at('2026-11-10T05:00:00Z'), turns: [] },
      { ...base, sessionNumber: 3, status: 'COMPLETED', closedReason: 'auto_closed', availableFrom: at('2026-11-16T05:00:00Z'), completedAt: at('2026-11-17T05:00:00Z'), turns: [] },
    ];
    const day = theirDay('amani', asQueried(rows) as ASessionOnRecord[], TUESDAY, ZONE);
    expect(twoMissedDaysSaid('Amani', day, [1, 2, 3, 4, 5])).toBe('Amani hasn\'t checked in the last 2 times the check-in opened, on Monday 9 November and Monday 16 November, so call Amani.');
  });
});
