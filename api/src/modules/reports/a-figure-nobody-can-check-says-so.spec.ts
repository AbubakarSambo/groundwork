import {
  howSolid, figuresWorthACaveat, sayingHowMuchIsUnchecked, MARK, WHAT_THAT_MEANS,
} from './a-figure-nobody-can-check-says-so';

describe('a figure nobody can check says so', () => {
  it('marks the live one as an estimate', () => {
    /* Word for word off a check-in, beside a target of 35. */
    const said = { text: 'I am tracking well, about a third of the way there I would say.', recallBased: true };
    expect(howSolid(said)).toBe('estimated');
    expect(MARK.estimated).toBe('their estimate');
  });

  it('separates an estimate from a firm claim nobody can see', () => {
    /* "Twelve tickets are over a day old" is not a guess. The person is sure and nobody else can
       check it, which is a different thing the reader needs to know. */
    expect(howSolid({ text: 'Twelve tickets are over a day old.', recallBased: true })).toBe('from-memory');
    expect(WHAT_THAT_MEANS['from-memory']).toContain('nothing attached');
  });

  it('leaves a figure with something behind it alone', () => {
    expect(howSolid({ text: 'Twelve tickets are over a day old.', recallBased: false })).toBe('counted');
    expect(MARK.counted).toBe('');
  });

  it('says nothing at all about a line with no figure in it', () => {
    /* Marking every sentence would turn the mark into wallpaper nobody reads. */
    expect(howSolid({ text: 'The rota goes out on Mondays.', recallBased: true })).toBeNull();
  });

  it('does not read a ticket number as a figure', () => {
    expect(howSolid({ text: 'It is tracked in OPS-902.', recallBased: true })).toBeNull();
  });

  it('returns only the lines that need a caveat, so the list is the finding', () => {
    const out = figuresWorthACaveat([
      { text: 'roughly a third done', recallBased: true },
      { text: 'Twelve tickets are open.', recallBased: false },
      { text: 'The rota goes out Mondays.', recallBased: true },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].how).toBe('estimated');
  });

  it('counts rather than names, because a proportion of a person is a judgement about them', () => {
    expect(sayingHowMuchIsUnchecked(1, 6)).toContain('One figure here was');
    expect(sayingHowMuchIsUnchecked(2, 6)).toContain('2 of the 6 figures here were');
    expect(sayingHowMuchIsUnchecked(2, 6)).not.toMatch(/third|proportion|%/);
  });

  it('says nothing where everything checks out', () => {
    expect(sayingHowMuchIsUnchecked(0, 6)).toBeNull();
    expect(figuresWorthACaveat([{ text: 'Twelve tickets are open.', recallBased: false }])).toEqual([]);
  });
});
