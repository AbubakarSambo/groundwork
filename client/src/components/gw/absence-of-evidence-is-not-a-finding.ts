/**
 * ABSENCE OF EVIDENCE IS NOT A FINDING.
 *
 * The report card picked its status word from `engagement.coverage`:
 *
 *   strong   -> "Clear"
 *   moderate -> "Emerging"
 *   anything else, which means THIN -> "Mixed"
 *
 * "Mixed" is a statement about the CONTENT: these accounts do not agree. A thin record is a
 * statement about the EVIDENCE: barely anybody said anything. Rendering the second as the first
 * converts an absence into a finding, and it is the one thing a record like this must never do -
 * somebody reads "Mixed" and concludes their team disagrees, when the truth is that two people
 * wrote a sentence each.
 *
 * Measured on the hundred-journey corpus: 58 of 59 thin reports followed a thin check-in rather
 * than a rich one, so this is not a synthesis failure being mislabelled. The reports are honest
 * summaries of very little, and the only thing wrong was the word on top of them.
 */

export type Coverage = 'strong' | 'moderate' | 'thin' | undefined;

export interface WhatToCallIt {
  /** The word on the card. */
  status: string;
  /** Whether it describes the evidence rather than the alignment. */
  aboutTheEvidence: boolean;
  /** Said under it, where the distinction needs making. */
  note?: string;
}

export function whatToCallIt(coverage: Coverage, closed: boolean): WhatToCallIt {
  /* A closed round is a decision somebody made, and it outranks the measure. */
  if (closed) return { status: 'Aligned', aboutTheEvidence: false };

  switch (coverage) {
    case 'strong':
      return { status: 'Clear', aboutTheEvidence: false };
    case 'moderate':
      return { status: 'Emerging', aboutTheEvidence: false };
    default:
      /*
       * NOT "Mixed". The card cannot say anything about agreement yet, and saying so plainly is
       * more useful than a word that sounds like it has: it tells the reader what to do, which is
       * to get another session rather than to have a conversation about a disagreement that may
       * not exist.
       */
      return {
        status: 'Too little to say',
        aboutTheEvidence: true,
        note: 'This is built on very little. It is not a finding that people disagree, it is that not enough has been said yet. Another check-in would give it something to work with.',
      };
  }
}
