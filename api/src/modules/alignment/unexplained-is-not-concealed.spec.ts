/**
 * THE TWO WAYS THIS FEATURE KILLS THE PRODUCT.
 *
 * By reading as an accusation — $100,000 unexplained said as $100,000 concealed —
 * and by doing arithmetic on things that are not comparable, which is real
 * arithmetic and complete nonsense, and the most convincing kind of wrong answer
 * there is.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Figure, whyTheseCannotBeCompared, addUp, money, howItReads as figureReads } from './a-figure-is-a-value-with-a-source';
import { whatDoesNotAddUp, worthAsking, howItReads, A_DIFFERENCE_IS_NOT_A_FINDING } from './what-does-not-add-up';
import { whatToAskNext, whatWouldAccountForIt, whenNothingIsLeft } from './an-explanation-is-a-candidate';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const Q3 = { from: new Date('2026-07-01'), to: new Date('2026-09-30') };
const Q2 = { from: new Date('2026-04-01'), to: new Date('2026-06-30') };

const figure = (over: Partial<Figure> = {}): Figure => ({
  says: 'revenue',
  minorUnits: 18_000_000,
  currency: 'USD',
  period: Q3,
  source: 'a person typed it in',
  statedBy: 'Ada',
  from: 'the quarterly report',
  ...over,
});

describe('a figure never travels without where it came from', () => {
  it('says the value, the period, the source and who stated it', () => {
    const said = figureReads(figure());
    expect(said).toContain('USD 180,000.00');
    expect(said).toContain('2026-07-01 to 2026-09-30');
    expect(said).toContain('Ada');
  });

  it('holds money exactly, to the cent', () => {
    expect(money(180_000_35, 'USD')).toBe('USD 180,000.35');
    expect(money(1, 'USD')).toBe('USD 0.01');
    expect(money(-250, 'NGN')).toBe('-NGN 2.50');
  });
});

describe('what may not be compared', () => {
  it('refuses two currencies, and says why', () => {
    const why = whyTheseCannotBeCompared(figure(), figure({ currency: 'NGN' }));
    expect(why).toContain('USD');
    expect(why).toContain('NGN');
  });

  it('refuses two periods, and says why', () => {
    const why = whyTheseCannotBeCompared(figure(), figure({ period: Q2 }));
    expect(why).toContain('different periods');
  });

  it('and a difference across them is refused rather than computed', () => {
    const out = whatDoesNotAddUp(figure(), [figure({ period: Q2, minorUnits: 8_000_000 })]);
    expect(out).toHaveProperty('cannot');
  });

  it('a sum across periods is refused too', () => {
    expect(addUp([figure(), figure({ period: Q2 })])).toHaveProperty('cannot');
  });
});

describe('the arithmetic', () => {
  it('the VAT case: 180,000 stated against 80,000 counted', () => {
    const out = whatDoesNotAddUp(
      figure({ says: 'revenue reported to us', minorUnits: 18_000_000 }),
      [figure({ says: 'revenue in the VAT filing', minorUnits: 8_000_000, from: 'the VAT return' })],
    ) as { difference: any };
    expect(out.difference.minorUnits).toBe(10_000_000);
    expect(out.difference.state).toBe('not explained yet');
  });

  it('an exact match is not a difference, and is not manufactured into one', () => {
    expect(whatDoesNotAddUp(figure(), [figure()])).toBeNull();
  });

  it('adds parts up before comparing', () => {
    const out = whatDoesNotAddUp(figure({ minorUnits: 10_000 }), [
      figure({ minorUnits: 4_000 }),
      figure({ minorUnits: 3_000 }),
    ]) as { difference: any };
    expect(out.difference.minorUnits).toBe(3_000);
  });
});

describe('proportion', () => {
  it('a rounding difference on a large number is not worth anybody’s month', () => {
    const out = whatDoesNotAddUp(figure({ minorUnits: 200_000_000 }), [figure({ minorUnits: 199_999_000 })]) as { difference: any };
    expect(worthAsking(out.difference)).toBe(false);
  });

  it('but a small share of a very large number still is', () => {
    const out = whatDoesNotAddUp(figure({ minorUnits: 900_000_000 }), [figure({ minorUnits: 897_000_000 })]) as { difference: any };
    expect(worthAsking(out.difference)).toBe(true);
  });

  it('and a large share of a small number is', () => {
    const out = whatDoesNotAddUp(figure({ minorUnits: 400_000 }), [figure({ minorUnits: 200_000 })]) as { difference: any };
    expect(worthAsking(out.difference)).toBe(true);
  });
});

describe('how a difference is said', () => {
  const out = whatDoesNotAddUp(
    figure({ says: 'revenue reported to us', minorUnits: 18_000_000 }),
    [figure({ says: 'revenue in the VAT filing', minorUnits: 8_000_000 })],
  ) as { difference: any };
  const said = howItReads(out.difference);

  it('says the amount and that it is not explained yet', () => {
    expect(said).toContain('USD 100,000.00');
    expect(said).toContain('not been explained yet');
  });

  it('never says any of the words that make it an accusation', () => {
    for (const word of ['missing', 'concealed', 'withheld', 'under-report', 'shortfall', 'owed', 'should be', 'failed to']) {
      expect(said.toLowerCase()).not.toContain(word);
    }
  });

  it('and offers the ordinary explanations in the same breath', () => {
    expect(said).toMatch(/periods being cut differently|different basis|out of scope/);
  });

  it('the rule given to any synthesis forbids the same words', () => {
    expect(A_DIFFERENCE_IS_NOT_A_FINDING.toLowerCase()).toContain('never');
    expect(A_DIFFERENCE_IS_NOT_A_FINDING.toLowerCase()).toContain('concealed');
    expect(A_DIFFERENCE_IS_NOT_A_FINDING.toLowerCase()).toContain('not a conclusion');
  });
});

describe('the loop', () => {
  const out = whatDoesNotAddUp(figure({ minorUnits: 18_000_000 }), [figure({ minorUnits: 8_000_000 })]) as { difference: any };

  it('lists what would account for it, ordinary explanations first', () => {
    const keys = whatWouldAccountForIt(out.difference).map((c) => c.key);
    expect(keys[0]).toBe('the periods are cut differently');
    expect(keys.indexOf('something has not been included')).toBe(keys.length - 1);
  });

  it('every candidate carries what would tell it apart and the question that gets it', () => {
    for (const c of whatWouldAccountForIt(out.difference)) {
      expect(c.toldApartBy.length).toBeGreaterThan(10);
      expect(c.ask).toContain('?');
    }
  });

  it('asks one question, and it is the one that settles the most', () => {
    const next = whatToAskNext(out.difference)!;
    expect(next.candidate.settles).toBe(2);
    expect(next.ask).toMatch(/\?$/);
  });

  it('moves on once a person has ruled one out', () => {
    const first = whatToAskNext(out.difference)!;
    const second = whatToAskNext(out.difference, [first.candidate.key])!;
    expect(second.candidate.key).not.toBe(first.candidate.key);
  });

  it('and when everything ordinary is ruled out it still concludes nothing', () => {
    const all = whatWouldAccountForIt(out.difference).map((c) => c.key);
    expect(whatToAskNext(out.difference, all)).toBeNull();
    const said = whenNothingIsLeft(out.difference);
    expect(said).toContain('unexplained');
    expect(said.toLowerCase()).not.toContain('concealed');
    expect(said.toLowerCase()).not.toContain('breach');
  });
});

describe('a reading is not a figure', () => {
  const service = withoutComments('alignment.service.ts');

  it('nothing unconfirmed is ever compared', () => {
    const compare = service.slice(service.indexOf('async compare('), service.indexOf('async answered('));
    expect(compare).toContain('confirmedAt === null');
    expect(compare).toContain('return {');
  });

  it('a number out of a document arrives unconfirmed; one somebody said is their statement', () => {
    const record = service.slice(service.indexOf('async recordFigure('), service.indexOf('async confirmFigure('));
    expect(record).toContain("f.source === 'a document somebody uploaded' ? null : new Date()");
  });

  it('a candidate is ruled out only where a person said so', () => {
    const answered = service.slice(service.indexOf('async answered('), service.indexOf('async whatIsOpen('));
    expect(answered).toContain('said.ruledOut');
    expect(answered).not.toMatch(/infer|guess|likely/i);
  });

  it('and a difference is raised once, not every month', () => {
    const compare = service.slice(service.indexOf('async compare('), service.indexOf('async answered('));
    expect(compare).toContain('difference.findFirst');
    expect(compare).toContain("state: { not: 'no longer there' }");
  });
});

describe('the words this product does not have', () => {
  /* Checked in what it SAYS rather than in the source: the file that forbids these
     words has to name them, and a source scan reads that as the offence. Every
     sentence any of this can produce, across a spread of cases. */
  const everySentence = () => {
    const said: string[] = [];
    for (const [stated, counted] of [
      [18_000_000, 8_000_000],
      [8_000_000, 18_000_000],
      [400_000, 200_000],
      [1, 900_000_000],
    ] as [number, number][]) {
      const out = whatDoesNotAddUp(figure({ minorUnits: stated }), [figure({ minorUnits: counted })]) as { difference: any };
      said.push(howItReads(out.difference));
      said.push(whenNothingIsLeft(out.difference));
      for (const c of whatWouldAccountForIt(out.difference)) said.push(c.says, c.toldApartBy, c.ask);
    }
    return said;
  };

  it('never says breach, fraud, owed or liable, in any case it can produce', () => {
    for (const sentence of everySentence()) {
      for (const word of ['breach', 'fraud', 'owed', 'liable', 'concealed', 'withheld']) {
        expect(sentence.toLowerCase()).not.toContain(word);
      }
    }
  });
});
