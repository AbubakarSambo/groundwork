import { someOfThemHave } from './some-of-them-has-or-have';

/* "N of M people ...": the verb goes with N, the noun with M (request 105 review: "1 of 2 people have answered."). */
describe('the verb agrees with how many did it', () => {
  it('reads each count right', () => {
    expect(someOfThemHave(1, 2, 'answered.')).toBe('1 of 2 people has answered.');
    expect(someOfThemHave(2, 3, 'answered.')).toBe('2 of 3 people have answered.');
    expect(someOfThemHave(1, 1, 'answered.')).toBe('1 of 1 person has answered.');
    expect(someOfThemHave(0, 4, 'answered.')).toBe('0 of 4 people have answered.');
  });
});
