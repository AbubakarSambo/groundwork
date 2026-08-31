/**
 * WHAT COMES BACK, AND WHERE EACH PART OF IT CAME FROM.
 *
 * The requirement that makes this useful rather than noise: Groundwork must distinguish a participant
 * PROPOSING something from participants AGREEING it, from Groundwork INFERRING it, from external
 * evidence VERIFYING it. Without that an inference and a verified fact arrive looking identical, and
 * the fastest way to lose a customer's trust in a feed is for them to act on one thinking it was the
 * other.
 *
 * WHAT IT MAY CARRY IS THE SAME RULE AS A WEBHOOK. A fact, a pointer, and counts. Never a quote,
 * never what a named person said about a colleague, never a judgement about somebody. This lands in
 * the customer's own admin panel where their whole company can read it, which is exactly the
 * condition under which §12.8 stops being cautious and starts being the only thing preventing harm.
 */

/** Where a returned item came from. The four are genuinely different and must not be flattened. */
export type Provenance =
  /** One person said it, in their own check-in. Their view, not a finding. */
  | 'participant_proposed'
  /** Several people independently said the same thing. The strongest thing this product produces. */
  | 'participants_agreed'
  /** Groundwork worked it out. A detector, a pattern, a divergence. Weakest, and labelled as such. */
  | 'groundwork_inferred'
  /** The customer's own systems say so. Not Groundwork's claim at all. */
  | 'evidence_verified';

export type Finding = {
  kind: 'blocker' | 'commitment' | 'divergence' | 'unresolved_question' | 'decision_required'
    | 'responsibility_unclear' | 'assumption_changed' | 'objective_change_proposed';
  provenance: Provenance;
  /** One sentence, already sanitised. Never a quote and never a name. */
  says: string;
  /** What it is about, by the customer's own id where there is one. */
  subjectExternalId?: string | null;
  objectiveExternalId?: string | null;
  /** How many people, never which. The REFERENCED rule, applied to everything that leaves. */
  peopleInvolved?: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
  permalink: string;
};

/**
 * WHAT NEEDS A HUMAN, IN FOUR BUCKETS AND NOT A SCORE.
 *
 * Management by exception is the point: nobody should read every check-in. The temptation is to rank
 * or grade, and the codebase already refuses that everywhere else - so this sorts SITUATIONS by what
 * they need, never people by how they are doing.
 */
export type Attention = 'none' | 'watch' | 'needs_clarification' | 'decision_required';

/**
 * Which bucket, from what the finding is and how sure we are.
 *
 * An inference never reaches `decision_required` on its own. Asking a chief executive to decide
 * something on the strength of a pattern Groundwork noticed - with nobody having confirmed it - is
 * how the feed becomes the thing people stop opening.
 */
export function attentionFor(f: Finding): Attention {
  if (f.kind === 'decision_required' || f.kind === 'objective_change_proposed') {
    return f.provenance === 'groundwork_inferred' ? 'needs_clarification' : 'decision_required';
  }
  if (f.kind === 'divergence' || f.kind === 'responsibility_unclear') return 'needs_clarification';
  if (f.kind === 'blocker' || f.kind === 'assumption_changed') return 'watch';
  return 'none';
}

/** Plain words for each, because a customer's UI should not have to invent them. */
export const ATTENTION_MEANS: Record<Attention, string> = {
  none: 'Nothing here needs you.',
  watch: 'Worth knowing about. Somebody is on it.',
  needs_clarification: 'Two people are working from different pictures. A short conversation fixes it.',
  decision_required: 'This is waiting on somebody with the authority to decide.',
};

/** The words that must never appear in anything returned. Same list the webhooks are held to. */
export const NEVER_RETURNED = ['transcript', 'quote', 'testimony', 'verdict', 'score', 'rating'] as const;
