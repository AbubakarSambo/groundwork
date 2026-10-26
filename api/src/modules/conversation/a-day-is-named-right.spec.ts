import { aDayIsNamedRight } from './a-day-is-named-right';

const TUESDAY_13 = new Date('2026-10-13T09:00:00+03:00');

describe('a day is named right, from the calendar', () => {
  it('Aisha\'s "the end of yesterday, Tuesday" on Tuesday 13 October is Monday', () => {
    expect(aDayIsNamedRight('What did you do about those witness statements by the end of yesterday, Tuesday?', TUESDAY_13).text)
      .toBe('What did you do about those witness statements by the end of yesterday, Monday?');
  });
  it('"Wednesday 13 October" follows the date', () => {
    expect(aDayIsNamedRight('You sent Brian the draft on Wednesday 13 October.', TUESDAY_13).text).toBe('You sent Brian the draft on Tuesday 13 October.');
  });
  it('a right day, or a weekday on its own, is left as it was', () => {
    for (const t of ['What is next for Westgate, and on which day, Friday or Monday?', 'Tomorrow, Wednesday, the units arrive.', 'On Monday 12 October you wrote it.']) {
      expect(aDayIsNamedRight(t, TUESDAY_13)).toEqual({ text: t, changed: false });
    }
  });
});
