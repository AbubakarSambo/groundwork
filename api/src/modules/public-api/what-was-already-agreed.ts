/**
 * AN AGREEMENT THE CUSTOMER'S SYSTEM ALREADY HOLDS.
 *
 * The principle, in Hafsah's words: Groundwork starts from the existing agreement instead of
 * pretending no agreement exists. Sahar should not be asked what she thinks her target is when
 * Lovedida already knows it is six paying clients, approved by Hafsah, effective 1 October.
 *
 * WHAT MAKES THIS SAFE RATHER THAN LEADING. Seeding tells the interview what was agreed; it does not
 * tell the interview that the agreement is right. The engine already draws the distinction that
 * matters - `seenBySubject` decides whether somebody may be pressed on a gap at all, and an unseen
 * objective is explicitly not read against them. Seeded state inherits that, so a target pushed by an
 * integration and never shown to the person is not a stick to beat them with.
 *
 * The participant keeps every way out they had: disagreement, a misunderstanding, an expectation that
 * has been overtaken, an assumption nobody tested. What changes is only the opening move.
 */
import { ObjectiveKind, ObjectiveScope, ObjectiveCheck, ObjectiveDue } from '@prisma/client';

export type SeedInput = {
  personExternalId: string;
  externalId: string;
  text: string;
  kind: string;
  scope?: string;
  check?: string;
  dueKind?: string;
  dueSaid?: string;
  owedToPersonExternalId?: string;
  approvedByExternalId?: string;
  effectiveFrom?: string;
  seenBySubject?: boolean;
  trackedUrl?: string;
};

const enumOr = <T extends object>(e: T, v: string | undefined, fallback: T[keyof T]): T[keyof T] =>
  (v && (Object.values(e) as string[]).includes(v) ? (v as any) : fallback);

/**
 * The taxonomy, unchanged, because it was already right.
 *
 * §5 of the integration brief asks that Groundwork not flatten an objective, a key result, a
 * responsibility, a commitment, a shared commitment, a task, a to-do, a milestone, a target and a
 * decision into one kind of thing. `ObjectiveKind` and `ObjectiveScope` already distinguish them -
 * a TARGET is a number crossing a line, a COMMITMENT is a to-do somebody else is waiting on and
 * carries who, a ROLE_EXPECTATION is standing with no end. Nothing new was needed.
 */
export function normalise(input: SeedInput) {
  return {
    kind: enumOr(ObjectiveKind, input.kind, ObjectiveKind.GOAL),
    scope: enumOr(ObjectiveScope, input.scope, ObjectiveScope.ONE_PERSON),
    check: input.check ? enumOr(ObjectiveCheck, input.check, ObjectiveCheck.NOT_CHECKABLE) : null,
    dueKind: input.dueKind ? enumOr(ObjectiveDue, input.dueKind, ObjectiveDue.NOT_SAID) : null,
  };
}

export const NOT_A_KIND =
  `kind must be one of: ${Object.values(ObjectiveKind).join(', ')}. `
  + 'These are not interchangeable - a TARGET is a number crossing a line and a COMMITMENT is '
  + 'something somebody else is waiting on, and the questions differ.';

/**
 * A COMMITMENT IS OWED TO SOMEBODY, and refusing one without a name is the point of the kind.
 *
 * "Sahar onboards the clients the team brings in" is a commitment because somebody is waiting on it.
 * Recorded without who, it is indistinguishable from a private to-do, and the handoff reasoning that
 * makes this product useful never sees it.
 */
export function missingOwedTo(input: SeedInput): boolean {
  return input.kind === ObjectiveKind.COMMITMENT && !input.owedToPersonExternalId;
}
