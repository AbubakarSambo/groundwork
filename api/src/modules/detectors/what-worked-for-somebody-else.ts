/**
 * WHAT ONE PERSON WORKED OUT, REACHING THE NEXT PERSON STUCK ON IT.
 *
 * A sales team of twelve solves the same problem twelve times. Somebody finds the way past a
 * procurement block in March and in June three other people are still stuck on it, because what she
 * worked out lived in her check-in and her check-in is hers.
 *
 * EVERY OBVIOUS WAY TO BUILD THIS IS A LEAGUE TABLE. Extract what works from the people it works
 * for, and the product is deciding whose approach is good; count who contributed, and it is a
 * scoreboard with a friendly name; rank the tips, and it is ranking the people behind them. So:
 *
 *   THEY OFFER IT, NOTHING HARVESTS IT. A note reaches other people because the person wrote it for
 *     other people. Nothing is lifted out of a check-in on somebody's behalf, which also means
 *     nobody has to wonder whether today's answer is going on a noticeboard.
 *   IT IS MATCHED TO A PROBLEM, NOT RECOMMENDED. Somebody stuck on the thing this note is about
 *     sees it. That is the whole ranking: does it match what you are stuck on.
 *   NOBODY IS COUNTED. There is no tally of who has offered what, because the day that number
 *     exists is the day it goes in somebody's review.
 *   IT IS NOT ADVICE FROM ABOVE. "This worked for somebody here" is a fact about one attempt. The
 *     wording never says it will work, and never implies the reader should have known it.
 */

export interface Offered {
  /** Who wrote it. Shown, because they chose to write it for other people - see WHY_NAMED. */
  by: string;
  /** What they were stuck on, in their words. This is what matching happens on. */
  about: string;
  /** What they did. Their words, never rewritten, because a summary of a method is not the method. */
  what: string;
  offeredAt: Date;
}

export interface Stuck {
  /** What this person has recorded as being in their way, in their words. */
  about: string;
}

export interface MightHelp {
  by: string;
  about: string;
  what: string;
  /** Said with it, every time. */
  caveat: string;
}

/**
 * NAMED, AND DELIBERATELY SO - the one place in this product where a person's name is attached to
 * something about their work by default. It is safe here for the reason it is unsafe elsewhere:
 * they wrote it, on purpose, for other people to read. Anonymising it would make it worse, not
 * safer - a tip from nobody cannot be asked a follow-up question, and the follow-up is most of the
 * value.
 */
export const WHY_NAMED = 'They wrote this for other people. Ask them about it.';

export const CAVEAT = 'This worked once, for one person, on their version of the problem. It may not'
  + ' be right for yours.';

/*
 * Deliberately dumb matching on shared words. A model deciding which colleague's experience is
 * relevant to your problem is a model forming a view about whose approach is good, and the honest
 * version of this feature does not need one: somebody reading "this is about a procurement hold"
 * can tell in a second whether it is their problem, and a wrong match costs them that second.
 */
const NOISE = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in',
  'on', 'for', 'with', 'at', 'by', 'from', 'it', 'this', 'that', 'we', 'i', 'they', 'my', 'our',
  'their', 'not', 'no', 'has', 'have', 'had', 'do', 'does', 'did', 'get', 'got', 'still', 'yet',
]);

function meaningfulWords(s: string): Set<string> {
  return new Set(
    s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !NOISE.has(w)),
  );
}

/** How many meaningful words two descriptions share. Two is the bar - one is a coincidence. */
export const WORDS_IN_COMMON = 2;

export function whatMightHelp(stuck: Stuck, offers: Offered[]): MightHelp[] {
  const mine = meaningfulWords(stuck.about);
  if (mine.size < WORDS_IN_COMMON) return [];

  return offers
    .filter((o) => {
      const theirs = meaningfulWords(o.about);
      let shared = 0;
      for (const w of mine) if (theirs.has(w)) shared++;
      return shared >= WORDS_IN_COMMON;
    })
    /*
     * MOST RECENT FIRST, and that is the only order. Anything else - how often a note matched, how
     * many people found it useful - is a score on the person who wrote it, arriving by the back
     * door as a property of their note.
     */
    .sort((a, b) => b.offeredAt.getTime() - a.offeredAt.getTime())
    .map((o) => ({ by: o.by, about: o.about, what: o.what, caveat: CAVEAT }));
}

/**
 * WHAT THIS IS NOT, SAID WHERE IT IS READ.
 *
 * Somebody shown a colleague's solution to their problem can read it as being told they should have
 * thought of it. That reading turns a useful thing into a small humiliation, and the only defence
 * is to say so plainly next to it.
 */
export const NOT_A_STANDARD = [
  'Nobody is being compared here, and nothing about this is recorded against you.',
  'It is one person\'s account of one attempt, not how it should be done.',
  'Ignoring it costs you nothing. Nobody is told whether you read it.',
];
