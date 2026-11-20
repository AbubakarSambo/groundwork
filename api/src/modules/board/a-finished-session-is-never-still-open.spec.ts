import { whatEachSessionSays } from './one-count-for-the-sessions';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 14. Mercy's board on 18 October read, one line under the other:
 *   "Session 3 finished on 14 October."
 *   "Session 4 opened on 15 October, while session 3 is still open."
 * Her rows: sessions 1 to 3 completed, session 4 available from 15 October and not started. The open round was 3.
 */
const NOW = new Date('2026-10-18T15:41:00Z');
const ROWS = [
  { sessionNumber: 1, status: 'COMPLETED', availableFrom: null, completedAt: '2026-10-12T11:06:29Z' },
  { sessionNumber: 2, status: 'COMPLETED', availableFrom: '2026-10-13T05:00:00Z', completedAt: '2026-10-13T11:06:37Z' },
  { sessionNumber: 3, status: 'COMPLETED', availableFrom: '2026-10-14T05:00:00Z', completedAt: '2026-10-14T11:09:48Z' },
  { sessionNumber: 4, status: 'NOT_STARTED', availableFrom: '2026-10-15T05:00:00Z' },
];

describe('a finished session is never said to be still open', () => {
  it('Mercy reads "Session 3 finished on 14 October." and "Session 4 opened on 15 October, and it is still open."', () => {
    expect(whatEachSessionSays(3, ROWS, 3, NOW).says).toBe('Check-in 3 finished on 14 October.');
    expect(whatEachSessionSays(4, ROWS, 3, NOW).says).toBe('Check-in 4 opened on 15 October, and it is still open.');
  });
  it('where somebody has not finished session 3, the lead still reads that it is open', () => {
    const rows = [...ROWS, { sessionNumber: 3, status: 'NOT_STARTED', availableFrom: '2026-10-14T05:00:00Z' }];
    expect(whatEachSessionSays(4, rows, 3, NOW).says).toBe('Check-in 4 opened on 15 October, while check-in 3 is still open.');
  });
});

/*
 * AND THE HEADER READS THE SAME COUNT (Drop Access short run, 18 October). Mercy's header read "Daily on weekdays, from 8am.
 * Session 3 of 15." over "Session 4 opened on 15 October, and it is still open." The rows below are gw_sweep_drop3's own: Joseph,
 * Kevin and Mercy each finished sessions 1 to 3, and each has session 4 available from 15 October, not started. Fifteen sessions.
 */
import { boardAs, person } from './the-switchboards-sections-harness';
import { theSessionClock, theHeaderSays } from './one-count-for-the-sessions';
import { PartyType } from '@prisma/client';

const DROP_PEOPLE = [
  person('p-grace', 'u-grace', 'Grace', 'Wanjiku', PartyType.INITIATOR),
  person('p-joseph', 'u-joseph', 'Joseph', 'Kariuki'),
  person('p-kevin', 'u-kevin', 'Kevin', 'Otieno'),
  person('p-mercy', 'u-mercy', 'Mercy', 'Achieng'),
];
const row = (who: string, n: number, status: string, availableFrom: string | null, completedAt: string | null) => ({
  id: `c${n}-${who}`, participantId: who, sessionNumber: n, status, isSetup: false,
  availableFrom: availableFrom ? new Date(availableFrom) : null, startedAt: completedAt ? new Date(completedAt) : null,
  completedAt: completedAt ? new Date(completedAt) : null, specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
});
const DROP_ROWS = [
  row('p-grace', 1, 'COMPLETED', null, '2026-10-12T08:33:22Z'),
  ...['p-joseph', 'p-kevin', 'p-mercy'].flatMap((p) => [
    row(p, 1, 'COMPLETED', null, '2026-10-12T11:06:29Z'),
    row(p, 2, 'COMPLETED', '2026-10-13T05:00:00Z', '2026-10-13T11:06:37Z'),
    row(p, 3, 'COMPLETED', '2026-10-14T05:00:00Z', '2026-10-14T11:08:15Z'),
    row(p, 4, 'NOT_STARTED', '2026-10-15T05:00:00Z', null),
  ]),
];

describe('the header and the session lines read one count (Drop Access, 18 October)', () => {
  for (const [name, userId] of [['Mercy', 'u-mercy'], ['Grace', 'u-grace']] as const) {
    it(`${name} reads "Check-in 4 of 15." over "Check-in 4 opened on 15 October, and it is still open."`, async () => {
      const b = await boardAs({
        people: DROP_PEOPLE as any, initiatorId: 'u-grace', checkIns: DROP_ROWS,
        clock: { now: NOW, timelineDays: 15, cadence: 'DAILY' },
        groundRow: { timelineDays: 15, cadence: 'DAILY' }, releaseOneSalesBoard: true,
      }, userId, 'MEMBER');
      expect(theHeaderSays(b.phaseSpine.currentSession, b.phaseSpine.plannedSessions, false)).toBe('Check-in 4 of 15.');
      const says = b.phaseSpine.sessions.map((s: any) => s.says);
      expect(says).toContain('Check-in 3 finished on 14 October.');
      expect(says).toContain('Check-in 4 opened on 15 October, and it is still open.');
      expect(JSON.stringify(b.phaseSpine)).not.toMatch(/Check-in 3 of 15|check-in 3 is still open/);
    });
  }

  /* Release 1, part 3: the count is handed on only behind Release 1's switch; off, the header reads as the board did before it. */
  it('with Release 1\'s switch off, Grace reads the header as the board did before it', async () => {
    const b = await boardAs({
      people: DROP_PEOPLE as any, initiatorId: 'u-grace', checkIns: DROP_ROWS,
      clock: { now: NOW, timelineDays: 15, cadence: 'DAILY' },
      groundRow: { timelineDays: 15, cadence: 'DAILY' },
    }, 'u-grace', 'MEMBER');
    expect(theHeaderSays(b.phaseSpine.currentSession, b.phaseSpine.plannedSessions, false)).toBe('Check-in 3 of 15.');
    expect(theHeaderSays(theSessionClock(DROP_ROWS.filter((r) => r.participantId !== 'p-grace') as any, new Set(['p-joseph', 'p-kevin', 'p-mercy']), 15, NOW, false).currentSession, 15, false)).toBe('Check-in 3 of 15.');
  });

  it("the check-in's own header counts the same session", () => {
    const clock = theSessionClock(DROP_ROWS.filter((r) => r.participantId !== 'p-grace') as any, new Set(['p-joseph', 'p-kevin', 'p-mercy']), 15, NOW);
    expect(clock.says).toBe('Check-in 4 of 15.');
    expect(clock.whileOpen).toBeNull();
  });

  it('a finished round with nothing after it that has come stays the count', () => {
    const early = new Date('2026-10-14T20:00:00Z');
    const clock = theSessionClock(DROP_ROWS.filter((r) => r.participantId !== 'p-grace') as any, new Set(['p-joseph', 'p-kevin', 'p-mercy']), 15, early);
    expect(clock.says).toBe('Check-in 3 of 15.');
  });
});
