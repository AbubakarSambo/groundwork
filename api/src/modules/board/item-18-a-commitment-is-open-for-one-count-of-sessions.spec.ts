import { AMINA, RUKIA, BARAKA, JUMA, A_RELEASED_REPORT, boardAs, answered, commitment } from './the-switchboards-sections-harness';

/**
 * ITEM 18 (THE PROJECT BOARD): ONE COMMITMENT IS OPEN FOR THE SAME NUMBER OF SESSIONS EVERYWHERE ON THE BOARD.
 *
 * "Atlas delivery" (served from the local test database on 2 October 2026). Two sessions had been finished, but the
 * report was stored counting 3, so Tunde read about Samuel's commitment, on one board:
 *   overTime:  "In session 1, Samuel Aryee committed to ask for clarification. It has been open for 2 sessions, ..."
 *   work plan: "In session 1, Samuel Aryee said, "I will ask for clarification". It has been open for 1 session, ..."
 * Both now count the sessions somebody has finished: "It has been open for 1 session".
 */
const SETUP = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1), answered('p-rukia', 2, '2026-09-09T16:00:00Z'), answered('p-baraka', 2, '2026-09-09T16:00:00Z')],
  commitments: [commitment('k1', 'p-rukia', 'I will ask for clarification', { statedInSession: 1 })],
  report: {
    ...A_RELEASED_REPORT,
    overTime: {
      sessions: 3,
      commitments: [{ participantId: 'p-rukia', who: 'Participant A', what: 'I will ask for clarification', theySaidIt: true, statedInSession: 1, status: 'UNKNOWN', restatedIn: [] }],
      dependencies: [], patterns: [], gaps: [], stillOpen: [], cannotTellYou: [], toSettleFirst: [],
    },
  },
};

/* UPDATED 19 NOVEMBER (rest of the list): the product says "check-in" where this spec still said "session" (the board's vocabulary); the count it pins, one count for every line, is unchanged. */
describe('item 18: a commitment is open for one count of sessions', () => {
  it('Amina, who runs it, reads "open for 1 session" in the record over time, as in the work plan', async () => {
    const b = await boardAs(SETUP, ...AMINA);
    const over = (b.overTime?.commitments ?? []).map((c: any) => c.say).join(' ');
    expect(over).toMatch(/It has been open for 1 check-in, and nobody has said whether it happened\./);
    expect(JSON.stringify(b)).not.toMatch(/open for 2 check-ins/);
    expect(b.overTime.inSessions).toBe('in 2 check-ins');
  });

  it.each([['Rukia, who made it', RUKIA], ['Baraka, who checks in', BARAKA], ['Juma, an admin who only reads', JUMA]])('%s is not served the record over time, and reads no other count', async (_who, [user, role]) => {
    const b = await boardAs(SETUP, user, role);
    expect(b.overTime ?? null).toBeNull();
    expect(JSON.stringify(b)).not.toMatch(/open for 2 check-ins/);
  });
});
