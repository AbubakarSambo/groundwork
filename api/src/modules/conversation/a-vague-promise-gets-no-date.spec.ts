import { whenTheyMeant, askWhenTheyMean } from './when-words-mean-a-date';

/**
 * WHEN WORDS MEAN A DATE, AND WHEN THEY DO NOT.
 *
 * "Infer a date but be sure to probe for details in the engine." The refusals matter more than the
 * successes: a vague phrase turned into a hard deadline becomes a missed commitment on somebody's
 * record that they never agreed to, and they find out at the next check-in when they are asked why.
 *
 * Every case is resolved against the day it was SAID, never against now, so re-reading an old
 * check-in cannot move its deadlines.
 */
const WED = new Date(Date.UTC(2026, 10, 4)); /* Wednesday 4 November 2026. */
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

describe('words that carry exactly one date', () => {
  it('takes an explicit one', () => {
    expect(iso(whenTheyMeant('2026-11-20', WED))).toBe('2026-11-20');
    expect(iso(whenTheyMeant('20 November 2026', WED))).toBe('2026-11-20');
    expect(iso(whenTheyMeant('the 20th of November', WED))).toBe('2026-11-20');
  });

  it('reads a month with no year as the next one, not one already gone', () => {
    /* "14 March" said in November means next March. This year would be a deadline in the past
       the moment it was written down. */
    expect(iso(whenTheyMeant('14 March', WED))).toBe('2027-03-14');
    expect(iso(whenTheyMeant('20 December', WED))).toBe('2026-12-20');
  });

  it('takes today and tomorrow', () => {
    expect(iso(whenTheyMeant('today', WED))).toBe('2026-11-04');
    expect(iso(whenTheyMeant('tomorrow', WED))).toBe('2026-11-05');
  });

  it('takes a month end, which is one day', () => {
    expect(iso(whenTheyMeant('end of October', WED))).toBe('2027-10-31');
    expect(iso(whenTheyMeant('end of November', WED))).toBe('2026-11-30');
    expect(iso(whenTheyMeant('end of the month', WED))).toBe('2026-11-30');
  });

  it('takes a weekday as the NEXT one, never today', () => {
    /* Somebody saying "Friday" means the coming Friday. Reading it as this morning makes a
       promise late before the sentence finishes. */
    expect(iso(whenTheyMeant('Friday', WED))).toBe('2026-11-06');
    expect(iso(whenTheyMeant('by Thursday', WED))).toBe('2026-11-05');
    /* Said on a Wednesday, about Wednesday: the next one, a week out. */
    expect(iso(whenTheyMeant('Wednesday', WED))).toBe('2026-11-11');
  });
});

describe('words that do not, which is the common case', () => {
  it('refuses a feeling', () => {
    for (const said of ['soon', 'shortly', 'ASAP', 'at some point', 'eventually', 'sometime']) {
      expect(whenTheyMeant(said, WED)).toBeNull();
    }
  });

  it('refuses a cycle this product has no calendar for', () => {
    for (const said of ['next target list', 'this target list', 'end of the quarter', 'the next release']) {
      expect(whenTheyMeant(said, WED)).toBeNull();
    }
  });

  it('refuses a dependency wearing a deadline\'s clothes', () => {
    /* "Once procurement clears" is a blocker, and GroundDependency already records that properly. */
    for (const said of ['once procurement clears', 'when the contract is signed', 'after the holidays']) {
      expect(whenTheyMeant(said, WED)).toBeNull();
    }
  });

  it('refuses nothing at all', () => {
    expect(whenTheyMeant('', WED)).toBeNull();
    expect(whenTheyMeant(null, WED)).toBeNull();
    expect(whenTheyMeant('   ', WED)).toBeNull();
  });

  it('refuses a date hidden inside a hedge', () => {
    /* "Friday if the client comes back" is not a promise about Friday. */
    expect(whenTheyMeant('Friday if the client comes back', WED)).toBeNull();
  });
});

describe('what the interview does instead', () => {
  it('asks for the day and accepts that there may not be one', () => {
    const ask = askWhenTheyMean('soon');
    expect(ask).toContain('soon');
    expect(ask).toContain('there is not a date yet');
  });

  it('asks once, and only where somebody is waiting', () => {
    /* A person who has just given three answers does not need a fourth about a passing word. */
    const ask = askWhenTheyMean('soon');
    expect(ask).toContain('Ask once');
    expect(ask).toContain('somebody else is waiting on');
  });
});
