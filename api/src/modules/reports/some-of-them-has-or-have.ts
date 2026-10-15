/**
 * "1 OF 2 PEOPLE HAS ANSWERED", NOT "HAVE" (request 105 review). In "N of M people ...", the verb goes with
 * N, the people who did it, not with M: "1 of 2 people has answered.", "2 of 3 people have answered.". The
 * noun goes with M: "1 of 1 person has answered.". Every sentence of that shape is said through this, so
 * the board and the reports cannot disagree about it again.
 */
export function someOfThemHave(n: number, m: number, rest: string, noun: { one: string; many: string } = { one: 'person', many: 'people' }): string {
  return `${n} of ${m} ${m === 1 ? noun.one : noun.many} ${n === 1 ? 'has' : 'have'} ${rest}`;
}
