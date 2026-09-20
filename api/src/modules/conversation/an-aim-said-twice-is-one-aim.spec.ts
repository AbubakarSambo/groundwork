import { theAimsThatAreNew, isTheSameAimSaidAsItsNumber } from './an-aim-said-twice-is-one-aim';

describe('an aim said twice is one aim', () => {
  const onBoard = [{ name: 'units of tea sold in Abuja', target: 10000 }];

  it('drops the one that is only the number again', () => {
    expect(theAimsThatAreNew([{ name: '10,000 units', target: 10000 }], onBoard)).toEqual([]);
    expect(theAimsThatAreNew([{ name: '10000 units total', target: 10000 }], onBoard)).toEqual([]);
  });

  it('and keeps an aim that says something of its own, number or not', () => {
    const real = [
      { name: 'shops opened in Kano', target: 10000 },
      { name: 'wholesale accounts signed', target: 10000 },
      { name: 'units of tea sold in Kaduna', target: 10000 },
    ];
    expect(theAimsThatAreNew(real, onBoard)).toEqual(real);
  });

  it('and never drops one whose number nobody else has', () => {
    expect(isTheSameAimSaidAsItsNumber({ name: '500 units', target: 500 }, onBoard)).toBe(false);
    expect(theAimsThatAreNew([{ name: '500 units', target: 500 }], onBoard)).toHaveLength(1);
  });

  it('and an aim with no number is always its own aim', () => {
    expect(theAimsThatAreNew([{ name: 'steady progress', target: null }], onBoard)).toHaveLength(1);
  });

  it('still drops an exact repeat, which is what it did before', () => {
    expect(theAimsThatAreNew([{ name: 'Units of tea sold in Abuja', target: 10000 }], onBoard)).toEqual([]);
  });

  it('and two restatements in one batch do not become two rows', () => {
    const out = theAimsThatAreNew(
      [{ name: '10,000 units', target: 10000 }, { name: '10000 items', target: 10000 }],
      onBoard,
    );
    expect(out).toEqual([]);
  });
});

/** Six near-copies of one target on a sales board (adversarial run, 20 Sep 2026): the currency letter survived the strip. */
describe('a target said with its currency', () => {
  it('is the same aim as the number', () => {
    const existing = [{ name: 'N180m', target: 180_000_000 }];
    expect(theAimsThatAreNew([
      { name: 'N180m target for the quarter', target: 180_000_000 },
      { name: 'team target', target: 180_000_000 },
      { name: '₦180m', target: 180_000_000 },
      { name: 'NGN 180 million', target: 180_000_000 },
    ], existing)).toEqual([]);
    /* And something of its own still stands. */
    expect(theAimsThatAreNew([{ name: 'credit share under 35%', target: 35 }], existing)).toHaveLength(1);
  });
});
