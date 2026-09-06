import { Difference } from './what-does-not-add-up';

/**
 * THE LOOP: A MISMATCH, THE THINGS THAT WOULD ACCOUNT FOR IT, AND THE ONE QUESTION
 * THAT TELLS THEM APART.
 *
 * This is the piece the audit called absent in any form. A commercial investigator
 * who finds a gap does not conclude; they list what would produce that gap
 * innocently, work out which observation would separate those, and ask for it.
 * Everything here is that, and nothing here decides.
 *
 * ==========================================================================
 * THREE RULES, IN THE ORDER THEY MATTER.
 * ==========================================================================
 *
 *   THE ORDINARY EXPLANATIONS COME FIRST, AND IT IS NOT POLITENESS. In real
 *   commercial reconciliations, timing, basis and scope account for the
 *   overwhelming majority of gaps. Listing concealment first is both the least
 *   likely answer and the one that ends the relationship. Ordering here is a claim
 *   about frequency, and it is the right claim.
 *
 *   A CANDIDATE IS NOT A SUSPICION. Every one of these is a thing that would
 *   produce this arithmetic. Naming them all is how a person sees their own
 *   situation in the list and says which it is — which is the point.
 *
 *   ONE QUESTION AT A TIME, AND IT IS THE ONE THAT SPLITS THE FIELD. Asking six
 *   questions about a $100,000 gap reads as an interrogation and answers nothing
 *   faster. The question chosen is the one whose answer eliminates the most
 *   candidates, and it is asked in the person's own check-in where they are
 *   already talking.
 *
 * WHAT ELIMINATES A CANDIDATE IS AN ANSWER, NEVER AN INFERENCE. Nothing here marks
 * a candidate as ruled out on its own. A person says so, or a figure changes.
 */

export type CandidateKey =
  | 'the periods are cut differently'
  | 'the two figures count different things'
  | 'something is outside what the agreement covers'
  | 'one of the figures is wrong'
  | 'something has not been included';

export interface Candidate {
  key: CandidateKey;
  /** What it would mean, said plainly. */
  says: string;
  /** What observation would tell this apart from the others. */
  toldApartBy: string;
  /** The question that gets that observation, in the words it would be asked in. */
  ask: string;
  /**
   * How many of the other candidates this question also settles. Higher means
   * ask it sooner — see the third rule.
   */
  settles: number;
}

/**
 * The candidates for a money difference between two accounts of the same period.
 *
 * Deliberately generic. A gap between a declared total and a sum of parts has the
 * same five shapes whether it is revenue against VAT, invoices against payments,
 * or headcount against a payroll — and a list per domain would be a list nobody
 * maintains.
 */
export function whatWouldAccountForIt(d: Difference): Candidate[] {
  const larger = d.minorUnits > 0 ? 'the first' : 'the second';

  return [
    {
      key: 'the periods are cut differently',
      says: 'The two figures cover the same dates but not the same events — something invoiced in one period and recognised in another.',
      toldApartBy: 'Whether either figure includes something that falls on the other side of the period boundary.',
      ask: 'Does either of these figures include anything that sits just outside the period — something invoiced late, or paid early?',
      settles: 2,
    },
    {
      key: 'the two figures count different things',
      says: 'Each is right about what it measures, and they measure different things — one gross and one net, one including something the other excludes.',
      toldApartBy: 'What each figure is defined to include.',
      ask: 'What does each of these two figures include? If one leaves something out that the other counts, that is likely the whole of it.',
      settles: 2,
    },
    {
      key: 'something is outside what the agreement covers',
      says: `Some of ${larger} is real and simply not within the scope of this arrangement.`,
      toldApartBy: 'Which specific work or clients make up the difference, and whether the agreement covers them.',
      ask: 'Is any part of this outside what the agreement covers? If so, which part, and roughly how much of it?',
      settles: 1,
    },
    {
      key: 'one of the figures is wrong',
      says: 'One of the two numbers is a mistake — a transcription, a wrong column, a filing that was later corrected.',
      toldApartBy: 'Whether either figure has been restated or corrected since it was produced.',
      ask: 'Has either of these figures been corrected or restated since it was first produced?',
      settles: 1,
    },
    {
      key: 'something has not been included',
      says: 'Something that belongs in the smaller figure is not in it yet.',
      toldApartBy: 'Whether everything in scope for the period has been reported.',
      ask: 'Is there anything in the period that has not made it into the reported figure yet?',
      settles: 1,
    },
  ];
}

/**
 * THE ONE TO ASK NOW.
 *
 * Among candidates nobody has ruled out, the question that settles the most. Ties
 * go to whichever comes first in the list, which is the order of frequency — so
 * the ordinary explanation is asked about before the unusual one.
 */
export function whatToAskNext(
  d: Difference,
  alreadyRuledOut: CandidateKey[] = [],
): { candidate: Candidate; ask: string } | null {
  const left = whatWouldAccountForIt(d).filter((c) => !alreadyRuledOut.includes(c.key));
  if (left.length === 0) return null;

  const best = left.reduce((a, b) => (b.settles > a.settles ? b : a), left[0]);
  return { candidate: best, ask: best.ask };
}

/**
 * WHAT IS LEFT WHEN EVERY ORDINARY EXPLANATION HAS BEEN RULED OUT — AND IT IS STILL
 * NOT A CONCLUSION.
 *
 * This is the moment the product is most likely to overreach, so it is the moment
 * it says the least. A difference that survives every question is a thing for two
 * people to talk about with what they know; it is not a finding, and this product
 * does not have the standing to make it one. It is not an auditor and would be a
 * worse one than the customer's actual auditor.
 */
export function whenNothingIsLeft(d: Difference): string {
  return (
    'Every ordinary explanation for this has been asked about and none of them accounted for it. '
    + 'That does not make it anything more than unexplained — it means the answer is not one of the '
    + 'usual ones, and the people in this relationship are better placed than this record to say '
    + 'what it is. It is worth putting in front of both of them together.'
  );
}
