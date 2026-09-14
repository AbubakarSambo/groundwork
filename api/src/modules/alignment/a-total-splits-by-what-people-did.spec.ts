import {
  splitTheTotal, runRateOf, headroomFor, sayingWhatTheSplitDoes, HEADROOM, type Person,
} from './a-total-splits-by-what-people-did';

/** The ten from the live session, with their real figures. */
const TEN: Person[] = [
  { key: 'Musa', lastPeriod: 31, months: 48 },
  { key: 'Amina', lastPeriod: 14, months: 11 },
  { key: 'Tunde', lastPeriod: 28, months: 36 },
  { key: 'Chidi', lastPeriod: 6, months: 6 },
  { key: 'Fatima', lastPeriod: 34, months: 60 },
  { key: 'Kemi', lastPeriod: 19, months: 24 },
  { key: 'Yusuf', lastPeriod: 26, months: 48 },
  { key: 'Ngozi', lastPeriod: 17, months: 18 },
  { key: 'Bala', lastPeriod: 38, months: 84 },
  { key: 'Zainab', lastPeriod: 9, months: 9 },
];

describe('a total splits by what people did', () => {
  it('gives ten numbers that add to the number committed to the board', () => {
    /* The live failure was three numbers adding to 66. A split that does not add up is not a
       split, it is a suggestion. */
    const out = splitTheTotal(TEN, 270);
    expect(out).toHaveLength(10);
    expect(out.reduce((a, s) => a + s.target, 0)).toBe(270);
  });

  it('adds up exactly at awkward totals too, where ten roundings would drift', () => {
    for (const total of [271, 269, 1, 7, 1000]) {
      expect(splitTheTotal(TEN, total).reduce((a, s) => a + s.target, 0)).toBe(total);
    }
  });

  it('annualises a part year before comparing anybody', () => {
    /* Six months and six closed is not half as good as twelve and twelve. It is the same, with half
       the time - and comparing the raw figures hands the newest people the biggest growth targets
       for the worst reason. */
    expect(runRateOf({ key: 'Chidi', lastPeriod: 6, months: 6 })).toBe(12);
    expect(runRateOf({ key: 'Musa', lastPeriod: 31, months: 48 })).toBe(31);
  });

  it('leaves the longest-serving carrying the least of the increase', () => {
    const out = splitTheTotal(TEN, 270);
    const bala = out.find((s) => s.key === 'Bala')!;
    const ngozi = out.find((s) => s.key === 'Ngozi')!;
    expect(bala.upliftPct).toBeLessThan(ngozi.upliftPct);
  });

  it('states the reason in facts, not adjectives', () => {
    const chidi = splitTheTotal(TEN, 270).find((s) => s.key === 'Chidi')!;
    expect(chidi.because).toContain('Closed 6 in 6 months');
    expect(chidi.because).toContain('about 12 a year at that rate');
    expect(chidi.because).not.toMatch(/strong|weak|good|poor|underperform/i);
  });

  it('puts the bands where a person can read and disagree with them', () => {
    expect(headroomFor(6).upToMonths).toBe(12);
    expect(headroomFor(84)).toBe(HEADROOM[HEADROOM.length - 1]);
    expect(HEADROOM.every((b) => b.saying.length > 10)).toBe(true);
  });

  it('splits evenly and says so where nobody closed anything', () => {
    /* No shape in the data to divide by. Inventing one would be the worst kind of confident. */
    const out = splitTheTotal([{ key: 'a', lastPeriod: 0, months: 12 }, { key: 'b', lastPeriod: 0, months: 12 }], 10);
    expect(out.map((s) => s.target)).toEqual([5, 5]);
    expect(out[0].because).toContain('split evenly');
  });

  it('says nothing where there is nobody or no total', () => {
    expect(splitTheTotal([], 270)).toEqual([]);
    expect(splitTheTotal(TEN, 0)).toEqual([]);
  });

  it('says what the split does without anybody adding the column up', () => {
    const out = splitTheTotal(TEN, 270);
    const line = sayingWhatTheSplitDoes(out, 270);
    expect(line).toContain('adding to 270');
    expect(line).toContain('a proposal, not a formula anybody is held to');
  });
});

describe('and a birthday is not an event', () => {
  it('does not drop somebody’s number for gaining a month of tenure', () => {
    /* Read on the real ten: 23 months sat at 1.30 and 24 months at 1.14, so a person's target fell
       twelve per cent the day they got more experienced. Nobody would defend that in the room. */
    const at = (months: number) => splitTheTotal(
      [{ key: 'a', lastPeriod: 19, months }, { key: 'b', lastPeriod: 19, months: 48 }], 60,
    ).find((s) => s.key === 'a')!.target;
    expect(Math.abs(at(24) - at(23))).toBeLessThanOrEqual(1);
  });

  it('still moves the right way across the whole range', () => {
    const { weightFor } = require('./a-total-splits-by-what-people-did');
    expect(weightFor(0)).toBeGreaterThan(weightFor(18));
    expect(weightFor(18)).toBeGreaterThan(weightFor(48));
    expect(weightFor(84)).toBe(weightFor(60));
  });
});
