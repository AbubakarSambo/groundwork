/**
 * THE LEAD'S VIEW OF SOMEBODY IS A PLACE TO LOOK, NEVER A THING THAT IS TRUE.
 *
 * A lead can attach context about a participant: "Abubakar has been slow to take
 * ownership." That is genuinely useful. It is usually why the ground exists, and
 * it tells the engine what is worth probing.
 *
 * It is also the most dangerous input in the system, because of how easily it
 * becomes what it predicted. The engine is told to watch for slow ownership, so
 * it probes ownership, so ownership fills the record, so a pattern "confirms" -
 * and what actually happened is that one person's opinion was laundered into a
 * finding by the machinery that was supposed to test it. The person is then
 * coached against a label their manager wrote before they said a word.
 *
 * THE RULE: the lead's context may RAISE a hypothesis. Only the person's own
 * account, over the three periods, can CONFIRM one. Those two must never be the
 * same code path, and confirmation must be impossible to reach without
 * corroboration from the person themselves.
 *
 * Which is why this is arithmetic rather than an instruction in a prompt. Two
 * prompt-only guardrails leaked in a single day on this product, and a rule that
 * lives only in wording is a rule that holds until the model is tired.
 */

export type ReadStatus =
  /** Nothing to say yet. The honest state for most people most of the time. */
  | 'nothing_yet'
  /** Something worth watching, from the lead or from a first sighting. Never shown as a finding. */
  | 'hypothesis'
  /** The person's own account has shown it, repeatedly. This one can be surfaced, with its reason. */
  | 'confirmed';

export interface Corroboration {
  /** Periods where the person's OWN account showed this, from their own words. */
  ownAccountPeriods: number;
  /** Did the lead raise it? Useful for what to probe. Never evidence. */
  raisedByLead: boolean;
  /** How many periods a pattern needs. The existing three-period discipline. */
  required?: number;
}

/**
 * What may be said about this, given what actually supports it.
 *
 * The lead's context moves nothing toward confirmation. It appears in this
 * function only so that "the lead mentioned it" can produce a HYPOTHESIS worth
 * probing when the person's own account has not yet shown anything.
 */
export function readStatus({
  ownAccountPeriods,
  raisedByLead,
  required = 3,
}: Corroboration): ReadStatus {
  // Confirmation comes from the person's own account and from nowhere else.
  // Note what is absent: raisedByLead is not consulted here, and must never be.
  if (ownAccountPeriods >= required) return 'confirmed';

  // Something to watch. Either the lead pointed at it, or the person's own
  // account has shown it once or twice and it has not repeated yet.
  if (raisedByLead || ownAccountPeriods > 0) return 'hypothesis';

  return 'nothing_yet';
}

/** May this be shown to anyone as a read? Only a confirmed one, ever. */
export function mayBeSurfaced(status: ReadStatus): boolean {
  return status === 'confirmed';
}

/**
 * May the engine let this shape what it ASKS about?
 *
 * Yes for a hypothesis, and this is the whole value of lead context. The probe
 * it produces must still be neutral and about the work: "which of these should
 * someone else own?" is a fair question whoever raised it. What must never
 * happen is the participant learning that their manager said something about
 * them, or the question carrying the accusation inside it.
 */
export function mayShapeProbing(status: ReadStatus): boolean {
  return status === 'hypothesis' || status === 'confirmed';
}

/**
 * Would this read exist without the lead having raised it?
 *
 * The self-fulfilling-label test, asked directly. If removing the lead's context
 * changes the answer, the read was theirs and not the record's, and it has not
 * earned the right to be called a finding.
 */
export function standsWithoutTheLead(c: Corroboration): boolean {
  return readStatus({ ...c, raisedByLead: false }) === readStatus(c);
}
