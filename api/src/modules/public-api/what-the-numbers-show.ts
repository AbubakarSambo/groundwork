/**
 * WHAT THE CUSTOMER'S OWN SYSTEMS SAY IS HAPPENING.
 *
 * The difference between a check-in and a form. Without this the interview asks whether testing has
 * started; with it, it asks what makes the three untested scenarios different from the fourteen that
 * passed. The second question is only possible because somebody else's board already answered the
 * first.
 *
 * IT MAY SAY SOMEBODY IS BEHIND. Hafsah's call, and it settles a real tension: an earlier draft
 * refused to state a gap at all, on the grounds that telling somebody they are behind is a judgement.
 * That was too careful. Two of six against a quarter that is two thirds gone IS behind, everybody
 * involved can see it, and pretending otherwise makes the conversation dishonest before it starts.
 *
 * The line that still holds: being behind is the REASON FOR THE QUESTION, never the conclusion of
 * one. "You are behind, why" is a question. "You are behind, therefore" is a verdict, and the verdict
 * belongs to the person with the authority to act on it.
 */

export type Evidence = {
  /** The customer's id for the objective this is about. */
  objectiveExternalId: string;
  /** When their system observed it. Not when they sent it. */
  observedAt: Date;
  /** Counts and short labels. Never prose, never anybody's words. */
  state: Record<string, string | number>;
};

/** After this, evidence is described as history rather than as what is true now. */
export const EVIDENCE_STALE_AFTER_DAYS = 14;

export function ageInDays(observedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - observedAt.getTime()) / 86_400_000));
}

/**
 * HOW OLD EVIDENCE IS PRESENTED, which matters more than whether it is shown.
 *
 * A check-in that confidently cites a three-week-old number is worse than one that cites none: the
 * person knows it is stale, and being asked about it as though it were current tells them the thing
 * is not really watching. So stale evidence is still shown - it is often the only number anybody
 * has - and it is shown with its date attached and framed as the last thing seen.
 */
export function describeEvidence(e: Evidence, now: Date): string {
  const days = ageInDays(e.observedAt, now);
  const pairs = Object.entries(e.state).map(([k, v]) => `${k}: ${v}`).join(', ');
  const when = days === 0 ? 'as of today'
    : days === 1 ? 'as of yesterday'
      : days <= EVIDENCE_STALE_AFTER_DAYS ? `as of ${days} days ago`
        : `last seen ${days} days ago, so this may have moved`;
  return `${pairs} (${when})`;
}

/**
 * The instruction that goes with it.
 *
 * Written once, here, because the rule and the data belong together - a later change to what may be
 * said about evidence should not require finding the place the evidence is assembled.
 */
export const EVIDENCE_RULE =
  'LIVE EVIDENCE, FROM THEIR OWN SYSTEMS: the numbers below come from the organisation\'s own tools, '
  + 'not from this conversation. Never ask them for a number you already have here - ask what is '
  + 'behind it.\n'
  + 'You MAY say plainly that something is behind, short, or not moving, and you should when it is: '
  + 'the person can see the same numbers and pretending otherwise makes the conversation dishonest. '
  + 'Being behind is the REASON for your question, never the conclusion of one - ask what is causing '
  + 'it, what would change it, and what they need. Do not decide what it means about them, do not '
  + 'compare them to anybody else, and if the numbers look wrong to them, record that: their own '
  + 'system can be out of date and they would know before it does.';

export function evidenceBlock(items: { text: string; evidence: Evidence }[], now: Date): string[] {
  if (!items.length) return [];
  const lines = items.map((i) => `- ${i.text}: ${describeEvidence(i.evidence, now)}`);
  return [`${EVIDENCE_RULE}\n${lines.join('\n')}`];
}
