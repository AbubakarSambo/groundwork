/**
 * WHICH CHECK-IN, SAID ONE WAY EVERYWHERE (request 97a).
 *
 * One check-in showed three different numbers on one day: Today said "for session 2", Coming up said
 * "Session 3 ... opens" to one person and "Session 2" to another, the check-ins list said "Session 1 of
 * 12" to everybody, and the You board said "You have finished 2 sessions". The board says "the second
 * check-in", so everything else says it that way too, and the number behind it comes from one place.
 *
 * THE ROUND IS THE TEAM'S, FROM ONE PLACE. `whichRoundIsOpen` (board/which-round-is-open.ts) is the
 * board's own clock: the lowest started round somebody has not finished. `howACheckInIsGoing` asks it
 * and serves the answer as `glance.progress.openRound`, so Today's count, the list's "where it is" and
 * the board all read the same round. Today used its own "latest session whose date has come", the list
 * used a third copy on the screen.
 *
 * WHAT MAY DIFFER, AND WHY. A person's OWN next check-in can be later than the team's round, because
 * check-ins are written ahead for each person and one person can be a round ahead of the others. That
 * is said as theirs ("Your third check-in ... opens"), never as the team's. Anything said about the
 * team (the count on Today, the list's glance, the lead's Coming up) is the same round for every reader.
 */
const WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/** "the second check-in", or "check-in number 12" past ten. */
export function theCheckIn(n: number): string {
  return n >= 1 && n <= WORDS.length ? `the ${WORDS[n - 1]} check-in` : `check-in number ${n}`;
}

/** "Your third check-in", for a person's own. */
export function yourCheckIn(n: number): string {
  return n >= 1 && n <= WORDS.length ? `Your ${WORDS[n - 1]} check-in` : `Your check-in number ${n}`;
}

/**
 * Where the team is, as one sentence the list shows as it is (request 97d). "It is on the second
 * check-in of 12." while it runs. When every planned check-in is done it says that once, with the right
 * plural: "The one check-in is finished." and "All three check-ins are finished.", not "Session 1 of 1,
 * finished." beside "1 of 1 sessions done".
 */
export function whereTheTeamIs(round: number, planned: number | null, done = 0): string | null {
  if (!round) return null;
  if (planned && done >= planned) return planned === 1 ? 'The one check-in is finished.' : `All ${howManyCheckIns(planned)} check-ins are finished.`;
  return planned && planned >= round ? `It is on ${theCheckIn(round)} of ${planned}.` : `It is on ${theCheckIn(round)}.`;
}

/** How far through, as a sentence for the line under it, or null where it would only repeat `whereTheTeamIs`. */
export function howManyAreDone(done: number, planned: number | null): string | null {
  if (!planned || done <= 0 || done >= planned) return null;
  const inWords = done <= 10 && planned <= 10;
  const first = inWords ? howManyCheckIns(done) : String(done);
  const total = inWords ? howManyCheckIns(planned) : String(planned);
  return `${first[0].toUpperCase()}${first.slice(1)} of the ${total} check-ins ${done === 1 ? 'is' : 'are'} done.`;
}

/** A count of check-ins in words up to ten, figures past it: "one", "two", "11". */
export function howManyCheckIns(n: number): string {
  const w = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return n >= 0 && n <= 10 ? w[n] : String(n);
}
