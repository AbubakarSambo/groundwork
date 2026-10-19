import { theirWeekInWords, theDayTheCountBegins } from './the-participants-week';

/**
 * A KEPT COUNT SAYS SINCE WHEN, WHERE IT BEGAN LESS THAN FOUR WEEKS AGO (engine test, Mercy's "Your week", Thursday 15 October 14:15).
 *
 * Drop Access (test). Mercy's first check-in was on Monday 12 October. Her week said "You kept two of the three things you said you
 * would do in the last four weeks, "I'm definitely going to follow up with Greenfield Supermarket this week for sure" and "My next step
 * is to call Mrs. Achola at Greenfield"." Four days in, "the last four weeks" is not what happened.
 */
const at = (s: string) => new Date(s);
const ROWS = [
  { status: 'DONE', createdAt: at('2026-10-12T11:06:49Z'), settledAt: at('2026-10-13T11:00:00Z'), text: "I'm definitely going to follow up with Greenfield Supermarket this week for sure" },
  { status: 'DONE', createdAt: at('2026-10-13T11:06:49Z'), settledAt: at('2026-10-14T11:00:00Z'), text: 'My next step is to call Mrs. Achola at Greenfield' },
  { status: 'NOT_DONE', createdAt: at('2026-10-13T11:06:49Z'), settledAt: at('2026-10-14T11:00:00Z'), text: 'Send Tuskys the samples' },
];
const week = (keptSince: string | null) => theirWeekInWords('Mercy', {
  kept: { kept: 2, of: 3 }, keptWhat: [ROWS[0].text, ROWS[1].text], keptSince, open: [], waitingOn: [], waitingOnYou: [],
});

describe("Mercy's week, four days into her first check-in", () => {
  it('says since Monday 12 October, not in the last four weeks', () => {
    const since = theDayTheCountBegins(ROWS, at('2026-10-15T11:15:00Z'), 'Africa/Nairobi');
    expect(since).toBe('Monday 12 October');
    expect(week(since)?.lines[1]).toBe('You kept two of the three things you said you would do since Monday 12 October, "I\'m definitely going to follow up with Greenfield Supermarket this week for sure" and "My next step is to call Mrs. Achola at Greenfield".');
  });
  it('and five weeks in it says the last four weeks, as before', () => {
    expect(theDayTheCountBegins(ROWS, at('2026-11-20T11:15:00Z'), 'Africa/Nairobi')).toBeNull();
    expect(week(null)?.lines[1]).toContain('you said you would do in the last four weeks');
  });
});
