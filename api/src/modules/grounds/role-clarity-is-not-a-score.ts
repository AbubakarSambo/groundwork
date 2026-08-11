/**
 * A LIVING CONTRIBUTION RECORD, WHICH IS NOT A CAPABILITY PROFILE. (G20, G36)
 *
 * I rejected "living capability profile" outright, and any grading version stays
 * rejected: a persistent score on a person, updated forever, is the thing this
 * product exists not to build. But a living record of what somebody is HERE TO
 * CONTRIBUTE, updated as it changes, is role clarity rather than a score - and it
 * is exactly what Abubakar did not have. The two were thrown out together and only
 * one of them deserved it.
 *
 * The difference is one question: does it describe the JOB or the PERSON?
 *
 *   "owns the migration and the handover to support"    the job
 *   "strong on delivery, developing on judgement"       the person, forever
 *
 * The first changes when the work changes. The second follows somebody between
 * grounds, and there is no version of it that is safe to keep.
 *
 * G36 LIVES HERE because it is the same material read one step further. Where two
 * things the ground wants are in tension, name the tension. Naming it is inside
 * the guardrail; pushing toward a resolution is not.
 *
 *   "keeping the queue clear and expecting client ownership in the same quarter
 *    are in tension, and nothing in the record says which one gives"
 *
 * That is help. "You should prioritise ownership" is somebody else's decision
 * being made by a product that has never met the client.
 */

export interface Contribution {
  participantId: string;
  /** What this person is here to do, in the words of whoever said it. */
  text: string;
  /** Who said it, because a lead's version and a person's version differ. */
  saidBy: 'the lead' | 'themselves';
  /** Session it was last restated, so drift is visible without a score. */
  lastRestatedAtSession: number;
}

const ABOUT_A_PERSON = [
  /\b(?:strong|weak|excellent|poor|developing|emerging)\b/i,
  /\b(?:good|bad) at\b/i,
  /\b(?:strengths?|weakness(?:es)?|areas? for (?:growth|development)|potential)\b/i,
  /\b(?:level|band|tier|rating|grade)\b/i,
  /\bneeds? to (?:improve|develop|work on)\b/i,
];

/**
 * The one check that keeps this a record and not a profile.
 *
 * Deliberately blunt. A contribution record is written by a lead in a hurry, and
 * "strong on delivery" is what a lead in a hurry writes - not maliciously, just
 * because it is the vocabulary everything else in their working life uses.
 */
export function readsAsAProfile(text: string): string | null {
  for (const p of ABOUT_A_PERSON) {
    const hit = text.match(p);
    if (hit) return hit[0];
  }
  return null;
}

export function whyThisIsNotAContribution(text: string): string | null {
  const hit = readsAsAProfile(text);
  if (!hit) return null;
  return `"${hit}" describes the person rather than the work. A contribution record says what somebody is here to do - "owns the migration and the handover to support" - so that it can change when the work changes. What is this person here to do?`;
}

/**
 * Whether the lead's version and the person's own version are the same thing.
 *
 * Returns the states rather than a verdict, and the interesting one is the third:
 * where only one version exists, the finding is about the setup, not the person.
 */
export function contributionRead(
  byLead: Contribution | null,
  bySelf: Contribution | null,
): { state: 'both' | 'only the lead' | 'only them' | 'neither'; line: string } {
  if (byLead && bySelf) {
    return {
      state: 'both',
      line: 'Both the lead and this person have said what this person is here to do. If those two descriptions differ, that difference is the most useful thing on this page.',
    };
  }
  if (byLead) {
    return {
      state: 'only the lead',
      line: 'The lead has said what this person is here to do, and this person has not. Nobody has checked whether the two match.',
    };
  }
  if (bySelf) {
    return {
      state: 'only them',
      line: 'This person has said what they are here to do, and nobody has confirmed it. They may be working to a description nobody else holds.',
    };
  }
  return {
    state: 'neither',
    // Abubakar's case, stated as what it is.
    line: 'Nobody has said what this person is here to do. That is usually the finding rather than a gap in the setup.',
  };
}

/**
 * G36. Naming a tension, and stopping there.
 *
 * The output is deliberately shaped so there is nowhere for a recommendation to
 * go: two things, and the sentence that says the record does not settle it.
 */
export interface Tension {
  one: string;
  other: string;
  /** Whether anything in the record says which gives. Usually nothing does. */
  settledBy?: string | null;
}

export function nameTheTension(t: Tension): string {
  const head = `${t.one} and ${t.other} are in tension.`;
  if (t.settledBy) {
    // Where somebody HAS said which gives, quote them rather than agreeing with
    // them. The product is reporting a decision, not endorsing it.
    return `${head} ${t.settledBy} is the only thing in the record that says which one gives.`;
  }
  return `${head} Nothing in the record says which one gives, so both are currently being expected at once.`;
}

/**
 * And the guardrail as a function, so it can be asserted rather than trusted.
 *
 * Everything about G36 is fine until one sentence suggests an answer, and that
 * sentence is easy to write by accident because it is what a helpful person would
 * say next.
 */
const A_RECOMMENDATION = [
  /\byou should\b/i, /\bwe recommend\b/i, /\bprioriti[sz]e\b/i,
  /\bfocus on\b/i, /\bthe right (?:call|answer|choice)\b/i,
  /\bought to\b/i, /\bbetter to\b/i, /\bdrop\b/i,
];

export function suggestsAnAnswer(line: string): string | null {
  for (const p of A_RECOMMENDATION) {
    const hit = line.match(p);
    if (hit) return hit[0];
  }
  return null;
}
