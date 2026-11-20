import { aRoundCouldHaveBeenAnswered, whenACheckInBegan } from './a-round-that-could-be-answered';
import { theirDay, twoMissedDaysSaid } from '../engagement/who-answers-and-when';
import { theirClosedSessions } from './missed-check-ins';

/* Run 6, 20 November. Msingi's rounds of 3, 10 and 17 November opened before anybody had said anything in the check-in; Amani then answered every week,
   and his lead still read "so call Amani". A round inside a pause was counted as missed by the weekly letter and by Today. */
const D = (s: string) => new Date(`${s}T08:00:00Z`);
const quiet = (n: number, day: string, who = 'amani') => ({ participantId: who, sessionNumber: n, status: 'COMPLETED', availableFrom: D(day), createdAt: D(day), completedAt: D(day), closedReason: null, turns: [] as any[] });
const said = (n: number, day: string, answeredOn: string, who = 'amani') => ({ ...quiet(n, day, who), completedAt: D(answeredOn), turns: [{ createdAt: D(answeredOn) }] });

describe('a round that could have been answered', () => {
  it('is not one that opened before anybody had said anything, before the person joined, or in a pause', () => {
    expect(aRoundCouldHaveBeenAnswered(D('2026-11-03'), { checkInBeganAt: D('2026-11-26') })).toBe(false);
    expect(aRoundCouldHaveBeenAnswered(D('2026-12-01'), { checkInBeganAt: D('2026-11-26') })).toBe(true);
    expect(aRoundCouldHaveBeenAnswered(D('2026-11-03'), { joinedAt: D('2026-11-10') })).toBe(false);
    expect(aRoundCouldHaveBeenAnswered(D('2027-01-29'), { pausedFrom: D('2027-01-19') })).toBe(false);
    expect(aRoundCouldHaveBeenAnswered(D('2027-01-12'), { pausedFrom: D('2027-01-19') })).toBe(true);
  });

  it('knows a check-in began when the first person said something in it', () => {
    expect(whenACheckInBegan([quiet(1, '2026-11-03'), said(4, '2026-11-24', '2026-11-26')])?.toISOString()).toBe(D('2026-11-26').toISOString());
    expect(whenACheckInBegan([quiet(1, '2026-11-03')])).toBeNull();
  });

  it('does not tell the lead to call somebody for rounds from before the check-in began', () => {
    const all = [quiet(1, '2026-11-03'), quiet(2, '2026-11-10'), quiet(3, '2026-11-17'), { ...quiet(1, '2026-11-03', 'zawadi') }, said(4, '2026-11-24', '2026-11-26', 'zawadi')];
    const day = theirDay('amani', all as any, D('2026-11-25'), 'Africa/Nairobi');
    expect(day.missedDays).toEqual([]);
    expect(twoMissedDaysSaid('Amani', day, null)).toBeNull();
  });

  it('still tells the lead when somebody missed rounds after the check-in began', () => {
    const all = [said(4, '2026-11-24', '2026-11-26', 'zawadi'), quiet(5, '2026-12-01', 'zawadi'), said(5, '2026-12-01', '2026-12-02'), quiet(4, '2026-11-24'), quiet(5, '2026-12-01'), quiet(6, '2026-12-08')]
      .filter((c) => !(c.participantId === 'amani' && c.turns.length));
    const day = theirDay('amani', all as any, D('2026-12-15'), 'Africa/Nairobi');
    /* Nov 24 opened a day before the first answer, inside the one day of grace the first round gets, so only 1 December and 8 December count. */
    expect(day.missedDays).toEqual(["2026-12-01", "2026-12-08"]);
  });

  it('leaves a round in a pause out of the weekly letter\'s count', () => {
    const rows = [{ ...said(10, '2027-01-05', '2027-01-06'), sessionNumber: 10 }, { ...quiet(11, '2027-01-29'), sessionNumber: 11, closedReason: 'auto_closed' }];
    const now = D('2027-02-15');
    const without = theirClosedSessions(rows as any, [], now, { theClocksSession: 12 });
    const inPause = theirClosedSessions(rows as any, [], now, { theClocksSession: 12, pausedFrom: D('2027-01-19') });
    expect(without.filter((c) => c.missed).length).toBe(1);
    expect(inPause.filter((c) => c.missed).length).toBe(0);
  });
});
