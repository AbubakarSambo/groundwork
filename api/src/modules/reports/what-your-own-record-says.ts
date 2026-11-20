/**
 * "THE INDIVIDUAL REPORT SUCKS AND SAYS NOTHING REALLY." 4.4, AND THE SENTENCE SHE READ:
 *
 *   "Because silence is usually a stage, not a rejection, it is important to know that this kind of
 *    sales and expansion work often faces unfair reading, which you should consider before making
 *    assumptions about your current standing."
 *
 * Nobody speaks like that, it is about a category rather than about her, and it survives being
 * deleted - which is the test that matters. Everything true in it is true of every salesperson who
 * ever lived.
 *
 * WHAT IT SHOULD SAY, IN HER WORDS: "you are carrying 150 of a 10,000 objective nobody has divided
 * up; there is no date on the pricing sheet; nothing in your session says how the closing gets
 * done." Three sentences, each pointing at something on your own record.
 *
 * THE RULE THAT MAKES IT WORK IS THE SAME ONE AS 3.2: A SENTENCE THAT COULD BE SAID TO SOMEBODY
 * ELSE IS CUT. Every line below carries a figure, a date, or a thing from this person's own record,
 * so it cannot be about anybody else. Where there is nothing of theirs to say, this says nothing,
 * and the role map behind it is left to do the work it is good at.
 */

export interface TheirOwnRecord {
  /** The whole-team number, and whether anybody has been given a share of it. */
  whole?: { name: string; target: number } | null;
  /** How many people hold a number of their own. */
  peopleWithANumber?: number;
  /** People being asked, not counting anybody managing only. */
  peopleInIt?: number;
  /** This person's own number, if they hold one. */
  theirs?: { name: string; target: number } | null;
  /** Where their own number stands, if anybody has said. */
  standsAt?: number | null;
  /** What they promised, and whether it carries a date. */
  promises?: { what: string; hasDate: boolean }[];
  /** Did anything they said point at something another person could open. */
  anythingDocumented?: boolean;
  /**
   * WHETHER ANYBODY IN THIS SITUATION HAS DOCUMENTS. "Everything in your session came from memory, so
   * there is nothing here that anybody else could open and check" was said to five borrowers who own a
   * tractor, a cold store and a bike (run 6, 21 Sep 2026). A cohort of business owners and a room of
   * discovery experts are not office work; the line is for the situations where a document is normal.
   */
  documentsExpected?: boolean;
  /** The product's own finding about this person, already in their terms: the first thing to say. */
  findingLines?: string[];
}

const n = (v: number) => Math.round(v).toLocaleString('en-US');

/** Trim a promise down to the thing itself, so it can sit inside a sentence. */
const theThing = (what: string): string =>
  (what ?? '').trim().replace(/^(?:i|we)\s+(?:will|'ll|am going to|are going to)\s+/i, '').replace(/[.\s]+$/, '');

/**
 * Up to three sentences about this person, from their own record. Fewer is normal, none is fine.
 */
export function whatYourOwnRecordSays(r: TheirOwnRecord): string[] {
  const out: string[] = [];

  /* THE FINDING FIRST: the gap the record itself shows for this person, in the product's words. */
  for (const line of (r.findingLines ?? []).filter((l) => l?.trim()).slice(0, 2)) out.push(line.trim());

  /*
   * CARRYING A PART OF SOMETHING NOBODY HAS DIVIDED. Her own example, and the one fact on the page
   * that needs everybody's numbers at once to see.
   */
  if (r.theirs && r.whole && (r.peopleWithANumber ?? 0) <= 1 && (r.peopleInIt ?? 0) > 1) {
    out.push(
      `You are carrying ${n(r.theirs.target)} of a ${n(r.whole.target)} objective that has not been divided up, so nothing here can say whether ${n(r.theirs.target)} is your fair share of it.`,
    );
  } else if (r.theirs && r.standsAt != null) {
    out.push(`You are at ${n(r.standsAt)} of your ${n(r.theirs.target)}.`);
  }

  /* A PROMISE WITH NO DATE, named, because it is the thing that quietly never happens. */
  const undated = (r.promises ?? []).filter((p) => !p.hasDate && (p.what ?? '').trim());
  if (undated.length) {
    out.push(`There is no date on ${theThing(undated[0].what)}${undated.length > 1 ? `, or on ${undated.length - 1} other thing${undated.length > 2 ? 's' : ''} you said you would do` : ''}.`);
  }

  /* NOTHING ANYBODY ELSE COULD OPEN, which is what makes the next session worth less than this one. */
  if (r.anythingDocumented === false && r.documentsExpected !== false) {
    out.push('Everything in your check-in came from memory, so there is nothing here that anybody else could open and check.');
  }

  return out.slice(0, 3);
}
