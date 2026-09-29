import { whatChangedSinceLastTime } from './what-changed-since-last-time';

/*
 * 4.3: "Session 1 has nothing to compare, but from session 2 the report should open on movement,
 * not on a fresh read."
 */
describe('what changed since last time', () => {
  it('says what is still open, what has gone, and what is new', () => {
    const out = whatChangedSinceLastTime(
      { topics: ['Reaching the 10,000 unit objective', 'Ownership of the supermarket chain'], answered: 3 },
      { topics: ['Reaching the 10,000 unit objective', 'The deadline'], answered: 3 },
    )!;
    expect(out).toMatch(/Reaching the 10,000 unit objective is still open from last time/);
    expect(out).toMatch(/The deadline is no longer showing as a difference/);
    expect(out).toMatch(/Ownership of the supermarket chain is new this round/);
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
