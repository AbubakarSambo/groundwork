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
 *
 * "OF THE ONE" IS NOT ENGLISH EITHER. With a single person on the check-in this read "One of the
 * one has not answered yet." - the same fault B-056 already fixed for `howManyCheckedInSentence`
 * ("The one person in it has checked in for session N."), not yet applied here. Same form, here
 * too: "The one person in it has not answered yet."
 */
export function howManyHaveNotAnsweredYet(outstanding: number, total: number): string {
  if (total === 1) return 'The one person in it has not answered yet.'
  if (outstanding === total && total >= 2) {
    const subject = total === 2 ? 'Neither' : 'None'
    return `${subject} of the ${numberUpToTenInWords(total)} has answered yet.`
  }
  const word = numberUpToTenInWords(outstanding)
  const capped = word.charAt(0).toUpperCase() + word.slice(1)
  const verb = outstanding === 1 ? 'has' : 'have'
  return `${capped} of the ${numberUpToTenInWords(total)} ${verb} not answered yet.`
}

/**
 * WHO THE COUNT LEAVES OUT, SAID BESIDE IT (journey test, 12 October 2026). The lead read "One of the
 * two has not answered yet." with five people on the roster: three were waiting for an admin to let
 * them in, and the count rightly leaves them out (decision 77), but nothing said so.
 */
export function andWhoIsNotCountedYet(notLetIn: number | null | undefined): string {
  if (!notLetIn || notLetIn < 1) return ''
  const word = numberUpToTenInWords(notLetIn)
  const capped = word.charAt(0).toUpperCase() + word.slice(1)
  return notLetIn === 1
    ? ' One more person is not counted yet, because an admin has not let them in.'
    : ` ${capped} more people are not counted yet, because an admin has not let them in.`
}
