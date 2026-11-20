import { theRoundsDone, theSessionRowsOf, theSessionsDoneBy } from './the-sessions-done';

/* Pilot, 12 November: People and setup said "0 of 12" and "1 of 12" on one page. One owner counts, and the set-up chat is never a session. */
const row = (participantId: string, sessionNumber: number, status: string, extra: any = {}) => ({ participantId, sessionNumber, status, isSetup: false, closedReason: null, ...extra });

describe('how many sessions are done', () => {
  it('counts the set-up chat as no session, for the team and for a person', () => {
    const rows = [row('a', 1, 'COMPLETED', { isSetup: true }), row('a', 1, 'COMPLETED'), row('b', 1, 'NOT_STARTED')];
    expect(theRoundsDone(theSessionRowsOf(rows as any, []) as any, undefined, new Date())).toBe(0);
    expect(theSessionsDoneBy(rows as any, 'a')).toBe(1);
  });
  it('counts a round once everybody has answered, and a corrected session once', () => {
    const rows = [row('a', 1, 'COMPLETED'), row('a', 1, 'COMPLETED'), row('b', 1, 'COMPLETED'), row('a', 2, 'COMPLETED'), row('b', 2, 'NOT_STARTED')];
    expect(theRoundsDone(rows as any, undefined, new Date())).toBe(1);
    expect(theSessionsDoneBy(rows as any, 'a')).toBe(2);
  });
});
