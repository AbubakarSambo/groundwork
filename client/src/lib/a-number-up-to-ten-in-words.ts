/**
 * A NUMBER UP TO TEN, IN WORDS - numbers a person reads are measurements, said in plain words
 * rather than a bare digit standing in for one.
 */
const SMALL_NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

export function numberUpToTenInWords(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < SMALL_NUMBERS.length ? SMALL_NUMBERS[n] : String(n)
}
