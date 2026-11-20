/**
 * TWICE A WEEK (2 November 2026). A weekly check-in that meets on more than one weekday (Ground.cadenceDays) opens on each of
 * them in turn, counts that many sessions a week, and every sentence that says how often says "Twice a week, on Monday and
 * Thursday." Once a week, and every other rhythm, reads and runs exactly as before.
 */
import { Cadence } from '@prisma/client';
import { whenTheNextSessionOpens, howManyRoundsUpTo, timesAWeekInWords, theWeekdaysItMeets } from './the-check-ins-own-schedule';
import { totalSessionsFor, timelineDaysForAChosenEnd } from './session-count';
import { howThisCheckInRuns } from './people-and-setup';
import { howOftenItRuns } from './the-check-ins-own-schedule';
import { whenItAsks } from '../participants/when-it-asks';

const day = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const MON_THU = [4, 1];

describe('a check-in that meets twice a week', () => {
  const s = { cadence: Cadence.WEEKLY, days: MON_THU, workingDays: [1, 2, 3, 4, 5], startedAt: new Date('2026-11-01T09:00:00Z'), zone: 'UTC' };

  /* Changed 20 November 2026 (channel test W27, Hafsah: sessions open at 8 where the team is): every rhythm now opens at 8, not only daily. */
  it('opens on the chosen weekdays in turn: Monday, Thursday, Monday', () => {
    /* Set up on Sunday 1 November, a day they do not work, so the first session is Monday's. */
    const first = new Date('2026-11-02T00:00:00.000Z');
    const second = whenTheNextSessionOpens(s, first, new Date('2026-11-02T12:00:00Z'));
    expect(second.toISOString()).toBe('2026-11-05T08:00:00.000Z');
    const third = whenTheNextSessionOpens(s, second, new Date('2026-11-05T12:00:00Z'));
    expect(third.toISOString()).toBe('2026-11-09T08:00:00.000Z');
  });

  it('counts two sessions a week, and the length saved for a chosen end gives that count back', () => {
    expect(totalSessionsFor(28, Cadence.WEEKLY, MON_THU)).toBe(8);
    expect(howManyRoundsUpTo({ cadence: Cadence.WEEKLY, days: MON_THU, workingDays: [1, 2, 3, 4, 5] }, day('2026-11-02'), day('2026-11-12'))).toBe(4);
    const days = timelineDaysForAChosenEnd({ startsAt: new Date(2026, 10, 2), endsAt: new Date(2026, 10, 12), cadence: Cadence.WEEKLY, cadenceDays: MON_THU, workingDays: [1, 2, 3, 4, 5] });
    expect(totalSessionsFor(days, Cadence.WEEKLY, MON_THU)).toBe(4);
  });

  it('says how often in one wording, everywhere on the server', () => {
    expect(timesAWeekInWords({ cadence: 'WEEKLY', days: MON_THU })).toBe('twice a week, on Monday and Thursday');
    expect(howOftenItRuns({ cadence: 'WEEKLY', cadenceDays: MON_THU, cadenceAnchorDay: 1 })).toBe('twice a week, on Monday and Thursday');
    expect(whenItAsks({ cadence: 'WEEKLY', cadenceDays: MON_THU })).toBe('About ten minutes twice a week, on Monday and Thursday, from 8am.' /* Changed 20 November 2026 (channel test W27, Hafsah: sessions open at 8 where the team is): every rhythm now opens at 8, not only daily. */);
    expect(howThisCheckInRuns({ answering: 5, cadence: 'WEEKLY', cadenceDays: MON_THU, endsOn: null, noEnd: true, onWhatsApp: false, endedBy: 'Grace', timeZone: 'UTC' } as any))
      .toBe('5 people answer twice a week, on Monday and Thursday, until Grace ends it, here.');
    expect(timesAWeekInWords({ cadence: 'WEEKLY', days: [1, 3, 5] })).toBe('three times a week, on Monday, Wednesday and Friday');
  });

  it('once a week, and any other rhythm, is exactly as before', () => {
    expect(theWeekdaysItMeets({ cadence: 'WEEKLY', days: [1] })).toEqual([]);
    expect(theWeekdaysItMeets({ cadence: 'FORTNIGHTLY', days: MON_THU })).toEqual([]);
    expect(totalSessionsFor(28, Cadence.WEEKLY, [])).toBe(4);
    expect(totalSessionsFor(28, Cadence.WEEKLY)).toBe(4);
    expect(howOftenItRuns({ cadence: 'WEEKLY', cadenceAnchorDay: 4 })).toBe('every Thursday');
    expect(whenItAsks({ cadence: 'WEEKLY', cadenceAnchorDay: 4 })).toBe('About ten minutes every Thursday, from 8am.') /* S18: the one wording, howOftenItRuns */;
  });
});
