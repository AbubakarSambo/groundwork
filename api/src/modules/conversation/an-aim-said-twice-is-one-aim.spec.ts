import { theAimsThatAreNew, isTheSameAimSaidAsItsNumber, theCountTheNameAimsAt } from './an-aim-said-twice-is-one-aim';

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

/** Run 11, 22 Sep 2026: the sales board's six aims for three things, and "0 so far" against every rate. */
describe('a rate is a target at any size, and a restatement without its number is not a new aim', () => {
  const { theAimsThatAreNew, theFigureInTheName } = require('./an-aim-said-twice-is-one-aim');
  const three = [
    { name: 'Sales reaching N180m', target: 180_000_000 },
    { name: '35% credit limit', target: 35 },
    { name: 'under 8% arrears', target: 8 },
  ];

  it('reads 8% as eight and keeps the figure in the name as the target', () => {
    expect(theFigureInTheName('under 8% arrears')).toBe(8);
    expect(theFigureInTheName('35% credit limit')).toBe(35);
    expect(theFigureInTheName('2 of the biggest customers')).toBeNull();
    expect(theAimsThatAreNew([{ name: '35% credit limit', target: null }, { name: 'under 8% arrears', target: null }], [])).toEqual([
      { name: '35% credit limit', target: 35 },
      { name: 'under 8% arrears', target: 8 },
    ]);
  });

  it('"credit limit", "arrears target" and "sales target", said with no number in session three, add nothing', () => {
    expect(theAimsThatAreNew([{ name: 'sales target', target: null }, { name: 'credit limit', target: null }, { name: 'arrears target', target: null }], three)).toEqual([]);
  });

  it('while a numberless aim about something else still stands', () => {
    expect(theAimsThatAreNew([{ name: 'Open the Kano depot', target: null }], three)).toEqual([{ name: 'Open the Kano depot', target: null }]);
    expect(theAimsThatAreNew([{ name: 'sales target', target: null }], [])).toHaveLength(1);
  });
});

/*
 * THE SAME AIM, TWO VERBS. Live board, 24 September 2026: "Get the federal ministry MOU for the
 * market information programme" and "Secure the federal ministry MOU for the market information
 * programme", side by side, both unowned and both at zero.
 */
describe('a verb is not what an aim is about', () => {
  it('merges the same aim phrased with a different verb', () => {
    const existing = [{ name: 'Get the federal ministry MOU for the market information programme', target: null }];
    const fresh = [{ name: 'Secure the federal ministry MOU for the market information programme', target: null }];
    expect(theAimsThatAreNew(fresh, existing)).toEqual([]);
  });

  it('and does it in both directions', () => {
    const existing = [{ name: 'Secure the federal ministry MOU', target: null }];
    expect(theAimsThatAreNew([{ name: 'Get the federal ministry MOU', target: null }], existing)).toEqual([]);
  });

  /* The narrowness the file insists on: the verb goes, the thing decides. */
  it('keeps two aims that differ in the thing rather than the verb', () => {
    const existing = [{ name: 'Secure the federal ministry MOU', target: null }];
    const fresh = [{ name: 'Get the state government letters of support', target: null }];
    expect(theAimsThatAreNew(fresh, existing)).toHaveLength(1);
  });
});

/**
 * "GET TO 20 PAYING CUSTOMERS BY DECEMBER." (screens request 136, item 1).
 *
 * The founder's own check-in is one person, and her only aim was stored with no number, so her board's headline had
 * no answer and no bar at all. The sentence aims at a count in exactly the way the rule already reads; the only
 * difference is the "to". What must not change is everything the rule deliberately refuses, so those are here too.
 */
describe('an aim that goes "to" a number still aims at it', () => {
  it('reads the count the founder named', () => {
    expect(theCountTheNameAimsAt('Get to 20 paying customers by December.')).toBe(20);
    expect(theCountTheNameAimsAt('Grow to 150 active traders')).toBe(150);
    expect(theCountTheNameAimsAt('Get up to 12 shops signed')).toBe(12);
    expect(theCountTheNameAimsAt('Go to 1,200 farmers reached')).toBe(1200);
  });

  it('and still refuses a share, a sum of money and a figure that is not what is counted', () => {
    expect(theCountTheNameAimsAt('Get to 12 percent margin')).toBeNull();
    expect(theCountTheNameAimsAt('Get to 12% margin')).toBeNull();
    expect(theCountTheNameAimsAt('Grow to 5 million in revenue')).toBeNull();
    expect(theCountTheNameAimsAt('Get to 200,000 shillings a month')).toBeNull();
    expect(theCountTheNameAimsAt('Get the team to agree on 3 priorities')).toBeNull();
    expect(theCountTheNameAimsAt('A signed renewal before the end of March with no discount past 12 percent')).toBeNull();
  });
});
