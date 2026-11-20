import { theirDay, twoMissedDaysSaid, type ASessionOnRecord } from './who-answers-and-when';

/**
 * Run 5, 19 November: at day 90 the board said "Asha hasn't checked in the last 2 times the check-in opened, on Tuesday 19 January and
 * Tuesday 26 January, so call Asha" for an organisation Groundwork had been paused for since December.
 */
describe('a round that opened while Groundwork was paused', () => {
  const round = (n: number, day: string, extra: Partial<ASessionOnRecord> = {}): ASessionOnRecord => ({
    participantId: 'asha', sessionNumber: n, status: 'COMPLETED', closedReason: 'AUTO_CLOSED_BY_CLOCK', availableFrom: `${day}T07:00:00Z`, turns: [], ...extra,
  });
  const now = new Date('2027-02-15T07:00:00Z');
  const paused = new Date('2026-12-20T00:00:00Z');
  const rounds = (pausedFrom: Date | null) => [round(1, '2027-01-12', { pausedFrom }), round(2, '2027-01-19', { pausedFrom }), round(3, '2027-01-26', { pausedFrom })];

  it('is called for as before while Groundwork is not paused', () => {
    const d = theirDay('asha', rounds(null), now, 'Africa/Nairobi');
    expect(twoMissedDaysSaid('Asha', d, null)).toMatch(/so call Asha\.$/);
  });
  it('is nobody to call, and no line, once those rounds opened after the pause', () => {
    const d = theirDay('asha', rounds(paused), now, 'Africa/Nairobi');
    expect(d.missedDays).toEqual([]);
    expect(twoMissedDaysSaid('Asha', d, null)).toBeNull();
  });
  it('still counts a round that opened before the pause', () => {
    const before = [round(1, '2026-12-01', { pausedFrom: paused }), round(2, '2026-12-08', { pausedFrom: paused }), round(3, '2027-01-19', { pausedFrom: paused })];
    expect(theirDay('asha', before, now, 'Africa/Nairobi').missedDays).toEqual(['2026-12-01', '2026-12-08']);
  });
});
