import { whatWasSeenLastPeriod, lastPeriodBlockFor } from './the-detector-has-no-memory-of-last-period';

const row = (code: string, lastPeriodNumber: number | null, observationText: string | null = 'Something happened.') =>
  ({ code, lastPeriodNumber, observationText });

describe('a steer is not a way round the three-period rule', () => {
  it('shows only the period immediately before this one', () => {
    const seen = whatWasSeenLastPeriod([row('D1', 4), row('B2', 3), row('K3', 2)], 5);
    expect(seen.map((s) => s.code)).toEqual(['D1']);
  });

  it('shows nothing from a period the gap rule has already discarded', () => {
    expect(whatWasSeenLastPeriod([row('D1', 2)], 5)).toEqual([]);
  });

  it('shows nothing on a first period', () => {
    expect(whatWasSeenLastPeriod([row('D1', 1)], 1)).toEqual([]);
  });

  it('drops a detection with no observation to recognise', () => {
    expect(whatWasSeenLastPeriod([row('D1', 4, ''), row('D2', 4, null)], 5)).toEqual([]);
  });

  it('never grows past five, so the steer cannot become the list', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => row(c, 4));
    expect(whatWasSeenLastPeriod(many, 5)).toHaveLength(5);
  });

  it('adds nothing to the prompt when there is nothing to recognise', () => {
    expect(lastPeriodBlockFor([])).toBe('');
  });

  it('tells the reader it is not evidence and that none is still the answer', () => {
    const block = lastPeriodBlockFor([row('D1', 4, 'Work marked finished with nobody downstream confirming it.')]);
    expect(block).toContain('never the reason');
    expect(block).toContain('the answer is still none');
    expect(block).toContain('Do not assume any of it continued');
    expect(block).toContain('Work marked finished');
  });
});
