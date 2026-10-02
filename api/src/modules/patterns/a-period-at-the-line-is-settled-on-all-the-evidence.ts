/**
 * A PERIOD THE READS WERE SPLIT ON IS SETTLED ONCE, ON MORE OF THE SAME EVIDENCE (decision 68, 1 October 2026).
 *
 * WHY. A pattern is shown to a person once it has been counted in three periods. Each period is read
 * five times and counts when three of the five reads keep the code. Read twice, the same six-session
 * conversations gave the same shown patterns only about 6 or 7 times in 10, and the differences sat on
 * the three-period line: a pattern counted in two periods in one reading and three in the other. The
 * period that flipped was nearly always one the five reads were split on, two or three of five, so
 * what a person was shown depended on a near coin toss in each such period.
 *
 * WHAT THIS DOES. When the five reads of a period are split (two or three of five keep a code) and the
 * pattern is not yet shown, the check-in is read five more times, the same way, and that code is
 * decided on all ten reads, on the same line as before: a majority (six of ten; a tie at five goes the
 * way the first five went). Only the split codes are decided this way; a code four or five reads
 * kept, or none or one, is decided as always.
 *
 * WHAT IT DOES NOT DO. It is symmetric: a period two of five kept can count (if the next five mostly
 * keep it too), and a period three of five kept can stop counting (if the next five mostly do not).
 * The line stays a majority of the reads. It never touches a pattern already shown, the three-period
 * rule, which patterns exist, or who reads them. If the extra reads cannot be had, the period is
 * decided as before, by three of five.
 *
 * TRIED FIRST, AND NOT KEPT. A narrower question to the model ("does this one pattern show in this
 * period?", graded, over the person's own record) was steady, but it said yes far more often than the
 * detector's own reads, so it showed many more patterns than the record supports. Measured on the
 * six-session runs (see api/journey/what-each-person-is-shown-read-twice.py and the morning report).
 */

/** How many more reads a check-in gets when its first reads were split on a pattern not yet shown. */
export const MORE_READS_WHEN_SPLIT = 5;

/**
 * The reads were split on this period: one short of the majority, or exactly at it. With five reads
 * and three needed, that is two or three of five. Defined only from what the detector already has.
 */
export function theReadsWereSplit(votes: number, readsThatMustAgree: number): boolean {
  return votes === readsThatMustAgree - 1 || votes === readsThatMustAgree;
}

/**
 * Whether settling this period can change what a person is shown: only while the pattern has been
 * counted in fewer periods (before this one) than it takes to be shown. Once shown, a pattern stays
 * shown, so a later split period changes nothing anybody reads.
 */
export function couldChangeWhatIsShown(periodsCountedBefore: number[], thisPeriod: number, periodsBeforeShown: number): boolean {
  return new Set((periodsCountedBefore ?? []).filter((p) => p < thisPeriod)).size < periodsBeforeShown;
}

/**
 * Whether a code holds on all the reads of a period, on the same line as three of five.
 *
 * Three of five is a majority, and a majority of an odd number of reads is even-handed: a code the
 * model keeps exactly half the time counts half the time. On ten reads that line is "more than half":
 * six or more of ten count, four or fewer do not. Exactly five of ten is a tie, and a tie goes the
 * way the first five went, so the rule stays even-handed. (Six of ten alone would move the line up,
 * and five of ten would move it down; both were measured, see the morning report.)
 */
export function holdsOnAllTheReads(votes: number, reads: number, firstVotes: number, readsThatMustAgree: number): boolean {
  if (reads <= 0) return false;
  if (2 * votes > reads) return true;
  if (2 * votes < reads) return false;
  return firstVotes >= readsThatMustAgree;
}

/**
 * How many reads kept each code (one vote per read, even if a read named a code twice), with the
 * observation from the first read, in order, that kept it.
 */
export function votesOf(reads: { code: string; observation: string }[][]): Map<string, { count: number; observation: string }> {
  const votes = new Map<string, { count: number; observation: string }>();
  for (const kept of reads) {
    const codesThisRead = new Set<string>();
    for (const { code, observation } of kept) {
      if (codesThisRead.has(code)) continue;
      codesThisRead.add(code);
      const entry = votes.get(code);
      if (entry) entry.count += 1;
      else votes.set(code, { count: 1, observation });
    }
  }
  return votes;
}

/**
 * Which codes count for this period. `first` are the first reads; `more` the extra reads taken
 * because some code was split (empty when none were taken or none came back); `settle` says which
 * codes may be settled (split and not yet shown). Every other code is decided on the first reads
 * alone, exactly as before.
 */
export function whatCountsThisPeriod(
  first: { code: string; observation: string }[][],
  more: { code: string; observation: string }[][],
  settle: (code: string, votes: number) => boolean,
  readsThatMustAgree: number,
): Map<string, { observation: string; votes: number; reads: number; settled: boolean }> {
  const out = new Map<string, { observation: string; votes: number; reads: number; settled: boolean }>();
  const firstVotes = votesOf(first);
  const allVotes = votesOf([...first, ...more]);
  for (const [code, { count, observation }] of firstVotes) {
    if (more.length && settle(code, count)) {
      const all = allVotes.get(code)!;
      const reads = first.length + more.length;
      if (holdsOnAllTheReads(all.count, reads, count, readsThatMustAgree)) out.set(code, { observation, votes: all.count, reads, settled: true });
      continue;
    }
    if (count >= readsThatMustAgree) out.set(code, { observation, votes: count, reads: first.length, settled: false });
  }
  return out;
}

/**
 * WHAT THE SETTLING LET GO, so a run's log shows it (2 October 2026): the codes three or more of the first
 * five reads kept, which would have counted before this rule, and which do not hold once all the reads are
 * counted. Codes the settling brings in are already said where they are written.
 */
export function whatTheSettlingLetGo(
  first: { code: string; observation: string }[][],
  more: { code: string; observation: string }[][],
  settle: (code: string, votes: number) => boolean,
  readsThatMustAgree: number,
): { code: string; firstVotes: number; votes: number; reads: number }[] {
  if (!more.length) return [];
  const counts = whatCountsThisPeriod(first, more, settle, readsThatMustAgree);
  const all = votesOf([...first, ...more]);
  return [...votesOf(first)]
    .filter(([code, { count }]) => count >= readsThatMustAgree && settle(code, count) && !counts.has(code))
    .map(([code, { count }]) => ({ code, firstVotes: count, votes: all.get(code)?.count ?? 0, reads: first.length + more.length }));
}

export function aLineForWhatTheSettlingLetGo(checkInId: string, period: number, letGo: { code: string; firstVotes: number; votes: number; reads: number }, firstReads: number): string {
  return `Check-in ${checkInId}: ${letGo.code} does not count for period ${period}. ${letGo.firstVotes} of the first ${firstReads} reads kept it, but only ${letGo.votes} of all ${letGo.reads} reads did once the split was read again.`;
}
