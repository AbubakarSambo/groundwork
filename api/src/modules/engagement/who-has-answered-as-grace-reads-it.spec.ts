import { theDirectMorningFor, asServedOnTheBoard, theEmailParts } from './the-direct-morning';
import { theNightRunsDatabase, theLeadsBoard, theLeadOf, N } from './the-night-run-bed';
import { theirDay, theirUsualTime, twoMissedDaysSaid, notInTodaySaid, onTimeSaid, onTimeSaidToYou, mayBeNudged } from './who-answers-and-when';

/**
 * WHO HAS ANSWERED, AS GRACE READS IT IN HER MORNING AND AT THE TOP OF HER BOARD (nudges that get answers, 20 October 2026), from the
 * second night run (gw_night_run2). Behind the direct morning's switch: off, nothing here is said to anybody.
 *
 *  - Past their usual time today: "Peter hasn't checked in today, and last checked in yesterday."
 *  - Two missed days in a row: "Joseph hasn't checked in for 2 days, on Tuesday 20 October and Wednesday 21 October. Call Joseph."
 *  - Checking in on time: "Kevin checked in on time 6 days running."
 */
const DROP = N.drop.ground.id;
const ZONE = 'Africa/Nairobi';
const JOSEPH = '2274e6af-8d37-4388-bd39-8a7aeb582d7b';
const KEVIN = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c';
const PETER = 'dfda363d-d9f3-4f01-bcb0-ae9f8d722f6f';
const dated = (c: any) => ({ ...c, completedAt: c.completedAt ? new Date(c.completedAt) : null, availableFrom: c.availableFrom ? new Date(c.availableFrom) : null, createdAt: new Date(c.createdAt) });

/** The record as it would stand on Thursday 22 October had Joseph's sessions of Tuesday and Wednesday both been closed by the clock. */
function josephMissesTwoDays() {
  const rows = (N.drop.checkIns as any[]).map(dated);
  const seven = rows.find((c) => c.participantId === JOSEPH && c.sessionNumber === 7);
  Object.assign(seven, { status: 'COMPLETED', completedAt: new Date('2026-10-21T05:00:00Z'), closedReason: 'auto_closed' });
  rows.push({ ...seven, id: 'joseph-8', sessionNumber: 8, availableFrom: new Date('2026-10-21T05:00:00Z'), createdAt: new Date('2026-10-21T05:00:00Z'), completedAt: new Date('2026-10-22T05:00:00Z') });
  rows.push({ ...seven, id: 'joseph-9', sessionNumber: 9, status: 'NOT_STARTED', closedReason: null, availableFrom: new Date('2026-10-22T05:00:00Z'), createdAt: new Date('2026-10-22T05:00:00Z'), completedAt: null });
  return rows;
}
const morningAt = async (now: Date, opts: { directMorning?: boolean; rows?: any[] } = {}) => {
  const db = theNightRunsDatabase('drop', { directMorning: opts.directMorning ?? true });
  if (opts.rows) db.checkIn.findMany = jest.fn(async () => opts.rows);
  return theDirectMorningFor(db, { groundId: DROP, leadUserId: theLeadOf('drop').userId, board: theLeadsBoard('drop'), now });
};
const team = (m: any) => asServedOnTheBoard(m).parts.find((p) => p.key === 'team')?.lines ?? [];

describe('each person’s usual time, from their own answers', () => {
  const rows = (N.drop.checkIns as any[]).map(dated);
  it('Kevin answers at about two in the afternoon in Nairobi, so he is late today after about three', () => {
    expect(theirUsualTime(rows.filter((c) => c.participantId === KEVIN), ZONE, '2026-10-20')).toBe(14 * 60 + 4);
    const d = theirDay(KEVIN, rows, new Date('2026-10-20T12:30:00Z'), ZONE);
    expect(d.lateAfter).toEqual({ minutes: 15 * 60 + 4, from: 'their usual time' });
    expect(d.lateToday).toBe(true);
    expect(theirDay(KEVIN, rows, new Date('2026-10-20T11:30:00Z'), ZONE).lateToday).toBe(false);
  });
  it('with fewer than three answers of their own, three hours after the session opened is used, and it says so', () => {
    const one = [{ participantId: 'x', status: 'NOT_STARTED', availableFrom: new Date('2026-10-20T05:00:00Z'), createdAt: new Date('2026-10-20T05:00:00Z') }];
    expect(theirDay('x', one, new Date('2026-10-20T08:30:00Z'), ZONE).lateAfter).toEqual({ minutes: 11 * 60, from: 'the opening' });
    expect(theirDay('x', one, new Date('2026-10-20T08:30:00Z'), ZONE).lateToday).toBe(true);
    expect(theirDay('x', one, new Date('2026-10-20T07:30:00Z'), ZONE).lateToday).toBe(false);
  });
  it('a session the clock closed is never counted as an answer, on time or otherwise', () => {
    const d = theirDay(JOSEPH, rows, new Date('2026-10-20T06:00:00Z'), ZONE);
    expect(d.onTimeRunning).toBe(0);
    expect(d.lastCheckedIn).toBe('2026-10-19');
  });
});

describe('Grace’s morning and the top of her board, with the switch on', () => {
  it('in the afternoon, past each person’s usual time, names who has not checked in today and the day they last did', async () => {
    const m = await morningAt(new Date('2026-10-20T12:30:00Z'));
    expect(team(m)).toEqual([
      "Peter hasn't checked in today, and last checked in yesterday.",
      "Kevin hasn't checked in today, and last checked in yesterday.",
      "Joseph hasn't checked in today, and last checked in yesterday.",
      "Mercy hasn't checked in today, and last checked in yesterday.",
    ]);
    expect(m!.mayBeNudged!.map((p) => p.firstName)).toEqual(['Peter', 'Kevin', 'Joseph', 'Mercy']);
  });

  it('in the morning, before anybody’s usual time, names nobody as late and credits who checks in on time', async () => {
    const m = await morningAt(new Date('2026-10-20T04:00:00Z'));
    const lines = team(m);
    expect(lines).toContain('Kevin checked in on time 6 days running.');
    expect(lines).toContain('Peter checked in on time 6 days running.');
    expect(lines).toContain('Mercy checked in on time 4 days running.');
    expect(lines.join(' ')).not.toMatch(/hasn't checked in today/);
    expect(lines.join(' ')).not.toMatch(/Joseph checked in on time/);
    expect(m!.mayBeNudged).toEqual([]);
  });

  it('after two missed days in a row, says so plainly with the days, and tells Grace to call', async () => {
    const m = await morningAt(new Date('2026-10-22T06:00:00Z'), { rows: josephMissesTwoDays() });
    expect(team(m)[0]).toBe("Joseph hasn't checked in for 2 days, on Tuesday 20 October and Wednesday 21 October. Call Joseph.");
    /* The same line in her email, under its heading. */
    expect(theEmailParts([m!]).find((p) => p.heading === 'Your team today')!.lines[0]).toBe(team(m)[0]);
    expect(m!.mayBeNudged!.map((p) => p.participantId)).toContain(JOSEPH);
  });

  it('never names Grace herself, and says no label about anybody', async () => {
    const all = [...team(await morningAt(new Date('2026-10-20T12:30:00Z'))), ...team(await morningAt(new Date('2026-10-22T06:00:00Z'), { rows: josephMissesTwoDays() }))].join(' ');
    expect(all).not.toMatch(/\bGrace\b/);
    expect(all).not.toMatch(/\b(?:unreliable|lazy|at risk|PIP|exit|poor|bad|late person|slacker)\b/i);
  });
});

describe('with the switch off', () => {
  it('nothing is built, so nobody reads any of it', async () => {
    expect(await morningAt(new Date('2026-10-20T12:30:00Z'), { directMorning: false })).toBeNull();
    expect(await morningAt(new Date('2026-10-22T06:00:00Z'), { directMorning: false, rows: josephMissesTwoDays() })).toBeNull();
  });
});

describe('the sentences, one at a time', () => {
  const day = (over: any) => ({ participantId: 'p', dueToday: true, answeredToday: false, answeredOnTimeToday: false, lateAfter: null, lateToday: false, lastCheckedIn: '2026-10-19', missedDays: [], onTimeRunning: 0, onTimeLastDay: null, ...over });
  it('two missed days on a weekly check-in are said as the times it opened, not as days in a row', () => {
    expect(twoMissedDaysSaid('Peter', day({ missedDays: ['2026-10-12', '2026-10-19'] }), [1, 2, 3, 4, 5])).toBe("Peter hasn't checked in the last 2 times the check-in opened, on Monday 12 October and Monday 19 October. Call Peter.");
    expect(twoMissedDaysSaid('Peter', day({ missedDays: ['2026-10-16', '2026-10-19'] }), [1, 2, 3, 4, 5])).toBe("Peter hasn't checked in for 2 days, on Friday 16 October and Monday 19 October. Call Peter.");
    expect(twoMissedDaysSaid('Peter', day({ missedDays: ['2026-10-14', '2026-10-15', '2026-10-16'] }), null)).toBe("Peter hasn't checked in for 3 days, since Wednesday 14 October. Call Peter.");
    expect(twoMissedDaysSaid('Peter', day({ missedDays: ['2026-10-19'] }), null)).toBeNull();
  });
  it('not in today, and the credit', () => {
    expect(notInTodaySaid('Peter', day({ lateToday: true, lastCheckedIn: '2026-10-16' }), '2026-10-20')).toBe("Peter hasn't checked in today, and last checked in on Friday 16 October.");
    expect(notInTodaySaid('Peter', day({ lateToday: true, lastCheckedIn: null }), '2026-10-20')).toBe("Peter hasn't checked in today, and has not checked in yet.");
    expect(notInTodaySaid('Peter', day({ lateToday: false }), '2026-10-20')).toBeNull();
    expect(onTimeSaid('Kevin', day({ onTimeRunning: 5, onTimeLastDay: '2026-10-20' }), '2026-10-20')).toBe('Kevin checked in on time 5 days running.');
    expect(onTimeSaid('Kevin', day({ onTimeRunning: 1, onTimeLastDay: '2026-10-20' }), '2026-10-20')).toBe('Kevin checked in on time today.');
    expect(onTimeSaid('Kevin', day({ onTimeRunning: 1, onTimeLastDay: '2026-10-19' }), '2026-10-20')).toBeNull();
    expect(onTimeSaidToYou(day({ onTimeRunning: 5, onTimeLastDay: '2026-10-20' }), '2026-10-20')).toBe('You checked in on time today, 5 days running.');
    expect(onTimeSaidToYou(day({ onTimeRunning: 5, onTimeLastDay: '2026-10-19' }), '2026-10-20')).toBe('You checked in on time yesterday, 5 days running.');
  });
  it('only somebody with a session open and unanswered, who is late or missed a day, may be nudged', () => {
    expect(mayBeNudged(day({ lateToday: true }))).toBe(true);
    expect(mayBeNudged(day({ missedDays: ['2026-10-19'] }))).toBe(true);
    expect(mayBeNudged(day({}))).toBe(false);
    expect(mayBeNudged(day({ lateToday: true, answeredToday: true }))).toBe(false);
    expect(mayBeNudged(day({ lateToday: true, dueToday: false }))).toBe(false);
  });
  it('Peter, from the record, is credited before his usual time and late after it', () => {
    const rows = (N.drop.checkIns as any[]).map(dated);
    expect(theirDay(PETER, rows, new Date('2026-10-20T06:00:00Z'), ZONE).onTimeRunning).toBe(6);
    expect(theirDay(PETER, rows, new Date('2026-10-20T13:00:00Z'), ZONE).lateToday).toBe(true);
  });
});
