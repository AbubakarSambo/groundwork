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
