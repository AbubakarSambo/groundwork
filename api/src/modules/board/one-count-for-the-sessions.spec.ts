import { boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, answered } from './the-switchboards-sections-harness';
import { whatEachSessionSays, theHeaderSays } from './one-count-for-the-sessions';

/**
 * REQUEST 107 (e): ONE COUNT FOR THE SESSIONS, FROM THE BOARD'S OWN CLOCK.
 *
 * The board read "Session 1 of 12" in its header beside "Session 2 opened on 30 September". Here
 * Baraka has not finished session 1, and Rukia has already done session 2. Every reader reads one
 * story: the header counts the open round, and session 2's line says it started while session 1 is
 * still open. The check-in runs weekly for 28 days, so 4 sessions are planned.
 */
const at = (d: string) => new Date(`2026-${d}T16:00:00Z`);
const STRAGGLER = [
  { ...answered('p-rukia', 1, '2026-09-16T16:00:00Z'), startedAt: at('09-16'), availableFrom: at('09-15') },
  { ...answered('p-baraka', 1), status: 'IN_PROGRESS', completedAt: null, startedAt: at('09-16'), availableFrom: at('09-15') },
  { ...answered('p-rukia', 2, '2026-09-30T16:00:00Z'), startedAt: at('09-30') },
  { ...answered('p-baraka', 2), status: 'NOT_STARTED', completedAt: null, startedAt: null },
];

describe('one count for the sessions, for every reader', () => {
  for (const [name, reader] of Object.entries({ Amina: AMINA, Rukia: RUKIA, Baraka: BARAKA, Juma: JUMA, 'the admin who set it up': SETUP_ADMIN })) {
    it(`as ${name}, the header and the check-in lines tell one story`, async () => {
      const b = await boardAs({ checkIns: STRAGGLER }, reader[0], reader[1]);
      expect(theHeaderSays(b.phaseSpine.currentSession, b.phaseSpine.plannedSessions, false)).toBe('Check-in 1 of 4.');
      expect(b.phaseSpine.currentSession).toBe(1);
      expect(b.phaseSpine.sessions.map((s: any) => s.says)).toEqual([
        'Check-in 1 opened on 15 September, and it is still open.',
        'Check-in 2 has started for some people, while check-in 1 is still open.',
      ]);
      expect(JSON.stringify(b.phaseSpine)).not.toMatch(/Check-in 2 opened/);
    });
  }

  it('once everybody has finished session 1, session 2 is the one open, opened on the day it was made available', async () => {
    const moved = [
      { ...STRAGGLER[0] }, { ...STRAGGLER[1], status: 'COMPLETED', completedAt: at('09-18') },
      { ...STRAGGLER[2], availableFrom: at('09-29') }, { ...STRAGGLER[3], availableFrom: at('09-29') },
    ];
    const b = await boardAs({ checkIns: moved }, ...AMINA);
    expect(theHeaderSays(b.phaseSpine.currentSession, b.phaseSpine.plannedSessions, false)).toBe('Check-in 2 of 4.');
    expect(b.phaseSpine.sessions.map((s: any) => s.says)).toEqual([
      'Check-in 1 finished on 18 September.',
      'Check-in 2 opened on 29 September, and it is still open.',
    ]);
  });
});

describe('the sentences themselves', () => {
  const now = at('10-02');
  it('a session with a day still to come says when it opens', () => {
    expect(whatEachSessionSays(3, [{ sessionNumber: 3, status: 'NOT_STARTED', availableFrom: at('10-07') }], 2, now).says).toBe('Check-in 3 opens on 7 October.');
  });
  it('and with no day set, that it has not opened', () => {
    expect(whatEachSessionSays(3, [{ sessionNumber: 3, status: 'NOT_STARTED' }], 2, now).says).toBe('Check-in 3 has not opened yet.');
  });
  it('the header, at the end, says it is finished', () => {
    expect(theHeaderSays(12, 12, true)).toBe('Check-in 12 of 12, finished.');
    expect(theHeaderSays(1, 12, false)).toBe('Check-in 1 of 12.');
    expect(theHeaderSays(3, null, false)).toBe('Check-in 3.');
  });
});
