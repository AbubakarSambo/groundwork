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
});
