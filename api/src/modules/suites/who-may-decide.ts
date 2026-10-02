import type { PrismaService } from '../prisma/prisma.service';
import { theirSignIn, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { readDuties, whoHolds, type Duties } from './who-holds-each-duty';

/**
 * WHO MAY DECIDE A REQUEST, BY RULE: the one approval resolver (decision 85; step 3 of the build list
 * in docs/suites-against-the-workflow-model.md).
 *
 * Decision 85 names approvers by rule, never by person, so a workflow survives changes in the
 * organisation. This file turns a rule and a request into the person who may decide it. Leave, time
 * sheets, reviews and spending all ask here, and nowhere else.
 *
 * THE RULES.
 *   - `manager`: the requester's line manager in the staff directory, when that manager signs in here
 *     as a lead or an admin (a-roster-entry-and-its-sign-in.ts matches a sign-in by link or address).
 *   - `budgetOwner`, `departmentHead`: whoever holds that duty for the request's team, or for the
 *     requester's team in the staff directory when the request names none (who-holds-each-duty.ts).
 *   - `finance`, `hr`, `chiefExecutive`: whoever holds that duty for the whole organisation.
 *   - `admin`: any admin.
 *   - `{ named }`: one person an admin named on a suite. Only spending's older answer "Who approves
 *     anything above that?" does this; it is kept so nothing already switched on changes.
 * A rule that finds nobody gives null, so the next step is tried. A guest, and somebody no longer in the
 * organisation, are passed over. The requester is never returned: nobody decides their own.
 *
 * TODAY'S ANSWERS, AS RULES (`theStepsFor`). Each is a list tried in order, ending with an admin, so
 * every request has somebody who may decide it:
 *   - leave and time sheets: the manager, else an admin (the one answer of 1 October 2026, which does
 *     not read the admin's "Who approves?" answer);
 *   - reviews: "Their manager" is the manager, else an admin; "An admin" is an admin;
 *   - spending up to the limit: the manager, else an admin;
 *   - spending above the limit: the team's budget owner, then finance, then the person the admin
 *     named, then an admin (as b7ff00b4 decided).
 */

export type Rule = 'manager' | 'budgetOwner' | 'departmentHead' | 'finance' | 'hr' | 'chiefExecutive' | 'admin';
export type Step = Rule | { named: string };

/** The request, as far as deciding who may decide it needs. */
export interface ARequest {
  organizationId: string;
  /** The requester's sign-in, or null for a directory entry with none (a review can be about them). */
  requesterUserId: string | null;
  /** The requester's manager in the directory. Leave it out (undefined) and it is read here. */
  managerExternalId?: string | null;
  /** The team the request counts against. Leave it out, or null, and the requester's directory department is used. */
  team?: string | null;
}

/** Who may decide: one person by rule, or any admin. */
export type WhoDecides =
  | { kind: 'manager'; rule: 'manager'; userId: string; firstName: string | null }
  | { kind: 'person'; rule: Exclude<Rule, 'manager' | 'admin'> | 'named'; userId: string }
  | { kind: 'admin'; rule: 'admin' };

/** What one reading of a request may share between its steps, so the duties are read once. */
export interface Known { duties?: Duties; team?: string | null }

const DUTY_OF = {
  budgetOwner: 'budgetOwners', departmentHead: 'departmentHeads', finance: 'finance', hr: 'hr', chiefExecutive: 'chiefExecutive',
} as const;

async function roleIn(prisma: PrismaService, organizationId: string, userId: string): Promise<string | null> {
  const m = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

/** Somebody who may be named for a step: in this organisation, not a guest, and not the requester. */
async function aPersonWhoMay(prisma: PrismaService, request: ARequest, userId: string | null | undefined): Promise<boolean> {
  if (!userId || userId === request.requesterUserId) return false;
  const role = await roleIn(prisma, request.organizationId, userId);
  return !!role && role !== 'GUEST';
}

/** The person one rule names for this request, or null when it names nobody. */
export async function whoMayDecide(prisma: PrismaService, rule: Step, request: ARequest, known: Known = {}): Promise<WhoDecides | null> {
  if (rule === 'admin') return { kind: 'admin', rule: 'admin' };
  if (typeof rule === 'object') return (await aPersonWhoMay(prisma, request, rule.named)) ? { kind: 'person', rule: 'named', userId: rule.named } : null;
  if (rule === 'manager') return theManager(prisma, request);

  const duty = DUTY_OF[rule];
  let holder: string | null;
  if (duty === 'budgetOwners' || duty === 'departmentHeads') {
    if (known.team === undefined) known.team = await theTeamOf(prisma, request);
    if (!known.team) return null;
    known.duties ??= await readDuties(prisma, request.organizationId);
    holder = whoHolds(known.duties, duty, known.team);
  } else {
    known.duties ??= await readDuties(prisma, request.organizationId);
    holder = whoHolds(known.duties, duty);
  }
  return (await aPersonWhoMay(prisma, request, holder)) ? { kind: 'person', rule, userId: holder! } : null;
}

/** The first step that names somebody. Every list ends with an admin, so somebody always may. */
export async function theOneWhoDecides(prisma: PrismaService, steps: Step[], request: ARequest): Promise<WhoDecides> {
  const known: Known = {};
  for (const step of steps) {
    const who = await whoMayDecide(prisma, step, request, known);
    if (who) return who;
  }
  return { kind: 'admin', rule: 'admin' };
}

/** Whether this reader decides: the one named, or any admin when an admin decides; never the requester. */
export function decidesIt(who: WhoDecides, reader: { userId: string; role: string | null }, requesterUserId: string | null): boolean {
  if (requesterUserId && requesterUserId === reader.userId) return false;
  if (who.kind === 'admin') return reader.role === 'ADMIN';
  return who.userId === reader.userId;
}

/**
 * Whether these steps could ever name this reader, for any request: an admin for `admin`, a lead or
 * an admin for `manager`, whoever holds a duty for a duty, and the named person. Used by a board to
 * let a member in as an approver, who then reads only what waits for them.
 */
export async function couldBeNamed(prisma: PrismaService, steps: Step[], organizationId: string, reader: { userId: string; role: string | null }): Promise<boolean> {
  if (!reader.role || reader.role === 'GUEST') return false;
  let duties: Duties | null = null;
  for (const step of steps) {
    if (step === 'admin') { if (reader.role === 'ADMIN') return true; continue; }
    if (step === 'manager') { if (reader.role === 'LEAD' || reader.role === 'ADMIN') return true; continue; }
    if (typeof step === 'object') { if (step.named === reader.userId) return true; continue; }
    duties ??= await readDuties(prisma, organizationId);
    const d = DUTY_OF[step];
    if (d === 'budgetOwners' || d === 'departmentHeads') { if (Object.values(duties[d] ?? {}).includes(reader.userId)) return true; }
    else if (duties[d] === reader.userId) return true;
  }
  return false;
}

/** The steps for each suite, from the answers the admin gave when switching it on. */
export function theStepsFor(suite: 'leave' | 'time', answers?: unknown): Step[];
export function theStepsFor(suite: 'reviews', answers: { writer: string | null }): Step[];
export function theStepsFor(suite: 'spend', answers: { limit: number | null; above: string | null }, amount: number): Step[];
export function theStepsFor(suite: 'leave' | 'time' | 'reviews' | 'spend', answers?: any, amount?: number): Step[] {
  if (suite === 'reviews') return answers?.writer === 'Their manager' ? ['manager', 'admin'] : ['admin'];
  if (suite === 'spend' && answers?.limit != null && Number(amount ?? 0) > answers.limit) {
    return ['budgetOwner', 'finance', ...(answers.above ? [{ named: answers.above as string }] : []), 'admin'];
  }
  return ['manager', 'admin'];
}

/** Every step a suite's answers could use, whatever the amount: what a board asks `couldBeNamed`. */
export function everyStepFor(suite: 'spend', answers: { limit: number | null; above: string | null }): Step[] {
  return answers.limit == null ? theStepsFor(suite, answers, 0) : [...theStepsFor(suite, answers, 0), ...theStepsFor(suite, answers, answers.limit + 1)];
}

// -------------------------------------------------------------------------------------------------

/** The requester's line manager, when they sign in here as a lead or an admin and are not the requester. */
async function theManager(prisma: PrismaService, request: ARequest): Promise<WhoDecides | null> {
  let managerExternalId = request.managerExternalId;
  if (managerExternalId === undefined) {
    const me = request.requesterUserId
      ? await theirRosterEntry(prisma, request.organizationId, request.requesterUserId, { managerExternalId: true })
      : null;
    managerExternalId = me?.managerExternalId ?? null;
  }
  if (!managerExternalId) return null;
  const m = await prisma.person.findFirst({
    where: { organizationId: request.organizationId, externalId: managerExternalId, active: true },
    select: { linkedUserId: true, email: true, givenName: true, displayName: true },
  });
  /* A manager whose entry is matched to their sign-in by address decides too (decision 82, item 6). */
  const managerUserId = await theirSignIn(prisma, request.organizationId, m);
  if (!m || !managerUserId || managerUserId === request.requesterUserId) return null;
  const role = await roleIn(prisma, request.organizationId, managerUserId);
  if (role !== 'LEAD' && role !== 'ADMIN') return null;
  const firstName = m.givenName?.trim() || m.displayName?.trim().split(/\s+/)[0] || null;
  return { kind: 'manager', rule: 'manager', userId: managerUserId, firstName };
}

/** The request's team, or else the requester's department in the staff directory. */
async function theTeamOf(prisma: PrismaService, request: ARequest): Promise<string | null> {
  if (request.team?.trim()) return request.team.trim();
  if (!request.requesterUserId) return null;
  const me = await theirRosterEntry(prisma, request.organizationId, request.requesterUserId, { department: true });
  return me?.department?.trim() || null;
}
