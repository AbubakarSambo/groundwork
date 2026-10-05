import { whatChangedSinceLastTime } from './what-changed-since-last-time';

/*
 * 4.3: "Session 1 has nothing to compare, but from session 2 the report should open on movement,
 * not on a fresh read."
 */
describe('what changed since last time', () => {
  it('says what is still open, what has gone, and what is new, each topic as a full sentence of its own', () => {
    const out = whatChangedSinceLastTime(
      {
        topics: ['The main obstacle to signing new shops is seen differently.', 'There are different descriptions of the allocation.'],
        answered: 3,
      },
      { topics: ['The main obstacle to signing new shops is seen differently.', 'People disagree about the deadline.'], answered: 3 },
    )!;
    expect(out).toBe(
      'This is what changed since the last round. The main obstacle to signing new shops is seen differently. This is still open from last time. '
      + 'People disagree about the deadline. That was a difference last time, and it is no longer showing as one. '
      + 'There are different descriptions of the allocation. This is new this round.',
    );
    /* Request 151, E1: a sentence is never the subject of another, and a full stop never opens a clause. */
    expect(out).not.toMatch(/\.\s+(is|are) /);
    expect(out).not.toMatch(/\.\./);
  });

  it('adds a full stop to a topic that has none, and says "these" for several', () => {
    const out = whatChangedSinceLastTime({ topics: ['a', 'b'], answered: 3 }, { topics: [], answered: 2 })!;
    expect(out).toContain('A. B. These are new this round.');
  });

  it('counts who answered when that changed', () => {
    const out = whatChangedSinceLastTime({ topics: ['a'], answered: 3 }, { topics: ['a'], answered: 2 })!;
    expect(out).toMatch(/3 people answered this round, against 2 last time/);
  });

  it('never says whether any of it is good', () => {
    const out = whatChangedSinceLastTime(
      { topics: ['a', 'b', 'c'], answered: 1 },
      { topics: ['a'], answered: 3 },
    )!;
    expect(out).not.toMatch(/\b(progress|slow|improv|worse|better|behind|worrying|good|bad)\b/i);
  });

  it('says nothing at all on the first round', () => {
    expect(whatChangedSinceLastTime({ topics: ['a'], answered: 3 }, null)).toBeNull();
  });

  it('and nothing where nothing changed, rather than a sentence saying so', () => {
    expect(whatChangedSinceLastTime({ topics: ['a', 'b'], answered: 3 }, { topics: ['b', 'a'], answered: 3 })).toBeNull();
  });
});
