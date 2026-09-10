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

export interface Viewer {
  role?: string | null;
  organizationId?: string | null;
  /** The department of the Person linked to this user, when there is one. Null is "no department", never "everyone's". */
  department?: string | null;
}

export interface CheckInInView {
  organizationId: string;
  initiatorId: string | null;
  createdByUserId?: string | null;
  participants?: { userId: string | null }[];
  /** The department of the Person linked to the lead who runs it, when known. */
  leadDepartment?: string | null;
}

export type ReadLevel = 'own' | 'shared' | 'lead';

/** An admin of THIS organisation. An admin of a different one is a stranger. */
export function adminsThisOrg(viewer: Viewer | null | undefined, checkIn: { organizationId: string }): boolean {
  return viewer?.role === 'ADMIN' && viewer.organizationId === checkIn.organizationId;
}

/** Runs it: the lead who started it, or an admin of its organisation covering for them. The write gate. */
export function runsIt(userId: string, viewer: Viewer | null | undefined, checkIn: CheckInInView): boolean {
  return checkIn.initiatorId === userId || adminsThisOrg(viewer, checkIn);
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
  if (runsIt(userId, viewer, checkIn)) return 'lead';
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
  if (!userId || adminsThisOrg(viewer, { organizationId })) return { organizationId };
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
