import { boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, answered } from './the-switchboards-sections-harness';
import { theHeaderSays, theSessionClock } from './one-count-for-the-sessions';
import { whatToWorkOnNext } from '../reports/what-to-work-on-next';

/**
 * ITEM 21, THE FOUNDER'S BOARD: A CHECK-IN THAT RAN PAST ITS PLAN COUNTS EVERY SESSION.
 *
 * "A second founder joining" (local test database, 9a904212) was planned for three sessions and six ran.
 * Every reader's board served `phaseSpine.currentSession` 3 beside six finished sessions, and Ada read
 * "This is session 3 of 3 of founder or CEO work." The count was capped at the planned number even
 * after people had checked in past it. Here the check-in is planned for four (weekly for 28 days) and
 * six sessions have run.
 */
const SIX = ['p-rukia', 'p-baraka'].flatMap((pid) => [1, 2, 3, 4, 5, 6].map((n) => answered(pid, n, `2026-09-${String(10 + n).padStart(2, '0')}T16:00:00Z`)));

describe('six sessions on a check-in planned for four, as each reader reads the board', () => {
  for (const [name, reader] of Object.entries({ 'Amina, who runs it': AMINA, 'Rukia, who checks in': RUKIA, Baraka: BARAKA, 'Juma, an admin': JUMA, 'the admin who set it up': SETUP_ADMIN })) {
    it(`${name} reads check-in 6, never check-in 4`, async () => {
      const b = await boardAs({ checkIns: SIX }, reader[0], reader[1]);
      expect(b.phaseSpine.currentSession).toBe(6);
      expect(b.phaseSpine.plannedSessions).toBe(4);
      expect(b.phaseSpine.sessions.map((s: any) => s.says)).toHaveLength(6);
    });
  }
});

describe('the count, in the sentences built from it', () => {
  it('the header says the session that ran, and never "Session 4 of 4" after six', () => {
    expect(theHeaderSays(6, 4, true)).toBe('Check-in 6, finished.');
    expect(theHeaderSays(4, 4, true)).toBe('Check-in 4 of 4, finished.');
  });
  it('the check-in\'s own clock agrees with the board', () => {
    const rows = SIX.map((c) => ({ ...c }));
    expect(theSessionClock(rows as any, new Set(['p-rukia', 'p-baraka']), 4).says).toBe('Check-in 6, finished.');
  });
  it('a check-in still within its plan is capped as before', () => {
    const rows = [...SIX.filter((c) => c.sessionNumber <= 4), { ...answered('p-rukia', 5), status: 'NOT_STARTED', completedAt: null }];
    expect(theSessionClock(rows as any, new Set(['p-rukia', 'p-baraka']), 4).currentSession).toBe(4);
  });
  it('the coaching note never says "session 6 of 4"', () => {
    const note = whatToWorkOnNext({
      patterns: [], role: null, detectedFunction: 'FOUNDER', functionConfidence: 0.9, noticedBehaviour: null,
      sessionNumber: 6, totalSessions: 4, scenario: 'NEW_COFOUNDER', waitingOn: [], holdingUp: [],
      saidSomethingSpecific: true, anythingDocumented: false,
    } as any);
    expect(note.whyItMatters).toMatch(/^This is check-in 6 of /);
    expect(note.whyItMatters).not.toMatch(/check-in 6 of 4|check-in 4 of 4/);
  });
});
