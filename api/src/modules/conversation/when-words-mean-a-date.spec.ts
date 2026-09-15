
/*
 * TWO SHAPES A REAL PERSON USED, READ OFF PRODUCTION ON 15 SEPTEMBER 2026.
 *
 * "500 contracts by the end of the year" and, in answer to a direct question about when, "by
 * december 1 2026". Both came back as no date at all, and the record then said "no date agreed"
 * about somebody who had given one twice.
 */
describe('the two she actually typed', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { whenTheyMeant } = require('./when-words-mean-a-date');
  const on = new Date(Date.UTC(2026, 8, 15));
  const iso = (s: string) => whenTheyMeant(s, on)?.toISOString().slice(0, 10) ?? null;

  it('reads a date written month first, which is how she wrote it', () => {
    expect(iso('december 1 2026')).toBe('2026-12-01');
    expect(iso('December 1, 2026')).toBe('2026-12-01');
    expect(iso('December 1st 2026')).toBe('2026-12-01');
  });

  it('and still reads it day first, which it always did', () => {
    expect(iso('1 December 2026')).toBe('2026-12-01');
    expect(iso('by the 15th of May of 2027')).toBe('2027-05-15');
  });

  it('a month first with no year means the next one of those, not one in the past', () => {
    /* Said in September: March means next March. */
    expect(iso('March 14')).toBe('2027-03-14');
    expect(iso('December 1')).toBe('2026-12-01');
  });

  it('reads the end of the year, which is one day and not a feeling', () => {
    for (const said of ['end of the year', 'by the end of the year', 'end of this year', 'year end', 'end of 2026']) {
      expect(iso(said)).toBe('2026-12-31');
    }
  });

  it('and a year said out loud is that year, not the next one', () => {
    expect(iso('end of 2027')).toBe('2027-12-31');
  });

  it('while everything that genuinely means nothing still means nothing', () => {
    for (const vague of ['soon', 'next sprint', 'when procurement clears', 'at some point', 'end of the quarter']) {
      expect(iso(vague)).toBeNull();
    }
  });
});
