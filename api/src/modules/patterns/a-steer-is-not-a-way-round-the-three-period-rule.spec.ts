import { whatWasSeenLastPeriod, lastPeriodBlockFor } from './the-detector-has-no-memory-of-last-period';

const row = (code: string, lastPeriodNumber: number | null, observationText: string | null = 'Something happened.') =>
  ({ code, lastPeriodNumber, observationText });

describe('a steer is not a way round the three-period rule', () => {
  /*
   * THE WINDOW IS THREE PERIODS NOW, most recent first, and the reason is in the module: one period
   * of memory meant a single miss erased the detector's own words for a behaviour, which made the
   * next miss likelier. Measured live: E2 seen in fortnight two and fortnight six of six, nothing
   * said to the lead in three months.
   */
  it('shows the recent periods, most recent first', () => {
    const seen = whatWasSeenLastPeriod([row('D1', 4), row('B2', 3), row('K3', 2)], 5);
    expect(seen.map((s) => s.code)).toEqual(['D1', 'B2', 'K3']);
  });

  it('shows nothing from further back than the window', () => {
    expect(whatWasSeenLastPeriod([row('D1', 1)], 5)).toEqual([]);
  });

  /* And never this period's own row, which would be the model reading its own answer back. */
  it('never shows this period', () => {
    expect(whatWasSeenLastPeriod([row('D1', 5)], 5)).toEqual([]);
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

  it('says how old each line is, so nothing reads as this period', () => {
    const block = lastPeriodBlockFor(whatWasSeenLastPeriod([row('D1', 4), row('B2', 3)], 5), 5);
    expect(block).toContain('D1 (last period)');
    expect(block).toContain('B2 (2 periods ago)');
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
