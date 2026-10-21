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
  /** The address on their account, so an admin the lead named as the person it is about can be recognised before they are linked to the check-in (P11). */
  email?: string | null;
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
  participants?: { userId: string | null; email?: string | null; managingOnly?: boolean | null }[];
  /** The department of the Person linked to the lead who runs it, when known. */
  leadDepartment?: string | null;
  /**
   * Whether it is waiting for an admin to accept it, and which admin decided, so the admin asked to approve
   * an evaluation check-in can read it (decision 75, item 2). `undefined` grants nothing.
   */
  status?: string | null;
  approvedById?: string | null;
}

/** What a caller adds to its select so the rule can tell whether an admin was given access (request 78). */
export const WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS = {
  scenario: true,
  createdByUserId: true,
  participants: { select: { userId: true, email: true, managingOnly: true } },
  /* Decision 75, item 2: the admin asked to approve it reads it. */
  status: true,
  approvedById: true,
} as const;

export type ReadLevel = 'own' | 'shared' | 'lead';

/** Whether the lead named this reader, by address, among the people on the check-in. Case does not matter in an address. */
export function aPersonNamedAtSetup(viewer: Viewer | null | undefined, checkIn: Pick<CheckInInView, 'participants'>): boolean {
  const mine = (viewer?.email ?? '').trim().toLowerCase();
  return !!mine && (checkIn.participants ?? []).some((p) => (p.email ?? '').trim().toLowerCase() === mine);
}

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
  /* An admin who takes part in it is, inside it, a person who takes part (decision 121, item 7), unless she also runs it or set it up. */
  if (takesPartWithoutRunningIt(viewer?.userId, checkIn)) return false;
  if (checkIn.scenario !== undefined && !isEvaluationCheckIn(checkIn.scenario)) return true;
  return runsOrSetItUp(viewer?.userId, checkIn);
}

/**
 * AN ADMIN WHO TAKES PART IN A CHECK-IN IS TREATED LIKE ANY PARTICIPANT INSIDE IT (decision 121, item 7). She reads what a person who takes part reads: no
 * brief, aims, private notes or lead-only sections. Unless she is also the one who runs it (its lead) or set it up, in which case nothing changes. She
 * keeps her admin role everywhere else: other check-ins, suites, People and settings, because this looks only at the check-in in front of her.
 */
export function takesPartWithoutRunningIt(
  userId: string | null | undefined,
  checkIn: { initiatorId?: string | null; createdByUserId?: string | null; participants?: { userId: string | null; managingOnly?: boolean | null }[] },
): boolean {
  if (!userId || runsOrSetItUp(userId, checkIn)) return false;
  /* Managing only is not checking in: that row is not taking part. */
  return (checkIn.participants ?? []).some((p) => p.userId === userId && !p.managingOnly);
}

/**
 * THE ADMIN ASKED TO APPROVE AN EVALUATION CHECK-IN READS IT (decision 75, item 2).
 *
 * A performance plan, a promotion or renewal, or a probation set up by a lead who is not an admin waits for
 * an admin to accept it. Every admin of the organisation is asked (the approval queue), so while it waits each
 * of them reads it as an admin with access does, to see what they are approving. Once it is decided, the admin
 * who decided keeps that access, and the others who were asked and did not decide go back to reading nothing.
 *
 * READING ONLY. This never makes them run it: `runsIt`, and every write that asks `adminsThisOrg`, are
 * unchanged, so they cannot change its setup, invite anybody or confirm anything. Nobody else gains anything:
 * a member, a lead or an admin of another organisation is never asked to approve.
 */
export function askedToApproveIt(viewer: Viewer | null | undefined, checkIn: CheckInInView): boolean {
  if (!adminsTheOrg(viewer, checkIn.organizationId)) return false;
  if (!viewer?.userId) return false;
  /* THE ADMIN THE LEAD NAMED AS THE PERSON IT IS ABOUT IS NOT ASKED TO APPROVE IT (decision 110, P11). While it waits, the people the lead named
     at setup are on it with no account linked yet, and nothing else says who it is about, so an admin who is its subject read their own plan's
     setup. The lead names them at setup; the match is on the address. They read as a person in it does, which is to say not at all, until they are invited. */
  if (aPersonNamedAtSetup(viewer, checkIn)) return false;
  if (checkIn.scenario === undefined || !isEvaluationCheckIn(checkIn.scenario)) return false;
  if (checkIn.status === 'AWAITING_APPROVAL') return true;
  return !!checkIn.approvedById && checkIn.approvedById === viewer.userId;
}

/**
 * AN ADMIN WHO MAY READ IT AS AN ADMIN: everything `adminsThisOrg` says yes to, and the admin asked to approve
 * an evaluation check-in (decision 75, item 2). For reads only; a write asks `adminsThisOrg` or `runsIt`.
 */
export function readsAsAnAdmin(viewer: Viewer | null | undefined, checkIn: CheckInInView): boolean {
  return adminsThisOrg(viewer, checkIn) || askedToApproveIt(viewer, checkIn);
}

/**
 * WHO READS THE LEAD'S PRIVATE PEOPLE NOTES AND HER PLAN FOR A PERSON (Hafsah, 21 October). The lead who runs the check-in, and an
 * admin of its organisation only if that admin set it up (`createdByUserId`) or approved it (`approvedById`). No other admin, however
 * much else of the check-in they read, and never anybody in it or outside it.
 */
export function readsTheLeadsPeopleNotes(
  viewer: Viewer | null | undefined,
  checkIn: { organizationId: string; initiatorId?: string | null; createdByUserId?: string | null; approvedById?: string | null },
): boolean {
  const userId = viewer?.userId;
  if (!userId) return false;
  if (checkIn.initiatorId === userId) return true;
  if (!adminsTheOrg(viewer, checkIn.organizationId)) return false;
  return (!!checkIn.createdByUserId && checkIn.createdByUserId === userId) || (!!checkIn.approvedById && checkIn.approvedById === userId);
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
    && viewer.department === checkIn.leadDepartment
    /* NEVER AN EVALUATION CHECK-IN (decision 75, item 25): a new hire, a performance plan, a promotion, a renewal or a probation is read by the people in it, who runs it and the admin who was given it, as the board and the report already say. A lead in the same department is none of them. */
    && !(checkIn.scenario !== undefined && isEvaluationCheckIn(checkIn.scenario));
}

export function whatTheyMayRead(userId: string, viewer: Viewer | null | undefined, checkIn: CheckInInView): ReadLevel | null {
  if (runsIt(userId, { ...viewer, userId }, checkIn)) return 'lead';
  if (checkIn.createdByUserId && checkIn.createdByUserId === userId) return 'lead';
  /* The person the lead named at setup reads nothing of it while it waits for an admin to accept it (decision 110, P11): they have not been invited, and it is about them. */
  if (checkIn.status === 'AWAITING_APPROVAL' && aPersonNamedAtSetup(viewer, checkIn)) return null;
  /* Before taking part: an admin asked to approve it who also takes part in it is not handed the manager's view. */
  if ((checkIn.participants ?? []).some((p) => p.userId === userId)) return 'own';
  if (askedToApproveIt({ ...viewer, userId }, checkIn)) return 'lead';
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
        /* Decision 75, item 2: one waiting for an admin to accept it, and one this admin decided. */
        { status: 'AWAITING_APPROVAL' },
        { approvedById: userId },
      ],
    };
  }
  return {
    organizationId,
    OR: [
      { initiatorId: userId },
      { createdByUserId: userId },
      /* Not one still waiting for an admin to accept it: opening it answers "not found", so the list never offers it (B-126). */
      { participants: { some: { userId } }, status: { not: 'AWAITING_APPROVAL' } },
      ...(viewer?.role === 'LEAD' && leadsOfTheirDepartment.length ? [{ initiatorId: { in: leadsOfTheirDepartment }, scenario: { notIn: EVALUATION_SCENARIOS } }] : []),
    ],
  };
}
