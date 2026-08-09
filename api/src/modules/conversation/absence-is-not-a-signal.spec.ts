import {
  countableSessions,
  patternClockReached,
  mayCoach,
  mayFormNewRead,
  absorptionIsExplained,
  baselineSession,
  onLeaveAt,
} from './participation-timeline';

/**
 * NOT BEING THERE IS NOT THE SAME AS HAVING NOTHING TO SAY.
 *
 * Detection confirms a pattern over three periods, which is fair only while
 * every one of those periods was a period the person was present for and able to
 * answer in. A real roster breaks that immediately, and the naive version does
 * something unkind in each case:
 *
 *   a joiner reads as "behind" for the weeks before they arrived
 *   somebody on parental leave accrues "went quiet" against a protected absence
 *   a person who has left keeps being coached, and keeps being read
 *
 * The last two are not just wrong, they carry legal and ethical weight. A
 * coaching nudge arriving during someone's medical leave, or a fresh read formed
 * about somebody after they were let go and can no longer answer back, is the
 * kind of thing that ends trust in a product permanently.
 *
 * Three states, three different answers: a joiner is FRESH, a person on leave is
 * PAUSED, a person who left is FROZEN.
 */

const day = (n: number) => new Date(2026, 0, n);
const sessions = [1, 2, 3, 4, 5, 6].map((n) => ({ sessionNumber: n, at: day(n * 7) }));

describe('somebody who joined part-way through', () => {
  const joiner = { joinedAt: day(21) };   // arrived around session 3

  it('is not read on the weeks before they existed here', () => {
    // THE REGRESSION: sessions 1 and 2 have nothing from them because they were
    // not here, and a blank is not a silence.
    const mine = countableSessions(sessions, joiner);
    expect(mine.map((s) => s.sessionNumber)).toEqual([3, 4, 5, 6]);
  });

  it('starts their baseline where they joined, not where the ground did', () => {
    expect(baselineSession(sessions, joiner)).toBe(3);
  });

  it('does not have a confirmed pattern until THEIR third period', () => {
    const twoOfTheirs = sessions.slice(0, 4);           // ground sessions 1-4, theirs 3-4
    expect(patternClockReached(twoOfTheirs, joiner)).toBe(false);
    expect(patternClockReached(sessions, joiner)).toBe(true);   // theirs 3,4,5,6
  });

  it('holds off entirely when they have no session of their own yet', () => {
    // Null is "not enough to place them", which is a reason to wait rather than
    // a reason to read them as empty.
    expect(baselineSession(sessions.slice(0, 2), joiner)).toBeNull();
  });
});

describe('somebody on authorized leave', () => {
  const away = { leaves: [{ from: day(10), to: day(30) }] };   // out for sessions 2, 3, 4

  it('does not accrue anything at all while away', () => {
    const mine = countableSessions(sessions, away);
    expect(mine.map((s) => s.sessionNumber)).toEqual([1, 5, 6]);
  });

  it('pauses the clock rather than letting time confirm a pattern', () => {
    // THE ONE THAT MATTERS. Two periods in, then a month off. They must not come
    // back "confirmed" because the calendar moved while they were away.
    const upToLeave = sessions.slice(0, 4);   // ground 1-4, theirs is only session 1
    expect(patternClockReached(upToLeave, away)).toBe(false);
  });

  it('resumes counting on return, without penalising the gap', () => {
    expect(patternClockReached(sessions, away)).toBe(true);   // 1, 5, 6
  });

  it('fires no coaching while they are away', () => {
    expect(mayCoach(day(15), away)).toBe(false);
    expect(mayFormNewRead(day(15), away)).toBe(false);
  });

  it('coaches again once they are back', () => {
    expect(mayCoach(day(35), away)).toBe(true);
  });

  it('treats an open-ended leave as still away', () => {
    const stillOut = { leaves: [{ from: day(10), to: null }] };
    expect(onLeaveAt(day(400), stillOut)).toBe(true);
    expect(mayCoach(day(400), stillOut)).toBe(false);
  });

  it('does not misread their work being covered as a drop', () => {
    // Somebody else carrying their work while they are on leave is cover. It is
    // not the absorber over-reaching and not the absent person dropping.
    expect(absorptionIsExplained(day(15), away)).toBe(true);
    expect(absorptionIsExplained(day(35), away)).toBe(false);
  });
});

describe('somebody who has left', () => {
  const gone = { leftAt: day(25) };

  it('is not read on anything after they went', () => {
    const mine = countableSessions(sessions, gone);
    expect(mine.map((s) => s.sessionNumber)).toEqual([1, 2, 3]);
  });

  it('is never coached again', () => {
    // A coaching prompt firing at somebody who has gone is absurd and is a leak.
    expect(mayCoach(day(30), gone)).toBe(false);
  });

  it('has no NEW read formed about them, ever', () => {
    // They are no longer there to add their voice or correct a reading, and a
    // person who cannot answer back should not be being assessed.
    expect(mayFormNewRead(day(30), gone)).toBe(false);
  });

  it('keeps what they said while they were here', () => {
    // Frozen, not erased. Their account was true and is part of the history.
    expect(countableSessions(sessions, gone).length).toBe(3);
  });

  it('does not misread the redistribution of their work', () => {
    expect(absorptionIsExplained(day(30), gone)).toBe(true);
  });
});

describe('somebody present the whole time', () => {
  it('is completely unaffected by any of this', () => {
    const present = {};
    expect(countableSessions(sessions, present)).toHaveLength(6);
    expect(patternClockReached(sessions, present)).toBe(true);
    expect(mayCoach(day(30), present)).toBe(true);
    expect(baselineSession(sessions, present)).toBe(1);
    // And nothing about their work being picked up is explained away by a roster
    // change that did not happen.
    expect(absorptionIsExplained(day(30), present)).toBe(false);
  });
});
