import type { PrismaService } from '../prisma/prisma.service';
import { theirSignIn, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { readDuties, whoHolds, type Duties } from './who-holds-each-duty';
import type { AWorkflow } from './the-approval-steps';
import { coverToday, type Lookups } from './the-lookups';
import { theThresholdCrossed, type AThreshold } from './the-spending-rules';

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
 * STEPS (build step 4). `theStepsFor` gives a list of steps. Each step is a list of rules tried in
 * order: the first that names somebody decides that step, and a request passed on for waiting too long
 * moves to the next rule in the same list (a-request-waits-too-long.ts). An approval moves the request to
 * the next step, and only the last step ends it. A request carries which step it is on and how far it
 * has been passed on (`WhereItIs`), and `whoDecidesNow` reads who decides it from there.
 *
 * An admin may set the steps for leave, time sheets and spending (the-approval-steps.ts). With nothing
 * set, TODAY'S ANSWERS ARE ONE STEP EACH, a list tried in order, ending with an admin, so every request
 * has somebody who may decide it:
 *   - leave and time sheets: the manager, else an admin (the one answer of 1 October 2026, which does
 *     not read the admin's "Who approves?" answer);
 *   - reviews: "Their manager" is the manager, else an admin; "An admin" is an admin;
 *   - spending up to the limit: the manager, else an admin;
 *   - spending above the limit: the team's budget owner, then finance, then the person the admin
 *     named, then an admin (as b7ff00b4 decided).
 * Thresholds are laid over these: spending by amount (the-spending-rules.ts) and leave by working days
 * (the-leave-rules.ts). Leave takes its length as the third argument; with no length, or no
 * thresholds, its steps are exactly as above.
 */

export type Rule = 'manager' | 'budgetOwner' | 'departmentHead' | 'finance' | 'hr' | 'chiefExecutive' | 'admin';
/** One rule, or one person an admin named on a suite. */
export type ARule = Rule | { named: string };
/** One approval step: the rules tried in order. The first that names somebody decides it. */
export type Step = ARule[];

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
  /**
   * `standingInFor` is set when the person named by the rule is on approved leave today and somebody stands in for them
   * (their leave's stand-in): then the stand-in decides, for exactly the days of that leave, and it is the away person's id.
   */
  | { kind: 'person'; rule: Exclude<Rule, 'manager' | 'admin'> | 'named'; userId: string; standingInFor?: string }
  | { kind: 'admin'; rule: 'admin' };

/** What one reading of a request may share between its steps, so the duties are read once. */
export interface Known {
  duties?: Duties; team?: string | null;
  /**
   * What a read of many requests has already loaded (the-lookups.ts), so each request is decided in memory and the
   * read costs the same number of queries for ten requests as for a thousand. Left out, every answer is asked of the
   * database, as before.
   */
  lookups?: Lookups;
  /** The day it is decided for, for who stands in for somebody away. Left out: now. */
  on?: Date;
  /** Who is away today and who stands in, read once for this resolution when no lookups were given. */
  cover?: Map<string, string>;
  /** Never hand a step to a stand-in: for a review, which is written by whoever the rule names and is not a request waiting for an answer. */
  noCover?: boolean;
}

const DUTY_OF = {
  budgetOwner: 'budgetOwners', departmentHead: 'departmentHeads', finance: 'finance', hr: 'hr', chiefExecutive: 'chiefExecutive',
} as const;

async function roleIn(prisma: PrismaService, organizationId: string, userId: string, known: Known = {}): Promise<string | null> {
  if (known.lookups) return known.lookups.roles.get(userId) ?? null;
  const m = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

/** Somebody who may be named for a step: in this organisation, not a guest, and not the requester. */
async function aPersonWhoMay(prisma: PrismaService, request: ARequest, userId: string | null | undefined, known: Known = {}): Promise<boolean> {
  if (!userId || userId === request.requesterUserId) return false;
  const role = await roleIn(prisma, request.organizationId, userId, known);
  return !!role && role !== 'GUEST';
}

/** The person one rule names for this request, or null when it names nobody. */
export async function whoMayDecide(prisma: PrismaService, rule: ARule, request: ARequest, known: Known = {}): Promise<WhoDecides | null> {
  if (rule === 'admin') return { kind: 'admin', rule: 'admin' };
  if (typeof rule === 'object') return (await aPersonWhoMay(prisma, request, rule.named, known)) ? { kind: 'person', rule: 'named', userId: rule.named } : null;
  if (rule === 'manager') return theManager(prisma, request, known);

  const duty = DUTY_OF[rule];
  let holder: string | null;
  if (duty === 'budgetOwners' || duty === 'departmentHeads') {
    if (known.team === undefined) known.team = await theTeamOf(prisma, request, known);
    if (!known.team) return null;
    known.duties ??= known.lookups?.duties ?? await readDuties(prisma, request.organizationId);
    holder = whoHolds(known.duties, duty, known.team);
  } else {
    known.duties ??= known.lookups?.duties ?? await readDuties(prisma, request.organizationId);
    holder = whoHolds(known.duties, duty);
  }
  return (await aPersonWhoMay(prisma, request, holder, known)) ? { kind: 'person', rule, userId: holder! } : null;
}

/** The first rule of one step that names somebody. When none does, an admin, so somebody always may. */
export async function theOneWhoDecides(prisma: PrismaService, rules: ARule[], request: ARequest, known: Known = {}): Promise<WhoDecides> {
  return (await whoDecidesFrom(prisma, rules, request, 0, known)).who;
}

/**
 * The first rule from `from` on that names somebody, and its place in the list. When none does, an
 * admin, at the place just after the last rule.
 *
 * WHEN THE PERSON NAMED IS AWAY (the stand-in). Somebody on approved leave today, whose leave names a
 * stand-in, hands the step to that stand-in for exactly the days of the leave: `who` is the stand-in,
 * with `standingInFor` the person who is away. It is worked out from the dates each time and written
 * nowhere, so it ends by itself the day the leave does, and the step is the away person's again. A
 * stand-in who is not in the organisation, is a guest, is the person who asked, or is away too, is
 * passed over, and the step stays with the person named, as it always did.
 */
export async function whoDecidesFrom(prisma: PrismaService, rules: ARule[], request: ARequest, from = 0, known: Known = {}): Promise<{ who: WhoDecides; at: number }> {
  for (let i = Math.max(0, from); i < rules.length; i++) {
    const who = await whoMayDecide(prisma, rules[i], request, known);
    if (who) return { who: await withWhoStandsIn(prisma, who, request, known), at: i };
  }
  return { who: { kind: 'admin', rule: 'admin' }, at: rules.length };
}

async function withWhoStandsIn(prisma: PrismaService, who: WhoDecides, request: ARequest, known: Known): Promise<WhoDecides> {
  /*
   * ONLY THE MANAGER'S STEP, AND ONLY TO A LEAD OR AN ADMIN. Approvers are named by rule and never by person (decision 85), so a
   * stand-in decides only a step the "manager" rule names, because "the person's manager" is who is on leave and the stand-in is
   * whoever the manager chose to cover. Every other step (finance, HR, the head, the budget holder, above a threshold) is not
   * handed over: it passes on by rule when it waits too long or the person is away, as it always did. A plain member who stands in
   * gets no right to decide, and so reads no leave balance, budget or anybody's request through it.
   */
  if (who.kind !== 'manager' || known.noCover) return who;
  const cover = known.lookups ? known.lookups.cover : (known.cover ??= await coverToday(prisma, request.organizationId, known.on ?? new Date()));
  const standIn = cover.get(who.userId);
  if (!standIn || standIn === who.userId) return who;
  const role = await roleIn(prisma, request.organizationId, standIn, known);
  if ((role !== 'LEAD' && role !== 'ADMIN') || !(await aPersonWhoMay(prisma, request, standIn, known))) return who;
  return { kind: 'person', rule: 'named', userId: standIn, standingInFor: who.userId };
}

/** Where a request is: the step it is on, and how far down that step's list it has been passed on. */
export interface WhereItIs { step?: number | null; escalatedTo?: number | null }

/** Who decides a request now, at which step and rule, whether this is the last step, and the team read. */
export interface DecidesNow { who: WhoDecides; step: number; at: number; last: boolean; team: string | null }

/** Who decides this request now, from where it is. A step past the end reads as the last step. */
export async function whoDecidesNow(prisma: PrismaService, steps: Step[], request: ARequest, where: WhereItIs = {}, shared: Pick<Known, 'lookups' | 'on'> = {}): Promise<DecidesNow> {
  const all = steps.length ? steps : [['admin'] as Step];
  const step = Math.min(Math.max(0, where.step ?? 0), all.length - 1);
  const known: Known = { ...shared };
  const { who, at } = await whoDecidesFrom(prisma, all[step], request, where.escalatedTo ?? 0, known);
  const team = known.team !== undefined ? known.team : request.team?.trim() || (await theTeamOf(prisma, request, known).catch(() => null));
  return { who, step, at, last: step >= all.length - 1, team };
}

/**
 * THE SAME APPROVER TWICE. When a request moves to a later step, or is passed on, and whoever now
 * decides it has already approved it at an earlier step, that step is passed for them: their approval
 * stands for it, and the request moves on. Applied by every suite through this one function, so leave,
 * time sheets and spending all do the same. `passed` is each step passed, with who had approved it
 * (each suite records "Omar had already approved it, so this step was passed."); `done` is true when
 * the last step was passed, so the request is approved. Any admin is never "the same person": another
 * admin may decide.
 */
export interface APassedStep { step: number; userId: string }
export async function passWhatTheyAlreadyApproved(
  prisma: PrismaService, steps: Step[], request: ARequest, from: WhereItIs, approvedByIds: string[] | null | undefined, shared: Pick<Known, 'lookups' | 'on'> = {},
): Promise<{ now: DecidesNow; where: { step: number; escalatedTo: number }; passed: APassedStep[]; done: boolean }> {
  const already = new Set(approvedByIds ?? []);
  let where = { step: Math.max(0, from.step ?? 0), escalatedTo: Math.max(0, from.escalatedTo ?? 0) };
  const passed: APassedStep[] = [];
  for (let i = 0; i <= (steps.length || 1); i++) {
    const now = await whoDecidesNow(prisma, steps, request, where, shared);
    const id = now.who.kind === 'admin' ? null : now.who.userId;
    if (!id || !already.has(id)) return { now, where: { step: now.step, escalatedTo: where.escalatedTo }, passed, done: false };
    passed.push({ step: now.step, userId: id });
    if (now.last) return { now, where: { step: now.step, escalatedTo: where.escalatedTo }, passed, done: true };
    where = { step: now.step + 1, escalatedTo: 0 };
  }
  const now = await whoDecidesNow(prisma, steps, request, where, shared);
  return { now, where, passed, done: false };
}

/** Whether two answers name the same people: both any admin, or the same person. */
export function samePeople(a: WhoDecides, b: WhoDecides): boolean {
  if (a.kind === 'admin' || b.kind === 'admin') return a.kind === b.kind;
  return a.userId === b.userId;
}

/**
 * Who a request would be passed to if it is passed on now: the next rule on the same step's list that
 * names somebody else. Null when nobody else is left on that list.
 */
export async function whoComesNext(prisma: PrismaService, steps: Step[], request: ARequest, where: WhereItIs = {}, shared: Pick<Known, 'lookups' | 'on'> = {}): Promise<{ now: DecidesNow; next: { who: WhoDecides; at: number } } | null> {
  const now = await whoDecidesNow(prisma, steps, request, where, shared);
  const rules = (steps.length ? steps : [['admin'] as Step])[now.step];
  let from = now.at + 1;
  while (from <= rules.length) {
    const next = await whoDecidesFrom(prisma, rules, request, from, { ...shared });
    if (!samePeople(next.who, now.who)) return { now, next };
    if (next.at >= rules.length) return null;
    from = next.at + 1;
  }
  return null;
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
export async function couldBeNamed(prisma: PrismaService, steps: ARule[], organizationId: string, reader: { userId: string; role: string | null }): Promise<boolean> {
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

/**
 * The steps for each suite, from the answers the admin gave when switching it on and the workflow they
 * set (the-approval-steps.ts), which the services pass as `answers.workflow`. With no workflow, one
 * step, exactly the list each suite had before steps existed.
 */
export function theStepsFor(suite: 'leave' | 'time', answers?: { workflow?: AWorkflow | null } | unknown, days?: number): Step[];
export function theStepsFor(suite: 'reviews', answers: { writer: string | null }): Step[];
export function theStepsFor(suite: 'spend', answers: { limit: number | null; above: string | null; workflow?: AWorkflow | null; thresholds?: AThreshold[] | null }, amount: number): Step[];
export function theStepsFor(suite: 'leave' | 'time' | 'reviews' | 'spend', answers?: any, amount?: number): Step[] {
  if (suite === 'reviews') return [answers?.writer === 'Their manager' ? ['manager', 'admin'] : ['admin']];
  const workflow = (answers?.workflow ?? null) as AWorkflow | null;
  /* The spending rules' thresholds (build step 9): above one, its own steps; above two, the higher one's. None set: as before. */
  const crossed = suite === 'spend' ? theThresholdCrossed({ thresholds: answers?.thresholds ?? undefined }, Number(amount ?? 0)) : null;
  if (crossed) return crossed.steps;
  /* Leave by length (the-leave-rules.ts): longer than a threshold of working days, its own steps; longer than two, the higher one's. None set, or no length given: as before. */
  const longer = suite === 'leave' && amount != null ? theThresholdCrossed({ thresholds: answers?.rules?.thresholds ?? answers?.thresholds ?? undefined }, Number(amount)) : null;
  if (longer) return longer.steps;
  if (suite === 'spend' && answers?.limit != null && Number(amount ?? 0) > answers.limit) {
    if (workflow?.stepsAbove?.length) {
      /* The person the admin named for large spending still decides the last step, in front of "an admin" (B-004): two answers on one page must not silently disagree. */
      const above = workflow.stepsAbove;
      const last = above[above.length - 1];
      const named = typeof answers.above === 'string' && answers.above.trim() ? answers.above.trim() : null;
      const alreadyNamed = above.some((step) => step.some((rule) => typeof rule === 'object' && !!rule && (rule as { named: string }).named === named));
      if (named && !alreadyNamed && last.includes('admin')) {
        return [...above.slice(0, -1), [{ named }, ...last]];
      }
      return above;
    }
    return [['budgetOwner', 'finance', ...(answers.above ? [{ named: answers.above as string }] : []), 'admin']];
  }
  if (workflow?.steps?.length) return workflow.steps;
  return [['manager', 'admin']];
}

/** Every rule in these steps, in order: what a board asks `couldBeNamed`. */
export const everyRuleIn = (steps: Step[]): ARule[] => steps.flat();

/** Every rule a suite's answers could use, whatever the amount: what a board asks `couldBeNamed`. */
export function everyStepFor(suite: 'spend', answers: { limit: number | null; above: string | null; workflow?: AWorkflow | null; thresholds?: AThreshold[] | null }): ARule[] {
  const below = { ...answers, thresholds: null };
  return [
    ...everyRuleIn(theStepsFor(suite, below, 0)),
    ...(answers.limit == null ? [] : everyRuleIn(theStepsFor(suite, below, answers.limit + 1))),
    ...(answers.thresholds ?? []).flatMap((t) => everyRuleIn(t.steps)),
  ];
}

// -------------------------------------------------------------------------------------------------

/** The requester's line manager, when they sign in here as a lead or an admin and are not the requester. */
async function theManager(prisma: PrismaService, request: ARequest, known: Known = {}): Promise<WhoDecides | null> {
  const L = known.lookups;
  let managerExternalId = request.managerExternalId;
  if (managerExternalId === undefined) {
    const me = request.requesterUserId
      ? (L ? L.entryOf.get(request.requesterUserId) ?? null : await theirRosterEntry(prisma, request.organizationId, request.requesterUserId, { managerExternalId: true }))
      : null;
    managerExternalId = me?.managerExternalId ?? null;
  }
  if (!managerExternalId) return null;
  if (L) {
    /* The same answer from what was read once: the manager's entry, the sign-in it matches, and their role here. */
    const m = L.byExternalId.get(managerExternalId);
    if (!m?.userId || m.userId === request.requesterUserId) return null;
    const role = L.roles.get(m.userId) ?? null;
    if (role !== 'LEAD' && role !== 'ADMIN') return null;
    return { kind: 'manager', rule: 'manager', userId: m.userId, firstName: m.givenName?.trim() || m.displayName?.trim().split(/\s+/)[0] || null };
  }
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
async function theTeamOf(prisma: PrismaService, request: ARequest, known: Known = {}): Promise<string | null> {
  if (request.team?.trim()) return request.team.trim();
  if (!request.requesterUserId) return null;
  if (known.lookups) return known.lookups.entryOf.get(request.requesterUserId)?.department?.trim() || null;
  const me = await theirRosterEntry(prisma, request.organizationId, request.requesterUserId, { department: true });
  return me?.department?.trim() || null;
}


/**
 * AN ADMIN WHO IS THE ONLY ADMIN, ASKING FOR SOMETHING AN ADMIN DECIDES (B-005). Nobody decides their own request
 * and nobody else is an admin, so it would be "sent to an admin" and wait for ever, with nobody told. This is the
 * sentence they are given instead, at the moment they ask, when nothing has been kept.
 */
export const NOBODY_ELSE_CAN_DECIDE = 'You are the only admin and nobody is named to approve your requests, so nobody else could decide this one. Add another admin, or name someone to approve it in the suite\u2019s settings, and then ask again.';

/** True when the first step names "an admin" for this request, the requester is that organisation's only admin, and so nobody could ever decide it. */
export async function nobodyElseCanDecide(
  prisma: PrismaService, steps: Step[], request: ARequest, requesterRole: string | null | undefined,
): Promise<boolean> {
  if (requesterRole !== 'ADMIN' || !request.requesterUserId) return false;
  try {
    const now = await whoDecidesNow(prisma, steps, request);
    if (now.who.kind !== 'admin') return false;
    const others = await (prisma as any).user.count({
      where: { organizationId: request.organizationId, role: 'ADMIN', isActive: true, deletedAt: null, id: { not: request.requesterUserId } },
    });
    return others === 0;
  } catch {
    /* A read that cannot be made never refuses a request. */
    return false;
  }
}
