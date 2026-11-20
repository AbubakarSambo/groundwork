import type { PrismaService } from '../prisma/prisma.service';
import type { ARule, Rule, Step, WhoDecides } from './who-may-decide';

/**
 * THE APPROVAL STEPS AN ADMIN SETS, AND WHEN A REQUEST IS PASSED ON (decision 85; step 4 of the build
 * list in docs/suites-against-the-workflow-model.md).
 *
 * A request can pass through more than one approver: for example the person's manager, and then
 * whoever looks after finance. Each step is a list of rules tried in order (who-may-decide.ts): the
 * first rule that names somebody decides that step, and when a request waits too long, or the person
 * it waits for is on approved leave that day, it is passed to the next rule in that step's list. An
 * approval moves the request to the next step, and only the last step ends it. A decline ends it at
 * any step.
 *
 * WHERE IT IS KEPT. In the existing `OrganizationSuite` table, one row for each organisation with the
 * key `workflows`, beside the `duties` row, so switching a suite on again (which keeps only the
 * suite's own answers) never loses it. An admin sets it for every suite; whoever holds the HR duty for
 * leave, and whoever holds the finance duty for time sheets and spending (`SuitesService.setWorkflows`).
 *
 * SPENDING IS NOT SET HERE. Who approves a request to spend is its steps by amount
 * (the-spending-rules.ts), the one place that says it. Only its working days before a request is
 * passed on are kept here.
 *
 * NOTHING CHANGES BY ITSELF. With nothing kept, leave and time sheets have one step (`THE_LINE_STEP`: the manager, else
 * their manager's manager, else an admin), and nothing is ever passed on: escalation runs only for a suite whose
 * number of working days an admin has set.
 */
export const WORKFLOWS_ROW = 'workflows';

export type StepSuite = 'leave' | 'time' | 'spend';
export const STEP_SUITES: StepSuite[] = ['leave', 'time', 'spend'];

export interface AWorkflow {
  /** The steps, in order. Not for spending: its steps are its steps by amount (the-spending-rules.ts), the one place that says who approves it. */
  steps?: Step[];
  /** Working days a request may wait for one person before it is passed to the next rule. Unset: never. */
  escalateAfter?: number;
}
export type Workflows = Partial<Record<StepSuite, AWorkflow>>;

/** The rules an admin may put in a step. A person is never named here: rules survive people changing jobs. */
export const RULES_AN_ADMIN_MAY_SET: Rule[] = ['manager', 'managersManager', 'departmentHead', 'budgetOwner', 'finance', 'hr', 'chiefExecutive', 'admin'];

/**
 * THE STEP EVERY REQUEST TAKES WHEN NOTHING ELSE IS SET (Batch S, S2): the person's manager, else their manager's manager, else an
 * admin. Leave, time sheets, reviews written by the manager, and spending below every amount all read it here. Somebody with no
 * manager is named by the setup check (the-setup-check.ts), so an admin is never the answer in silence.
 */
export const THE_LINE_STEP: Rule[] = ['manager', 'managersManager', 'admin'];

export const MAX_STEPS = 5;
export const MAX_RULES_IN_A_STEP = 8;
export const MAX_DAYS = 30;

/** The refusals, in plain full sentences. */
export const WORKFLOWS_REFUSED = {
  onlyAnAdmin: 'Only an admin, or whoever looks after HR or finance, can set the approval steps.',
  /** A duty holder setting steps for a suite that is not theirs. */
  notYourSuite: 'Whoever looks after HR sets the approval steps for leave, and whoever looks after finance sets them for time sheets and spending. An admin sets them all.',
  badSteps: `Give between one and ${MAX_STEPS} steps, each a list of who decides, chosen from the person's manager, their manager's manager, the head of their team, whoever holds their team's budget, finance, HR, the chief executive and an admin.`,
  badDays: `Give the number of working days as a whole number from 1 to ${MAX_DAYS}, or nothing to never pass a request on.`,
  spendIsByAmount: 'Who approves a request to spend is set by amount, on the spending page. Only the days before a request is passed on are set here.',
};

/**
 * Steps as given, or null when any is not valid. `mayName`: a step may also name one person (`{ named }`), which only spending's
 * steps by amount do, because its settings ask "Who approves anything above that?" and name a person (Hafsah's plan of 2 November).
 */
export function stepsFrom(v: unknown, mayName = false): Step[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > MAX_STEPS) return null;
  const out: Step[] = [];
  const named = (r: any) => mayName && !!r && typeof r === 'object' && typeof r.named === 'string' && !!r.named.trim();
  for (const s of v) {
    if (!Array.isArray(s) || s.length < 1 || s.length > MAX_RULES_IN_A_STEP) return null;
    if (!s.every((r) => (typeof r === 'string' && (RULES_AN_ADMIN_MAY_SET as string[]).includes(r)) || named(r))) return null;
    const seen = new Set<string>();
    out.push((s as ARule[]).map((r) => (typeof r === 'object' ? { named: r.named.trim() } : r)).filter((r) => {
      const k = typeof r === 'object' ? `@${r.named}` : r;
      return seen.has(k) ? false : (seen.add(k), true);
    }));
  }
  return out;
}

const daysFrom = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_DAYS ? v : null);

/** What is kept, read with care: anything that is not a valid step or number is left out. */
export function workflowsFrom(answers: unknown): Workflows {
  const a = (answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {}) as Record<string, any>;
  const out: Workflows = {};
  for (const suite of STEP_SUITES) {
    const w = a[suite];
    if (!w || typeof w !== 'object' || Array.isArray(w)) continue;
    const kept: AWorkflow = {};
    /* Spending keeps only its days here: who approves it is its steps by amount, and nothing else (the-spending-rules.ts). */
    const steps = suite === 'spend' ? null : stepsFrom(w.steps);
    if (steps) kept.steps = steps;
    const days = daysFrom(w.escalateAfter);
    if (days) kept.escalateAfter = days;
    if (Object.keys(kept).length) out[suite] = kept;
  }
  return out;
}

/** The organisation's workflows as kept. Nothing kept reads as no workflow for any suite. */
export async function readWorkflows(prisma: PrismaService, organizationId: string): Promise<Workflows> {
  const row = await (prisma as any).organizationSuite
    ?.findUnique({ where: { organizationId_suite: { organizationId, suite: WORKFLOWS_ROW } }, select: { answers: true } })
    .catch(() => null);
  return workflowsFrom(row?.answers);
}

/** One suite's workflow, or undefined. */
export async function readWorkflow(prisma: PrismaService, organizationId: string, suite: StepSuite): Promise<AWorkflow | undefined> {
  return (await readWorkflows(prisma, organizationId))[suite];
}

/**
 * An admin's change, laid over what is kept. For each suite given, `steps` and `escalateAfter` given
 * as null are cleared, and left out are kept. Spending's steps are refused here: they are its steps by
 * amount, set through `setSpendRules`, so there is one place that says who approves a request to spend. Returns the workflows to keep, or
 * the refusal.
 */
export function changeWorkflows(kept: Workflows, input: unknown): { workflows: Workflows } | { refused: string } {
  const given = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const next: Workflows = JSON.parse(JSON.stringify(kept));
  for (const suite of STEP_SUITES) {
    const g = given[suite];
    if (g === undefined) continue;
    if (g === null) { delete next[suite]; continue; }
    if (typeof g !== 'object' || Array.isArray(g)) return { refused: WORKFLOWS_REFUSED.badSteps };
    const w: AWorkflow = { ...(next[suite] ?? {}) };
    if ((g.steps != null || g.stepsAbove != null) && suite === 'spend') return { refused: WORKFLOWS_REFUSED.spendIsByAmount };
    if (g.stepsAbove != null) return { refused: WORKFLOWS_REFUSED.badSteps };
    if (g.steps !== undefined) {
      if (g.steps === null) delete w.steps;
      else {
        const steps = stepsFrom(g.steps);
        if (!steps) return { refused: WORKFLOWS_REFUSED.badSteps };
        w.steps = steps;
      }
    }
    if (g.escalateAfter !== undefined) {
      if (g.escalateAfter === null) delete w.escalateAfter;
      else {
        const days = daysFrom(g.escalateAfter);
        if (!days) return { refused: WORKFLOWS_REFUSED.badDays };
        w.escalateAfter = days;
      }
    }
    if (Object.keys(w).length) next[suite] = w; else delete next[suite];
  }
  return { workflows: next };
}

// ------------------------------------------- in words -------------------------------------------

/** A rule, as an admin reads it in the said-back workflow. */
export const RULE_IN_WORDS: Record<Rule, string> = {
  manager: 'the person’s manager',
  managersManager: 'their manager’s manager',
  departmentHead: 'whoever heads their team',
  budgetOwner: 'whoever holds their team’s budget',
  finance: 'whoever looks after finance',
  hr: 'whoever looks after HR',
  chiefExecutive: 'the chief executive',
  admin: 'an admin',
};

const ruleSaid = (r: ARule) => (typeof r === 'object' ? 'the person named on the suite' : RULE_IN_WORDS[r]);
const aStepSaid = (s: Step) => [ruleSaid(s[0]), ...s.slice(1).map((r) => `or else ${ruleSaid(r)}`)].join(', ');

/** "goes first to the person’s manager, or else an admin, and then to whoever looks after finance, or else an admin" */
export function stepsSaid(steps: Step[]): string {
  if (steps.length === 1) return `goes to ${aStepSaid(steps[0])}`;
  return `goes first to ${aStepSaid(steps[0])}, ${steps.slice(1).map((s) => `and then to ${aStepSaid(s)}`).join(', ')}`;
}

const WHAT: Record<StepSuite, string> = { leave: 'A leave request', time: 'A week of hours', spend: 'A request to spend' };
const PLURAL: Record<StepSuite, string> = { leave: 'leave requests', time: 'hours', spend: 'requests to spend' };

/** The workflow of one suite said back to the admin, in full sentences. Spending's steps are its steps by amount, said where they are set. */
export function aWorkflowSaid(suite: StepSuite, steps: Step[], escalateAfter: number | undefined): string[] {
  const said: string[] = [];
  if (suite === 'spend') said.push('Who approves a request to spend is set by amount, on the spending page.');
  else {
    said.push(`${WHAT[suite]} ${stepsSaid(steps)}.`);
    if (steps.length > 1) said.push('Each approval sends it to the next step, and only the last step ends it. A decline ends it at any step.');
  }
  said.push(escalateAfter
    ? `If the person it waits for has not answered after ${escalateAfter} working ${escalateAfter === 1 ? 'day' : 'days'}, or is on approved leave that day, it goes to the next person on that step’s list.`
    : `Groundwork never passes ${PLURAL[suite]} on by itself. An admin can set a number of working days after which it does.`);
  return said;
}

/**
 * The person a request now waits for, as somebody else reads it: "Wairimu", "Omar in finance", "Grace,
 * the chief executive", "Joseph, who heads Sales", "an admin". "you" for the reader themselves.
 */
export async function whoInWords(prisma: PrismaService, who: WhoDecides, team: string | null, readerUserId?: string, cache?: Map<string, string>): Promise<string> {
  if (who.kind === 'admin') return 'an admin';
  if (readerUserId && who.userId === readerUserId) return 'you';
  const first = who.kind === 'manager' && who.firstName ? who.firstName : (await firstNamesOf(prisma, [who.userId], undefined, cache))[0] ?? '';
  if (!first) return who.rule === 'finance' ? 'whoever looks after finance' : 'the person who approves it';
  /* Standing in while the person the rule names is on leave: "Daniel, who is standing in for Wairimu". */
  if (who.kind === 'person' && who.standingInFor) {
    const away = (await firstNamesOf(prisma, [who.standingInFor], readerUserId, cache))[0];
    return away ? `${first}, who is standing in for ${away}` : first;
  }
  switch (who.rule) {
    case 'finance': return `${first} in finance`;
    case 'hr': return `${first} in HR`;
    case 'chiefExecutive': {
      /* Their own title where the directory has one ("Grace, the managing director"), not a duty's name (Batch S, round 2, T1). */
      const t = (await Promise.resolve((prisma as any).person?.findFirst?.({ where: { linkedUserId: who.userId, active: true }, select: { title: true } })).catch(() => null))?.title?.trim();
      return t ? `${first}, the ${/^[A-Z]{2,}/.test(t) ? t : `${t.charAt(0).toLowerCase()}${t.slice(1)}`}` : `${first}, the chief executive`;
    }
    case 'departmentHead': return team ? `${first}, who heads ${team}` : first;
    case 'budgetOwner': return team ? `${first}, who holds the ${team} budget` : first;
    default: return first;
  }
}

/** First names of sign-ins, in the order given, "you" for the reader. Never an address. */
export async function firstNamesOf(prisma: PrismaService, ids: string[], readerUserId?: string, cache?: Map<string, string>): Promise<string[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  /* A board asks for the same few approvers' names once for every request on it: a cache held for the one read asks the database once for each. */
  const wanted = cache ? unique.filter((id) => !cache.has(id)) : unique;
  const byId = cache ?? new Map<string, string>();
  if (wanted.length) {
    let us: unknown = [];
    try { us = (await (prisma as any).user?.findMany?.({ where: { id: { in: wanted } }, select: { id: true, firstName: true } })) ?? []; } catch { us = []; }
    for (const u of us as { id: string; firstName: string | null }[]) byId.set(u.id, u.firstName?.trim() || '');
    for (const id of wanted) if (!byId.has(id)) byId.set(id, '');
  }
  return unique.map((id) => (readerUserId && id === readerUserId ? 'you' : byId.get(id) || '')).filter(Boolean);
}

async function firstNameOf(prisma: PrismaService, userId: string): Promise<string> {
  return (await firstNamesOf(prisma, [userId]))[0] ?? '';
}
