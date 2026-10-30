import { theirClosedSessions } from './missed-check-ins';
import { thePersonHistory } from '../board/the-switchboards-own-sections';
import { theirDay } from '../engagement/who-answers-and-when';
import { whatNeedsYou, type ListedCheckIn } from './what-needs-you';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';

/**
 * NO MISS ON A DAY THEY CHECKED IN, ON EVERY SURFACE (polish round 15; board/a-day-they-checked-in.ts).
 *
 * Kevin (Drop Access, "Sales team, Q4", daily) answered every working day from Monday 12 to Friday 16 October. On Monday evening he
 * pressed the button in his invitation email, which opened Tuesday's session early; he said nothing in it and the clock closed it at
 * 07:00 on Tuesday. He answered at 11:00 that day, in the next session. Every surface counted the closed one as missed:
 *   - the weekly letter: "Kevin missed one of six";
 *   - his own board: "You have missed 1 session. In session 2, you did not check in before it closed.";
 *   - the morning: "Kevin checked in on time 4 days running".
 * And Aisha (Muchemi & Co, "Litigation team daily") answered every day, but Wanjiru's Today read "Aisha has not checked in yet." each
 * evening, about the next day's session written ahead of time. The rows are theirs as round 15 kept them.
 */
const d = (iso: string) => new Date(iso);
const said = (at: string) => [{ id: 't', createdAt: d(at) }];
const KEVIN = [
  { id: 'k1', sessionNumber: 1, status: 'COMPLETED', availableFrom: null, createdAt: d('2026-10-12T05:03:37Z'), completedAt: d('2026-10-12T11:03:24Z'), closedReason: null, turns: said('2026-10-12T11:00:45Z') },
  { id: 'k2', sessionNumber: 2, status: 'COMPLETED', availableFrom: d('2026-10-13T05:00:00Z'), createdAt: d('2026-10-12T11:03:24Z'), completedAt: d('2026-10-13T07:00:43Z'), closedReason: CLOSED_BY_THE_CLOCK, turns: [] },
  { id: 'k3', sessionNumber: 3, status: 'COMPLETED', availableFrom: d('2026-10-13T11:00:06Z'), createdAt: d('2026-10-13T07:00:43Z'), completedAt: d('2026-10-13T11:03:34Z'), closedReason: null, turns: said('2026-10-13T11:00:22Z') },
  { id: 'k4', sessionNumber: 4, status: 'COMPLETED', availableFrom: d('2026-10-14T05:00:00Z'), createdAt: d('2026-10-13T11:03:34Z'), completedAt: d('2026-10-14T11:03:18Z'), closedReason: null, turns: said('2026-10-14T11:00:50Z') },
  { id: 'k5', sessionNumber: 5, status: 'COMPLETED', availableFrom: d('2026-10-15T05:00:00Z'), createdAt: d('2026-10-14T11:03:18Z'), completedAt: d('2026-10-15T11:03:24Z'), closedReason: null, turns: said('2026-10-15T11:01:15Z') },
  { id: 'k6', sessionNumber: 6, status: 'COMPLETED', availableFrom: d('2026-10-16T05:00:00Z'), createdAt: d('2026-10-15T11:03:24Z'), completedAt: d('2026-10-16T11:03:43Z'), closedReason: null, turns: said('2026-10-16T11:00:40Z') },
  { id: 'k7', sessionNumber: 7, status: 'NOT_STARTED', availableFrom: d('2026-10-19T05:00:00Z'), createdAt: d('2026-10-16T11:03:43Z'), completedAt: null, closedReason: null, turns: [] },
].map((c) => ({ ...c, participantId: 'p-kevin', isSetup: false, optional: false, missedReason: null }));
const FRIDAY_EVENING = d('2026-10-16T18:30:00Z');

describe('Kevin, who answered every working day', () => {
  it('the weekly letter and the missed check-in notices count no miss', () => {
    const closed = theirClosedSessions(KEVIN as any, [], FRIDAY_EVENING, { opensDaily: true });
    expect(closed.filter((c) => c.missed)).toEqual([]);
    expect(closed.map((c) => c.sessionNumber)).toEqual([1, 3, 4, 5, 6]);
  });

  it('his own board says he answered, and never "You have missed 1 session"', () => {
    const r: any = { mayReadEveryone: false, meId: 'p-kevin', personMayBeRead: () => true, nameOf: () => 'You', aColleague: () => 'A colleague' };
    const [mine] = thePersonHistory([{ id: 'p-kevin', managingOnly: false }], [], [], KEVIN as any, r, true);
    const text = [mine.says, ...mine.sessions.map((s) => s.says)].join('\n');
    expect(mine.says).toBe('You have answered 5 sessions, and have made no commitment on record yet.');
    expect(text).not.toMatch(/missed|did not check in before it closed/);
  });

  it('the morning counts five days running on time, not four', () => {
    const day = theirDay('p-kevin', KEVIN.map((c) => ({ ...c, opensDaily: true })) as any, FRIDAY_EVENING, 'Africa/Nairobi');
    expect(day.onTimeRunning).toBe(5);
    expect(day.missedDays).toEqual([]);
  });
});

describe('once a week, each session is its own check-in', () => {
  it('a weekly session left quiet is still missed, even on the day they answered last week’s late', () => {
    const weekly = [
      { ...KEVIN[0], completedAt: d('2026-10-19T09:00:00Z'), turns: said('2026-10-19T08:30:00Z') },
      { ...KEVIN[1], availableFrom: d('2026-10-19T05:00:00Z'), completedAt: d('2026-10-26T05:00:00Z') },
    ];
    expect(theirClosedSessions(weekly as any, [], d('2026-10-27T09:00:00Z')).filter((c) => c.missed).map((c) => c.sessionNumber)).toEqual([2]);
  });
});

describe('Aisha, on Wanjiru’s Today, the evening of Wednesday 14 October', () => {
  const NOW = d('2026-10-14T18:30:34Z');
  const row = (id: string, participantId: string, sessionNumber: number, status: string, availableFrom: string | null, completedAt: string | null, answeredAt: string | null) =>
    ({ id, participantId, sessionNumber, status, availableFrom, completedAt, closedReason: null, turns: answeredAt ? said(answeredAt) : [] });
  const lit: ListedCheckIn = {
    id: 'g-lit', label: 'Litigation team daily', status: 'ACTIVE', organizationId: 'org-mu', initiatorId: 'u-wanjiru',
    participants: [
      { id: 'p-wanjiru', userId: 'u-wanjiru', user: { firstName: 'Wanjiru' } },
      { id: 'p-aisha', userId: 'u-aisha', user: { firstName: 'Aisha' } },
      { id: 'p-brian', userId: 'u-brian', user: { firstName: 'Brian' } },
      { id: 'p-njeri', userId: 'u-njeri', user: { firstName: 'Njeri' } },
    ],
    checkIns: [
      /* Aisha answered Monday, Tuesday and today; her fourth session is tomorrow's, written ahead of time. */
      row('a3', 'p-aisha', 3, 'COMPLETED', '2026-10-14T05:00:00Z', '2026-10-14T11:16:53Z', '2026-10-14T11:14:30Z'),
      row('a4', 'p-aisha', 4, 'NOT_STARTED', '2026-10-15T05:00:00Z', null, null),
      /* Brian and Njeri had an extra session on Monday, so their fourth was Tuesday's, answered. */
      row('b4', 'p-brian', 4, 'COMPLETED', '2026-10-13T11:10:02Z', '2026-10-13T11:13:00Z', '2026-10-13T11:10:20Z'),
      row('n4', 'p-njeri', 4, 'COMPLETED', '2026-10-13T11:16:13Z', '2026-10-13T11:19:16Z', '2026-10-13T11:16:40Z'),
    ] as any,
    glance: { progress: { roundsDone: 3, roundsPlanned: null, answeredThisRound: 2, ofPeople: 3, waitingOn: ['p-aisha'], openRound: 4 } },
  } as any;
  (lit as any).cadence = 'DAILY';

  it('does not say Aisha has not checked in', () => {
    const today = whatNeedsYou([lit], { userId: 'u-wanjiru', role: 'MEMBER', organizationId: 'org-mu' }, [], NOW);
    expect(today.line ?? '').not.toMatch(/Aisha/);
  });

  it('still names somebody whose session today is open and unanswered', () => {
    const waiting = { ...lit, checkIns: [...(lit.checkIns as any[]).filter((c) => c.id !== 'a3' && c.id !== 'a4'), row('a3', 'p-aisha', 3, 'NOT_STARTED', '2026-10-14T05:00:00Z', null, null)], glance: { progress: { ...lit.glance!.progress, openRound: 3 } } } as any;
    waiting.checkIns.push(row('b3', 'p-brian', 3, 'COMPLETED', '2026-10-14T05:00:00Z', '2026-10-14T11:13:00Z', '2026-10-14T11:10:20Z'), row('n3', 'p-njeri', 3, 'COMPLETED', '2026-10-14T05:00:00Z', '2026-10-14T11:19:16Z', '2026-10-14T11:16:40Z'));
    const today = whatNeedsYou([waiting], { userId: 'u-wanjiru', role: 'MEMBER', organizationId: 'org-mu' }, [], NOW);
    expect(today.line).toBe('In Litigation team daily, 2 of 3 have checked in for the third check-in. Aisha has not checked in yet.');
  });
});
