import { boardAs, answered, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';

/**
 * REQUEST 115 (g), part of 111 (d): `phaseSpine` called session 2 "upcoming" while it was open and two
 * people had checked in to it, because session 1 still had somebody to answer. "Who checked in" then drew
 * one square each. A session somebody has checked in to is open ("current"); only one nobody has started
 * is upcoming. The same for every reader.
 */
const notYet = (participantId: string, n: number) => ({ ...answered(participantId, n), status: 'NOT_STARTED', completedAt: null, specificityLevel: null, specificityDimensions: null });
const setup = {
  createdByUserId: 'u-setup',
  checkIns: [
    answered('p-rukia', 1), notYet('p-baraka', 1),
    answered('p-rukia', 2, '2026-09-30T16:00:00Z'), notYet('p-baraka', 2),
    notYet('p-rukia', 3), notYet('p-baraka', 3),
  ],
};

describe('request 115 (g): a session somebody has checked in to is not upcoming', () => {
  it.each([
    ['Amina, the lead', AMINA], ['the admin who set it up', SETUP_ADMIN], ['Juma, an admin who only reads', JUMA],
    ['Rukia, who checks in', RUKIA], ['Baraka, who checks in', BARAKA],
  ])('%s is sent session 2 as open and session 3 as upcoming', async (_who, reader) => {
    const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
    const state = Object.fromEntries(board.phaseSpine.sessions.map((s: any) => [s.n, s.state]));
    /* Changed 22 November 2026 (Hafsah, "Yes, move it on"): session 2 has begun, so session 1 is over and session 2 is the team's. */
    expect(state).toEqual({ 1: 'done', 2: 'current', 3: 'upcoming' });
    expect(board.phaseSpine.currentSession).toBe(2);
  });
});
