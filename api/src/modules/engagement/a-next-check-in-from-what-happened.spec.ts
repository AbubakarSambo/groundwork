import { theNextCheckInFor, theSuggestionSaid } from './the-next-check-in-from-what-happened';
import { theFollowUpWords } from './the-report-follow-up';

/**
 * JOURNEY 12: THE NEXT CHECK-IN, FROM WHAT HAPPENED (decision 109; spec section 36), AS WAIRIMU READS IT.
 *
 * Three weeks after "Sales team, Q4"'s report, the record is different each time, and so is the one check-in she is pointed to, with why. A "why now" is
 * said only where the record gives one. Never a list, never a generic pitch, and only a situation Groundwork already has.
 */
const WENT_OUT = new Date('2026-10-12T09:00:00Z');
const said = (r: any) => theSuggestionSaid(theNextCheckInFor(r));

describe('what Wairimu is pointed to', () => {
  it('handoffs waiting and nothing moved a while after the report: the check-in for work that has gone off track, with a real why now', () => {
    expect(said({ scenario: 'REALIGN_TEAM', done: 0, cleared: 0, waiting: 3, open: 2, daysSinceTheReport: 9 })).toBe(
      'Groundwork suggests a check-in for work that has gone off track, because three handoffs are still waiting and nothing has been marked done or cleared since the report. It is worth doing now because nine days have passed since the report went out and nothing has moved in that time.',
    );
  });
  it('with no real why now, none is made up', () => {
    const s = said({ scenario: 'REALIGN_TEAM', done: 0, cleared: 0, waiting: 3, open: 2, daysSinceTheReport: 3 });
    expect(s).toBe('Groundwork suggests a check-in for work that has gone off track, because three handoffs are still waiting and nothing has been marked done or cleared since the report.');
    expect(s).not.toMatch(/worth doing now/);
  });
  it('things moved and nothing waits: a regular read on live work, and no invented urgency', () => {
    expect(said({ scenario: 'REALIGN_TEAM', done: 2, cleared: 1, waiting: 0, open: 1 })).toBe(
      'Groundwork suggests a check-in for a regular read on live work, because three things have moved since the report and no handoff is waiting.',
    );
  });
  it('mixed or nothing in the record: the same check-in again, never an invented other', () => {
    expect(theNextCheckInFor({ scenario: 'REALIGN_TEAM', done: 1, cleared: 0, waiting: 1, open: 0 }).kind).toBe('the same again');
    expect(said({ scenario: 'REALIGN_TEAM', done: 0, cleared: 0, waiting: 0, open: 0 })).toBe(
      'Groundwork suggests running the same check-in again, because nothing has been marked done or cleared since the report.',
    );
  });
  it('never points to the situation she already ran, and always one recommendation', () => {
    expect(theNextCheckInFor({ scenario: 'DRIFT', done: 0, cleared: 0, waiting: 3, open: 0 }).kind).toBe('the same again');
    expect(theNextCheckInFor({ scenario: 'PULSE_CHECK', done: 2, cleared: 0, waiting: 0, open: 0 }).kind).toBe('the same again');
  });
  it('is the last line of the follow-up message, and the subject stays short', () => {
    const w = theFollowUpWords('Wairimu', 'Sales team, Q4', WENT_OUT, { scenario: 'REALIGN_TEAM', done: 0, cleared: 0, waiting: 3, open: 0 });
    expect(w.lines[w.lines.length - 1]).toContain('Groundwork suggests a check-in for work that has gone off track, because');
    for (const c of [{ done: 2, cleared: 1, waiting: 3, open: 4 }, { done: 0, cleared: 0, waiting: 2, open: 0 }, { done: 3, cleared: 0, waiting: 0, open: 0 }, { done: 0, cleared: 0, waiting: 0, open: 0 }]) {
      expect(theFollowUpWords('W', 'A very long name for a check-in about the sales pipeline in East Africa', WENT_OUT, c).subject.length).toBeLessThanOrEqual(110);
    }
  });
  it('and judges nobody', () => {
    for (const r of [{ done: 0, cleared: 0, waiting: 3, open: 2 }, { done: 3, cleared: 0, waiting: 0, open: 0 }]) expect(said(r)).not.toMatch(/ahead|behind|strong|weak|best|worst|lazy|failed/i);
  });
});
