import { howThisHasMoved, KeptRound } from './how-this-has-moved';

/**
 * HOW THINGS HAVE MOVED, READ BACK FROM WHAT WAS RECORDED AT THE TIME.
 *
 * A trajectory assembled at day 90 from a pile of transcripts is a story told once at the end. One
 * read back from what each round actually said is a record - and it is the difference between
 * "here is what we now think happened" and "here is what we said at the time".
 *
 * What it must never become is a rating. No score, no tier, no arrow.
 */
const round = (over: Partial<KeptRound> = {}): KeptRound => ({
  round: 1,
  sharedPicture: 'They describe the handoff differently. Both expect the other to own conversion.',
  divergences: [{ a: 1 }, { b: 2 }],
  takenAt: new Date('2026-11-14T09:00:00Z'),
  ...over,
});

describe('what it shows', () => {
  it('each round, oldest first, with the line it led with', () => {
    const moved = howThisHasMoved([round({ round: 3 }), round({ round: 1 }), round({ round: 2 })]);
    expect(moved.map((m) => m.round)).toEqual([1, 2, 3]);
    expect(moved[0].says).toBe('They describe the handoff differently.');
  });

  it('when it was taken, so a reader can put it beside a date', () => {
    expect(howThisHasMoved([round()])[0].takenAt).toBe('2026-11-14');
  });

  it('how many accounts differed, as a count', () => {
    expect(howThisHasMoved([round()])[0].differences).toBe(2);
    expect(howThisHasMoved([round({ divergences: [] })])[0].differences).toBe(0);
  });

  it('and says when a round was changed after it closed', () => {
    const moved = howThisHasMoved([round({ amendedAt: new Date(), amendedNote: 'Updated after a correction.' })]);
    expect(moved[0].amended).toBe('Updated after a correction.');
  });

  it('with nothing said about rounds that were never touched', () => {
    expect(howThisHasMoved([round()])[0].amended).toBeNull();
  });
});

describe('what it is not', () => {
  it('shows a single round rather than waiting for three', () => {
    /* "This is where it started" is worth seeing on day 14, and a section that appears only once
       there are three of them is a section nobody discovers. */
    expect(howThisHasMoved([round()])).toHaveLength(1);
  });

  it('carries no score, tier or direction', () => {
    const moved = howThisHasMoved([round({ round: 1 }), round({ round: 2 })]);
    const keys = Object.keys(moved[0]).sort();
    /* Changed 19 November (cycle 11): `sessionNumber` is served beside `round`, the name every page reads; the page wrote "On 4 December" for a row without it. Still no score, tier or arrow. */
    expect(keys).toEqual(['amended', 'differences', 'round', 'says', 'sessionNumber', 'takenAt']);
    /* The moment this renders an arrow it has started rating people. */
    expect(JSON.stringify(moved)).not.toMatch(/improv|worse|better|trend|score|tier/i);
  });

  it('and re-decides nothing - every line was written when that round closed', () => {
    const moved = howThisHasMoved([round({ sharedPicture: 'Exactly what was said then. And more.' })]);
    expect(moved[0].says).toBe('Exactly what was said then.');
  });

  it('drops a round with no picture rather than showing an empty one', () => {
    expect(howThisHasMoved([round({ sharedPicture: '  ' })])).toHaveLength(0);
  });
});
