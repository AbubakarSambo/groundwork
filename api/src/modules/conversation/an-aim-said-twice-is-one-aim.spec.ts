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

  it('a figure worded again with words added is one aim; the same figure about something else is not', () => {
    const four = [
      { name: 'Securing new business for the firm', target: 400000 },
      { name: 'new business', target: 400000 },
      { name: 'Drive revenue of around $400,000, weighted towards larger engagements.', target: 400000 },
      { name: 'Generate $400,000 in new business.', target: 400000 },
    ];
    expect(theAimsThatAreNew(four, [])).toEqual([four[0]]);
    expect(theAimsThatAreNew([{ name: 'New business, $400,000', target: 400000 }], [four[0]])).toEqual([]);
    const small = [
      { name: 'Bring in two large engagements', target: 2 },
      { name: 'Two new hires', target: 2 },
      { name: 'two large engagements', target: 2 },
    ];
    expect(theAimsThatAreNew(small, [])).toEqual([small[0], small[1]]);
  });
});

/** Run 7, 21 Sep 2026: "Hit N180m (180,000,000); get to N180m" on one About box. */
describe('a figure in the name is the target the aim did not carry', () => {
  const { theAimsThatAreNew, theFigureInTheName } = require('./an-aim-said-twice-is-one-aim');
  it('reads N180m, 400k and 180,000,000', () => {
    expect(theFigureInTheName('get to N180m')).toBe(180_000_000);
    expect(theFigureInTheName('Bring in $400k')).toBe(400_000);
    expect(theFigureInTheName('reach 180,000,000 in sales')).toBe(180_000_000);
    expect(theFigureInTheName('more dealers')).toBeNull();
  });
  it('so the restatement is not a second aim', () => {
    expect(theAimsThatAreNew([{ name: 'get to N180m', target: null } as any], [{ name: 'Hit N180m', target: 180_000_000 } as any])).toEqual([]);
    expect(theAimsThatAreNew([{ name: 'Open 40 more dealers', target: null } as any], [{ name: 'Hit N180m', target: 180_000_000 } as any])).toHaveLength(1);
  });
});
