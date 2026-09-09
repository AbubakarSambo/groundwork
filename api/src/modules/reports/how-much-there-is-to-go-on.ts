/**
 * CONFIDENCE IN THIS REPORT, WHICH IS NOT THE SAME QUESTION AS SPECIFICITY.
 *
 * Two meters, two questions, and only one of them was on the page.
 *
 *   Specificity asks how much ONE PERSON gave this session. It is feedback to them about their
 *   own input, it is scoped to their own answers, and it belongs on their private half.
 *
 *   Confidence asks how much basis there is to build a good shared report AT ALL. It is scoped to
 *   everybody together plus what the record rests on, and it is a health reading on the document,
 *   never on a person.
 *
 * Merging them, or styling them the same, would turn a reading about a document into a mark out
 * of five for whoever happens to be reading it.
 *
 * IT IS COMPUTED, NEVER ASKED OF A MODEL. Every input is a count of something that either happened
 * or did not: who answered, whether anything was attached, whether what people said lines up or
 * pulls apart, whether a commitment has somebody's name and a date on it. A model asked "how
 * confident are you in this report" will always answer.
 *
 * THE REASONS ARE THE POINT. A score with no reasons is a grade. Each reason names the fixable
 * thing rather than the deficiency, because every one of them is something a person can go and do
 * before the next session.
 */
export interface WhatItRestsOn {
  /** How many people this session counts, and how many of them answered. */
  answered: number;
  ofPeople: number;
  /** Entries that were anchored to something written down rather than recalled. */
  documented: number;
  /** Everything said this session. */
  saidInAll: number;
  /** Areas the records agree on, and areas still open between them. */
  agreed: number;
  stillOpen: number;
  /** Commitments made this session, and how many of them carry an owner and a date. */
  commitments: number;
  commitmentsWithOwnerAndDate: number;
}

export interface Confidence {
  /** 0 to 100. Rendered as a band, never as a mark. */
  score: number;
  band: 'thin' | 'partial' | 'solid';
  /** One line saying what the band means for what this report can be used for. */
  saying: string;
  /** The specific things holding it down, each phrased as the thing to go and do. */
  reasons: string[];
  /**
   * WHAT THIS IS COUNTING, SAID. Every input here is a line a model took from what somebody said,
   * not a line they wrote, and nothing downstream had said so. Not a reason - there is nothing to
   * go and fix - so it is a note, and it is always there while there is anything to count.
   */
  note: string | null;
}

/**
 * FOUR THINGS, WEIGHTED BY HOW MUCH EACH ONE ACTUALLY CHANGES WHAT A REPORT CAN SAY.
 *
 * Who answered is worth the most: a report built from one person out of four is not a shared
 * report at all, whatever else is true of it. Then whether anything is written down, because a
 * record entirely from memory cannot be checked by anybody. Then whether the sides have been
 * compared. Then whether what was agreed has a name and a date on it, which is the difference
 * between a conversation and a commitment.
 */
export function howMuchThereIsToGoOn(r: WhatItRestsOn): Confidence {
  const reasons: string[] = [];

  const coverage = r.ofPeople > 0 ? r.answered / r.ofPeople : 0;
  if (r.ofPeople > 0 && r.answered < r.ofPeople) {
    const missing = r.ofPeople - r.answered;
    reasons.push(
      `${missing} of ${r.ofPeople} ${missing === 1 ? 'person has' : 'people have'} not answered yet. Their side is not in this.`,
    );
  }

  const documented = r.saidInAll > 0 ? r.documented / r.saidInAll : 0;
  if (r.saidInAll > 0 && r.documented === 0) {
    reasons.push('Everything here was recalled. Attaching one document would let somebody check it.');
  } else if (documented < 0.34 && r.saidInAll > 0) {
    reasons.push('Most of this was recalled rather than checked against anything written down.');
  }

  const compared = r.agreed + r.stillOpen > 0;
  if (!compared) {
    reasons.push('The written report has not yet set what people said side by side, so it names no agreement and no gap.');
  }

  const owned = r.commitments > 0 ? r.commitmentsWithOwnerAndDate / r.commitments : 0;
  if (r.commitments === 0) {
    reasons.push('Nobody committed to anything specific, so there is nothing here to follow up on.');
  } else if (r.commitmentsWithOwnerAndDate < r.commitments) {
    const loose = r.commitments - r.commitmentsWithOwnerAndDate;
    reasons.push(
      `${loose} of ${r.commitments} ${loose === 1 ? 'commitment has' : 'commitments have'} no owner or no date. Naming one of each would make ${loose === 1 ? 'it' : 'them'} checkable.`,
    );
  }

  const score = Math.round(
    (coverage * 45 + documented * 25 + (compared ? 1 : 0) * 15 + owned * 15),
  );
  const band = score >= 67 ? 'solid' : score >= 34 ? 'partial' : 'thin';

  const saying =
    band === 'solid'
      ? 'There is enough here to act on.'
      : band === 'partial'
        ? 'There is enough here to talk about, and not enough to settle anything.'
        : 'There is not much here yet. Treat it as a starting point rather than a finding.';

  /* A perfect report still says why it is one, rather than showing an empty list. */
  if (!reasons.length) {
    reasons.push('Everybody answered, what was said is anchored to documents, and the commitments have owners and dates.');
  }

  return {
    score, band, saying, reasons,
    note: r.saidInAll > 0
      ? 'These are lines taken from what people said, not lines they wrote. Anyone can mark one of their own as not what they said, and it stops counting.'
      : null,
  };
}
