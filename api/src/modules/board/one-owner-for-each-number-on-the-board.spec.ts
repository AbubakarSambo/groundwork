import { readFileSync } from 'fs';
import { join } from 'path';
import { theLastDayOf, deadlineOf } from '../grounds/when-the-clock-starts';
import { theCountAsServed } from '../grounds/the-count-as-served';
import { thePlannedSessionsOf } from '../grounds/this-sessions-count';

/**
 * ONE OWNER FOR EACH NUMBER AND DATE THE LEAD READS (batch 2, group 2; round 50's three numbers that disagree, staging S1 and S20).
 *   - The end date every page shows is theLastDayOf: the day the lead chose, never the deadline's last millisecond in UTC, which in Lagos
 *     is already the next day (26 October beside 25 October).
 *   - How many sessions the check-in plans is thePlannedSessionsOf, served with the one count, so no page works it out again.
 *   - A person's target is a number somebody said; the model's share of a team total is never written (S1, "Remy's target is 30").
 *   - "Last updated ... when Associate checked in" reads only check-ins made, as the board's count does (S20).
 */
const sources = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the end date', () => {
  const ground = { createdAt: new Date('2026-10-26T09:00:00Z'), endsAt: new Date('2027-10-25T00:00:00Z'), timelineDays: 364 };
  it('is the day the lead chose, on every page', () => {
    expect(theLastDayOf(ground)!.toISOString().slice(0, 10)).toBe('2027-10-25');
    /* The deadline stays the end of that day, for lateness only. Read in Lagos it is already 26 October, so it is never the date shown. */
    expect(deadlineOf(ground)!.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long' })).toBe('26 October');
  });
  it('is none while it runs until somebody ends it', () => {
    expect(theLastDayOf({ ...ground, runsUntilEnded: true })).toBeNull();
  });
  it('the board, setup, the check-in page and the conversation read it, not the stored column or the deadline', () => {
    expect(sources('board/board.service.ts')).toContain('endsAt: theLastDayOf(ground as any),');
    expect(sources('grounds/people-and-setup.ts')).toContain('const endsOn = noEnd ? null : theLastDayOf(ground);');
    expect(sources('grounds/grounds.service.ts')).toContain('const endsOn = noEnd ? null : theLastDayOf(ground as any);');
    expect(sources('conversation/conversation.service.ts')).toContain('endsOn: theLastDayOf(ground as any),');
  });
});

describe('how many sessions', () => {
  it('twice a week for a year is one number, served with the count', () => {
    const g = { timelineDays: 360, cadence: 'WEEKLY', cadenceDays: [1, 4] };
    const planned = thePlannedSessionsOf(g);
    expect(planned).toBe(102);
    expect(theCountAsServed({ session: 2, said: null, planned }, {}, { onlyThese: null }).planned).toBe(102);
    expect(thePlannedSessionsOf({ ...g, runsUntilEnded: true })).toBeNull();
  });
  it('no server page works it out on its own any more', () => {
    for (const f of ['board/board.service.ts', 'grounds/grounds.service.ts', 'grounds/people-and-setup.ts', 'engagement/the-leads-daily-nudge.ts']) {
      expect(sources(f)).not.toMatch(/totalSessionsFor\(/);
    }
  });
});

describe('a target is one somebody said', () => {
  it('a per-person number from the lead\'s reading is written only where the number is in her words', () => {
    expect(sources('conversation/conversation.service.ts')).toContain('(e.targetNumber as number) > 0 && numbersInTheirWords.has(Math.round(e.targetNumber as number))');
  });
});

describe('"Last updated ... when somebody checked in"', () => {
  it('reads only check-ins made, never a session the clock closed with nothing said', () => {
    expect(sources('reports/the-sales-readings-for-a-report.ts')).toContain("status: 'COMPLETED', isSetup: false, AND: [NOT_A_QUIET_CLOSE] }");
  });
});
