import { aDateSaid } from './a-dump-is-many-things';

/* "Tunde Afolabi is joining on November." read as if November were a day. Each line is what a person reads. */
describe('a date said in a sentence', () => {
  const says = (when: string) => aDateSaid('Tunde Afolabi is joining', when);
  it('puts a month, a quarter and a year after "in", not "on"', () => {
    expect(says('November')).toBe('Tunde Afolabi is joining in November.');
    expect(says('November 2026')).toBe('Tunde Afolabi is joining in November 2026.');
    expect(says('Q4')).toBe('Tunde Afolabi is joining in Q4.');
    expect(says('the fourth quarter')).toBe('Tunde Afolabi is joining in the fourth quarter.');
    expect(says('2027')).toBe('Tunde Afolabi is joining in 2027.');
    expect(says('mid-November')).toBe('Tunde Afolabi is joining in mid-November.');
    expect(says('early November')).toBe('Tunde Afolabi is joining in early November.');
  });
  it('says "at the end of" for the end of a period, and lets a relative time stand', () => {
    expect(says('end of the month')).toBe('Tunde Afolabi is joining at the end of the month.');
    expect(says('end of month')).toBe('Tunde Afolabi is joining at the end of month.');
    expect(says('next week')).toBe('Tunde Afolabi is joining next week.');
    expect(says('tomorrow')).toBe('Tunde Afolabi is joining tomorrow.');
  });
  it('still puts a day after "on", and keeps the words that already lead', () => {
    expect(says('5 November')).toBe('Tunde Afolabi is joining on 5 November.');
    expect(says('Monday')).toBe('Tunde Afolabi is joining on Monday.');
    expect(says('by Friday 16 October')).toBe('Tunde Afolabi is joining by Friday 16 October.');
    expect(says('in November')).toBe('Tunde Afolabi is joining in November.');
  });
});
