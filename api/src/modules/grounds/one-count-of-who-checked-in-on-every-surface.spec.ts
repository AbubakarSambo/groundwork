import { theSessionAndItsCount } from './this-sessions-count';
import { howACheckInIsGoing } from './how-a-check-in-is-going';
import { theSessionRowsOf, theRoundsDone } from './the-sessions-done';
import { theCountAsServed, theClocksSessionIn } from './the-count-as-served';
import { theirClosedSessions } from './missed-check-ins';
import { theTeamsOpenRound, inTheTeamsNumbering } from '../board/which-round-is-open';
import { theSessionClock } from '../board/one-count-for-the-sessions';
import { theirDay, twoMissedDaysSaid } from '../engagement/who-answers-and-when';

/**
 * ONE COUNT OF WHO HAS CHECKED IN, ON EVERY SURFACE (release test, 21 November 2026).
 *
 * The world the release test ran: Wairimu leads "Sales team, Q4", weekly, twelve sessions. Amani, Chidi, Zawadi, Juma and Neema were
 * there from the start and all checked in for session 1. In session 2, Amani and Chidi have checked in; Zawadi, Juma and Neema have not.
 * Olu is added in week 2 and has started his first session, which is his session 1 and the team's session 2.
 *
 * What people read that night: Today and Ask said "6 of 7 have checked in; Olu has started and not finished yet." (session 1, counted
 * again because Olu's first row held it open), the participant's board "None of the 12 check-ins is done yet", the lead's board "Juma
 * has checked in", and the morning "Amani hasn't checked in for 2 days". Every one of those surfaces reads one of the functions below;
 * this world checks they all say the same session, the same count and the same sessions done.
 */
const D = (s: string) => new Date(s);
const NOW = D('2026-11-17T09:00:00Z'); // Tuesday of week 2: session 2 opened on Saturday 14 November
const S1 = D('2026-11-07T07:00:00Z');
const S2 = D('2026-11-14T07:00:00Z');
const S3 = D('2026-11-21T07:00:00Z');

const person = (id: string, first: string, extra: Record<string, unknown> = {}) => ({ id, userId: `u-${id}`, partyType: 'PARTICIPANT', joinedAt: S1, user: { firstName: first }, ...extra });
const PEOPLE = [
  person('wairimu', 'Wairimu', { partyType: 'INITIATOR' }),
  person('amani', 'Amani'), person('chidi', 'Chidi'), person('zawadi', 'Zawadi'), person('juma', 'Juma'), person('neema', 'Neema'),
  person('olu', 'Olu', { joinedAt: D('2026-11-16T10:00:00Z') }),
];

const said = (at: Date) => [{ id: `t-${at.getTime()}`, createdAt: at }];
const row = (participantId: string, sessionNumber: number, status: string, availableFrom: Date, extra: Record<string, unknown> = {}) => ({
  id: `${participantId}-${sessionNumber}`, participantId, sessionNumber, status, availableFrom, createdAt: S1, isSetup: false, closedReason: null, turns: [] as unknown[], completedAt: null as Date | null, ...extra,
});
const answered = (participantId: string, n: number, opened: Date, at: Date) => row(participantId, n, 'COMPLETED', opened, { completedAt: at, turns: said(at), createdAt: n === 1 ? S1 : opened });
const open = (participantId: string, n: number, opened: Date) => row(participantId, n, 'NOT_STARTED', opened, { createdAt: opened });

const ROWS = [
  { ...row('wairimu', 0, 'COMPLETED', S1), isSetup: true },
  answered('wairimu', 1, S1, D('2026-11-07T08:00:00Z')),
  ...['amani', 'chidi', 'zawadi', 'juma', 'neema'].map((p) => answered(p, 1, S1, D('2026-11-07T10:00:00Z'))),
  answered('amani', 2, S2, D('2026-11-14T09:00:00Z')), open('amani', 3, S3),
  answered('chidi', 2, S2, D('2026-11-14T11:00:00Z')), open('chidi', 3, S3),
  open('zawadi', 2, S2), open('juma', 2, S2), open('neema', 2, S2),
  /* Olu's first session: written when he was added, in week 2, and started. */
  row('olu', 1, 'IN_PROGRESS', D('2026-11-16T10:00:00Z'), { createdAt: D('2026-11-16T10:00:00Z'), turns: said(D('2026-11-16T10:05:00Z')) }),
];

const GROUND = { participants: PEOPLE, checkIns: ROWS, scenario: 'SALES', timelineDays: 84, cadence: 'WEEKLY', cadenceDays: null, runsUntilEnded: false };

describe('one count of who has checked in, read the same on every surface', () => {
  const { clock, count, bySession } = theSessionAndItsCount(GROUND as any, { now: NOW, names: { readerUserId: 'u-wairimu' } });

  it('the clock is the team’s session 2, not Olu’s first session', () => {
    expect(clock.currentSession).toBe(2);
    /* The board's header and phase line ask whichRoundIsOpen through theTeamsOpenRound. */
    expect(theTeamsOpenRound(ROWS as any, PEOPLE as any)).toBe(2);
    expect(theSessionClock(ROWS.filter((r) => !r.isSetup) as any, new Set(PEOPLE.filter((p) => p.partyType !== 'INITIATOR').map((p) => p.id)), 12, NOW).currentSession).toBe(2);
  });

  it('Today, the check-ins list, the board and Ask read: two of six have checked in, and who has not, by name', () => {
    expect(count.answered).toBe(2);
    expect(count.ofPeople).toBe(6);
    expect(count.says).toBe('2 of 6 have checked in; Olu has started and not finished yet, and Zawadi, Juma and Neema haven’t started yet.');
    /* What the list and the board are served is the same count (theCountAsServed). */
    const served = theCountAsServed({ session: clock.currentSession, said: count, planned: 12 }, bySession, { onlyThese: null });
    expect(theClocksSessionIn(served)?.answered.length).toBe(2);
    expect(theClocksSessionIn(served)?.onTheCheckIn.length).toBe(6);
  });

  it('the participant’s board and Ask’s "how is my team doing" read the same count, and one session done', () => {
    const going = howACheckInIsGoing({ ...GROUND, dependencies: [], sharedPicture: null, round: clock.currentSession } as any, NOW);
    expect(going.glance.progress.answeredThisRound).toBe(2);
    expect(going.glance.progress.ofPeople).toBe(6);
    expect(going.glance.progress.roundsDone).toBe(1);
    /* With no round given (a reader the clock is not passed to), the same session. */
    const alone = howACheckInIsGoing({ ...GROUND, dependencies: [], sharedPicture: null } as any, NOW);
    expect(alone.glance.progress.answeredThisRound).toBe(2);
    expect(alone.glance.progress.roundsDone).toBe(1);
  });

  it('People and setup counts the sessions done by the same clock', () => {
    expect(theRoundsDone(theSessionRowsOf(ROWS as any, PEOPLE), undefined, NOW, clock.currentSession)).toBe(1);
  });

  it('a session the clock has moved past is done, whoever missed it', () => {
    const later = D('2026-11-24T09:00:00Z');
    /* As the sweep leaves it when session 3 opens: what nobody answered in session 2 closed by the clock, and a session 3 for each. */
    const closed = { status: 'COMPLETED', closedReason: 'closed-by-the-clock', completedAt: S3 };
    const week3 = [
      ...ROWS.map((r) => (r.sessionNumber === 2 && r.status === 'NOT_STARTED' ? { ...r, ...closed } : r.participantId === 'olu' ? { ...r, ...closed } : r)),
      ...['zawadi', 'juma', 'neema'].map((p) => open(p, 3, S3)), { ...open('olu', 2, S3), createdAt: S3 },
    ];
    const c = theSessionAndItsCount({ ...GROUND, checkIns: week3 } as any, { now: later });
    expect(c.clock.currentSession).toBe(3);
    expect(theRoundsDone(theSessionRowsOf(week3 as any, PEOPLE), undefined, later, c.clock.currentSession)).toBe(2);
  });

  it('Olu’s first session is the team’s session 2 in every count, and his own rows keep their numbers', () => {
    const numbered = inTheTeamsNumbering(ROWS as any[]);
    expect(numbered.find((r) => r.participantId === 'olu')?.sessionNumber).toBe(2);
    expect(ROWS.find((r) => r.participantId === 'olu')?.sessionNumber).toBe(1);
    /* Everybody there from the start keeps their numbers, and numbering twice changes nothing. */
    expect(numbered.filter((r) => r.participantId !== 'olu').map((r) => r.sessionNumber)).toEqual(ROWS.filter((r) => r.participantId !== 'olu').map((r) => r.sessionNumber));
    expect(inTheTeamsNumbering(numbered).map((r) => r.sessionNumber)).toEqual(numbered.map((r) => r.sessionNumber));
  });

  it('the lead’s morning tells nobody to call anybody about one session of a weekly check-in, and Amani, who answered, missed nothing', () => {
    expect(theirDay('amani', ROWS as any, NOW, 'Africa/Nairobi').missedDays).toEqual([]);
    for (const who of ['amani', 'zawadi', 'olu']) expect(twoMissedDaysSaid(who, theirDay(who, ROWS as any, NOW, 'Africa/Nairobi'), [1, 2, 3, 4, 5])).toBeNull();
  });

  it('the weekly letter, against the check-in’s clock, has nobody missing a session still open, and Zawadi missing none she answered', () => {
    for (const who of ['amani', 'chidi', 'zawadi', 'olu']) {
      const theirs = inTheTeamsNumbering(ROWS as any[]).filter((r) => r.participantId === who);
      expect(theirClosedSessions(theirs as any, [], NOW, { theClocksSession: clock.currentSession }).filter((c) => c.missed)).toEqual([]);
    }
  });
});
