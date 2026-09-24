import { howFarBehind } from './a-report-behind-the-answers';

describe('a report behind the answers', () => {
  /* The run this came from: ten answered, the last successful synthesis read four. */
  it('says how many answered and how many this read', () => {
    const b = howFarBehind(10, 4);
    expect(b.behindBy).toBe(6);
    expect(b.say).toBe('10 people have answered, and this was written from 4. The other 6 are not in these numbers yet.');
  });

  it('says nothing when the report is level with the answers', () => {
    expect(howFarBehind(10, 10).say).toBeNull();
    expect(howFarBehind(2, 2).say).toBeNull();
  });

  /* A report written before the count existed cannot be compared, so it claims nothing. */
  it('says nothing where the count was never recorded', () => {
    expect(howFarBehind(10, null).say).toBeNull();
    expect(howFarBehind(10, undefined).say).toBeNull();
  });

  it('never goes negative when a report read more than are on record now', () => {
    expect(howFarBehind(3, 5).behindBy).toBe(0);
    expect(howFarBehind(3, 5).say).toBeNull();
  });

  it('gets the grammar right for one', () => {
    expect(howFarBehind(2, 1).say).toBe('2 people have answered, and this was written from 1. The other one is not in these numbers yet.');
    expect(howFarBehind(1, 0).say).toBe('1 person has answered, and this was written from 0. The other one is not in these numbers yet.');
  });

  /* It is not an apology: nothing has necessarily gone wrong. */
  it('does not say anything went wrong', () => {
    expect(howFarBehind(10, 4).say).not.toMatch(/fail|error|sorry|problem|wrong/i);
  });
});
