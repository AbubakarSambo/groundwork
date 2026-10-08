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
 *
 * B-108: "TWO OF THE TWO HAVE NOT ANSWERED YET." SAYS THE SAME NUMBER TWICE, WHICH IS NOT HOW A
 * PERSON COUNTS A GROUP WHERE NOBODY HAS ANSWERED. Right after a check-in saves, with nobody else
 * through yet, the outstanding count equals the whole roster - "Neither of the two has answered
 * yet." for two people, "None of the three has answered yet." for more, the same word a person
 * would actually reach for, rather than a fraction with the same number on both sides of "of".
 */
export function howManyHaveNotAnsweredYet(outstanding: number, total: number): string {
  if (outstanding === total && total >= 2) {
    const subject = total === 2 ? 'Neither' : 'None'
    return `${subject} of the ${numberUpToTenInWords(total)} has answered yet.`
  }
  const word = numberUpToTenInWords(outstanding)
  const capped = word.charAt(0).toUpperCase() + word.slice(1)
  const verb = outstanding === 1 ? 'has' : 'have'
  return `${capped} of the ${numberUpToTenInWords(total)} ${verb} not answered yet.`
}
