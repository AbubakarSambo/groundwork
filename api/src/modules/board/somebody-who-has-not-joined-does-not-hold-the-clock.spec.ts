import { theSessionClock, holdsTheClock } from './one-count-for-the-sessions';

/**
 * SOMEBODY WHO HAS NOT JOINED DOES NOT HOLD THE SESSION CLOCK (browser test, 21 October 2026). "Sales team, Q4" was on session 7 for its
 * five people when Grace added Sam by email. Sam had not opened the invitation (no sign-in, never joined), and his first session waited for
 * him: People and setup said "Session 1 of 15. Session 2 finished on 14 October." It says session 7 again, and once Sam joins, he counts.
 */
const notLetIn = () => false;
const five = ['grace', 'kevin', 'mercy', 'joseph', 'peter'];
const people = [
  ...five.map((k) => ({ id: `p-${k}`, userId: `u-${k}`, joinedAt: '2026-10-12T09:00:00Z', managingOnly: false })),
  { id: 'p-sam', userId: null, joinedAt: null, managingOnly: false },
];
const rows = [
  ...five.flatMap((k) => [1, 2, 3, 4, 5, 6].map((n) => ({ participantId: `p-${k}`, sessionNumber: n, status: 'COMPLETED' }))),
  ...five.map((k) => ({ participantId: `p-${k}`, sessionNumber: 7, status: 'IN_PROGRESS' })),
  { participantId: 'p-sam', sessionNumber: 1, status: 'NOT_STARTED' },
] as any[];

describe('somebody who has not joined does not hold the session clock', () => {
  it('Grace reads session 7, not session 1, while Sam has not opened his invitation', () => {
    const who = new Set(people.filter((p) => holdsTheClock(p, notLetIn)).map((p) => p.id));
    expect(theSessionClock(rows, who, 15, new Date('2026-10-20T10:00:00Z')).says).toBe('Session 7 of 15.');
  });
  it('once Sam has joined, he counts like everybody else', () => {
    expect(holdsTheClock({ id: 'p-sam', userId: 'u-sam', joinedAt: '2026-10-21T09:00:00Z' }, notLetIn)).toBe(true);
  });
  it('a row read without the fields (an older reader) still counts, as before', () => {
    expect(holdsTheClock({ id: 'p-x', managingOnly: false }, notLetIn)).toBe(true);
  });
});
