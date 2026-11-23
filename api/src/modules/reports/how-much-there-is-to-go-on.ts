import { someOfThemHave } from './some-of-them-has-or-have';
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
  /** Release 1's switch is on for the check-in's organisation: the count of commitments reads as a sentence ("1 of the 5 commitments has"). */
  releaseOne?: boolean;
}

export interface Confidence {
  /** 0 to 100. Rendered as a band, never as a mark. */
  score: number;
  band: 'thin' | 'partial' | 'solid';
  /** One line saying what the band means for what this report can be used for. */
  saying: string;
  /** The specific things holding it down, each phrased as the thing to go and do. */
  reasons: string[];
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
export function howMuchThereIsToGoOn(input: WhatItRestsOn): Confidence {
  /* Both terms of each ratio must come from one population. A numerator larger than its denominator
     is a caller that mixed two, and the score it would produce is a lie; clamp, so the sentence
     below can never say "5 of 4". */
  const r: WhatItRestsOn = {
    ...input,
    answered: Math.min(input.answered, input.ofPeople),
    documented: Math.min(input.documented, input.saidInAll),
  };
  const reasons: string[] = [];

  const coverage = r.ofPeople > 0 ? r.answered / r.ofPeople : 0;
  if (r.ofPeople > 0 && r.answered < r.ofPeople) {
    const missing = r.ofPeople - r.answered;
    reasons.push(
      `${someOfThemHave(missing, r.ofPeople, 'not answered yet.')} Their side ${missing === 1 ? 'is' : 'are'} not in this.`,
    );
  }

  const documented = r.saidInAll > 0 ? r.documented / r.saidInAll : 0;
  /*
   * A STATEMENT, NOT AN ASK. This line used to tell every reader to attach a document, at a time when
   * 26 uploads across 22 grounds had changed nothing anybody could see. A document changes the record
   * now (anchorRecordToDocuments), so the fact stands; the instruction does not. Where a document was
   * checked, it says how many lines it backs.
   */
  if (r.saidInAll > 0 && r.documented === 0) {
    reasons.push('Everything here is from memory. Nothing said was checked against a document.');
  } else if (documented < 0.34 && r.saidInAll > 0) {
    reasons.push(`${r.documented} of ${r.saidInAll} lines are backed by a document. The rest is from memory.`);
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
      /* "1 of the 5 commitments has", never "1 of 5 commitment has" (Drop Access short run, item 12), where Release 1's switch is on; off, as before. */
      input.releaseOne
        ? `${r.commitments === 1 ? 'The one commitment has' : loose === r.commitments ? `All ${r.commitments} commitments have` : `${loose} of the ${r.commitments} commitments ${loose === 1 ? 'has' : 'have'}`} no owner or no date. Naming one of each would make ${loose === 1 ? 'it' : 'them'} checkable.`
        : `${loose} of ${r.commitments} ${loose === 1 ? 'commitment has' : 'commitments have'} no owner or no date. Naming one of each would make ${loose === 1 ? 'it' : 'them'} checkable.`,
    );
  }

  const score = Math.round(
    (coverage * 45 + documented * 25 + (compared ? 1 : 0) * 15 + owned * 15),
  );
  /*
   * SOLID MEANS "ENOUGH HERE TO ACT ON", AND THERE IS NOTHING TO ACT ON WITHOUT A COMMITMENT.
   *
   * One uploaded document took a session from 60 to 74, partial to solid, while the headline
   * reason stayed "nobody committed to anything specific". Coverage, documents and a comparison
   * can reach 85 between them, so solid was reachable with zero owned commitments, and that reads
   * wrong: a well-evidenced description of a situation nobody has promised to move is still only
   * something to talk about. The score stands as computed; the band is capped at partial until at
   * least one commitment has an owner and a date.
   */
  const somethingToActOn = r.commitmentsWithOwnerAndDate > 0;
  const band = score >= 67 && somethingToActOn ? 'solid' : score >= 34 ? 'partial' : 'thin';

  const saying =
    band === 'solid'
      ? 'There is enough here to act on.'
      : band === 'partial'
        ? 'There is enough here to talk about.'
        : 'There is not much here yet.';

  /* A perfect report still says why it is one, rather than showing an empty list. */
  if (score >= 67 && !somethingToActOn) {
    reasons.push('Nothing here has an owner and a date yet.');
  }
  if (!reasons.length) {
    reasons.push('Everybody answered, what was said is anchored to documents, and the commitments have owners and dates.');
  }

  /* No sentence explaining the report (page audit, 24 November, row 6). */
  return { score, band, saying, reasons };
}
