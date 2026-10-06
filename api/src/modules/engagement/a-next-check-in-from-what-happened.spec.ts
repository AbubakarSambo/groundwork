import { theNextCheckInFor, theSuggestionSaid } from './the-next-check-in-from-what-happened';
import { theFollowUpWords } from './the-report-follow-up';

/**
 * JOURNEY 12: THE NEXT CHECK-IN, FROM WHAT HAPPENED (decision 109; spec section 36), AS WAIRIMU READS IT.
 *
 * Three weeks after "Sales team, Q4"'s report, the record is different each time, and so is the one check-in she is pointed to, with why and why now.
 * Never a list, never a generic pitch, and only a situation Groundwork already has.
 */
const WENT_OUT = new Date('2026-10-12T09:00:00Z');
const said = (r: any) => theSuggestionSaid(theNextCheckInFor(r));

describe('what Wairimu is pointed to', () => {
  it('handoffs waiting and nothing moved: the check-in for work that has gone off track', () => {
    expect(said({ scenario: 'REALIGN_TEAM', done: 0, cleared: 0, waiting: 3, open: 2 })).toBe(
      'Groundwork has a check-in for work that has gone off track. I suggest it because three handoffs are still waiting and nothing has been marked done or cleared since the report. It is worth doing now because the longer a handoff waits, the harder it is to see what is holding it.',
    );
  });
  it('things moved and nothing waits: a regular read on live work', () => {
    expect(said({ scenario: 'REALIGN_TEAM', done: 2, cleared: 1, waiting: 0, open: 1 })).toBe(
      'Groundwork has a check-in for a regular read on live work. I suggest it because three things have moved since the report and no handoff is waiting. It is worth doing now because a regular read shows whether it keeps moving, while the people involved still remember what changed.',
    );
  });
  it('mixed or nothing in the record: the same check-in again, never an invented other', () => {
    expect(theNextCheckInFor({ scenario: 'REALIGN_TEAM', done: 1, cleared: 0, waiting: 1, open: 0 }).kind).toBe('the same again');
    expect(said({ scenario: 'REALIGN_TEAM', done: 0, cleared: 0, waiting: 0, open: 0 })).toBe(
      'I suggest running the same check-in again, because nothing has been marked done or cleared since the report. It is worth doing now because it asks the same people the same questions, so what has moved can be seen.',
    );
  });
  it('never points to the situation she already ran, and always one recommendation', () => {
    expect(theNextCheckInFor({ scenario: 'DRIFT', done: 0, cleared: 0, waiting: 3, open: 0 }).scenario).toBe('DRIFT');
    expect(theNextCheckInFor({ scenario: 'DRIFT', done: 0, cleared: 0, waiting: 3, open: 0 }).kind).toBe('the same again');
    expect(theNextCheckInFor({ scenario: 'PULSE_CHECK', done: 2, cleared: 0, waiting: 0, open: 0 }).kind).toBe('the same again');
  });
  it('is the line in the follow-up message, in place of a generic offer', () => {
    const w = theFollowUpWords('Wairimu', 'Sales team, Q4', WENT_OUT, { scenario: 'REALIGN_TEAM', done: 0, cleared: 0, waiting: 3, open: 0 });
    expect(w.lines[w.lines.length - 1]).toContain('Groundwork has a check-in for work that has gone off track.');
    expect(w.lines.join(' ')).not.toMatch(/same way\?|Do you want Groundwork to check/);
  });
  it('and judges nobody', () => {
    for (const r of [{ done: 0, cleared: 0, waiting: 3, open: 2 }, { done: 3, cleared: 0, waiting: 0, open: 0 }]) expect(said(r)).not.toMatch(/ahead|behind|strong|weak|best|worst|lazy|failed/i);
  });
});
