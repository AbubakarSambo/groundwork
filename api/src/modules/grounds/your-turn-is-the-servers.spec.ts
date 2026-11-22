import { yourTurnIn, whatNeedsYou } from './what-needs-you';

/**
 * YOUR TURN IS DECIDED ONCE, ON THE SERVER (release test, 21 November 2026). Olu's check-ins list said "Your turn" while his Today said
 * "Nothing needs you right now": the list guessed from the rows in the browser, and Today asked a rule that knows whether an admin has
 * let the reader in and whether Groundwork is paused. `yourTurnIn` is that rule; the list serves it on each row and Today reads it, so
 * the two cannot disagree. The cases the browser's guess used to be tested on are tested here.
 */
const NOW = new Date('2026-11-20T09:00:00Z');
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();
const ground = (checkIns: any[], extra: Record<string, unknown> = {}) => ({
  id: 'g1', label: 'Sales team, Q4', status: 'ACTIVE', organizationId: 'org1', initiatorId: 'u-lead',
  participants: [{ id: 'p-me', userId: 'u-me' }, { id: 'p-them', userId: 'u-them' }],
  checkIns, ...extra,
});
const row = (sessionNumber: number, status: string, availableFrom: string | null, participantId = 'p-me') => ({ id: `c-${participantId}-${sessionNumber}`, participantId, sessionNumber, status, availableFrom });
const ME = { userId: 'u-me' };

describe('your turn, by the one rule', () => {
  it('a session of yours that has opened and that you have not answered is your turn, with the day it opened', () => {
    expect(yourTurnIn(ground([row(1, 'COMPLETED', day(-7)), row(2, 'NOT_STARTED', day(-1))]) as any, ME, NOW)).toEqual({ checkInId: 'c-p-me-2', sessionNumber: 2, openedAt: day(-1) });
  });
  it('two behind is one thing to do: the earliest', () => {
    expect(yourTurnIn(ground([row(1, 'NOT_STARTED', day(-8)), row(2, 'NOT_STARTED', day(-1))]) as any, ME, NOW)?.sessionNumber).toBe(1);
  });
  it('a session that opens in a fortnight is not your turn', () => {
    expect(yourTurnIn(ground([row(2, 'NOT_STARTED', day(14))]) as any, ME, NOW)).toBeNull();
  });
  it('a session you declined is answered, never "your next check-in ... It opened on 29 August"', () => {
    expect(yourTurnIn(ground([row(1, 'DECLINED', day(-80))]) as any, ME, NOW)).toBeNull();
  });
  it('nothing is your turn on a check-in that is shut, while Groundwork is paused, or before an admin has let you in', () => {
    const open = [row(1, 'NOT_STARTED', day(-1))];
    expect(yourTurnIn(ground(open, { status: 'CLOSED' }) as any, ME, NOW)).toBeNull();
    expect(yourTurnIn(ground(open, { closedAt: day(-1) }) as any, ME, NOW)).toBeNull();
    expect(yourTurnIn(ground(open) as any, { ...ME, pausedFrom: day(-2) }, NOW)).toBeNull();
    expect(yourTurnIn(ground(open) as any, { ...ME, notLetIn: true }, NOW)).toBeNull();
  });
  it('somebody else’s open session is never yours', () => {
    expect(yourTurnIn(ground([row(1, 'NOT_STARTED', day(-1), 'p-them')]) as any, ME, NOW)).toBeNull();
  });
  it('Today says it exactly when the rule does', () => {
    const g = ground([row(1, 'NOT_STARTED', day(-1))]);
    const today = whatNeedsYou([g as any], { userId: 'u-me', organizationId: 'org1' }, [], NOW);
    expect(JSON.stringify(today)).toContain('turn-g1');
    const held = whatNeedsYou([g as any], { userId: 'u-me', organizationId: 'org1', notLetIn: true }, [], NOW);
    expect(JSON.stringify(held)).not.toContain('turn-g1');
  });
});
