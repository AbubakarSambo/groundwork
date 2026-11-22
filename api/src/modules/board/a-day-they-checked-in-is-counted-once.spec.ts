import { thePersonsRecord } from './the-persons-record';
import { theRecordInWords } from './the-persons-record-in-words';
import { myWorkFrom } from './my-work';

/**
 * A DAY THEY CHECKED IN IS COUNTED ONCE, FROM WHAT ACTUALLY HAPPENED (polish round 15, Drop Access, "Sales team, Q4", daily).
 *
 * The rows are Kevin's and Peter's as round 15 kept them (Africa/Nairobi; times in UTC).
 *
 * Kevin answered every working day, Monday 12 to Friday 16 October. On Monday evening he pressed the button in his invitation email,
 * which opened Tuesday's session early; he said nothing in it, and the clock closed it at 07:00 on Tuesday. His Tuesday answer came at
 * 11:00 and opened the next session that moment. Grace's board read "Kevin did five of six check-ins ... On Tuesday 13 October, the
 * check-in was not done."
 *
 * Peter answered on Monday 12 and Thursday 15 only. Two sessions the clock closed with nothing from him were counted as done, and his
 * own page read "You did 4 of 5 check-ins on time".
 */
const ZONE = 'Africa/Nairobi';
const d = (iso: string) => new Date(iso);
type Row = { id: string; sessionNumber: number; status: string; availableFrom: Date | null; createdAt: Date; completedAt: Date | null; closedReason?: string | null; answers: number; firstAnswer?: string };
const KEVIN: Row[] = [
  { id: 'k1', sessionNumber: 1, status: 'COMPLETED', availableFrom: null, createdAt: d('2026-10-12T05:03:37Z'), completedAt: d('2026-10-12T11:03:24Z'), answers: 10, firstAnswer: '2026-10-12T11:00:45Z' },
  /* Opened by the email button on Monday evening, closed by the clock on Tuesday morning, nothing from Kevin in it. */
  { id: 'k2', sessionNumber: 2, status: 'COMPLETED', availableFrom: d('2026-10-13T05:00:00Z'), createdAt: d('2026-10-12T11:03:24Z'), completedAt: d('2026-10-13T07:00:43Z'), closedReason: 'auto_closed', answers: 0 },
  /* His Tuesday answer opened this one at 11:00. */
  { id: 'k3', sessionNumber: 3, status: 'COMPLETED', availableFrom: d('2026-10-13T11:00:06Z'), createdAt: d('2026-10-13T07:00:43Z'), completedAt: d('2026-10-13T11:03:34Z'), answers: 13, firstAnswer: '2026-10-13T11:00:22Z' },
  { id: 'k4', sessionNumber: 4, status: 'COMPLETED', availableFrom: d('2026-10-14T05:00:00Z'), createdAt: d('2026-10-13T11:03:34Z'), completedAt: d('2026-10-14T11:03:18Z'), answers: 7, firstAnswer: '2026-10-14T11:00:50Z' },
  { id: 'k5', sessionNumber: 5, status: 'COMPLETED', availableFrom: d('2026-10-15T05:00:00Z'), createdAt: d('2026-10-14T11:03:18Z'), completedAt: d('2026-10-15T11:03:24Z'), answers: 6, firstAnswer: '2026-10-15T11:01:15Z' },
  { id: 'k6', sessionNumber: 6, status: 'COMPLETED', availableFrom: d('2026-10-16T05:00:00Z'), createdAt: d('2026-10-15T11:03:24Z'), completedAt: d('2026-10-16T11:03:43Z'), answers: 10, firstAnswer: '2026-10-16T11:00:40Z' },
  { id: 'k7', sessionNumber: 7, status: 'NOT_STARTED', availableFrom: d('2026-10-19T05:00:00Z'), createdAt: d('2026-10-16T11:03:43Z'), completedAt: null, answers: 0 },
];
const PETER: Row[] = [
  { id: 'p1', sessionNumber: 1, status: 'COMPLETED', availableFrom: null, createdAt: d('2026-10-12T05:03:41Z'), completedAt: d('2026-10-12T11:12:23Z'), answers: 9, firstAnswer: '2026-10-12T11:10:00Z' },
  { id: 'p2', sessionNumber: 2, status: 'COMPLETED', availableFrom: d('2026-10-13T05:00:00Z'), createdAt: d('2026-10-12T11:12:23Z'), completedAt: d('2026-10-13T07:00:06Z'), closedReason: 'auto_closed', answers: 0 },
  { id: 'p3', sessionNumber: 3, status: 'COMPLETED', availableFrom: d('2026-10-14T05:00:00Z'), createdAt: d('2026-10-13T07:00:06Z'), completedAt: d('2026-10-14T23:30:14Z'), closedReason: 'auto_closed', answers: 0 },
  /* Opened at 02:30 on Thursday, Nairobi time; Peter answered at 16:00 that afternoon. */
  { id: 'p4', sessionNumber: 4, status: 'COMPLETED', availableFrom: d('2026-10-14T23:30:14Z'), createdAt: d('2026-10-14T23:30:14Z'), completedAt: d('2026-10-15T13:02:02Z'), answers: 2, firstAnswer: '2026-10-15T13:01:00Z' },
  { id: 'p5', sessionNumber: 5, status: 'NOT_STARTED', availableFrom: d('2026-10-16T05:00:00Z'), createdAt: d('2026-10-15T13:02:02Z'), completedAt: null, answers: 0 },
];
const FRIDAY_EVENING = d('2026-10-16T18:30:00Z');
const MONDAY_MORNING = d('2026-10-19T08:30:00Z');

const theRecordOf = (rows: Row[], now: Date) => thePersonsRecord({
  participantId: 'p', now, zone: ZONE, sales: true, daily: { workingDays: [1, 2, 3, 4, 5] },
  checkIns: rows.map((r) => ({ ...r, specificityLevel: r.answers ? 'specific' : null, _count: { turns: r.answers } })),
  theirTurns: rows.filter((r) => r.firstAnswer).map((r) => ({ content: 'An answer.', at: d(r.firstAnswer!), checkInId: r.id })),
  lines: [], items: [], commitments: [], saidDone: {}, blockers: [], codes: [], ourTurns: [],
} as any);
const theCheckInsPart = (rows: Row[], now: Date, first: string) =>
  theRecordInWords(theRecordOf(rows, now), [], { self: false, firstName: first }, 'Sales team, Q4').parts.find((p: any) => /check-ins$/.test(p.heading)) as any;
const theirOwnPage = (rows: Row[], now: Date, first: string) => {
  const page: any = myWorkFrom({
    reader: 'self', person: { participantId: 'p', name: `${first} Test`, firstName: first }, leadFirst: 'Grace', kindOfWork: 'sales org',
    items: [], commitments: [], waitsOnThem: [], raised: [], credits: [], ownLines: [], patterns: [], teamCoaching: [], helpWith: null, target: null,
    checkIns: rows.map((r) => ({ ...r, specificityLevel: r.answers ? 'specific' : null, firstAnsweredAt: r.firstAnswer ?? null })),
    now, timeZone: ZONE, daily: { workingDays: [1, 2, 3, 4, 5] },
  } as any, 'Sales team, Q4');
  return page.performing.behaviours.find((b: any) => b.key === 'check-in-quality');
};

describe('Kevin, who answered every working day, as Grace reads his record and as he reads his own page', () => {
  it('Grace reads five of five, all on time, and no Tuesday not done', () => {
    const part = theCheckInsPart(KEVIN, FRIDAY_EVENING, 'Kevin');
    expect(part.says).toBe('Kevin did five of five check-ins, all on time. Five of them named the item, what changed and the day.');
    expect(part.evidence.join(' ')).not.toMatch(/not done/);
  });

  it('his Tuesday counts on Tuesday: the session his own message opened early is Tuesday’s check-in, on time', () => {
    const tuesday = theRecordOf(KEVIN, FRIDAY_EVENING).checkIns.find((c) => c.on === 'Tuesday 13 October')!;
    expect(tuesday).toMatchObject({ sessionNumber: 3, done: true, onTime: true });
  });

  it('on Monday morning, before he has answered Monday’s, it is still five of five', () => {
    expect(theCheckInsPart(KEVIN, MONDAY_MORNING, 'Kevin').says).toBe('Kevin did five of five check-ins, all on time. Five of them named the item, what changed and the day.');
  });

  it('his own page reads the same', () => {
    expect(theirOwnPage(KEVIN, FRIDAY_EVENING, 'Kevin').happened).toBe('You did 5 of 5 check-ins, all on time. 5 of them named the item, what changed and the day.');
  });
});

describe('Peter, who answered on Monday 12 and Thursday 15 only', () => {
  it('on Friday evening Grace reads two of four, with Tuesday and Wednesday not done', () => {
    const part = theCheckInsPart(PETER, FRIDAY_EVENING, 'Peter');
    expect(part.says).toBe('Peter did two of four check-ins, all on time. Two of them named the item, what changed and the day.');
    expect(part.evidence).toEqual(expect.arrayContaining(['On Tuesday 13 October, the check-in was not done.', 'On Wednesday 14 October, the check-in was not done.']));
  });

  it('on Monday morning Friday is missed too: two of five', () => {
    const part = theCheckInsPart(PETER, MONDAY_MORNING, 'Peter');
    expect(part.says).toBe('Peter did two of five check-ins, all on time. Two of them named the item, what changed and the day.');
    expect(part.evidence).toContain('On Friday 16 October, the check-in was not done.');
  });

  it('his own page no longer reads "4 of 5 check-ins on time"', () => {
    const b = theirOwnPage(PETER, MONDAY_MORNING, 'Peter');
    expect(b.happened).toBe('You did 2 of 5 check-ins, all on time. 2 of them named the item, what changed and the day.');
    expect(b.verdict).toBe('Needs work');
  });
});
