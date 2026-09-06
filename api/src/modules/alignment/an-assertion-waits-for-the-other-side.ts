/**
 * "B SAYS DELTA WAS APPROVED" IS NOT "DELTA WAS APPROVED".
 *
 * The product already asks both sides separately and already refuses to narrate
 * one to the other. What it has never had is one row saying a claim is
 * outstanding — so a thing one side said in July is, by September, simply
 * something that was said, indistinguishable from something both sides confirmed.
 *
 * ==========================================================================
 * ASKING THE OTHER SIDE WITHOUT TELLING THEM WHAT WAS SAID.
 * ==========================================================================
 *
 * This is the whole difficulty, and getting it wrong destroys the thing that makes
 * this product worth having to two parties who disagree. `prompt-library.ts` puts
 * it exactly right and has for a long time: "Never narrate the other party's
 * position, decision, or belief to the person before you have asked for and
 * received their independent version... The moment you narrate the other side's
 * position before hearing this side, you have contaminated the independent record.
 * It cannot be uncorrupted."
 *
 * So an assertion carries TWO things, and they are kept apart on purpose:
 *
 *   `claim` — what was actually said. Never leaves this side.
 *   `about`  — the subject it concerns, in neutral words. This is all the other
 *              side is asked about.
 *
 * "Delta was approved as a client under the agreement" has the subject "which
 * clients have been approved under the agreement". The other side is asked the
 * subject and answers freely; two free answers about the same subject can then be
 * compared, and neither was led.
 *
 * `theQuestionLeaks` is the enforcement. It refuses a question that carries the
 * distinctive words of the claim — because the failure here does not look like a
 * failure. "B mentioned Delta — was that approved?" reads helpful, gets a yes far
 * more often than the open question does, and the yes is worth nothing.
 *
 * ==========================================================================
 * AND THE ANSWER IS NEVER A VERDICT.
 * ==========================================================================
 *
 * Two sides remembering an approval differently is the ordinary case, not a lie.
 * `they do not agree` is a state that means the two accounts differ — which is
 * the thing worth putting in front of both of them, and nothing more than that.
 */

export type AssertionState =
  /** One side said it. Nobody has asked the other. */
  | 'said by one side'
  /** The other side has been asked the subject, in their own check-in. */
  | 'the other side has been asked'
  /** Their independent answer covers it the same way. */
  | 'both sides say the same'
  /** Their independent answer differs. Not a lie — a difference. */
  | 'the two accounts differ';

export interface Assertion {
  /** What was said, in their words. This never reaches the other side. */
  claim: string;
  /** The subject, in neutral words. This is all the other side is asked about. */
  about: string;
  /** Who said it. */
  by: string;
  /** Who has not been asked yet, or was. */
  theOtherSide: string;
  state: AssertionState;
  /** Their answer, in their words, once they have given one. */
  theirAccount: string | null;
}

/** Words too common to count as giving anything away. */
const ORDINARY = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'was', 'were', 'is', 'are',
  'be', 'been', 'that', 'this', 'it', 'as', 'at', 'by', 'with', 'from', 'we', 'they', 'our',
  'their', 'has', 'have', 'had', 'not', 'no', 'yes', 'under', 'about', 'which', 'what', 'who',
  'when', 'any', 'all', 'some', 'there', 'you', 'your', 'agreement', 'contract', 'period',
]);

const distinctive = (text: string): string[] =>
  (text.toLowerCase().match(/[a-z][a-z0-9'-]*/g) ?? []).filter((w) => w.length > 2 && !ORDINARY.has(w));

/**
 * WHETHER A QUESTION GIVES THE CLAIM AWAY.
 *
 * Returns the words that leak, so the refusal can say which — a refusal that says
 * "that leaks" and not what leaks is one somebody works around by rephrasing until
 * it passes, which is worse than no check at all.
 */
export function theQuestionLeaks(claim: string, question: string, alreadyShared = ''): string[] {
  /*
   * THE SUBJECT'S OWN WORDS ARE NOT A LEAK, AND THIS TOOK RUNNING IT TO SEE.
   *
   * A claim about an approval and a subject about approvals share the word
   * "approved" — necessarily, because that is what both are about. Counting that
   * as giving something away rejects the correct open question and accepts
   * nothing, which is a check that has to be switched off to ship.
   *
   * What may not cross is the PARTICULARS: the client's name, the month, the
   * amount. So the sanctioned vocabulary is the subject, and anything in the claim
   * beyond it is what leaks.
   */
  const allowed = new Set(distinctive(alreadyShared));
  const inQuestion = new Set(distinctive(question));
  return distinctive(claim).filter((w) => inQuestion.has(w) && !allowed.has(w));
}

/**
 * The question the other side gets: open, about the subject, and answerable by
 * somebody who has never heard the claim.
 *
 * Built from `about` alone. There is no argument for `claim` here and that is
 * deliberate — a function that cannot see the claim cannot leak it.
 */
export function whatTheOtherSideIsAsked(about: string): string {
  const subject = about.trim().replace(/[.?]+$/, '');
  return `${subject.charAt(0).toUpperCase()}${subject.slice(1)}? Whatever you have is fine — I am asking for your own account of it.`;
}

/**
 * Whether two free accounts of the same subject say the same thing.
 *
 * DELIBERATELY NOT AUTOMATED. This returns what a person has decided, because
 * deciding whether two accounts of an approval agree is a judgement about meaning,
 * and a model doing it quietly is a model deciding which of two companies is right.
 */
export function whereItStandsNow(
  a: Assertion,
  personSaid: { theyAgree: boolean; theirAccount: string },
): Assertion {
  return {
    ...a,
    theirAccount: personSaid.theirAccount,
    state: personSaid.theyAgree ? 'both sides say the same' : 'the two accounts differ',
  };
}

/** How an assertion reads. Never as a fact, and never as an accusation. */
export function howItReads(a: Assertion): string {
  switch (a.state) {
    case 'said by one side':
      return `${a.by} says: “${a.claim}”. ${a.theOtherSide} has not been asked about it yet.`;
    case 'the other side has been asked':
      return `${a.by} says: “${a.claim}”. ${a.theOtherSide} has been asked about ${a.about} and has not answered yet.`;
    case 'both sides say the same':
      return `${a.by} and ${a.theOtherSide} both say the same about ${a.about}. ${a.by} put it as: “${a.claim}”.`;
    case 'the two accounts differ':
      return (
        `${a.by} and ${a.theOtherSide} describe ${a.about} differently. `
        + `${a.by}: “${a.claim}”. ${a.theOtherSide}: “${a.theirAccount ?? ''}”. `
        + 'Two people remembering the same thing differently is ordinary, and it is worth the two of them settling it.'
      );
  }
}

/** Given to any synthesis that reads one of these. */
export const AN_ASSERTION_IS_NOT_A_FACT =
  'WHAT ONE SIDE SAID IS NOT WHAT HAPPENED. Where only one side has been asked, say who said it and '
  + 'that the other has not been asked — never state it as established. Where the two accounts differ, '
  + 'say both, in their own words, and never say which is correct, which is more likely, or that '
  + 'anybody is mistaken. You were not there and neither was this record.';
