/**
 * A NUMBER UP TO TEN, IN WORDS - numbers a person reads are measurements, said in plain words
 * rather than a bare digit standing in for one.
 */
const SMALL_NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

export function numberUpToTenInWords(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < SMALL_NUMBERS.length ? SMALL_NUMBERS[n] : String(n)
}

/**
 * "One of the three has not answered yet." / "Two of the five have not answered yet."
 *
 * SCREEN FAULT 4 (FINAL WALK): "1 of the 3 have not answered yet." read a bare fraction, with the
 * wrong verb for a single person left over ("1... have", not "has"). Replaced with the same style
 * stillToCheckIn (TheReportIsAListOfSessions.tsx) and WhoIsStillOut already use elsewhere on the
 * product: numbers in words, and "has" for one person, "have" for more than one.
 */
export function howManyHaveNotAnsweredYet(outstanding: number, total: number): string {
  /* Everybody still out reads as a sentence, never "Two of the two have not answered yet." (release check, 9 October). */
  if (outstanding === total && total >= 2) {
    return total === 2 ? 'Neither of the two has answered yet.' : `None of the ${numberUpToTenInWords(total)} has answered yet.`
  }
  const word = numberUpToTenInWords(outstanding)
  const capped = word.charAt(0).toUpperCase() + word.slice(1)
  const verb = outstanding === 1 ? 'has' : 'have'
  return `${capped} of the ${numberUpToTenInWords(total)} ${verb} not answered yet.`
}
