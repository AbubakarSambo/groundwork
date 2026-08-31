/**
 * WHY SOMETHING AGREED IS NOT HAPPENING - WHERE THE RECORD ACTUALLY SHOWS IT.
 *
 * "No revenue after 30 days should NOT automatically equal poor performance." The six answers are
 * different in kind and reading one as another is the most damaging thing this product could do to
 * somebody: told nothing, blocked by the company, not knowing how, putting it off, not acted on, or
 * simply too early. The two in the middle arrived later and can only come from the person - see
 * `they-said-why-themselves.ts`.
 *
 * THE DEFAULT IS THAT WE CANNOT TELL, and that is not a failure to try harder. Most of the time the
 * record holds a promise, a date, and silence - and "we do not know which of these it is" is the
 * true answer. Saying it out loud is what makes the other four worth reading.
 *
 * DECIDED IN CODE, NOT BY THE MODEL. A model asked why something is late will always produce a
 * reason, because producing one is what it is for. Every branch below is a fact somebody recorded -
 * an awareness answer, a blocker with two sides to it, a date that has passed - and where no branch
 * fits, nothing is said. The synthesis is given these as facts it may state and is forbidden from
 * inventing a seventh.
 */

import { SAYS_SKILL, SAYS_CONFIDENCE } from '../conversation/they-said-why-themselves';

export interface WhatIsKnown {
  /** What was promised, in their words. Only ever quoted back, never rewritten. */
  text: string;
  /** Their words read as a date, where they carried one. */
  dueDate: Date | null;
  /** OPEN, MET, DROPPED, CHANGED. */
  status: string;
  /** Whether the person it is about has seen it. False for a lead's expectation nobody told them. */
  seenBySubject: boolean;
  /** TOLD | NOT_TOLD | UNSURE | NOT_ASKED, from the lead's own answer. */
  awareness: string | null;
  /** Blockers this person recorded, in their own account, that are still open. */
  openBlockers: { what: string; onName: string | null; escalated: boolean }[];
  /** Anything they have recorded as done against it. */
  progress: { text: string }[];
  /**
   * THEIR OWN WORDS ABOUT THIS AND NOBODY ELSE'S. Two of the explanations below can only come from
   * the person themselves, and passing a colleague's description of them here is the one way to
   * turn this into a product that records opinions about people. See `they-said-why-themselves.ts`.
   */
  saidWhy?: string | null;
  theirQuote?: string | null;
  /**
   * WHETHER THE READER MAY SEE THE SENTENCE ITSELF. False everywhere it is not set, and the shared
   * report never sets it - see the note in `they-said-why-themselves.ts`. A one-to-one surface where
   * the reader is the person or their lead alone can turn it on deliberately.
   */
  mayQuoteThem?: boolean;
}

export type Why =
  | { kind: 'UNDERSTANDING'; says: string }
  | { kind: 'CONSTRAINT'; says: string }
  | { kind: 'SKILL'; says: string }
  | { kind: 'CONFIDENCE'; says: string }
  | { kind: 'EXECUTION'; says: string }
  | { kind: 'TOO_EARLY'; says: string }
  | { kind: 'CANNOT_TELL'; says: string };

/** After this, a promise with no date and no movement is worth asking about rather than assuming. */
export const QUIET_FOR_TOO_LONG_DAYS = 21;

export function whyNot(known: WhatIsKnown, now: Date): Why {
  /*
   * NOTHING TO EXPLAIN. A promise that was met, dropped or changed is not behind, and the most
   * common way a product like this becomes unfair is by chasing something that already ended.
   */
  if (known.status !== 'OPEN') {
    return { kind: 'CANNOT_TELL', says: `This is recorded as ${known.status.toLowerCase()}, so there is nothing outstanding to explain.` };
  }

  /*
   * NOBODY TOLD THEM. First, because it outranks everything below it: somebody who has never seen
   * an expectation cannot be behind on it, and reading that as execution is the single unfairest
   * mistake available here.
   */
  if (!known.seenBySubject || known.awareness === 'NOT_TOLD') {
    return {
      kind: 'UNDERSTANDING',
      says: 'This has not been shown to the person it is about, so nothing here is a read on how they are doing against it.',
    };
  }

  /*
   * SOMETHING IS IN THE WAY, and both sides recorded it - a blocker only exists here because the
   * person waiting described it in their own account. Escalation is worth saying because an
   * escalated blocker that is still open is a different situation from a fresh one.
   */
  if (known.openBlockers.length) {
    const b = known.openBlockers[0];
    const on = b.onName ? ` on ${b.onName}` : '';
    const escalated = known.openBlockers.some((x) => x.escalated) ? ', and it has already been raised' : '';
    return {
      kind: 'CONSTRAINT',
      says: `They are waiting${on} for ${b.what}${escalated}. That is in the way of this, and it is not theirs to clear alone.`,
    };
  }

  /*
   * THEY TOLD US WHY. Above EXECUTION for the same reason every other branch is: EXECUTION is the
   * narrowest reading and everything softer is taken before it. A person who has said out loud that
   * they do not know how, or that they have been putting it off, has given the actual answer - and
   * a product that files that under "the agreed thing is not being done" was not listening.
   *
   * Below CONSTRAINT, because something genuinely in the way outranks how anybody feels about it.
   */
  const mayQuote = known.mayQuoteThem === true && !!known.theirQuote;
  if (known.saidWhy === 'SKILL') return { kind: 'SKILL', says: SAYS_SKILL(known.theirQuote ?? '', mayQuote) };
  if (known.saidWhy === 'CONFIDENCE') return { kind: 'CONFIDENCE', says: SAYS_CONFIDENCE(known.theirQuote ?? '', mayQuote) };

  const past = known.dueDate !== null && known.dueDate.getTime() < now.getTime();

  /*
   * PAST THE DATE, SEEN, NOTHING IN THE WAY, AND NOTHING RECORDED AGAINST IT.
   *
   * The one branch that says the agreed thing is not being done, and it is deliberately the
   * narrowest: every softer reading has already been taken above it. It still says what it is
   * founded on rather than pronouncing, because "no blocker was recorded" is not the same as
   * "there was no blocker" - it only means nobody wrote one down.
   */
  if (past && !known.progress.length) {
    return {
      kind: 'EXECUTION',
      says: 'The date has passed, they have seen this, and no blocker has been recorded against it. '
        + 'Nothing has been recorded as done either, which is worth asking about directly.',
    };
  }

  /* Past the date but moving. Late is not the same as not happening. */
  if (past) {
    return {
      kind: 'CANNOT_TELL',
      says: 'The date has passed and there is progress recorded against it, so this is late rather than untouched.',
    };
  }

  /* Still inside the time they were given. */
  if (known.dueDate) {
    return {
      kind: 'TOO_EARLY',
      says: 'The date they gave has not arrived yet, so there is nothing to read into this either way.',
    };
  }

  return { kind: 'CANNOT_TELL', says: NO_DATE_NO_READ };
}

/**
 * THE COMMONEST ANSWER, AND THE MOST IMPORTANT ONE TO SAY WELL.
 *
 * A promise with no date cannot be late, however long it has been quiet. Everything about this
 * product's fairness depends on not letting "we cannot tell" quietly become "behind" - so it names
 * the missing thing and asks for it rather than shrugging.
 */
export const NO_DATE_NO_READ =
  'No date was ever agreed for this, so it cannot be late. Worth agreeing one, or agreeing that it does not need one.';
