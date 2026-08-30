/**
 * THE SPEC'S KEYS, RECONCILED ONTO THE CODES THAT ALREADY EXIST.
 *
 * The build spec lists twenty-five detector keys. This codebase already detects thirty-eight
 * behaviours, with a three-period rule, collusion confirmation and accuracy ratings behind them -
 * earned over a long time and not up for rewriting. Building the spec's list beside them would be
 * the exact failure the spec's own §2.0 warns about: two sets of detectors that drift apart inside
 * a month, disagreeing about the same person.
 *
 * So: ONE VOCABULARY, TWO SCOPES. The existing codes stay authoritative and keep firing inside a
 * ground. The org layer accumulates the same codes across grounds and against subjects. Where a
 * spec key maps onto an existing code, the existing code wins and the key is an alias. Where it
 * does not, it is listed below as genuinely new - and every one of those is new for the same
 * reason: it needs a SUBJECT and a view across grounds, neither of which existed here before.
 */

/** A spec key that is a different name for something already detected. The existing code wins. */
export const ALIASES: Record<string, string> = {
  /* "Missed commitments and raised no flag" is what D1 has always been: completion claimed, the
     record says otherwise. */
  missed_unflagged: 'D1',
  /* Busy on none of the core actions the role owns. K4 is exactly this, from the commercial side. */
  misdirected_effort: 'K4',
  /* Sitting on work instead of moving it. B6 - research that never becomes a decision. */
  analysis_paralysis: 'B6',
  /* Leaning on blockers to avoid the work. B10 and R1 both touch it; R1 is the closer read,
     because the shape is other people's work stopping at one person. */
  blocker_avoidance: 'R1',
  /* Pushing out work they should do themselves. D6 inverted is the same behaviour observed from
     the other side, and D6 is the one with a detector already written. */
  over_delegation: 'D6',
  /* Done claims with nothing behind them. D1 again - and that it maps to the same code as
     missed_unflagged is not a mistake: they are one behaviour described twice. */
  unbacked_done: 'D1',
  /* Effort on another role's work. B12 is stage mismatch, which is the nearest and is NOT the
     same; listed here so the difference is recorded rather than assumed. */
  role_drift: 'B12',
  /* Building and not shipping. D5, half-built product. */
  not_shipping: 'D5',
  /* Other people's work stuck waiting on this person. R1, dependency bottleneck. */
  bottleneck: 'R1',
  /* A manager who has logged no feedback. B9 - a team describing different priorities is the
     symptom this produces. */
  manager_no_feedback: 'B9',
  report_not_managing: 'B9',
  manager_report_struggling: 'B4',
  /* Talking rather than producing. D4, strategy theatre. */
  gone_quiet: 'D4',
  /* Missed the rhythm the role expects. E3, selective presence. */
  poor_attendance: 'E3',
  /* Customer or field signals sitting unreviewed. K3 - flagged repeatedly, never acted on. */
  signal_unreviewed: 'K3',
};

/**
 * KEYS WITH NO EXISTING CODE, AND ALL FOR ONE REASON.
 *
 * Every one of these needs a SUBJECT - a piece of the customer's own work - and a view that spans
 * grounds. The existing thirty-eight are read from what one person says inside one check-in, which
 * is why none of them can express "these two objectives depend on each other and nobody wrote it
 * down". That is not a gap in the old vocabulary; it is a thing the old scope could not see.
 */
export const GENUINELY_NEW = [
  'goal_divergence',
  'undeclared_dependency',
  'unrecognised_contributor',
  'nominal_only',
  'unowned_gap',
  /* Also new, and the cheapest of them: a declared objective nobody has referenced in months. */
  'objective_unmentioned',
  'unattached_work',
  /* Structural rather than behavioural, and about the roster rather than the record. */
  'no_lead',
  'no_checkin',
  /*
   * The one that needed a role to be a record before it could exist at all. It is new in the same
   * sense as the rest - the spec names it and nothing before this detected it - so it belongs in
   * the vocabulary rather than in a list of exceptions.
   */
  'neglected_primary',
  /*
   * NOT FROM THE SPEC, AND SAID SO RATHER THAN SLIPPED IN.
   *
   * Every other key here answers a line in the document. This one came from a question about the
   * API - "how can our tool auto detect what they measure" - and the answer that we cannot invent a
   * measure but can notice when the one they sent never comes up in the conversation.
   *
   * The reconciliation guard checks that every SPEC key is accounted for, not that every key is in
   * the spec, so a detector the document did not think of belongs here in the open rather than
   * living outside the vocabulary where nothing reconciles it.
   */
  'measure_unmentioned',
] as const;

export type NewDetector = (typeof GENUINELY_NEW)[number];

/**
 * WHAT IS BUILT, AS OPPOSED TO WHAT IS NAMED.
 *
 * Kept separate from the list above on purpose. A detector that is named and not built must not be
 * quietly indistinguishable from one that runs - the same reasoning as only offering webhook events
 * that can fire. A customer asking why they have seen no `goal_divergence` deserves "it is not
 * built yet" rather than silence.
 */
export const IMPLEMENTED: NewDetector[] = ['undeclared_dependency', 'objective_unmentioned', 'goal_divergence',
  'unrecognised_contributor', 'nominal_only', 'unowned_gap',
  /*
   * These three were reported as blocked on machinery that does not exist - role benchmarks, an
   * onboarding window - and only one of those was true. `no_lead` reads `managerExternalId`, which
   * SCIM has written since the day it landed. A blocker nobody rechecks outlives its cause.
   */
  'unattached_work', 'no_lead', 'no_checkin',
  /*
   * Built once roles became records. It was the last one blocked on something that genuinely did
   * not exist - see the note on NEEDS_ROLES below, which is now history rather than a caveat.
   */
  'neglected_primary',
  'measure_unmentioned',
];

export function isImplemented(key: string): boolean {
  return (IMPLEMENTED as string[]).includes(key);
}

/** Every spec key, so the reconciliation can be checked against the document rather than recalled. */
export const SPEC_KEYS = [
  'missed_unflagged', 'manager_report_struggling', 'goal_divergence', 'gone_quiet',
  'misdirected_effort', 'neglected_primary', 'analysis_paralysis', 'blocker_avoidance',
  'over_delegation', 'unbacked_done', 'role_drift', 'not_shipping', 'bottleneck', 'no_lead',
  'manager_no_feedback', 'report_not_managing', 'objective_unmentioned', 'unattached_work',
  'undeclared_dependency', 'unrecognised_contributor', 'nominal_only', 'unowned_gap',
  'signal_unreviewed', 'poor_attendance', 'no_checkin',
] as const;

/**
 * WHAT `neglected_primary` WAS WAITING FOR, KEPT BECAUSE THE REASON IS WORTH READING.
 *
 * It needed `primaryActionKey` and a cadence on a role, and a role was only ever a name on an
 * assignment. Aliasing it onto an existing code would have been wrong - nothing detected "skipping
 * the one action that converts" - and listing it as new-and-unbuilt beside things that only needed
 * a subject would have hidden that it needed a whole role model first. So it was named here, as a
 * decision rather than an omission, until the `Role` and `PrimaryActionEvent` records existed.
 *
 * The list is empty now. It stays, so the next detector that is blocked on machinery has somewhere
 * honest to sit rather than being quietly dropped from the vocabulary.
 */
export const NEEDS_ROLES = [] as const;
