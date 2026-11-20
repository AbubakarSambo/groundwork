import { theCoachingFollowedUp, type ACoaching, type ThePersonsRecord } from './the-persons-record';
import { whoGroundworkCouldNotMove } from './what-the-lead-reads-about-each-person';
import { theRecordInWords } from './the-persons-record-in-words';

/**
 * "GROUNDWORK HAS COACHED MARY" ONLY WHERE MARY WAS IN A CHECK-IN AFTER IT (fix plan 16 November, group 5; end-to-end I-9).
 *
 * The lead's day-90 letter read: "Mary did 3 of 5 check-ins, 3 of them on time, and 1 named the item, what changed and the day. Groundwork
 * has coached Mary on it since Monday 16 November, and it has got worse, so call Mary." Mary had done one check-in and none after it. A coaching
 * is said inside a check-in of hers, so none could have reached her, and the four she did not open were read as proof that it failed. The board
 * beside it said Groundwork had not coached her. Both are now read from the check-ins she did after the coaching.
 */
const checkIn = (n: number, done: boolean) => ({ checkInId: `c${n}`, sessionNumber: n, on: done ? `2026-11-${15 + n}` : null, done, onTime: done, specific: n === 1 });
const record = (done: number[]): ThePersonsRecord => {
  const checkIns = [1, 2, 3, 4, 5].map((n) => checkIn(n, done.includes(n)));
  const d = checkIns.filter((c) => c.done);
  return {
    claims: [], promises: [], changes: [], blockers: [], focus: [], checkIns,
    summary: {
      claims: 0, proven: 0, changed: 0, keptOnTime: 0, keptLate: 0, notDone: 0, late: 0, promisesDue: 0, blockersRaised: 0, blockersTriedFirst: 0,
      checkInsDue: 5, checkInsDone: d.length, checkInsOnTime: d.length, checkInsSpecific: d.filter((c) => c.specific).length,
    },
  } as unknown as ThePersonsRecord;
};
const coachedAfterThree: ACoaching = {
  about: 'check-ins', said: 'Name the item, what changed and the day, every time.', afterSession: 3, givenOn: 'Monday 16 November', givenAt: '2026-11-16T09:00:00Z',
  before: { good: 1 / 3, of: 3 }, since: null, outcome: null, done: false,
};
const stored = (r: ThePersonsRecord, coaching: ACoaching[]) => ({ groundId: 'g', participantId: 'p', record: r, coaching, lastSession: 5, builtAt: new Date() }) as any;

describe('a person who never came back was not coached', () => {
  it('Mary, with three check-ins and the two after the coaching not opened, is not read as coached, and the lead is not told to call her about it', () => {
    const r = record([1, 2, 3]);
    const coaching = theCoachingFollowedUp([coachedAfterThree], r, 5, new Date('2026-12-14T00:00:00Z'), 'Africa/Nairobi');
    expect(coaching).toHaveLength(1);
    const [c] = coaching;
    expect(c.afterSession).toBe(3);
    expect(c.since).toBeNull();
    expect(c.outcome).toBeNull();
    expect(whoGroundworkCouldNotMove(stored(r, [c]), 'Mary', 'sales')).toBeNull();
  });

  it('what the board says about her coaching agrees: it says no check-in since then shows whether anything changed', () => {
    const r = record([1, 2, 3]);
    const [c] = theCoachingFollowedUp([coachedAfterThree], r, 5, new Date('2026-12-14T00:00:00Z'), 'Africa/Nairobi');
    const words = theRecordInWords(r, [c], { self: false, firstName: 'Mary' }, 'Sales updates');
    expect(words.coaching.map((x) => x.since)).toEqual(['No check-in since then shows whether it has changed yet.']);
  });

  it('Joel, who did check-ins 4 and 5 after the coaching and was vaguer in them, is still told about, because he was in check-ins after it', () => {
    const base = record([1, 2, 3, 4, 5]);
    const r = { ...base, checkIns: base.checkIns } as ThePersonsRecord;
    const [c] = theCoachingFollowedUp([coachedAfterThree], r, 5, new Date('2026-12-14T00:00:00Z'), 'Africa/Nairobi');
    expect(c.outcome).toBe('worse');
    expect(whoGroundworkCouldNotMove(stored(r, [c]), 'Joel', 'sales')).toMatch(/^Joel did 5 of 5 check-ins.*Groundwork has coached Joel on it since Monday 16 November, and it has got worse, so call Joel\.$/);
  });

  it('Sam, who answered every round after the coaching naming the item and the day, though not within a day of it opening, is not told "so call Sam" (run 7, 22 November)', () => {
    const base = record([1, 2, 3, 4, 5]);
    const checkIns = base.checkIns.map((c) => ({ ...c, specific: true, onTime: c.sessionNumber === 1 }));
    const r = { ...base, checkIns } as ThePersonsRecord;
    const coaching = theCoachingFollowedUp([coachedAfterThree], r, 5, new Date('2026-12-14T00:00:00Z'), 'Africa/Nairobi');
    /* The old coaching is gone: what it asked for is what he does every round. Whatever else is chosen has not been followed up, so it cannot have failed. */
    expect(coaching.find((c) => c.afterSession === 3 && !c.done)).toBeUndefined();
    for (const c of coaching) expect(whoGroundworkCouldNotMove(stored(r, [c]), 'Sam', 'sales')).toBeNull();
  });
});
