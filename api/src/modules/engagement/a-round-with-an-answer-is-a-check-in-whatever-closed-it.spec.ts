import { theirDay, twoMissedDaysSaid, type ASessionOnRecord } from './who-answers-and-when';

/**
 * Run 4 (18 November): Joel and Asha answered every weekly round with a number, but the system closed each round after the last
 * question went unanswered, and the lead read "Asha hasn't checked in for 2 weeks, so call Asha." One owner of "checked in": they said
 * something in the round, whatever closed it (board/a-day-they-checked-in.ts).
 */
const monday = (n: number) => new Date(Date.UTC(2026, 9, 5 + 7 * n, 8, 0, 0));
const round = (n: number, said: boolean): ASessionOnRecord => ({
  participantId: 'asha', sessionNumber: n + 1, status: 'COMPLETED', closedReason: 'auto_closed',
  availableFrom: monday(n), createdAt: monday(n), completedAt: new Date(monday(n).getTime() + 26 * 3_600_000),
  turns: said ? [{ id: `t${n}`, createdAt: new Date(monday(n).getTime() + 3_600_000) }] : [],
  opensDaily: false, workingDays: [1, 2, 3, 4, 5],
});
const now = new Date(Date.UTC(2026, 9, 27, 9, 0, 0));

describe('a round with answers is a check-in, whatever closed it', () => {
  it('does not tell the lead to call somebody who gave a number every week', () => {
    const day = theirDay('asha', [round(0, true), round(1, true), round(2, true)], now, 'UTC');
    expect(day.missedDays).toEqual([]);
    expect(twoMissedDaysSaid('Asha', day, [1, 2, 3, 4, 5])).toBeNull();
    expect(day.lastCheckedIn).toBe('2026-10-19');
  });
  it('still reads a round closed with nothing said as missed', () => {
    const day = theirDay('asha', [round(0, true), round(1, false), round(2, false)], now, 'UTC');
    expect(day.missedDays.length).toBe(2);
    expect(twoMissedDaysSaid('Asha', day, [1, 2, 3, 4, 5])).toMatch(/Asha hasn't checked in .*, so call Asha\./);
  });
});
