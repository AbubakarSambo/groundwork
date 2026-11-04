import { theirDay, onTimeSaid, onTimeSaidToYou } from './who-answers-and-when';

/**
 * A WEEKLY CHECK-IN IS NOT "DAYS RUNNING" (browser test, 20 October 2026). Achieng Otieno, a borrower in Pesa Ndogo Lenders (test),
 * checks in each Monday and has answered on time five Mondays running. Her own report read "You checked in on time yesterday, 5 days
 * running", which is not true. Each session is a week here, so it says weeks; a daily check-in still says days.
 */
const ZONE = 'Africa/Nairobi';
const session = (n: number, day: string, answeredAt: string) => ({ id: `c${n}`, participantId: 'p-achieng', sessionNumber: n, status: 'COMPLETED', availableFrom: new Date(`${day}T06:00:00Z`), createdAt: new Date(`${day}T06:00:00Z`), completedAt: new Date(`${day}T${answeredAt}Z`) });
const MONDAYS = ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'].map((d, i) => session(i + 1, d, '07:00:00'));
const WEEKDAYS = ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19'].map((d, i) => session(i + 1, d, '07:00:00'));
const TUESDAY = new Date('2026-10-20T06:00:00Z');

describe('how many times running, in the unit the check-in runs in', () => {
  it('Achieng, five Mondays on time, reads weeks, not days', () => {
    const d = theirDay('p-achieng', MONDAYS, TUESDAY, ZONE);
    expect(onTimeSaidToYou(d, '2026-10-20')).toBe('You checked in on time yesterday, 5 weeks running.');
    expect(onTimeSaid('Achieng', d, '2026-10-20')).toBe('Achieng checked in on time 5 weeks running.');
  });
  it('a daily check-in, over a weekend, still reads days', () => {
    const d = theirDay('p-achieng', WEEKDAYS, TUESDAY, ZONE);
    expect(onTimeSaidToYou(d, '2026-10-20')).toBe('You checked in on time yesterday, 5 days running.');
  });
  it('sessions with no steady gap read as check-ins in a row', () => {
    const odd = ['2026-09-01', '2026-09-20', '2026-10-19'].map((d, i) => session(i + 1, d, '07:00:00'));
    expect(onTimeSaidToYou(theirDay('p-achieng', odd, TUESDAY, ZONE), '2026-10-20')).toBe('You checked in on time yesterday, 3 check-ins in a row.');
  });
});
