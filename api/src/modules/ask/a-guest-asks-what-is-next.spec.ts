import { answerAGuest } from './a-guest-asks-only-about-their-own-check-in';

/**
 * SCREENS REQUEST 86: a guest who has already started a check-in is told it is open, not that it opens
 * later, even when the date it was first offered for has not come.
 */
const NOW = new Date('2026-09-30T09:00:00Z');
const LATER = new Date('2026-10-04T09:00:00Z');
const said = (r: any) => JSON.stringify(r);

describe('what a guest is told about their next check-in', () => {
  it('not started, with its date ahead: when it opens', () => {
    expect(said(answerAGuest('next', 'Sales team, Q3', { checkIns: [{ sessionNumber: 2, status: 'NOT_STARTED', availableFrom: LATER }] }, NOW)))
      .toContain('Your next check-in on Sales team, Q3 opens on');
  });

  it('started, with its date still ahead: that it is open and already started', () => {
    const r = said(answerAGuest('next', 'Sales team, Q3', { checkIns: [{ sessionNumber: 2, status: 'IN_PROGRESS', availableFrom: LATER }] }, NOW));
    expect(r).toContain('Your check-in on Sales team, Q3 is open now, and you have already started it. You can carry on from the check-in page.');
    expect(r).not.toContain('opens on');
  });

  /*
   * Night quality run 2: Jared read "You have finished four check-ins." with two answered, because two
   * of his four were closed by the clock with nothing said. Ask Groundwork counts the same way.
   */
  it('nothing waiting: counts only the check-ins they answered, not those the clock closed with nothing said', () => {
    const done = (n: number) => ({ sessionNumber: n, status: 'COMPLETED', availableFrom: LATER, closedReason: null, personTurns: 1 });
    const quiet = (n: number) => ({ sessionNumber: n, status: 'COMPLETED', availableFrom: LATER, closedReason: 'auto_closed', personTurns: 0 });
    const r = said(answerAGuest('next', 'Field sales', { checkIns: [done(1), quiet(2), done(3), quiet(4)] }, NOW));
    expect(r).toContain('There is no check-in waiting for you on Field sales now. You have finished 2 check-ins on it so far.');
    expect(r).not.toContain('finished 4');
  });
});

