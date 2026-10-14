import { Cadence } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { timelineDaysForAChosenEnd, totalSessionsFor } from './session-count';
import { deadlineOf } from './when-the-clock-starts';

/**
 * THE END THE LEAD CHOSE SETS HOW LONG IT RUNS (U.6 review).
 *
 * Read live: a weekly check-in set "until 6 November" was saved as 90 days, so it said "Session 1 of
 * 12" and "90 days, 12 sessions", ended on 26 December, and its invitation said "until 6 November".
 * Now the length, the number of check-ins, the deadline and the invitation all come from that end.
 */
describe('the chosen end', () => {
  /* Sunday 27 September 2026 to Friday 6 November, weekly: 27 Sep, 4, 11, 18, 25 Oct and 1 Nov. */
  const startsAt = new Date(2026, 8, 27);
  const endsAt = new Date(2026, 10, 6);

  it('gives the check-ins the setup listed, and no more', () => {
    const days = timelineDaysForAChosenEnd({ startsAt, endsAt, cadence: Cadence.WEEKLY });
    expect(totalSessionsFor(days, Cadence.WEEKLY)).toBe(6);
  });

  it('counts the same from "now" at any time of day as from the start of the day', () => {
    const afternoon = new Date(2026, 8, 27, 15, 30);
    expect(timelineDaysForAChosenEnd({ startsAt: null, endsAt, cadence: Cadence.WEEKLY, now: afternoon }))
      .toBe(timelineDaysForAChosenEnd({ startsAt, endsAt, cadence: Cadence.WEEKLY }));
  });

  it('only counts the days they work', () => {
    /* 1 July to 30 September 2026, every weekday: 66 of them. */
    const days = timelineDaysForAChosenEnd({ startsAt: new Date(2026, 6, 1), endsAt: new Date(2026, 8, 30), cadence: Cadence.DAILY, workingDays: [1, 2, 3, 4, 5] });
    expect(totalSessionsFor(days, Cadence.DAILY)).toBe(66);
  });

  it('is the deadline, whatever the length works out as', () => {
    expect(deadlineOf({ createdAt: startsAt, startsAt, timelineDays: 42, endsAt })!.getTime()).toBe(endsAt.getTime());
    /* And a check-in with no chosen end keeps its old deadline. */
    expect(deadlineOf({ createdAt: startsAt, startsAt, timelineDays: 90 })!.getTime()).toBe(startsAt.getTime() + 90 * 86_400_000);
  });

  it('is what both ways of creating a check-in use when nobody said a length', () => {
    const src = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src.match(/timelineDays: howLongItRuns\(dto\),/g)).toHaveLength(2);
    expect(src).not.toContain('timelineDays: dto.timelineDays ?? DEFAULT_TIMELINE_DAYS[dto.scenario],');
    // Request 37: choosing "until I end it" also counts as stated.
    expect(src.match(/timelineStated: dto\.runsUntilEnded === true \|\| dto\.timelineDays != null \|\| !!dto\.endsAt,/g)).toHaveLength(2);
  });
});

/**
 * SETUP, THE SAVED COUNT AND THE INVITATION AGREE (journey test, 12 October 2026). One check-in read
 * 12, then 65, then 261 sessions. The saved count now walks the schedule's own rounds, so these are the
 * numbers setup lists for the same choices (client: the-session-count-is-one-rule.spec.ts holds the
 * same three cases).
 */
describe('the saved count is the rounds that will open', () => {
  const sundayNow = new Date(2026, 9, 11, 15, 0);
  const count = (cadence: Cadence, anchorDay: number, endsAt: Date) =>
    totalSessionsFor(timelineDaysForAChosenEnd({ startsAt: null, endsAt, cadence, anchorDay, now: sundayNow }), cadence);

  it('weekly on Mondays, "Now" on Sunday 11 October, until Sunday 29 November: 11 Oct, then Mondays 19 Oct to 23 Nov', () => {
    expect(count(Cadence.WEEKLY, 1, new Date(2026, 10, 29))).toBe(7);
  });
  it('fortnightly on Mondays, until Monday 30 November: 11 Oct, 19 Oct, 2 Nov, 16 Nov, 30 Nov', () => {
    expect(count(Cadence.FORTNIGHTLY, 1, new Date(2026, 10, 30))).toBe(5);
  });
  it('monthly on the 20th, until 15 January: 11 Oct, 20 Nov, 20 Dec', () => {
    expect(count(Cadence.MONTHLY, 20, new Date(2027, 0, 15))).toBe(3);
  });
});
