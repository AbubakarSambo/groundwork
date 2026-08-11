/**
 * WHAT A LEADER CAN WEIGH, AND WHAT THEY CANNOT. (G10)
 *
 * A ground is opened to answer a question, usually "should we keep going with this
 * person or this work". Twelve weeks later the report tells the story accurately
 * and readably, and then the decision gets made against prose. Nothing lays out
 * the thing actually being decided.
 *
 * This is one section, built ENTIRELY from words the parties already gave:
 *
 *   1  what you said doing well means      the lead's own definition, quoted back
 *   2  what the record holds on that       entries from every account bearing on it
 *   3  what nobody has evidence for        the parts nothing ever reached
 *
 * PART THREE IS THE ONE THAT EARNS THE SECTION. Parts one and two are a tidy
 * summary. Part three is the thing a leader cannot produce for themselves, because
 * absence is invisible: nobody notices the standard that twelve weeks of accounts
 * never touched, and that standard is usually the one the decision turns on.
 *
 * WHAT IS DELIBERATELY ABSENT, and absent BY OMISSION rather than by a warning.
 * A "what not to weigh" list on the screen draws attention to exactly the thing it
 * warns against, so there is no such list in the output - only this comment, and
 * the tests.
 *
 *   the specificity label     measures how somebody WRITES, not how they work.
 *                             Plain-spoken scores low. Using it as a proxy for
 *                             performance is the quiet unfairness this product
 *                             exists to prevent. It belongs to the person, as
 *                             feedback on their own record. (G9, now G30.)
 *   session counts            turning up is not contribution, and a report that
 *                             treated activity as alignment has been found wrong
 *                             here once already.
 *   attributed testimony      the substance can be weighed; testimony cannot be
 *                             handed over.
 *   the pattern feed          shapes worth asking about, not conclusions.
 *
 * AND IT DOES NOT APPEAR UNTIL THE CLOSE. The overview is seen every week. A "what
 * to weigh about this person" panel sitting there from week two turns every visit
 * into an evaluation exercise and invites a verdict long before the record can
 * support one.
 */

export interface WeighableEntry {
  /** The kind of thing it is. Only these kinds are ever weighable. */
  kind:
    | 'SUCCESS_DEFINITION'
    | 'COMMITMENT'
    | 'TIMEFRAME'
    | 'ASK'
    | 'TOLERANCE'
    | 'WORRY'
    | 'TENSION'
    | 'AGREEMENT'
    | 'DIVERGENCE';
  text: string;
  session: number;
}

/**
 * The kinds that may be weighed, and the reason each one earns it: every one is
 * either somebody's own stated standard or something a person put on the record
 * themselves. Nothing here is the product's opinion of anybody.
 */
export const WEIGHABLE: WeighableEntry['kind'][] = [
  'SUCCESS_DEFINITION', 'COMMITMENT', 'TIMEFRAME', 'ASK',
  'TOLERANCE', 'WORRY', 'TENSION', 'AGREEMENT', 'DIVERGENCE',
];

export interface WeighInput {
  /** The lead's own words for what doing well means. */
  statedStandards: { text: string; session: number }[];
  /** Everything on the record, of any kind. Filtered here, not by the caller. */
  entries: WeighableEntry[];
  /** Which standards anything in the record actually reached. */
  standardsTouched: string[];
  /** Whether the ground has reached its closing round. */
  isClosing: boolean;
}

export interface WeighSection {
  whatYouSaidGoodMeans: { text: string; session: number }[];
  whatTheRecordHolds: WeighableEntry[];
  whatNobodyHasEvidenceFor: string[];
  /** One line, and it is about the section rather than about a person. */
  note: string;
}

/**
 * The section, or nothing.
 *
 * Nothing is a real answer twice over: before the close, because it is not that
 * moment; and where the lead never stated a standard, because a "what to weigh"
 * panel with no yardstick in it is just the record again, arranged to look like
 * grounds for a decision.
 */
export function whatALeaderCanWeigh(input: WeighInput): WeighSection | null {
  if (!input.isClosing) return null;
  if (!input.statedStandards.length) return null;

  const touched = new Set(input.standardsTouched.map((s) => s.trim().toLowerCase()));
  const untouched = input.statedStandards
    .filter((s) => !touched.has(s.text.trim().toLowerCase()))
    .map((s) => s.text);

  return {
    whatYouSaidGoodMeans: input.statedStandards,
    // The filter lives here rather than at the call site, so a future caller
    // cannot pass the specificity label in by handing over a wider list.
    whatTheRecordHolds: input.entries.filter((e) => WEIGHABLE.includes(e.kind)),
    whatNobodyHasEvidenceFor: untouched,
    note: untouched.length
      ? `${untouched.length === 1 ? 'One thing' : `${untouched.length} things`} you said mattered ${untouched.length === 1 ? 'was' : 'were'} never reached by anybody's account. That is not evidence against anyone; it means the record cannot answer that part, and a decision that rests on it is resting on something else.`
      : 'Everything you said mattered has something in the record bearing on it. Read the entries, not this summary of them.',
  };
}

/**
 * The one sentence the section carries where the ground is about a person.
 *
 * Not a disclaimer. It is the difference between a leader reading this as grounds
 * for a decision and reading it as the material a conversation starts from, and
 * that difference is most of what this product is for.
 */
export const THIS_IS_MATERIAL_NOT_A_VERDICT =
  'This is what the ground can tell you, against what you said you were looking for. It does not add up to an answer, and it is not meant to: what it does is make sure the conversation starts from the same place the ground did.';

/**
 * G10's subject question, settled in the direction the whole product points.
 *
 * Everything in the section comes from shared record entries and the lead's own
 * stated definition, so there is nothing in it the subject has not effectively
 * seen. Read alone the night before a decision, though, "what your manager is
 * weighing about you" is a heavy thing to hand somebody with no conversation
 * attached - so the subject sees the same content under a frame that is true and
 * is not addressed at them as a subject.
 */
export function headingFor(viewer: 'the lead' | 'the subject' | 'somebody else'): string | null {
  switch (viewer) {
    case 'the lead':
      return 'What you said you were looking for, and what the record holds';
    case 'the subject':
      return 'What this ground was measured against';
    case 'somebody else':
      // Not theirs to read. A colleague reading the material behind a decision
      // about somebody else is the thing the whole wall exists to prevent.
      return null;
  }
}
