/**
 * WHO MAY READ THIS CHECK-IN: ONE RULE, IN ONE FILE, THAT EVERY READ CALLS.
 *
 * Fourteen places decided for themselves whether the caller ran a check-in, in two formulas that
 * did not agree on a security question: grounds.service asked `role === 'ADMIN' && same organisation`
 * ten times; reports.service asked `same organisation` four times and never asked for the role, so
 * any member of the organisation read every report in it with the lead's eyes (fix plan A2 made that
 * call - the grounds formula is the right one - and this file inherits it rather than re-deciding).
 * The board arrived at the same answer a third way. The list selected between two Prisma clauses on
 * `userRole === 'ADMIN'`. Nothing owned the question, so every new read invented an answer.
 *
 * In the style of a-ground-that-has-ended.ts: no database, no Nest, pure functions over the viewer
 * and the check-in. Three levels rather than a boolean, because the damage came from treating a
 * reader as either nobody or the lead:
 *
 *   own     their own record and their own words - a participant reads at least this
 *   shared  the shared report, the board, who has answered; never another person's exact words
 *   lead    the above plus the admin surfaces of the check-in they run
 *
 * The comment board.service.ts kept is kept here: an admin of THIS organisation runs the check-in;
 * an admin of a different one is a stranger. And the admin who SET IT UP and handed it to a lead
 * reads at `lead` - she was locked out of every board she had created - but does not hold the
 * lead's write powers; those ask runsIt(), which she is not.
 *
 * E5 (decided with this file): a LEAD reads at `shared` on the check-ins run from their own
 * department. The schema's note on UserRole, that a LEAD inherits nothing, is amended by this.
 */

import { GroundScenario } from '@prisma/client';
import { isEvaluationCheckIn, EVALUATION_SCENARIOS } from '../reports/is-this-an-evaluation-check-in';

export interface Viewer {
  /** Who is reading. Needed to tell whether an admin was given access to an evaluation check-in (decision 5, request 78). */
  userId?: string | null;
  role?: string | null;
  organizationId?: string | null;
  /** The department of the Person linked to this user, when there is one. Null is "no department", never "everyone's". */
  department?: string | null;
}

export interface CheckInInView {
  organizationId: string;
  /**
   * The scenario, because decision 5 and request 78 make an admin's reach depend on it: on a performance
   * plan, a promotion or a renewal an admin reads only what they run, set up or take part in. `undefined`
   * (a caller that forgot to select it) is treated as the strictest case, never as an ordinary check-in.
   */
  scenario: GroundScenario | null | undefined;
  initiatorId: string | null;
  createdByUserId?: string | null;
  participants?: { userId: string | null }[];
  /** The department of the Person linked to the lead who runs it, when known. */
  leadDepartment?: string | null;
}

/** What a caller adds to its select so the rule can tell whether an admin was given access (request 78). */
export const WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS = {
  scenario: true,
  createdByUserId: true,
  participants: { select: { userId: true } },
} as const;

export type ReadLevel = 'own' | 'shared' | 'lead';

/** An admin of THIS organisation. An admin of a different one is a stranger. Says nothing about evaluation check-ins. */
export function adminsTheOrg(viewer: Viewer | null | undefined, organizationId: string): boolean {
  return viewer?.role === 'ADMIN' && viewer.organizationId === organizationId;
}

/**
 * RUNS IT OR SET IT UP: the two ways an admin holds the admin's reach over an evaluation check-in.
 * An admin who only takes part in one reads it as a person in it does (the `own` level), not as the
 * manager, so a person being reviewed who happens to be an admin is never handed the manager's view.
 */
export function runsOrSetItUp(
  userId: string | null | undefined,
  checkIn: { initiatorId?: string | null; createdByUserId?: string | null },
): boolean {
  if (!userId) return false;
  return checkIn.initiatorId === userId || (!!checkIn.createdByUserId && checkIn.createdByUserId === userId);
}

/**
 * AN ADMIN OF THIS ORGANISATION, WHERE ADMINS HAVE REACH. On a performance plan, a promotion or a renewal
 * (`isEvaluationCheckIn`) an admin who was not given access is, for that check-in, as if they were not an
 * admin at all: they may not see it, and it is not listed (decision 5, request 78). Given access means they
 * run it, set it up, or take part in it; the first two keep the admin's reach, taking part reads as a
 * person in it does. Pass the viewer with their `userId`; without it, or without the scenario, the answer
 * on an evaluation check-in is no.
 */
export function adminsThisOrg(viewer: Viewer | null | undefined, checkIn: CheckInInView): boolean {
  if (!adminsTheOrg(viewer, checkIn.organizationId)) return false;
  if (checkIn.scenario !== undefined && !isEvaluationCheckIn(checkIn.scenario)) return true;
  return runsOrSetItUp(viewer?.userId, checkIn);
}

/** Runs it: the lead who started it, or an admin of its organisation covering for them. The write gate. */
export function runsIt(userId: string, viewer: Viewer | null | undefined, checkIn: CheckInInView): boolean {
  return checkIn.initiatorId === userId || adminsThisOrg({ ...viewer, userId }, checkIn);
}

/** A LEAD in the same department as the lead who runs it. Blank departments never match. */
export function leadsTheSameDepartment(viewer: Viewer | null | undefined, checkIn: CheckInInView): boolean {
  return viewer?.role === 'LEAD'
    && viewer.organizationId === checkIn.organizationId
    && !!viewer.department
    && !!checkIn.leadDepartment
    && viewer.department === checkIn.leadDepartment;
}

export function whatTheyMayRead(userId: string, viewer: Viewer | null | undefined, checkIn: CheckInInView): ReadLevel | null {
  if (runsIt(userId, { ...viewer, userId }, checkIn)) return 'lead';
  if (checkIn.createdByUserId && checkIn.createdByUserId === userId) return 'lead';
  if ((checkIn.participants ?? []).some((p) => p.userId === userId)) return 'own';
  if (leadsTheSameDepartment(viewer, checkIn)) return 'shared';
  return null;
}

/** May they read anything at all. The common gate, as a boolean for the routes that only need that. */
export function maySee(userId: string, viewer: Viewer | null | undefined, checkIn: CheckInInView): boolean {
  return whatTheyMayRead(userId, viewer, checkIn) !== null;
}

/**
 * THE LIST IS A QUERY BUILT FROM THE RULE, NOT THE PLACE THE RULE LIVES. The same three cases as
 * whatTheyMayRead, as a Prisma clause: an admin sees the organisation's check-ins; everybody else the
 * ones they run, set up or take part in; a LEAD also the ones run by the leads of their department,
 * which the caller resolves to user ids because a where-clause cannot follow User -> Person.
 */
export function groundsAViewerMayList(
  userId: string | undefined,
  viewer: Viewer | null | undefined,
  organizationId: string,
  leadsOfTheirDepartment: string[] = [],
): Record<string, unknown> {
  if (!userId) return { organizationId };
  if (adminsTheOrg(viewer, organizationId)) {
    /* An admin lists the organisation's check-ins, except a performance plan, a promotion or a renewal they
       were not given access to (decision 5, request 78). */
    return {
      organizationId,
      OR: [
        { scenario: { notIn: EVALUATION_SCENARIOS } },
        { initiatorId: userId },
        { createdByUserId: userId },
        { participants: { some: { userId } } },
      ],
    };
  }
  return {
    organizationId,
    OR: [
      { initiatorId: userId },
      { createdByUserId: userId },
      { participants: { some: { userId } } },
      ...(viewer?.role === 'LEAD' && leadsOfTheirDepartment.length ? [{ initiatorId: { in: leadsOfTheirDepartment } }] : []),
    ],
  };
}
