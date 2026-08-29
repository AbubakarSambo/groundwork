/**
 * WHAT HAPPENS TO SOMEBODY'S RECORD WHEN THEY LEAVE.
 *
 * §13C.1 opens by saying nothing currently specifies this and it is the first question an enterprise
 * security review asks. Both halves are true, and the second is why this sits ahead of every phase
 * it would otherwise fall into: it is not a feature, it is the answer to a question that blocks a
 * contract.
 *
 * The resolution is staged rather than uniform, because the two obvious answers are both wrong. A
 * hard delete guts the record - their check-ins are the substrate for every finding about the
 * objectives they touched, so removing them makes the objectives' history unintelligible for the
 * people still working on them. Keeping everything indefinitely against somebody who has left is a
 * real exposure, and it is the one a reviewer will ask about by name.
 *
 * So each layer is treated differently:
 *
 *   Contributions        retained          - the work history is the org's, not the individual's
 *   Findings             retained, collapsed - the objective's history stays intelligible
 *   Commitments/blockers retained, closed  - otherwise they read as live and somebody chases them
 *   Raw turns            aged out          - the exposure lives here
 *   Embeddings           deleted with them - otherwise deletion is cosmetic
 */

/**
 * The window a customer may choose, and the two ends they may not go past.
 *
 * A floor because zero deletes the substrate the moment somebody leaves, and the findings about
 * objectives they touched stop being explicable to the people still on them. A ceiling because a
 * retention policy that can be set to forever is not a retention policy - it is a setting that
 * looks like one in a security review.
 */
export const RETENTION_FLOOR_DAYS = 30;
export const RETENTION_CEILING_DAYS = 730;
export const RETENTION_DEFAULT_DAYS = 180;

export function clampRetention(days: number | null | undefined): number {
  if (days === null || days === undefined || !Number.isFinite(days)) return RETENTION_DEFAULT_DAYS;
  return Math.min(RETENTION_CEILING_DAYS, Math.max(RETENTION_FLOOR_DAYS, Math.floor(days)));
}

/**
 * Whether the window on one departure has closed.
 *
 * Measured from the departure, not from the last turn: somebody who stopped talking six months
 * before they left has already had their exposure running for six months, and dating it from their
 * last message would extend it for the person who went quiet.
 */
export function windowHasClosed(departedAt: Date, retentionDays: number, now: Date): boolean {
  return (now.getTime() - departedAt.getTime()) / 86_400_000 >= clampRetention(retentionDays);
}

/**
 * WHAT AN ATTRIBUTION COLLAPSES TO.
 *
 * A finding says something about a named person. Once they have gone, the finding still matters -
 * it explains why an objective went the way it did - but the name in it is a statement about
 * somebody who is no longer here to answer it, sitting in a record their former colleagues read.
 *
 * So the attribution collapses to the role they held. "The person who held Head of Partnerships"
 * keeps the objective's history intelligible and stops the record being about a person.
 */
export function collapsedAttribution(roleName: string | null): string {
  return roleName ? `the person who held ${roleName}` : 'someone who has since left';
}

/** The shape the sweep works on, so what it decides can be checked without a database. */
export type Departure = {
  personExternalId: string;
  departedAt: Date;
  turnsDeletedAt: Date | null;
};

export function readyToAgeOut(departures: Departure[], retentionDays: number, now: Date): Departure[] {
  return departures
    .filter((d) => !d.turnsDeletedAt)
    .filter((d) => windowHasClosed(d.departedAt, retentionDays, now));
}
