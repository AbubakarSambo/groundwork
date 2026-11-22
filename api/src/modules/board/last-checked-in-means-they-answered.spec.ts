import { theirLastAnswer, theirCheckInToday } from './each-persons-line-today';
import { aDaySaidInFull } from './a-day-said-in-full';
import { theirDay } from '../engagement/who-answers-and-when';
import { theDayIn } from './a-day-they-checked-in';

/**
 * RE-TEST, 22 NOVEMBER 2026 EVENING (R-11). Wairimu's sales board read "Chidi last checked in on Monday 23 November.", and the same
 * morning's WhatsApp said "Chidi hasn't checked in the last 2 times the check-in opened, on Sunday 22 November and Monday 23 November".
 * Chidi never opened session 3: at 08:00 on Monday the clock closed it (COMPLETED, closedReason auto_closed, a completedAt, nothing of his
 * in it), and the board's "last checked in" read that row's completedAt. The board now reads the one rule of answering the morning reads
 * (a-day-they-checked-in's whenTheyAnswered): a session the clock closed with nothing of theirs is not a check-in.
 */
const chidi = [
  { id: 's1', participantId: 'p-chidi', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-11-08T14:47:24Z'), closedReason: null, turns: [] },
  { id: 's2', participantId: 'p-chidi', sessionNumber: 2, status: 'COMPLETED', completedAt: new Date('2026-11-15T14:47:24Z'), closedReason: null, turns: [] },
  { id: 's3', participantId: 'p-chidi', sessionNumber: 3, status: 'COMPLETED', completedAt: new Date('2026-11-23T05:00:00Z'), closedReason: 'auto_closed', turns: [] },
  { id: 's4', participantId: 'p-chidi', sessionNumber: 4, status: 'NOT_STARTED', completedAt: null, closedReason: null, turns: [] },
];

describe('"last checked in" is the last check-in they answered', () => {
  it('passes over the session the clock closed with nothing from Chidi', () => {
    const last = theirLastAnswer(chidi, 'p-chidi');
    expect(last?.checkIn.id).toBe('s2');
    /* The board's line: "Chidi last checked in on Sunday 15 November." */
    expect(`Chidi last checked in on ${aDaySaidInFull(last!.at)}.`).toBe('Chidi last checked in on Sunday 15 November.');
  });
  it('is not "checked in today" on the morning the clock closed his session', () => {
    expect(theirCheckInToday(chidi, 'p-chidi', new Date('2026-11-23T06:30:00Z'), 'Africa/Nairobi')).toBeNull();
  });
  it('a session the clock closed after he answered in it is his, on the day he answered', () => {
    const answered = [...chidi.slice(0, 2), { ...chidi[2], turns: [{ createdAt: new Date('2026-11-22T16:00:00Z') }] }];
    const last = theirLastAnswer(answered, 'p-chidi');
    expect(last?.checkIn.id).toBe('s3');
    expect(aDaySaidInFull(last!.at)).toBe('Sunday 22 November');
  });
  it('names the same day the morning reads as his last check-in', () => {
    const morning = theirDay('p-chidi', chidi.map((c) => ({ ...c, availableFrom: null, createdAt: c.completedAt ?? new Date('2026-11-30T05:00:00Z') })) as any, new Date('2026-11-24T06:30:00Z'), 'Africa/Nairobi');
    expect(morning.lastCheckedIn).toBe(theDayIn(theirLastAnswer(chidi, 'p-chidi')!.at, 'Africa/Nairobi'));
  });
});
