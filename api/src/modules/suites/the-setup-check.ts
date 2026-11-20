import type { PrismaService } from '../prisma/prisma.service';
import { askNameOf } from '../assistant/ask-name';
import { readDuties, type Duties } from './who-holds-each-duty';
import { readWorkflows } from './the-approval-steps';
import { readLeaveRules } from './the-leave-rules';
import { readSpendRules } from './the-spending-rules';
import { theStepsFor, type ARule } from './who-may-decide';
import { thePeopleHere, type APersonHere } from './the-people-and-their-lines';

/**
 * THE SETUP CHECK (Batch S, S3, Hafsah 19 November 2026: "approvals that follow the role map, with the admin guided to set it up
 * when it's needed").
 *
 * One function says, for a suite, what is missing before its approvals follow the reporting lines, and the step that fixes it, in
 * plain sentences: the people with nobody set as their manager (by name, the first few, then how many more), the teams nobody
 * heads when a step goes to the head of a team, the jobs nobody holds when a step names one, and an only admin with nobody to
 * approve their own requests. The suite's card and board read it (`GET /suites/:key/setup`), and Ask reads the same sentences when
 * it guides an admin through setting the suite up (a-suite-set-up-by-talking.ts). Nothing here changes who decides: the approval
 * resolver (who-may-decide.ts) does that, and this only says where it would fall to an admin.
 */
export type ACheckedSuite = 'leave' | 'time' | 'spend' | 'reviews';
export const CHECKED_SUITES: ACheckedSuite[] = ['leave', 'time', 'spend', 'reviews'];

export interface TheSetupCheck {
  /** True when nothing is missing. */
  ready: boolean;
  /** What is missing and the step that fixes each, or one sentence saying it is ready. */
  said: string[];
  /** The people with nobody set as their manager, by sign-in, so Ask can offer to set them. */
  noManager: { userId: string; name: string }[];
}

const WHAT: Record<ACheckedSuite, string> = { leave: 'leave requests', time: 'hours', spend: 'requests to spend', reviews: 'reviews' };
const listed = (xs: string[], joiner = 'and') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${joiner} ${xs[xs.length - 1]}`);
/** "Amina Otieno, Brian Mwangi, Chidi Obi and 7 others". */
const aFewThenHowMany = (names: string[]) => (names.length > 4 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} others` : listed(names));
const DUTY_SAID: Record<'finance' | 'hr' | 'chiefExecutive', string> = { finance: 'looks after finance', hr: 'looks after HR', chiefExecutive: 'is the chief executive' };

/** What one organisation's suites need, read once and shared by every suite's check. */
export interface WhatTheCheckReads { people: APersonHere[]; duties: Duties; rules: Record<ACheckedSuite, ARule[]>; ask: string }

export async function readForTheCheck(prisma: PrismaService, organizationId: string): Promise<WhatTheCheckReads> {
  const [people, duties, workflows, leaveRules, spendRules, reviews, ask] = await Promise.all([
    thePeopleHere(prisma, organizationId),
    readDuties(prisma, organizationId).catch((): Duties => ({})),
    readWorkflows(prisma, organizationId).catch(() => ({})),
    readLeaveRules(prisma, organizationId).catch(() => ({})),
    readSpendRules(prisma, organizationId).catch(() => ({})),
    (prisma as any).organizationSuite?.findUnique?.({ where: { organizationId_suite: { organizationId, suite: 'reviews' } }, select: { answers: true } })?.catch?.(() => null),
    askNameOf(prisma as any, organizationId),
  ]);
  const writer = typeof (reviews as any)?.answers?.writer === 'string' ? (reviews as any).answers.writer : null;
  return {
    people, duties: duties as Duties, ask,
    rules: {
      leave: [...theStepsFor('leave', { workflow: (workflows as any).leave }).flat(), ...((leaveRules as any).thresholds ?? []).flatMap((t: any) => t.steps.flat())],
      time: theStepsFor('time', { workflow: (workflows as any).time }).flat(),
      spend: [...theStepsFor('spend', {}, 0).flat(), ...((spendRules as any).thresholds ?? []).flatMap((t: any) => t.steps.flat())],
      reviews: theStepsFor('reviews', { writer }).flat(),
    },
  };
}

/** THE ONE CHECK, for one suite, said to `readerUserId` ("you" when the only admin is the reader). */
export function theSetupCheck(suite: ACheckedSuite, read: WhatTheCheckReads, readerUserId: string | null): TheSetupCheck {
  const { people, duties, ask } = read;
  const rules = new Set(read.rules[suite].map((r) => (typeof r === 'object' ? 'named' : r)));
  const what = WHAT[suite];
  const said: string[] = [];
  const admins = people.filter((p) => p.appRole === 'ADMIN');

  /* People with nobody set as their manager. An admin with no manager is the top of the organisation, and goes to another admin. */
  const noManager = rules.has('manager') ? people.filter((p) => !p.managerUserId && p.appRole !== 'ADMIN' && p.name) : [];
  if (noManager.length) {
    const one = noManager.length === 1;
    const goes = suite === 'reviews' ? `so an admin writes ${one ? 'their review' : 'their reviews'}` : `so their ${what} go to an admin`;
    const example = aReportingLineExample(noManager[0], people);
    said.push(`${aFewThenHowMany(noManager.map((p) => p.name))} ${one ? 'has' : 'have'} nobody set as their manager, ${goes}.`);
    said.push(`To fix it, set who ${one ? 'they report' : 'each of them reports'} to on the People page, or tell ${ask}${example ? `, for example “${example}”` : ''}.`);
  }

  /* Teams nobody heads, and teams whose budget nobody holds, when a step goes to them. */
  const teams = [...new Set(people.map((p) => p.team).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b));
  if (rules.has('departmentHead')) {
    const unheaded = teams.filter((t) => !duties.departmentHeads?.[t]);
    if (unheaded.length) {
      said.push(`Nobody heads ${listed(unheaded, 'or')} yet, so the step that goes to the head of a team goes to an admin for the people in ${unheaded.length === 1 ? 'it' : 'them'}.`);
      said.push(`To fix it, name who heads each team under “Who looks after what” on the Suites page, or tell ${ask}, for example “${firstOf(people.find((p) => p.team === unheaded[0] && p.appRole !== 'MEMBER') ?? admins[0])} heads ${unheaded[0]}”.`);
    }
  }
  if (rules.has('budgetOwner')) {
    const unheld = teams.filter((t) => !duties.budgetOwners?.[t]);
    if (unheld.length) {
      said.push(`Nobody holds the budget of ${listed(unheld, 'or')} yet, so the step that goes to whoever holds a team’s budget goes to an admin for the people in ${unheld.length === 1 ? 'it' : 'them'}.`);
      said.push('To fix it, name who holds each team’s budget under “Who looks after what” on the Suites page.');
    }
  }
  for (const d of ['finance', 'hr', 'chiefExecutive'] as const) {
    if (rules.has(d) && !duties[d]) {
      said.push(`Nobody ${DUTY_SAID[d]} yet, so the step that goes to them goes to an admin. To fix it, name who ${DUTY_SAID[d]} under “Who looks after what” on the Suites page.`);
    }
  }

  /* The only admin, with nobody above them: nobody can approve their own requests. */
  if (suite !== 'reviews' && admins.length === 1 && !admins[0].managerUserId) {
    const a = admins[0];
    const you = a.userId === readerUserId;
    said.push(you
      ? `You are the only admin and nobody is set as your manager, so nobody can approve your own ${what}. To fix it, add a second admin on the People page, or set who you report to.`
      : `${a.name || 'Your only admin'} is the only admin and has nobody set as their manager, so nobody can approve ${a.firstName || 'their'}${a.firstName ? '’s' : ''} own ${what}. To fix it, add a second admin on the People page, or set who ${a.firstName || 'they'} ${a.firstName ? 'reports' : 'report'} to.`);
  }

  if (!said.length) {
    return { ready: true, noManager: [], said: [suite === 'reviews' && !rules.has('manager') ? 'An admin writes each review, so nothing more needs setting up.' : `Everybody has somebody to go to, so ${what} follow your reporting lines.`] };
  }
  return { ready: false, said, noManager: noManager.map((p) => ({ userId: p.userId, name: p.name })) };
}

const firstOf = (p: { firstName?: string; name?: string } | undefined) => p?.firstName || p?.name?.split(' ')[0] || 'Joseph';

/** "Amina reports to Joseph": the first person missing a manager, and a lead or admin who is not them. */
function aReportingLineExample(p: APersonHere, people: APersonHere[]): string | null {
  const above = people.find((x) => x.userId !== p.userId && x.appRole === 'LEAD') ?? people.find((x) => x.userId !== p.userId && x.appRole === 'ADMIN');
  if (!p.firstName || !above?.firstName) return null;
  return `${p.firstName} reports to ${above.firstName}`;
}

/** The check for one suite, read from the database. */
export async function whatIsMissing(prisma: PrismaService, organizationId: string, suite: ACheckedSuite, readerUserId: string | null): Promise<TheSetupCheck> {
  return theSetupCheck(suite, await readForTheCheck(prisma, organizationId), readerUserId);
}
