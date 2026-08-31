/**
 * "SHIPPED" IS ONE WORD FOR EIGHT DIFFERENT THINGS.
 *
 * A person says a feature is shipped and means, honestly, any of: I wrote it, it is merged, it
 * passed its tests, it is deployed, the flag is on, it works end to end, people are using it, or it
 * is doing what we built it for. All eight are said with the same word and the same confidence, and
 * a leader who cannot read the code has no way to tell which one they were told.
 *
 * That is not usually a lie. It is a definition of done that was never written down, and everybody
 * involved has a different one. But the effect on somebody depending on the answer is the same as a
 * lie, and it compounds: every week the gap between the word and the state is carried forward as
 * though it had been closed.
 *
 * WHAT THIS FILE DOES AND DOES NOT DO. It does not decide whether something is shipped. It says
 * which of the eight the available records actually reach, and - far more importantly - which ones
 * nothing here speaks to at all.
 *
 * THE TWO RULES THAT MATTER MOST, both about what may NOT be inferred:
 *
 *   FORWARD. Evidence of a state never implies a later one. A deploy record is not evidence that
 *     anything works, and this is the single commonest way a technical report misleads: deployment
 *     is the last state that leaves an easy record, so it becomes the de facto meaning of shipped.
 *
 *   BACKWARD. No evidence of a state is not evidence the state did not happen. Most work in most
 *     companies is unrecorded. The honest sentence is always "nothing here shows it", never "it did
 *     not happen", and the difference between those two is the difference between a product a
 *     technical team will cooperate with and one they will learn to route around.
 */

export type State = 'WRITTEN' | 'MERGED' | 'TESTED' | 'DEPLOYED' | 'RELEASED' | 'WORKING' | 'USED';

/** In order, because the order is the whole point. */
export const IN_ORDER: State[] = ['WRITTEN', 'MERGED', 'TESTED', 'DEPLOYED', 'RELEASED', 'WORKING', 'USED'];

/**
 * WHICH RECORD SPEAKS TO WHICH STATE, and each speaks to exactly one.
 *
 * A test run says something passed a test. It says nothing about whether that code is deployed, and
 * nothing about whether the test covers the thing anybody cares about.
 */
export const WHAT_A_RECORD_REACHES: Record<string, State> = {
  MERGE: 'MERGED',
  TEST_RUN: 'TESTED',
  DEPLOY: 'DEPLOYED',
  RELEASE: 'RELEASED',
};

/**
 * THE STATES NO RECORD IN THIS PRODUCT CAN REACH, named rather than left as a silence.
 *
 * WORKING needs somebody to have run the thing end to end and said what happened. USED needs a
 * number from the product itself. Neither is a kind of record that can be pushed here today, and a
 * list that quietly stopped at RELEASED would let "deployed" go on meaning "done" - which is the
 * exact substitution this file exists to break.
 */
export const NOTHING_HERE_REACHES: State[] = ['WORKING', 'USED'];

export interface WhatTheRecordsReach {
  /** The furthest state anything actually evidences. Null when nothing does. */
  furthest: State | null;
  /** Said in the report. Never a verdict on whether something is done. */
  says: string[];
}

const PLAINLY: Record<State, string> = {
  WRITTEN: 'written',
  MERGED: 'merged',
  TESTED: 'passed a test run',
  DEPLOYED: 'deployed',
  RELEASED: 'released',
  WORKING: 'working end to end',
  USED: 'being used',
};

/**
 * @param kinds  The kinds of record that exist for this piece of work.
 * @param claimed  What somebody said about it, if they said anything. Only ever used to say where
 *                 the claim sits relative to the records - never to contradict them or the person.
 */
export function whatTheRecordsReach(kinds: string[], claimed?: State | null): WhatTheRecordsReach {
  const reached = kinds
    .map((k) => WHAT_A_RECORD_REACHES[k])
    .filter((s): s is State => !!s);

  const furthest = reached.length
    ? IN_ORDER.filter((s) => reached.includes(s)).slice(-1)[0]
    : null;

  const says: string[] = [];

  if (!furthest) {
    says.push(
      'No record here speaks to how far this has got. That is not evidence it has not moved - most'
      + ' work leaves no record anybody sends us - it means this has to be taken on somebody\'s word.',
    );
  } else {
    says.push(`Records here show it ${PLAINLY[furthest]}.`);
    /*
     * THE SENTENCE THE WHOLE FILE IS FOR. Without it, the furthest recorded state silently becomes
     * the answer to "is it done", and deployment is where the easy records stop.
     */
    const beyond = IN_ORDER.slice(IN_ORDER.indexOf(furthest) + 1);
    if (beyond.length) {
      says.push(
        `Nothing here says whether it is ${beyond.map((s) => PLAINLY[s]).join(', ')}. Those are`
        + ' different things and this cannot see any of them.',
      );
    }
  }

  if (claimed && furthest && IN_ORDER.indexOf(claimed) > IN_ORDER.indexOf(furthest)) {
    /*
     * NOT AN ACCUSATION, AND THE WORDING IS THE WHOLE SAFEGUARD. The likeliest explanation by far
     * is a definition of done that was never agreed, and the second likeliest is that the evidence
     * exists somewhere nobody sends us. Both are ordinary. What is worth saying is only that the
     * two do not currently line up, and that somebody should ask.
     */
    says.push(
      `It has been described as ${PLAINLY[claimed]}, which is further than the records here reach.`
      + ' That is a question to ask rather than a disagreement: the evidence may exist somewhere'
      + ' this does not see, or the word may be being used for a different point in the sequence.',
    );
  }

  return { furthest, says };
}

/** Given to the synthesis with the records, for the same reason NEVER_CONCLUDE is. */
export const NEVER_CONCLUDE_ABOUT_SHIPPING =
  'WHAT THESE RECORDS CANNOT TELL YOU. A merge is not a deployment, a deployment is not a working'
  + ' feature, and a working feature is not one anybody uses. Never write that something is done,'
  + ' shipped or complete on the strength of a record that only reaches an earlier state, and never'
  + ' write that something did not happen because no record of it is here - most work is unrecorded.'
  + ' Where a description and the records reach different states, say so as a question about the'
  + ' definition being used, never as a claim that somebody is overstating.';
