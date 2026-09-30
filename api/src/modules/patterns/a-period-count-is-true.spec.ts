import { periodsTheRecordHolds, aTruePeriodCount } from './period-of';

/** REQUEST 79 (a). A pattern's count of periods can never be more than the periods the record holds. */
describe('the count of periods', () => {
  it('one session reads 1, whatever was claimed', () => {
    const held = periodsTheRecordHolds([{ sessionNumber: 1 }], { cadence: 'WEEKLY' });
    expect(held).toBe(1);
    expect(aTruePeriodCount(2, held)).toBe(1);
    expect(aTruePeriodCount(5, held)).toBe(1);
  });
  it('two sessions a week apart are two periods; a claim of 3 reads 2', () => {
    const held = periodsTheRecordHolds([{ sessionNumber: 1 }, { sessionNumber: 2 }], { cadence: 'WEEKLY' });
    expect(held).toBe(2);
    expect(aTruePeriodCount(3, held)).toBe(2);
    expect(aTruePeriodCount(2, held)).toBe(2);
  });
  it('several sessions in one week of a daily check-in are one period (decision 57)', () => {
    const d = (day: number) => new Date(Date.UTC(2026, 8, day, 9));
    expect(periodsTheRecordHolds([{ sessionNumber: 1, when: d(14) }, { sessionNumber: 2, when: d(15) }, { sessionNumber: 3, when: d(16) }], { cadence: 'DAILY' })).toBe(1);
    expect(periodsTheRecordHolds([{ sessionNumber: 1, when: d(14) }, { sessionNumber: 2, when: d(22) }], { cadence: 'DAILY' })).toBe(2);
  });
  it('a missing or nonsense claim reads 1 when something was seen, and nothing is invented when nothing is held', () => {
    expect(aTruePeriodCount(undefined, 3)).toBe(1);
    expect(aTruePeriodCount('x', 3)).toBe(1);
    expect(aTruePeriodCount(2, 0)).toBe(0);
  });
});
