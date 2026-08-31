import { countableSessions, hadStartedBy, patternClockReached } from './participation-timeline';

/**
 * NOTHING THAT HAPPENED BEFORE SOMEBODY'S FIRST DAY IS THEIRS TO ANSWER FOR.
 *
 * Five situations set a ground up about a person before they begin: a hire whose first day is next
 * month, an advisor whose year has not opened, a manager taking over on the first. That is deliberate -
 * agreeing what good looks like before anybody can be judged against it is the entire point.
 *
 * `joinedAt` could not express it. The joiner HAS joined the ground: they were named at setup and they
 * have a check-in waiting. What they have not done is start the job. So a period before their start
 * date looked exactly like a period they were present for and went quiet in, and every read built on
 * countable periods - patterns, contribution, follow-through - counted it against them.
 *
 * This is the same argument the file already makes for leave, which its own header states: without
 * dates the engine cannot tell "said nothing" from "was not there", and the naive read is unkind in
 * every direction.
 */
const d = (iso: string) => new Date(iso);
const sessions = [
  { sessionNumber: 1, at: d('2026-01-05T00:00:00Z') },
  { sessionNumber: 2, at: d('2026-01-12T00:00:00Z') },
  { sessionNumber: 3, at: d('2026-01-19T00:00:00Z') },
  { sessionNumber: 4, at: d('2026-01-26T00:00:00Z') },
];

describe('a period before somebody started', () => {
  it('does not count when their work begins later', () => {
    const p = { startsAt: d('2026-01-15T00:00:00Z') };
    const counted = countableSessions(sessions, p).map((s) => s.at.toISOString().slice(0, 10));
    expect(counted).toEqual(['2026-01-19', '2026-01-26']);
  });

  it('and every period counts when the work was already underway', () => {
    // Null is the normal case, and every row that existed before this column has it.
    expect(countableSessions(sessions, {}).length).toBe(4);
  });

  it('counts the start date itself, because that is a day they were there for', () => {
    expect(hadStartedBy(d('2026-01-12T00:00:00Z'), { startsAt: d('2026-01-12T00:00:00Z') })).toBe(true);
  });

  it('and not the day before it', () => {
    expect(hadStartedBy(d('2026-01-11T00:00:00Z'), { startsAt: d('2026-01-12T00:00:00Z') })).toBe(false);
  });

  it('so a pattern cannot be confirmed on periods that predate the job', () => {
    /**
     * The harm this prevents, stated as the thing it prevents. Three periods is what confirms a
     * behaviour pattern; on a ground opened a month before a hire starts, three of them can pass before
     * that person has done a day's work.
     */
    const p = { startsAt: d('2026-01-19T00:00:00Z') };
    expect(patternClockReached(sessions, p, 3)).toBe(false);
    expect(patternClockReached(sessions, {}, 3)).toBe(true);
  });

  it('and it stacks with leave rather than replacing it', () => {
    // Somebody can start late AND be away later. Both windows are theirs to not answer for.
    const p = {
      startsAt: d('2026-01-12T00:00:00Z'),
      leaves: [{ from: d('2026-01-19T00:00:00Z'), to: d('2026-01-27T00:00:00Z') }],
    };
    const counted = countableSessions(sessions, p).map((s) => s.at.toISOString().slice(0, 10));
    expect(counted).toEqual(['2026-01-12']);
  });

  it('and joining the ground is still a separate fact from starting the work', () => {
    /**
     * The distinction the column exists for. This person was named at setup on the 5th - they joined
     * the ground then - and starts on the 19th. Both are true, and only one of them makes a period
     * theirs to answer for.
     */
    const p = { joinedAt: d('2026-01-05T00:00:00Z'), startsAt: d('2026-01-19T00:00:00Z') };
    expect(countableSessions(sessions, p).length).toBe(2);
  });
});
