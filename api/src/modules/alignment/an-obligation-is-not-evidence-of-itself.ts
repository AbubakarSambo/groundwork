/**
 * MISSING EVIDENCE IS NOT A BREACH, AND THE DIFFERENCE LIVES IN THE STATE MACHINE.
 *
 * This is the failure mode the audit ranks highest among the recoverable ones, and
 * it is not a wording problem. A product that holds obligations will, within a
 * quarter, have a list of things nobody uploaded a document for — and the moment
 * that list is called anything other than "nothing has been shown either way", it
 * is a list of alleged breaches, produced by a system that was not there.
 *
 * So there is no state here that means breached, and no path to one. The strongest
 * thing this record can hold is THE PERSON RESPONSIBLE SAYING IT WAS NOT DONE,
 * which is not an accusation but an account — the same rule the rest of this
 * product already runs on, where only somebody's own account can confirm a thing
 * about them.
 *
 * ==========================================================================
 * THE THREE THINGS PEOPLE COLLAPSE, KEPT APART.
 * ==========================================================================
 *
 *   NOBODY HAS BEEN ASKED. The commonest state by far, and the one most often
 *   presented as a problem with the other side rather than with the process.
 *
 *   THEY SAID IT WAS DONE AND NOTHING WAS SHOWN. An account, uncorroborated. It is
 *   evidence of what they said and of nothing else.
 *
 *   NOTHING WAS SHOWN EITHER WAY. Not a claim, not a denial, not a finding. Very
 *   often it means the obligation was never anybody's job to evidence, which is
 *   worth discovering before it is worth complaining about.
 *
 * AND AN OBLIGATION ONLY EXISTS WHERE A TERM DOES. It is created from a term both
 * sides agreed the reading of — anything else would be holding a company to a
 * duty derived from one side's reading of a clause. See
 * `a-term-is-not-true-because-a-model-read-it.ts`.
 */

export type ObligationState =
  /** Its time has not come. Nothing is owed and nothing is late. */
  | 'not due yet'
  /** Due, and nobody has put it to the person whose it is. */
  | 'due, nobody has been asked'
  /** Asked, in their own check-in, and they have not answered. */
  | 'asked, no answer yet'
  /** They say it was done. One account, and evidence of what they said. */
  | 'they say it was done'
  /** They say it was done and the other side says the same. */
  | 'both sides say it was done'
  /** THE PERSON RESPONSIBLE says it was not. An account, not an accusation. */
  | 'they say it was not done'
  /** Asked, answered by neither, evidenced by nothing. NOT a breach and not a claim. */
  | 'nothing has been shown either way';

export interface Obligation {
  /** What has to be done, in the words of the term it came from. */
  says: string;
  /** Whose it is. */
  whose: string;
  /** The term it comes from. An obligation with no term is a duty nobody agreed. */
  fromTerm: string;
  /** When it falls due, where it does. Some obligations are continuous and have none. */
  dueOn: Date | null;
  state: ObligationState;
  /** What anybody said about it, in their words. */
  accounts: { by: string; said: string }[];
}

/**
 * WHAT MAY FOLLOW WHAT.
 *
 * Written as a map rather than as conditions, so the states that do not exist are
 * visibly absent rather than merely unreachable. Note that nothing leads anywhere
 * that means breached, because there is nowhere for it to lead.
 */
const WHAT_MAY_FOLLOW: Record<ObligationState, ObligationState[]> = {
  'not due yet': ['due, nobody has been asked'],
  'due, nobody has been asked': ['asked, no answer yet'],
  'asked, no answer yet': [
    'they say it was done',
    'they say it was not done',
    'nothing has been shown either way',
  ],
  'they say it was done': ['both sides say it was done', 'nothing has been shown either way'],
  'they say it was not done': ['they say it was done'],
  'both sides say it was done': [],
  'nothing has been shown either way': [
    'they say it was done',
    'they say it was not done',
    'both sides say it was done',
  ],
};

/**
 * WHERE IT STANDS TODAY, WHICH IS NOT ALWAYS WHERE THE COLUMN SAYS.
 *
 * "Not due yet" is a statement about the calendar, and calendars move. Found by
 * driving it: an obligation created before its due date sat in `not due yet`
 * forever, and every attempt to ask about it after the date was refused with
 * "nothing is owed on this yet" — a state machine that quietly stopped anybody
 * using the object at all.
 *
 * So the one state that depends on the date is worked out rather than stored, the
 * same way a version's standing is. Every other state is a record of something
 * somebody did, and those do not change because a day passed.
 */
export function asItStandsToday(
  o: { state: ObligationState; dueOn: Date | null },
  today: Date = new Date(),
): ObligationState {
  if (o.state !== 'not due yet') return o.state;
  if (o.dueOn === null) return 'due, nobody has been asked';
  return o.dueOn <= today ? 'due, nobody has been asked' : 'not due yet';
}

export function whyThisCannotFollow(from: ObligationState, to: ObligationState): string | null {
  if (WHAT_MAY_FOLLOW[from].includes(to)) return null;
  if (from === 'not due yet') return 'Nothing is owed on this yet, so there is nothing to answer about.';
  if (from === 'both sides say it was done') return 'Both sides have already said this was done. Reopening it takes somebody saying otherwise, in their own words.';
  return `An obligation cannot go from “${from}” to “${to}”. Somebody has to be asked first.`;
}

/**
 * WHAT AN OBLIGATION IN THIS STATE IS EVIDENCE OF.
 *
 * Deliberately the whole answer. Anything reading an obligation gets this sentence
 * with it, so a list of them cannot be read as a list of failures — which is
 * precisely how a list of them WILL be read otherwise.
 */
export function whatThisIsEvidenceOf(o: Obligation): string {
  switch (o.state) {
    case 'not due yet':
      return 'Nothing yet. It is not due.';
    case 'due, nobody has been asked':
      return `Nobody has asked ${o.whose} about this. That is a gap in the asking, not in what they did.`;
    case 'asked, no answer yet':
      return `${o.whose} has been asked and has not answered yet.`;
    case 'they say it was done':
      return `${o.whose} says it was done. That is evidence of what they said and of nothing else.`;
    case 'both sides say it was done':
      return 'Both sides say it was done. As settled as this record gets.';
    case 'they say it was not done':
      return `${o.whose} says it was not done. Their own account, which is the only way this record can hold such a thing.`;
    case 'nothing has been shown either way':
      return (
        'Nothing has been shown either way. That is not a claim that it was not done - very often it '
        + 'means nobody was ever asked to evidence it, which is worth finding out before it is worth complaining about.'
      );
  }
}

/** Given to any synthesis that reads obligations. */
export const NOTHING_SHOWN_IS_NOT_A_BREACH =
  'AN OBLIGATION WITH NOTHING SHOWN AGAINST IT IS NOT A BREACH, AND MUST NEVER BE WRITTEN AS ONE. '
  + 'Never say an obligation was breached, missed, failed, ignored or not met. Where nothing has been '
  + 'shown, say that nothing has been shown and that nobody may have been asked. Where one side says '
  + 'it was done, say who said it. The only thing this record can hold as not done is the responsible '
  + 'side saying so in their own words - and even then it is their account, not a finding.';

/** Whether an obligation may exist at all, given the standing of the term it comes from. */
export function whyThisCannotBeAnObligation(termState: string): string | null {
  if (termState === 'agreed by both') return null;
  return (
    'An obligation can only come from a term both sides agree the reading of. '
    + `This one is “${termState}”, so holding anybody to it would be holding them to one side's reading of a clause.`
  );
}
