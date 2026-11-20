import type { Rule, Step } from '../suites/who-may-decide';
import { CURRENCIES, checkAnswers, suiteOf } from '../suites/the-ten-suites';
import { changeDuties, type Duties } from '../suites/who-holds-each-duty';
import { THE_LINE_STEP, changeWorkflows } from '../suites/the-approval-steps';
import { changeLeaveRules, moreThanWorkingDays } from '../suites/the-leave-rules';
import { changeSpendRules } from '../suites/the-spending-rules';
import { WEEKDAYS, changeTimeRules, type Weekday } from '../suites/the-time-sheet-rules';
import { changeForWhom, type ASetting, type ForWhom } from '../suites/who-a-rule-is-for';
import type { APersonHere } from '../suites/the-people-and-their-lines';
import { numbersForSomePeopleIn, theseNumbersSaid, type ANumberSaid } from './the-role-map-said-in-chat';
import { isAPolicyKey, policyQuestions, takeAPolicyAnswer, thePolicyAsRules, thePolicySaid, type LeavePolicyPlan } from './a-leave-policy-set-up-by-talking';

/**
 * SETTING A SUITE UP BY TALKING (decision 85; build step 14 of docs/suites-against-the-workflow-model.md).
 *
 * An admin says "Set up our employee leave process" to Ask Groundwork. Groundwork asks only what is
 * missing, one question at a time, in plain words, then says the whole thing back in plain sentences,
 * and sets nothing until the admin says yes. On the yes, AssistantService writes it through the same
 * SuitesService methods the routes use (`switch`, `setDuties`, `setWorkflows`, `setLeaveRules`,
 * `setTimeRules`), so there is no second way to set a suite up, the server checks again that the
 * person may (an admin for every suite; whoever holds the HR duty for leave and reviews; whoever holds
 * the finance duty for spending and time sheets, decision 85), and the rules history records it as
 * their change. Only an admin names who holds a job, so nobody else is asked who does.
 *
 * APPROVERS ARE NAMED BY RULE, NEVER BY PERSON (decision 85). An answer that names a person ("Wairimu")
 * is turned into the job they hold (who-holds-each-duty.ts): "Wairimu heads Sales" becomes "the head of
 * the person's team". When the person holds no job yet, Groundwork asks which one, and the yes also
 * records that they hold it. When a rule needs somebody nobody is named for yet ("Who looks after
 * HR?"), Groundwork asks who.
 *
 * NO MODEL READS OR WORDS ANY OF THIS, the same as the role interview (the-role-interview.ts). Every
 * answer is read by rules below, and anything the rules cannot read is asked again in plain words.
 * So there is no prompt and no prompt version. The said-back sentences are written here from the plan
 * that would be stored, and the reply after the yes is written by the same function from what the
 * services then return, so what the admin agreed to is what is kept.
 */

export const SUITE_SETUP_KIND = 'suite_setup';
export const SUITE_SETUP_CONFIRM_KIND = 'suite_setup_confirm';

export type SetUpSuite = 'leave' | 'spend' | 'time' | 'reviews';
export const SET_UP_SUITES: SetUpSuite[] = ['leave', 'spend', 'time', 'reviews'];
/** The suites that can be set up by talking so far. The others are answered as before, by the router's other lanes. */
export const OFFERED: SetUpSuite[] = ['leave', 'spend', 'time', 'reviews'];

/** The suite as the admin reads it in a sentence. */
export const SUITE_IN_WORDS: Record<SetUpSuite, string> = {
  leave: 'leave requests', spend: 'spending requests', time: 'time sheets', reviews: 'performance reviews',
};

// ---------------------------------------------- the trigger ----------------------------------------------

const VERB = String.raw`(?:set\s*up|setup|configure|put\s+in\s+place|establish|define|change\s+how|change\s+the\s+way)`;
const FILLER = String.raw`(?:\s+(?:our|the|a|an|how|company|company'?s|employee|employees'?|staff|team|annual|whole|new|we|do|handle|run|people|workers))*`;
const TAIL = String.raw`(?:\s+(?:request|requests|process|processes|policy|policies|rules|approval|approvals|system|suite|cycle|cycles|workflow|works?|work|for\s+(?:us|me|everyone|everybody|the\s+company|our\s+team|our\s+organisation|our\s+organization)))*\s*[.!?]*\s*$`;
const NOUNS: Record<SetUpSuite, string> = {
  leave: String.raw`(?:leave|time[\s-]?off|holidays?|annual\s+leave)`,
  spend: String.raw`(?:spending|spend|expenses?|expense\s+claims?|payment\s+requests?|purchase\s+requests?|payments?|budget\s+approvals?|requests?\s+to\s+spend)`,
  time: String.raw`(?:time[\s-]?sheets?|timesheets?|hours|time\s+tracking)`,
  /* One review ("set up a review") is not the process: the singular needs a word such as "process" after it. */
  reviews: String.raw`(?:(?:performance\s+)?reviews|(?:performance\s+)?appraisals|(?:performance\s+)?(?:review|appraisal)(?=\s+(?:process|processes|policy|policies|rules|system|cycle|cycles|suite)\b))`,
};

/* Details may follow the suite ("set up reviews every 6 months", Batch S round 2, T1): the opening is read for them (readOpening). */
const patternFor = (s: SetUpSuite) => new RegExp(String.raw`\b${VERB}${FILLER}\s+${NOUNS[s]}(?:${TAIL}|\s+(?:every|each|with|so|where|that|once|twice)\b.*$)`, 'i');
/** The patterns the router reads, one for each suite offered, in the order of `OFFERED`. */
export const SET_UP_A_SUITE_PATTERNS: RegExp[] = OFFERED.map(patternFor);

/** Which suite an admin asks to set up, or null. Never a check-in, a session or an objective. */
export function asksToSetUpASuite(message: string): SetUpSuite | null {
  const t = (message ?? '').trim();
  if (!t || /\bcheck[\s-]?ins?\b|\bsessions?\b|\bobjectives?\b|\bgoals?\b|\btargets?\b/i.test(t)) return null;
  const i = SET_UP_A_SUITE_PATTERNS.findIndex((p) => p.test(t));
  return i < 0 ? null : OFFERED[i];
}

// ---------------------------------------------- what is known ----------------------------------------------

export interface APerson { id: string; name: string; team: string | null }

/** What the conversation knows about the organisation, read through SuitesService as the admin. */
export interface WhatIsKnown {
  people: APerson[];
  teams: string[];
  /** Who holds each duty today. */
  duties: Duties;
  /** The admin who is setting it up. */
  me: string;
  /** The suite's own answers today, or empty. */
  answers: Record<string, unknown>;
  /** Whether the suite is switched on today. */
  on: boolean;
  /**
   * Whether the person setting it up may name who holds a job. Only an admin may (who holds each duty
   * stays admin-only); whoever holds the HR or finance duty sets up their suites with the jobs as they
   * are. Left out, an admin.
   */
  mayNameJobs?: boolean;
  /** Everybody here with their job title, team and app role, for numbers set for some people (who-a-rule-is-for.ts). */
  here?: Pick<APersonHere, 'userId' | 'name' | 'firstName' | 'title' | 'team' | 'appRole'>[];
  /** The numbers already set for some people. */
  forWhom?: ForWhom;
  /** The job titles here each group named in the answer means, as the model read it (ask-understands-with-the-model.ts). */
  titlesMeant?: Record<string, string[]>;
  /** Leave: the policy as stored today (a-leave-policy-set-up-by-talking.ts), so nothing already set is asked again. */
  leavePolicy?: LeavePolicyPlan;
}

/** The number each suite asks that can differ for some people (Batch S, S1). Reviews have none. */
export const THE_SETTING_OF: Partial<Record<SetUpSuite, ASetting>> = { leave: 'leave.days', time: 'time.hoursAWeek', spend: 'spend.limit' };

/** What the admin has said so far, which is what would be stored. */
export interface Plan {
  suite: SetUpSuite;
  /** Leave: days a year. */
  days?: number;
  /** Who approves, step by step. For spending, up to the limit. Each step is rules tried in order. */
  steps?: Rule[][];
  /** Spending: the steps above the limit. */
  stepsAbove?: Rule[][];
  /** The "anybody after them?" question has been answered. */
  after?: boolean;
  /** Working days before a request is passed on, or null when it waits. */
  escalateAfter?: number | null;
  /** Leave: HR sees every request, each approved one, or none. */
  tellHr?: 'every' | 'approved' | null;
  /**
   * Leave by length (the-leave-rules.ts): leave longer than `above` working days goes to other people.
   * With `also`, `add` comes after the steps every leave request takes ("the head of their team also
   * approves"); without it, `add` is the whole of the steps for longer leave. Kept as a threshold of
   * the leave rules on the yes.
   */
  longer?: { above?: number; add?: Rule[][]; also: boolean } | null;
  /** Spending. */
  currency?: string;
  limit?: number;
  /** Time sheets. */
  clients?: string[];
  hoursAWeek?: number | null;
  cutOff?: { day: Weekday; time: string } | null;
  /** Reviews: the suite's own choices. */
  every?: 'Every 6 months' | 'Every 12 months';
  writer?: 'Their manager' | 'An admin';
  /** The numbers set for some people: days of leave, hours a week, or how much a manager approves on their own. Null when they said nobody. */
  forSome?: ANumberSaid[] | null;
  /** Jobs the admin named in this conversation. Kept only on the yes. */
  duties: Duties;
  /** Jobs the admin said nobody holds yet: "hr", "departmentHeads:Sales". */
  skipped: string[];
  /** The question waiting for an answer. */
  asking?: string | null;
  /** Answers the model read in what the admin said or pasted, kept until their question comes, so nothing said is asked again (a-policy-read-into-the-set-up.ts). */
  heard?: Record<string, string>;
  /** A person named for a rule who holds no job yet: their id, and the answer to read again once their job is known. */
  pending?: { personId: string; key: string; message: string } | null;
  /** The job the admin said a person approves as, when they hold more than one. */
  chosen?: Record<string, Rule>;
  /** Leave: the policy said so far: types of leave, the working week, holidays, offices, how annual leave builds up. */
  policy?: LeavePolicyPlan;
  /** Questions a written policy did not answer, passed over only while the model's reading is applied; never kept. */
  passed?: string[];
}

export function startPlan(suite: SetUpSuite, message: string, known: WhatIsKnown): Plan {
  const plan: Plan = { suite, duties: {}, skipped: [] };
  const a = known.answers ?? {};
  /* What is already stored for the suite's own questions is kept, and not asked again. */
  if (suite === 'leave' && typeof a.days === 'number') plan.days = a.days;
  if (suite === 'leave' && known.leavePolicy) plan.policy = JSON.parse(JSON.stringify(known.leavePolicy));
  if (suite === 'spend' && typeof a.currency === 'string') plan.currency = a.currency;
  if (suite === 'spend' && typeof a.limit === 'number') plan.limit = a.limit;
  if (suite === 'time' && Array.isArray(a.clients) && a.clients.length) plan.clients = a.clients.filter((c): c is string => typeof c === 'string');
  /* Numbers already set for some people are kept, said back, and not asked again. */
  const setting = THE_SETTING_OF[suite];
  const kept = setting ? known.forWhom?.[setting] ?? [] : [];
  if (setting && kept.length) plan.forSome = kept.map((e) => ({ setting, who: e.who, value: e.value }));
  /* And what the opening sentence already says. */
  return readOpening(plan, message, known);
}

// ---------------------------------------------- reading words ----------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  'twenty-one': 21, 'twenty one': 21, 'twenty-two': 22, 'twenty two': 22, 'twenty-five': 25, 'twenty five': 25,
  thirty: 30, forty: 40,
};
const IN_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => (n >= 0 && n <= 10 ? IN_WORDS[n] : String(n));
/** "ten working days", "one working day". */
const upToWorkingDays = (n: number) => `${inWords(n)} working ${n === 1 ? 'day' : 'days'}`;

/** The first whole number in the words, written in figures or as a word, or null. */
export function aNumberIn(t: string): number | null {
  const figures = /(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|m|million)?\b/i.exec(t);
  if (figures) {
    let n = Number(figures[1].replace(/,/g, ''));
    const unit = (figures[2] ?? '').toLowerCase();
    if (unit === 'k' || unit === 'thousand') n *= 1000;
    if (unit === 'm' || unit === 'million') n *= 1_000_000;
    return Number.isFinite(n) ? n : null;
  }
  const words = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length);
  for (const w of words) if (new RegExp(String.raw`\b${w}\b`, 'i').test(t)) return NUMBER_WORDS[w];
  return null;
}

const YES_LIKE = /^(?:y|yes|yep|yeah|yup|sure|ok|okay|correct|of course|they do|it does|please|all|every|always|definitely)\b/i;
const NO_LIKE = /^(?:n|no|nope|nah|none|nobody|no one|not really|they don'?t|it doesn'?t|never|nothing)\b/i;
const NOBODY = /^(?:nobody|no one|none|not yet|nobody yet|no one yet|skip|leave it|not sure|i don'?t know|nobody else|skip the rest|none of them)\b/i;
const SKIP_THE_REST = /\b(?:the rest|nobody else|no one else|none of the others|skip (?:them|all))\b/i;
export const STOP = /^(?:stop|cancel|never ?mind|forget it|not now|leave it|quit|abandon)\b[.!]?$/i;

/** The jobs a rule can name, read from the admin's words, longest first so "team manager" is not "manager". */
const RULE_WORDS: [Rule, RegExp][] = [
  ['departmentHead', /\b(?:department|dept|team|division|unit)\s+(?:heads?|leads?|leaders?|directors?|managers?)\b|\bheads?\s+of\s+(?:the\s+|their\s+|his\s+|her\s+|each\s+|that\s+)?(?:person'?s\s+)?(?:department|team|division|unit)s?\b|\bhods?\b/gi],
  ['budgetOwner', /\bbudget\s+(?:owners?|holders?)\b|\b(?:holds?|owns?)\s+(?:the\s+|their\s+)?(?:team'?s\s+)?budget\b|\bwhoever\s+holds\s+the\s+budget\b/gi],
  ['chiefExecutive', /\bchief\s+executive\b|\bceo\b|\bmanaging\s+director\b|\bfounder\b/gi],
  ['finance', /\bfinance\b|\bcfo\b|\baccounts\b|\bfinancial\s+controller\b/gi],
  ['hr', /\bhr\b|\bhuman\s+resources\b|\bpeople\s+team\b/gi],
  ['managersManager', /\b(?:their\s+|the\s+)?(?:manager|boss|supervisor)(?:'s|’s)\s+(?:manager|boss|supervisor)\b/gi],
  ['manager', /\b(?:line\s+|direct\s+)?managers?(?:'s|’s)?\b|\bboss\b|\bsupervisors?\b/gi],
  ['admin', /\badmins?\b|\badministrators?\b/gi],
];

type AToken = { at: number; end: number } & ({ rule: Rule } | { person: string });

/** The people a name in the words could be: a full name first, then a first name, then a last name. Several means it is unclear. */
function peopleNamed(t: string, people: APerson[]): { at: number; end: number; ids: string[] }[] {
  const out: { at: number; end: number; ids: string[] }[] = [];
  const taken: [number, number][] = [];
  const free = (a: number, b: number) => !taken.some(([x, y]) => a < y && x < b);
  const find = (word: (p: APerson) => string | null) => {
    const by = new Map<string, { at: number; end: number; ids: string[] }>();
    for (const p of people) {
      const w = word(p);
      if (!w || w.length < 2) continue;
      const re = new RegExp(String.raw`\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(t))) {
        if (!free(m.index, m.index + m[0].length)) continue;
        const k = `${m.index}:${m[0].length}`;
        const e = by.get(k) ?? { at: m.index, end: m.index + m[0].length, ids: [] };
        if (!e.ids.includes(p.id)) e.ids.push(p.id);
        by.set(k, e);
      }
    }
    for (const e of by.values()) { out.push(e); taken.push([e.at, e.end]); }
  };
  find((p) => p.name);
  find((p) => p.name.split(/\s+/)[0] ?? null);
  find((p) => (p.name.split(/\s+/).length > 1 ? p.name.split(/\s+/).slice(-1)[0] : null));
  return out.sort((a, b) => a.at - b.at);
}

/** The rules and people in the words, in the order they were said. */
function tokensIn(t: string, people: APerson[]): AToken[] | { unclear: string[] } {
  const found: AToken[] = [];
  const taken: [number, number][] = [];
  for (const [rule, re] of RULE_WORDS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const a = m.index, b = m.index + m[0].length;
      if (taken.some(([x, y]) => a < y && x < b)) continue;
      taken.push([a, b]);
      found.push({ at: a, end: b, rule });
    }
  }
  for (const n of peopleNamed(t, people)) {
    if (taken.some(([x, y]) => n.at < y && x < n.end)) continue;
    if (n.ids.length > 1) return { unclear: n.ids };
    found.push({ at: n.at, end: n.end, person: n.ids[0] });
  }
  return found.sort((x, y) => x.at - y.at);
}

/** "me", "I do", "myself" is the admin who is talking. */
const ME = /^(?:me|i do|i will|myself|i'?ll do it|that'?s me|it'?s me)\b/i;

/** The one person an answer names, or why it does not. */
function onePersonIn(t: string, known: WhatIsKnown): { id: string } | { unclear: string[] } | null {
  if (ME.test(t.trim())) return { id: known.me };
  const named = peopleNamed(t, known.people);
  if (!named.length) return null;
  if (named[0].ids.length > 1) return { unclear: named[0].ids };
  return { id: named[0].ids[0] };
}

const first = (known: WhatIsKnown, id: string) => known.people.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? 'somebody';
/** Whether a job is held by the person reading, who is "you" in every sentence, never their own name. */
const isMe = (known: WhatIsKnown, id: string | undefined) => !!id && id === known.me;
/** The verb that agrees with who is said: "you have", "Omar has". */
const agree = (who: string, forYou: string, forOthers: string) => (who === 'you' ? forYou : forOthers);
const full = (known: WhatIsKnown, id: string) => known.people.find((p) => p.id === id)?.name ?? 'somebody';

/** "A or B", "A, B or C", for people. */
const orList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The jobs as held after this conversation: today's, with what the admin said laid over. */
export function dutiesNow(plan: Plan, known: WhatIsKnown): Duties {
  const d: Duties = JSON.parse(JSON.stringify(known.duties ?? {}));
  for (const k of ['finance', 'hr', 'chiefExecutive'] as const) if (plan.duties[k]) d[k] = plan.duties[k];
  for (const k of ['budgetOwners', 'departmentHeads'] as const) if (plan.duties[k]) d[k] = { ...(d[k] ?? {}), ...plan.duties[k] };
  return d;
}

/** Every job one person holds, as rules, with the team for a team job. */
function jobsOf(id: string, d: Duties): { rule: Rule; team?: string }[] {
  const out: { rule: Rule; team?: string }[] = [];
  if (d.hr === id) out.push({ rule: 'hr' });
  if (d.finance === id) out.push({ rule: 'finance' });
  if (d.chiefExecutive === id) out.push({ rule: 'chiefExecutive' });
  for (const [team, who] of Object.entries(d.departmentHeads ?? {})) if (who === id) out.push({ rule: 'departmentHead', team });
  for (const [team, who] of Object.entries(d.budgetOwners ?? {})) if (who === id) out.push({ rule: 'budgetOwner', team });
  /* One person may head two teams: it is still one rule. */
  return out.filter((j, i) => out.findIndex((x) => x.rule === j.rule) === i);
}

const JOB_NAMES: Record<Rule, string> = {
  manager: 'is their manager', managersManager: 'is their manager’s manager', departmentHead: 'heads a team', budgetOwner: 'holds a team’s budget', finance: 'looks after finance',
  hr: 'looks after HR', chiefExecutive: 'is the chief executive', admin: 'is an admin',
};
/** The same jobs, said to the person who holds them. */
const YOUR_JOB_NAMES: Record<Rule, string> = {
  manager: 'are their manager', managersManager: 'are their manager’s manager', departmentHead: 'head a team', budgetOwner: 'hold a team’s budget', finance: 'look after finance',
  hr: 'look after HR', chiefExecutive: 'are the chief executive', admin: 'are an admin',
};

/**
 * Rules from an answer, as steps. Words joined by "or", "or else", "otherwise" or "if there is none"
 * are one step tried in order; anything else ("then", "and", "after that") is the next step. Every
 * step ends with an admin, so somebody can always decide, as the suites have always done. A person
 * named is turned into the job they hold; when that cannot be done, why is said.
 */
type Read<T> = { ok: T } | { again: string } | { whichJob: string };

function stepsFrom(t: string, plan: Plan, known: WhatIsKnown): Read<Rule[][]> {
  const tokens = tokensIn(t, known.people);
  if ('unclear' in tokens) return { again: `Do you mean ${orList(tokens.unclear.map((id) => full(known, id)))}?` };
  if (!tokens.length) return { again: WHO_I_CAN_SET };
  const d = dutiesNow(plan, known);
  const steps: Rule[][] = [];
  let prevEnd = -1;
  for (const tok of tokens) {
    let rule: Rule;
    if ('person' in tok) {
      const jobs = jobsOf(tok.person, d);
      const chosen = plan.chosen?.[tok.person];
      if (chosen && jobs.some((j) => j.rule === chosen)) rule = chosen;
      else if (!jobs.length && known.mayNameJobs === false) return { again: ONLY_AN_ADMIN_NAMES_JOBS(first(known, tok.person)) };
      else if (jobs.length !== 1) return { whichJob: tok.person };
      else rule = jobs[0].rule;
    } else rule = tok.rule;
    const between = prevEnd < 0 ? '' : t.slice(prevEnd, tok.at);
    const sameStep = steps.length > 0 && /\bor\b|\botherwise\b|\belse\b|\binstead\b|\bif\s+(?:there\s+is|they\s+have)\s+(?:no|none)\b|\bif\s+not\b|\bwhen\s+there\s+is\s+none\b/i.test(between);
    if (sameStep) steps[steps.length - 1].push(rule); else steps.push([rule]);
    prevEnd = tok.end;
  }
  return { ok: steps.map(withAnAdminLast) };
}

const withAnAdminLast = (s: Rule[]): Rule[] => {
  const u = [...new Set(s)];
  return u[u.length - 1] === 'admin' ? u : [...u.filter((r) => r !== 'admin'), 'admin'];
};

const WHO_I_CAN_SET =
  'I did not catch who that is. You can say, for example, “the person’s manager”, “the head of their team”, “HR”, “finance”, “the chief executive”, “an admin”, or a person’s name.';

/** What is asked when a person was named who holds no job, or more than one. */
function whichJobQuestion(id: string, plan: Plan, known: WhatIsKnown): string {
  const n = first(known, id);
  const jobs = jobsOf(id, dutiesNow(plan, known));
  if (isMe(known, id)) {
    /* The person reading named themselves: they are "you". */
    if (jobs.length > 1) {
      return `You ${andList(jobs.map((j) => (j.team ? (j.rule === 'departmentHead' ? `head ${j.team}` : `hold the ${j.team} budget`) : YOUR_JOB_NAMES[j.rule])))}. Which of these are you approving it as? I set who approves by their job, so it keeps working when people change jobs.`;
    }
    if (known.mayNameJobs === false) return ONLY_AN_ADMIN_NAMES_JOBS(n);
    return 'I set who approves by their job, not by name, so it keeps working when people change jobs. Which job do you do here? For example, do you head a team, hold a team’s budget, look after HR, look after finance, or are you the chief executive?';
  }
  if (jobs.length > 1) {
    return `${n} ${andList(jobs.map((j) => (j.team ? (j.rule === 'departmentHead' ? `heads ${j.team}` : `holds the ${j.team} budget`) : JOB_NAMES[j.rule])))}. Which of these is ${n} approving it as? I set who approves by their job, so it keeps working when people change jobs.`;
  }
  if (known.mayNameJobs === false) return ONLY_AN_ADMIN_NAMES_JOBS(n);
  return `I set who approves by their job, not by name, so it keeps working when people change jobs. Which job does ${n} do here? For example, does ${n} head a team, hold a team’s budget, look after HR, look after finance, or is ${n} the chief executive?`;
}

/** Said to whoever holds the HR or finance duty when they name a person who holds no job yet. */
const ONLY_AN_ADMIN_NAMES_JOBS = (n: string) =>
  `I set who approves by their job, not by name, so it keeps working when people change jobs. ${n} holds no job in Groundwork yet, and only an admin can say who holds each job. Who should approve it instead? For example, “the person’s manager”, “the head of their team”, “HR”, “finance” or “an admin”.`;

/** The job named for a person, recorded in the plan. The team is the one named, or else the person's own. */
function takeAJob(id: string, t: string, plan: Plan, known: WhatIsKnown): Read<Plan> {
  const tokens = tokensIn(t, known.people);
  const rule = ('unclear' in tokens ? null : (tokens.find((x) => 'rule' in x && x.rule !== 'manager' && x.rule !== 'admin') as { rule: Rule } | undefined)?.rule ?? null)
    ?? (/\bbudget\b/i.test(t) ? 'budgetOwner' : /\b(?:heads?|leads?|runs)\b/i.test(t) ? 'departmentHead' : null);
  if (!rule) return { again: whichJobQuestion(id, plan, known) };
  const next: Plan = JSON.parse(JSON.stringify(plan));
  next.chosen = { ...(next.chosen ?? {}), [id]: rule };
  if (known.mayNameJobs === false) {
    /* Only an admin names who holds a job: somebody else chooses among the jobs the person already holds. */
    return jobsOf(id, dutiesNow(plan, known)).some((j) => j.rule === rule) ? { ok: next } : { again: whichJobQuestion(id, plan, known) };
  }
  if (rule === 'departmentHead' || rule === 'budgetOwner') {
    const team = known.teams.find((x) => new RegExp(String.raw`\b${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i').test(t)) ?? known.people.find((p) => p.id === id)?.team ?? null;
    if (!team || !known.teams.includes(team)) return { again: `Which team? The teams in your staff directory are ${andList(known.teams)}.` };
    const key = rule === 'departmentHead' ? 'departmentHeads' : 'budgetOwners';
    next.duties[key] = { ...(next.duties[key] ?? {}), [team]: id };
  } else {
    next.duties[rule as 'hr' | 'finance' | 'chiefExecutive'] = id;
  }
  return { ok: next };
}

/** Statements of who holds a job, anywhere in the words: "Omar looks after finance", "Joseph heads Operations". */
function jobsSaidIn(t: string, plan: Plan, known: WhatIsKnown): Plan | null {
  /* Only an admin names who holds a job. */
  if (known.mayNameJobs === false) return null;
  let next: Plan | null = null;
  const said = (p: Plan) => (next = p);
  for (const n of peopleNamed(t, known.people)) {
    if (n.ids.length !== 1) continue;
    const rest = t.slice(n.end, n.end + 60);
    const id = n.ids[0];
    const base = next ?? plan;
    if (/^\s+(?:heads|is\s+(?:the\s+)?head\s+of|leads|runs)\s+/i.test(rest)) {
      const team = known.teams.find((x) => new RegExp(String.raw`^\s+(?:heads|is\s+(?:the\s+)?head\s+of|leads|runs)\s+(?:the\s+)?${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i').test(rest));
      if (team) said({ ...base, duties: { ...base.duties, departmentHeads: { ...(base.duties.departmentHeads ?? {}), [team]: id } } });
    } else if (/^\s+holds\s+the\s+/i.test(rest)) {
      const team = known.teams.find((x) => new RegExp(String.raw`^\s+holds\s+the\s+${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s+budget\b`, 'i').test(rest));
      if (team) said({ ...base, duties: { ...base.duties, budgetOwners: { ...(base.duties.budgetOwners ?? {}), [team]: id } } });
    } else if (/^\s+(?:looks\s+after|handles|runs|is\s+in)\s+(?:the\s+)?(?:hr|human\s+resources)\b/i.test(rest)) said({ ...base, duties: { ...base.duties, hr: id } });
    else if (/^\s+(?:looks\s+after|handles|runs|is\s+in)\s+(?:the\s+)?(?:finance|accounts)\b/i.test(rest)) said({ ...base, duties: { ...base.duties, finance: id } });
    else if (/^\s+is\s+(?:the\s+|our\s+)?(?:chief\s+executive|ceo)\b/i.test(rest)) said({ ...base, duties: { ...base.duties, chiefExecutive: id } });
  }
  return next;
}

/** "Friday at 17:00", "Friday 5pm". */
function aCutOffIn(t: string): { day: Weekday; time: string } | 'no time' | null {
  const day = WEEKDAYS.find((d) => new RegExp(String.raw`\b${d}s?\b`, 'i').test(t));
  if (!day) return null;
  const m = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i.exec(t.replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/gi, ''));
  if (!m) return 'no time';
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = (m[3] ?? '').toLowerCase().replace(/\./g, '');
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return 'no time';
  return { day, time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}` };
}

/** "more than 10 working days", "longer than two weeks' worth of days", "over ten days", "longer leave". */
const LONGER_LEAVE = /\b(?:longer|more)\s+than\s+[\w-]+\s+(?:working\s+)?days?\b|\bover\s+[\w-]+\s+(?:working\s+)?days?\b|\blong(?:er)?\s+leave\b/i;
const LENGTH_IN = /\b(?:longer|more)\s+than\s+([\w-]+)\s+(?:working\s+)?days?\b|\bover\s+([\w-]+)\s+(?:working\s+)?days?\b/i;
const ALSO = /\balso\b|\btoo\b|\bas\s+well\b|\bafter\b|\bthen\b|\bas\s+a\s+second\b/i;

/** Leave by length said in an answer: the working days, if said, and who approves longer leave, if said. */
interface LongerSaid { above?: number; add?: Rule[][]; also: boolean; rest: string }

/**
 * Reads "If it's more than 10 working days, the department head also approves" into a length and the
 * people for longer leave. The part of the words about longer leave is the clause with the length in
 * it, with the next clause (or else the one before) when the length's own clause names nobody. What is
 * left (`rest`) is about every leave request. `alsoByDefault` is true when the question was who approves
 * after the first person, so whoever is named comes after them.
 */
function longerLeaveIn(t: string, plan: Plan, known: WhatIsKnown, alsoByDefault: boolean): Read<LongerSaid> | null {
  if (!LONGER_LEAVE.test(t)) return null;
  const clauses = t.split(/\s*(?:[,;]|\.\s|\bbut\b|\band\s+(?=if\b|when\b|for\b))\s*/i).filter((x) => x.trim());
  const at = clauses.findIndex((c) => LONGER_LEAVE.test(c));
  const names = (c: string) => tokensHaveARule(c, known);
  let take = [at];
  if (!names(clauses[at])) {
    if (at + 1 < clauses.length && names(clauses[at + 1])) take = [at, at + 1];
    else if (at > 0 && names(clauses[at - 1])) take = [at - 1, at];
  }
  const about = take.map((i) => clauses[i]).join(' ');
  const rest = clauses.filter((_, i) => !take.includes(i)).join(', ');
  const m = LENGTH_IN.exec(about);
  /* "more than 10 working days"; or, about longer leave already named, "make it 15 working days for longer leave". */
  const n = m ? aNumberIn(m[1] ?? m[2] ?? '') : /\bdays?\b/i.test(about) ? aNumberIn(about) : null;
  const above = n != null && Number.isInteger(n) && n >= 1 && n <= 365 ? n : undefined;
  const also = alsoByDefault || ALSO.test(about);
  if (!names(about)) return { ok: { above, also, rest } };
  const s = stepsFrom(about.replace(LENGTH_IN, ' '), plan, known);
  if (!('ok' in s)) return s;
  return { ok: { above, add: s.ok, also, rest } };
}

/** The steps longer leave takes, from what was said: after every leave request's steps, or in place of them. */
export function longerSteps(plan: Plan): Rule[][] | null {
  if (!plan.longer?.above || !plan.longer.add?.length) return null;
  return plan.longer.also ? [...(plan.steps ?? [[...THE_LINE_STEP]]), ...plan.longer.add] : plan.longer.add;
}

// ---------------------------------------------- the questions ----------------------------------------------

/** The rule as the admin reads it, with the holder's name where there is one, or "you" when the holder is the person reading. */
export function ruleSaid(r: Rule, d: Duties, known: WhatIsKnown): string {
  if ((r === 'finance' || r === 'hr' || r === 'chiefExecutive') && isMe(known, d[r])) return 'you';
  switch (r) {
    case 'manager': return 'the person’s manager';
    case 'managersManager': return 'their manager’s manager';
    case 'departmentHead': return 'the head of the person’s team';
    case 'budgetOwner': return 'whoever holds the team’s budget';
    case 'finance': return d.finance ? `${first(known, d.finance)}, who looks after finance` : 'whoever looks after finance';
    case 'hr': return d.hr ? `${first(known, d.hr)}, who looks after HR` : 'whoever looks after HR';
    case 'chiefExecutive': return d.chiefExecutive ? `${first(known, d.chiefExecutive)}, ${theirTitleSaid(known, d.chiefExecutive) ?? 'the chief executive'}` : 'the chief executive';
    default: return 'an admin';
  }
}

/** "the managing director": the title a person holds here, as a sentence says it, or null (round 2, T1: Grace is not "the chief executive"). */
function theirTitleSaid(known: WhatIsKnown, id: string): string | null {
  const t = known.here?.find((p) => p.userId === id)?.title?.trim();
  return t ? `the ${/^[A-Z]{2,}/.test(t) ? t : `${t.charAt(0).toLowerCase()}${t.slice(1)}`}` : null;
}

/** The rule said again, shortly: "the manager", "Omar", "an admin", or "you" when the holder is the person reading. */
function ruleShort(r: Rule, d: Duties, known: WhatIsKnown): string {
  if ((r === 'finance' || r === 'hr' || r === 'chiefExecutive') && isMe(known, d[r])) return 'you';
  switch (r) {
    case 'manager': return 'the manager';
    case 'managersManager': return 'the manager’s manager';
    case 'departmentHead': return 'the head of the team';
    case 'budgetOwner': return 'whoever holds the budget';
    case 'finance': return d.finance ? first(known, d.finance) : 'finance';
    case 'hr': return d.hr ? first(known, d.hr) : 'HR';
    case 'chiefExecutive': return d.chiefExecutive ? first(known, d.chiefExecutive) : 'the chief executive';
    default: return 'an admin';
  }
}

/** When a rule names nobody: "the person has no manager in Groundwork". */
function nobodyFor(r: Rule): string {
  switch (r) {
    case 'manager': return 'the person has no manager in Groundwork';
    case 'managersManager': return 'the person’s manager has no manager in Groundwork';
    case 'departmentHead': return 'nobody is named as the head of the person’s team';
    case 'budgetOwner': return 'nobody is named as holding the team’s budget';
    case 'finance': return 'nobody is named to look after finance';
    case 'hr': return 'nobody is named to look after HR';
    case 'chiefExecutive': return 'nobody is named as the chief executive';
    default: return 'there is no admin';
  }
}

const money = (currency: string | undefined, n: number) => `${currency ? `${currency} ` : ''}${n.toLocaleString('en-GB')}`;

/** Every rule the plan uses that needs somebody named. */
function rulesThatNeedSomebody(plan: Plan): Rule[] {
  const rs = [...(plan.steps ?? []).flat(), ...(plan.stepsAbove ?? []).flat(), ...(plan.longer?.add ?? []).flat()];
  if (plan.suite === 'leave' && plan.tellHr) rs.push('hr');
  return [...new Set(rs)].filter((r) => r !== 'manager' && r !== 'managersManager' && r !== 'admin');
}

export interface AQuestion { key: string; ask: string }

/** Asked once the number for everyone is known: whether anybody has a different one (Batch S, S1). */
export const FOR_SOME_ASKS: Record<'leave' | 'time' | 'spend', string> = {
  leave: 'Does anybody get a different number of days, by job title, team or person? For example, “managers get 25 days, field agents 18”. You can say no.',
  time: 'Is anybody asked for a different number of hours a week, by job title, team or person? For example, “people in Sales give 45 hours”. You can say no.',
  spend: 'Does anybody’s manager approve a different amount on their own, by job title, team or person? For example, “field agents’ managers approve up to 5,000”. You can say no.',
};

const AN_EXAMPLE: Partial<Record<Rule, string>> = { departmentHead: 'the head of the person’s team', hr: 'HR', finance: 'finance' };

/**
 * The example in "Does anybody approve it after the manager, for example finance?": the first job, in
 * the suite's own order, that does not already approve it, so the question never offers the person who
 * approves first. None left, no example.
 */
function anExampleAfter(plan: Plan, jobs: Rule[]): string {
  const already = new Set((plan.steps ?? []).flat());
  const job = jobs.find((r) => !already.has(r));
  return job ? `, for example ${AN_EXAMPLE[job]}` : '';
}

/** The next thing that is missing, or null when everything is known. One at a time, in this order. */
export function nextQuestion(plan: Plan, known: WhatIsKnown): AQuestion | null {
  if (plan.pending) return { key: 'job', ask: whichJobQuestion(plan.pending.personId, plan, known) };
  const d = dutiesNow(plan, known);
  const firstSaid = plan.steps?.[0]?.[0] ? ruleShort(plan.steps[0][0], d, known) : 'the first person';
  switch (plan.suite) {
    case 'leave':
      if (plan.days === undefined) return { key: 'days', ask: 'How many days of leave does each person have in a year?' };
      if (plan.forSome === undefined && known.here?.length && !plan.passed?.includes('forSome')) return { key: 'forSome', ask: FOR_SOME_ASKS.leave };
      if (!plan.steps) return { key: 'approver', ask: plan.longer?.above ? `Who approves leave of up to ${upToWorkingDays(plan.longer.above)}?` : 'Who approves annual leave?' };
      if (!plan.after) return { key: 'after', ask: `Does anybody approve it after ${firstSaid}${anExampleAfter(plan, ['departmentHead', 'hr'])}? You can say no.` };
      if (plan.longer && !plan.longer.above) return { key: 'longerDays', ask: 'How long does leave need to be for that? For example, more than 10 working days.' };
      if (plan.longer?.above && !plan.longer.add?.length) {
        return { key: 'longerWho', ask: plan.longer.also
          ? `Who approves leave of ${moreThanWorkingDays(plan.longer.above)} after ${firstSaid}?`
          : `Who approves leave of ${moreThanWorkingDays(plan.longer.above)}?` };
      }
      if (plan.tellHr === undefined) return { key: 'tellHr', ask: 'Does HR need to see all requests?' };
      if (plan.escalateAfter === undefined) return { key: 'escalate', ask: `What happens if ${firstSaid} ${agree(firstSaid, "don't", "doesn't")} respond within two working days?` };
      {
        /* The leave policy (Hafsah, 20 November 2026): the types of leave and each one's details, then the calendar, the holidays and offices, and how annual leave builds up. */
        const pq = policyQuestions(plan.policy, known).find((q) => !plan.passed?.includes(q.key));
        if (pq) return pq;
      }
      break;
    case 'spend':
      if (!plan.currency) return { key: 'currency', ask: 'Which currency do people spend in?' };
      if (!plan.steps) return { key: 'approver', ask: 'Who approves a request to spend?' };
      if (!plan.after) return { key: 'after', ask: `Does anybody approve it after ${firstSaid}${anExampleAfter(plan, ['finance', 'departmentHead'])}? You can say no.` };
      if (plan.limit === undefined) return { key: 'limit', ask: plan.steps.length > 1 ? 'Up to what amount does a request go this way? Above that amount, somebody else approves it.' : `What is the most ${firstSaid} may approve on ${agree(firstSaid, 'your', 'their')} own?` };
      if (plan.forSome === undefined && known.here?.length) return { key: 'forSome', ask: FOR_SOME_ASKS.spend };
      if (!plan.stepsAbove) return { key: 'above', ask: `Who approves anything above ${money(plan.currency, plan.limit)}?` };
      if (plan.escalateAfter === undefined) return { key: 'escalate', ask: `What happens if ${firstSaid} ${agree(firstSaid, "don't", "doesn't")} respond within two working days?` };
      break;
    case 'time':
      if (!plan.clients?.length) return { key: 'clients', ask: 'Which clients or projects do people give their hours for? Write one on each line, or put commas between them.' };
      if (!plan.steps) return { key: 'approver', ask: 'Who approves each week’s hours?' };
      if (!plan.after) return { key: 'after', ask: `Does anybody approve the hours after ${firstSaid}${anExampleAfter(plan, ['finance', 'departmentHead'])}? You can say no.` };
      if (plan.hoursAWeek === undefined) return { key: 'hoursAWeek', ask: 'How many hours a week does each person need to give? You can say none.' };
      if (plan.forSome === undefined && known.here?.length) return { key: 'forSome', ask: FOR_SOME_ASKS.time };
      if (plan.cutOff === undefined) return { key: 'cutOff', ask: 'When are the hours due each week? For example, Friday at 17:00. You can say there is no cut-off.' };
      if (plan.escalateAfter === undefined) return { key: 'escalate', ask: `What happens if ${firstSaid} ${agree(firstSaid, "don't", "doesn't")} respond within two working days?` };
      break;
    case 'reviews':
      if (!plan.every) return { key: 'every', ask: 'How often is each person reviewed, every 6 months or every 12 months?' };
      if (!plan.writer) return { key: 'writer', ask: 'Who writes each review with the person, their manager or an admin?' };
      break;
  }
  /* Only an admin names who holds a job, so nobody else is asked who does. */
  for (const r of known.mayNameJobs === false ? [] : rulesThatNeedSomebody(plan)) {
    if (r === 'departmentHead' || r === 'budgetOwner') {
      const key = r === 'departmentHead' ? 'departmentHeads' : 'budgetOwners';
      const team = known.teams.find((x) => !d[key]?.[x] && !plan.skipped.includes(`${key}:${x}`) && !plan.skipped.includes(key));
      if (team) return { key: `duty:${key}:${team}`, ask: r === 'departmentHead' ? `Who heads ${team}? You can say nobody yet.` : `Who holds the ${team} budget? You can say nobody yet.` };
    } else if (!d[r as 'hr' | 'finance' | 'chiefExecutive'] && !plan.skipped.includes(r)) {
      const ask = r === 'hr' ? 'Who looks after HR?' : r === 'finance' ? 'Who looks after finance?' : 'Who is the chief executive?';
      return { key: `duty:${r}`, ask: `${ask} You can say nobody yet.` };
    }
  }
  return null;
}

// ---------------------------------------------- the answers ----------------------------------------------

/** The opening sentence, read for anything it already answers. */
function readOpening(plan: Plan, t: string, known: WhatIsKnown): Plan {
  let p = jobsSaidIn(t, plan, known) ?? plan;
  if (p.suite === 'leave' && p.days === undefined) {
    const m = /\b(\d{1,3})\s+days?\b(?:\s+of\s+(?:annual\s+)?leave)?\s+(?:a|per|each|every)\s+year\b/i.exec(t);
    if (m && Number(m[1]) <= 365) p = { ...p, days: Number(m[1]) };
  }
  if (p.suite === 'spend' && !p.currency) {
    const c = CURRENCIES.find((x) => new RegExp(String.raw`\b${x}\b`).test(t));
    if (c) p = { ...p, currency: c };
  }
  if (p.suite === 'reviews' && !p.every) {
    const e = everyIn(t);
    if (e) p = { ...p, every: e };
  }
  const approved = /\b(?:approved\s+by|goes\s+to|go\s+to)\s+(.+?)(?:[.;]|$)/i.exec(t);
  if (approved && p.suite !== 'reviews') {
    const s = stepsFrom(approved[1], p, known);
    if ('ok' in s) p = { ...p, steps: s.ok, after: s.ok.length > 1 ? true : p.after };
  }
  return p;
}

function everyIn(t: string): Plan['every'] | null {
  if (/\b(?:6|six)\s+months?\b|\btwice\s+a\s+year\b|\bhalf[\s-]?yearly\b/i.test(t)) return 'Every 6 months';
  if (/\b(?:12|twelve)\s+months?\b|\bonce\s+a\s+year\b|\bannual(?:ly)?\b|\byearly\b|\bevery\s+year\b/i.test(t)) return 'Every 12 months';
  return null;
}

/**
 * The admin's answer to the question waiting. Returns the plan with the answer in it, or the question
 * to ask again, in plain words. Nothing is stored here.
 */
export function takeAnswer(plan: Plan, key: string, message: string, known: WhatIsKnown): { plan: Plan } | { again: string } {
  const t = (message ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return { again: 'I did not catch an answer there. Could you say it again?' };
  /* A job said in passing ("Omar looks after finance") is kept, whatever the question. */
  const p0 = jobsSaidIn(t, plan, known) ?? plan;
  const p: Plan = { ...JSON.parse(JSON.stringify(p0)), asking: null };
  const viaSteps = (s: Read<Rule[][]>, then: (steps: Rule[][]) => Plan): { plan: Plan } | { again: string } => {
    if ('again' in s) return { again: s.again };
    if ('whichJob' in s) return { plan: { ...p, pending: { personId: s.whichJob, key, message: t } } };
    return { plan: then(s.ok) };
  };

  if (isAPolicyKey(key)) {
    /* The policy's own readings (a-leave-policy-set-up-by-talking.ts), on the words as said, line breaks and all. */
    const r = takeAPolicyAnswer(p.policy, key, (message ?? '').trim(), known);
    return 'again' in r ? { again: r.again } : { plan: { ...p, policy: r.policy } };
  }

  if (key === 'job' && p.pending) {
    const job = takeAJob(p.pending.personId, t, p, known);
    if ('again' in job) return { again: job.again };
    if ('whichJob' in job) return { again: whichJobQuestion(p.pending.personId, p, known) };
    const { key: was, message: said } = p.pending;
    return takeAnswer({ ...job.ok, pending: null }, was, said, known);
  }

  switch (key) {
    case 'days': {
      const n = aNumberIn(t);
      if (n == null || !Number.isInteger(n) || n < 0 || n > 365) return { again: 'How many days of leave does each person have in a year? Give a whole number, for example 21.' };
      return { plan: { ...p, days: n } };
    }
    case 'currency': {
      const c = CURRENCIES.find((x) => new RegExp(String.raw`\b${x}\b`, 'i').test(t))
        ?? (/\bshillings?\b/i.test(t) ? 'KES' : /\bnaira\b/i.test(t) ? 'NGN' : /\bcedis?\b/i.test(t) ? 'GHS' : /\brand\b/i.test(t) ? 'ZAR' : /\bdollars?\b/i.test(t) ? 'USD' : /\beuros?\b/i.test(t) ? 'EUR' : /\bpounds?\b/i.test(t) ? 'GBP' : null);
      if (!c) return { again: `Which currency? I can use ${andList(CURRENCIES)}.` };
      return { plan: { ...p, currency: c } };
    }
    case 'limit': {
      const n = aNumberIn(t);
      if (n == null || n < 0 || n > 1_000_000_000) return { again: 'What is the most they may approve? Give an amount, for example 20,000.' };
      return { plan: { ...p, limit: Math.round(n) } };
    }
    case 'approver': {
      /* Leave by length said here ("leave of more than 10 days goes to the head of their team"): kept, and the rest read as who approves every leave request. */
      const longer = p.suite === 'leave' ? longerLeaveIn(t, p, known, false) : null;
      if (longer && !('ok' in longer)) return viaSteps(longer as Read<never>, () => p);
      const withLonger = longer && 'ok' in longer ? { ...p, longer: { above: longer.ok.above, add: longer.ok.add, also: longer.ok.also } } : p;
      const words = longer && 'ok' in longer ? longer.ok.rest : t;
      /* "their manager, then Grace if it is more than 5 days": who approves after the first person is already said, so it is not asked again (round 2, T1). */
      const saidAfter = withLonger.longer?.also && withLonger.longer.add?.length ? true : withLonger.after;
      /* "their manager up to 50k": the amount is the most they approve on their own (round 2, T1). */
      const upTo = p.suite === 'spend' ? /\bup\s+to\s+(?:[A-Z]{3}\s*)?([\d.,]+\s*(?:k|thousand|m|million)?)/i.exec(words) : null;
      const amount = upTo ? aNumberIn(upTo[1]) : null;
      const withLimit: Plan = amount != null && amount >= 0 ? { ...withLonger, limit: Math.round(amount) } : withLonger;
      const who = upTo ? words.replace(upTo[0], ' ') : words;
      if (longer && !tokensHaveARule(who, known)) return { plan: { ...withLimit, after: saidAfter } };
      return viaSteps(stepsFrom(who, withLimit, known), (steps) => ({ ...withLimit, steps, after: steps.length > 1 ? true : saidAfter }));
    }
    case 'after': {
      /* "If it's more than 10 working days, the department head also approves" (decision 85): leave by length, after the first person. */
      const longer = p.suite === 'leave' && !/\balways\b|\bevery\b/i.test(t) ? longerLeaveIn(t, p, known, true) : null;
      if (longer && !('ok' in longer)) return viaSteps(longer as Read<never>, () => p);
      if (longer && 'ok' in longer) {
        const withLonger: Plan = { ...p, longer: { above: longer.ok.above, add: longer.ok.add, also: true }, after: true };
        const rest = longer.ok.rest.replace(/^(?:y|yes|yep|yeah|no|nope|only|just)\b[\s,.]*/i, '');
        if (!tokensHaveARule(rest, known)) return { plan: withLonger };
        return viaSteps(stepsFrom(rest, withLonger, known), (more) => ({ ...withLonger, steps: [...(p.steps ?? []), ...more] }));
      }
      if (NO_LIKE.test(t) || /^(?:just|only)\s+(?:them|the\s+manager|that)\b/i.test(t)) return { plan: { ...p, after: true } };
      if (YES_LIKE.test(t) && !tokensHaveARule(t, known)) return { again: 'Who approves it after them? For example, “the head of the person’s team”, “HR”, “finance” or a person’s name.' };
      return viaSteps(stepsFrom(t, p, known), (more) => ({ ...p, steps: [...(p.steps ?? []), ...more], after: true }));
    }
    case 'longerDays': {
      const n = aNumberIn(t);
      if (n == null || !Number.isInteger(n) || n < 1 || n > 365) return { again: 'How many working days? Give a whole number, for example 10, and leave longer than that goes to the people you named.' };
      return { plan: { ...p, longer: { ...(p.longer ?? { also: true }), above: n } } };
    }
    case 'longerWho':
      return viaSteps(stepsFrom(t, p, known), (add) => ({ ...p, longer: { ...(p.longer ?? { also: true }), add } }));
    case 'above':
      return viaSteps(stepsFrom(t, p, known), (stepsAbove) => ({ ...p, stepsAbove }));
    case 'tellHr': {
      if (/\bapproved\b|\bonce\s+(?:it\s+is\s+)?approved\b|\bafter\s+approval\b/i.test(t)) return { plan: { ...p, tellHr: 'approved' } };
      if (YES_LIKE.test(t) || /\ball\b|\bevery\b/i.test(t)) return { plan: { ...p, tellHr: 'every' } };
      if (NO_LIKE.test(t)) return { plan: { ...p, tellHr: null } };
      return { again: 'Does HR need to see every leave request, only the approved ones, or none? You can say all, approved or no.' };
    }
    case 'escalate': {
      if (NO_LIKE.test(t) || /\bit\s+waits\b|\bwait(?:s)?\s+for\s+them\b|\bnothing\b|\bstays\b/i.test(t)) return { plan: { ...p, escalateAfter: null } };
      const days = aNumberIn(t.replace(/\b\d{1,2}(?::\d{2})\b/g, ''));
      const n = days != null && Number.isInteger(days) && days >= 1 && days <= 30 ? days : 2;
      const s = stepsFrom(t, p, known);
      if ('again' in s) return { again: 'Who should it go to then? For example, “the head of the person’s team”, “HR” or “an admin”. Or say it waits.' };
      if ('whichJob' in s) return { plan: { ...p, pending: { personId: s.whichJob, key, message: t } } };
      const next = s.ok.flat().filter((r) => r !== 'admin' || s.ok.flat().length === 1);
      const steps = (p.steps ?? [[...THE_LINE_STEP]]).map((x) => [...x]);
      const head = steps[0][0];
      steps[0] = withAnAdminLast([head, ...next.filter((r) => r !== head), ...steps[0].slice(1)]);
      return { plan: { ...p, steps, escalateAfter: n } };
    }
    case 'clients': {
      const list = t.split(/\n|,|;|\band\b/i).map((x) => x.trim().replace(/^[-*•]\s*/, '').replace(/[.]+$/, '')).filter((x) => x.length >= 2 && x.length <= 120);
      if (!list.length) return { again: 'Which clients or projects? Write one on each line, or put commas between them.' };
      return { plan: { ...p, clients: [...new Set(list)].slice(0, 100) } };
    }
    case 'hoursAWeek': {
      if (NO_LIKE.test(t)) return { plan: { ...p, hoursAWeek: null } };
      const n = aNumberIn(t);
      if (n == null || n < 1 || n > 80) return { again: 'How many hours a week? Give a number from 1 to 80, or say none.' };
      return { plan: { ...p, hoursAWeek: n } };
    }
    case 'cutOff': {
      if (NO_LIKE.test(t) || /\bno\s+cut[\s-]?off\b/i.test(t)) return { plan: { ...p, cutOff: null } };
      const c = aCutOffIn(t);
      if (c === 'no time') return { again: 'At what time on that day? For example, 17:00.' };
      if (!c) return { again: 'When are the hours due? Say a day and a time, for example Friday at 17:00, or say there is no cut-off.' };
      return { plan: { ...p, cutOff: c } };
    }
    case 'forSome': {
      if (NO_LIKE.test(t) || /^(?:everyone|everybody)\s+(?:is\s+)?the\s+same\b/i.test(t)) return { plan: { ...p, forSome: null } };
      const setting = THE_SETTING_OF[p.suite];
      const said = setting ? numbersForSomePeopleIn(t, known.here ?? [], setting, known.titlesMeant ?? {}) : null;
      if (!said) {
        const titles = [...new Set((known.here ?? []).map((x) => x.title).filter((x): x is string => !!x))];
        return { again: `I did not catch a group and a number there. Say each group with its number, for example “${titles[0] ?? 'Sales executive'} gets 18 days”.${titles.length ? ` The job titles here are ${andList(titles.slice(0, 8))}${titles.length > 8 ? ', and others' : ''}.` : ''} You can also name a team or a person, or say no.` };
      }
      return { plan: { ...p, forSome: said.filter((n) => n.setting === setting) } };
    }
    case 'every': {
      const e = everyIn(t);
      if (!e) return { again: 'Is each person reviewed every 6 months or every 12 months?' };
      return { plan: { ...p, every: e } };
    }
    case 'writer': {
      const tokens = tokensIn(t, known.people);
      const rs = 'unclear' in tokens ? [] : tokens.flatMap((x) => ('rule' in x ? [x.rule] : []));
      if (rs[0] === 'manager') return { plan: { ...p, writer: 'Their manager' } };
      if (rs[0] === 'admin') return { plan: { ...p, writer: 'An admin' } };
      return { again: 'A review can be written with the person by their manager or by an admin. Which should it be?' };
    }
  }
  if (key.startsWith('duty:')) {
    const [, duty, team] = key.split(':');
    if (NOBODY.test(t)) {
      const all = team && SKIP_THE_REST.test(t);
      return { plan: { ...p, skipped: [...p.skipped, all ? duty : team ? `${duty}:${team}` : duty] } };
    }
    const who = onePersonIn(t, known);
    if (!who) return { again: `I could not find that person in your organisation. Who is it? You can say nobody yet.` };
    if ('unclear' in who) return { again: `Do you mean ${orList(who.unclear.map((id) => full(known, id)))}?` };
    if (team) return { plan: { ...p, duties: { ...p.duties, [duty]: { ...((p.duties as any)[duty] ?? {}), [team]: who.id } } } };
    return { plan: { ...p, duties: { ...p.duties, [duty]: who.id } } };
  }
  return { again: 'I did not catch that. Could you say it again?' };
}

/**
 * A change said after the said-back and before the yes ("make it three working days", "HR only
 * sees approved ones", "Fatuma heads Finance"). Returns the changed plan, or null when nothing in the
 * words is a change it can read. Nothing is stored.
 */
export function takeAChange(plan: Plan, message: string, known: WhatIsKnown): Plan | null {
  const t = (message ?? '').trim().replace(/\s+/g, ' ').replace(/^(?:no|actually|wait|but|and|change it so)[,.]?\s+/i, '');
  if (!t) return null;
  const jobs = jobsSaidIn(t, plan, known);
  const tryKey = (key: string, words?: string): Plan | null => {
    const r = takeAnswer(jobs ?? plan, key, words ?? t, known);
    return 'plan' in r && !r.plan.pending ? r.plan : null;
  };
  let changed: Plan | null = null;
  if (plan.suite === 'leave' && /\bhr\b|\bhuman\s+resources\b/i.test(t) && /\bsee|told|know|approved|every|all|not\b/i.test(t) && !/\bapproves?\b/i.test(t)) {
    changed = tryKey('tellHr', t.replace(/^.*?\b(?:hr|human resources)\b\s*(?:only\s+)?(?:needs?\s+to\s+)?(?:sees?|is\s+told\s+of|knows?\s+about)?\s*/i, ''));
    if (changed && /\bonly\b.*\bapproved\b|\bapproved\b/i.test(t)) changed = { ...changed, tellHr: 'approved' };
    else if (changed && /\bnot\b|\bno\b|\bnever\b/i.test(t)) changed = { ...changed, tellHr: null };
  } else if (plan.suite === 'leave' && plan.longer && /\b(?:no|drop|remove|forget|take\s+away)\b.*\blong(?:er)?\b|\bsame\s+for\s+all\s+leave\b/i.test(t)) {
    /* "Drop the rule for longer leave": every leave request takes the same steps again. */
    changed = { ...(jobs ?? plan), longer: null };
  } else if (plan.suite === 'leave' && LONGER_LEAVE.test(t)) {
    /* Leave by length said after the said-back: "If it's more than 10 working days, the head of their team also approves." */
    const r = longerLeaveIn(t, jobs ?? plan, known, false);
    if (r && 'ok' in r && (r.ok.above || r.ok.add)) {
      const was = plan.longer ?? null;
      const longer = { above: r.ok.above ?? was?.above, add: r.ok.add ?? was?.add, also: r.ok.add ? r.ok.also : was?.also ?? true };
      changed = longer.above && longer.add ? { ...(jobs ?? plan), longer } : null;
    }
  } else if (plan.suite === 'leave' && /\bdays?\b.*\b(?:a|per|each)\s+year\b|\bdays?\s+of\s+leave\b/i.test(t)) {
    changed = tryKey('days');
  } else if (/\bworking\s+days?\b|\b(?:doesn'?t|does\s+not|not)\s+(?:respond|answer)\b|\bpass(?:ed)?\s+on\b|\bwaits?\b/i.test(t) && plan.suite !== 'reviews') {
    const days = aNumberIn(t);
    if (/\bit\s+waits\b|\bwaits?\s+for\b|\bno(?:t|thing)\b/i.test(t)) changed = tryKey('escalate', 'nothing');
    else if (!tokensHaveARule(t, known) && days != null && Number.isInteger(days) && days >= 1 && days <= 30) {
      /* Only the number of days changed: the people it goes to stay as they were. */
      changed = { ...(jobs ?? plan), escalateAfter: days };
    } else changed = tryKey('escalate');
  } else if (plan.suite === 'spend' && CURRENCIES.some((c) => new RegExp(String.raw`\b${c}\b`, 'i').test(t)) && !aNumberIn(t)) {
    changed = tryKey('currency');
  } else if (plan.suite === 'spend' && /\blimit\b|\bthe\s+most\b|\bup\s+to\b/i.test(t) && aNumberIn(t) != null) {
    changed = tryKey('limit');
  } else if (plan.suite === 'spend' && /\babove\b|\bover\b/i.test(t) && /\bapprov/i.test(t)) {
    changed = tryKey('above', t.replace(/^.*?\b(?:above|over)\b[^,]*?(?:,|\bis\b|\bby\b|\bgoes\s+to\b)\s*/i, ''));
  } else if (plan.suite === 'time' && /\bhours?\s+a\s+week\b/i.test(t)) {
    changed = tryKey('hoursAWeek');
  } else if (plan.suite === 'time' && WEEKDAYS.some((d) => new RegExp(String.raw`\b${d}\b`, 'i').test(t))) {
    changed = tryKey('cutOff');
  } else if (plan.suite === 'time' && /\bclients?\b|\bprojects?\b/i.test(t)) {
    changed = tryKey('clients', t.replace(/^.*?\b(?:clients?|projects?)\b(?:\s+(?:are|is))?\s*:?\s*/i, ''));
  } else if (plan.suite === 'reviews' && everyIn(t)) {
    changed = tryKey('every');
  } else if (plan.suite === 'reviews' && /\bwrites?\b|\bwritten\b/i.test(t)) {
    changed = tryKey('writer');
  } else if (plan.suite !== 'reviews' && /\bapprov/i.test(t)) {
    const also = /\btoo\b|\bas\s+well\b|\balso\b|\bafter\b|\bthen\b/i.test(t);
    const words = t.replace(/\b(?:approves?|approved|approval|approve)\b.*$/i, '').trim() || t;
    if (also) {
      const s = stepsFrom(words, jobs ?? plan, known);
      if ('ok' in s) changed = { ...(jobs ?? plan), steps: [...(plan.steps ?? []), ...s.ok], after: true };
    } else {
      const s = stepsFrom(words, jobs ?? plan, known);
      if ('ok' in s) changed = { ...(jobs ?? plan), steps: [s.ok.flat().length ? withAnAdminLast(s.ok.flat()) : ['admin'], ...(plan.steps ?? []).slice(1)] };
    }
  }
  if (!changed && jobs) changed = jobs;
  if (!changed) return null;
  return JSON.stringify(changed) === JSON.stringify(plan) ? null : changed;
}

function tokensHaveARule(t: string, known: WhatIsKnown): boolean {
  const tokens = tokensIn(t, known.people);
  return !('unclear' in tokens) && tokens.length > 0;
}

// ---------------------------------------------- said back ----------------------------------------------

const WHAT: Record<Exclude<SetUpSuite, 'reviews'>, string> = { leave: 'A leave request', spend: 'A request to spend', time: 'A week of hours' };

/** "Omar, who looks after finance," when more of the sentence follows. */
const inTheMiddle = (said: string) => (said.includes(', ') ? `${said},` : said);

/** The steps said in sentences: who it goes to, in turn, and who it goes to when nobody holds a job. */
function stepsSaid(what: string, steps: Rule[][], d: Duties, known: WhatIsKnown, seen = new Set<string>()): string[] {
  const out: string[] = [];
  out.push(`${what} goes to ${steps.length > 1 ? `${inTheMiddle(ruleSaid(steps[0][0], d, known))} first` : ruleSaid(steps[0][0], d, known)}.`);
  for (let i = 1; i < steps.length; i++) {
    const who = ruleShort(steps[i - 1][0], d, known);
    out.push(`When ${who} ${agree(who, 'have', 'has')} approved it, it goes to ${inTheMiddle(ruleSaid(steps[i][0], d, known))} to approve as well.`);
  }
  const last = ruleShort(steps[steps.length - 1][0], d, known);
  if (steps.length > 1) out.push(`It is approved only when ${last} ${agree(last, 'approve', 'approves')} it, and a no from anybody on the way ends it.`);
  for (const s of steps) {
    if (s.length < 2 || s[0] === 'admin') continue;
    /* The fallback is said only when nobody holds that job: with Omar looking after finance, "if nobody is named to look after finance" is not true. */
    if ((s[0] === 'finance' || s[0] === 'hr' || s[0] === 'chiefExecutive') && d[s[0]]) continue;
    const line = `If ${nobodyFor(s[0])}, it goes to ${inTheMiddle(ruleSaid(s[1], d, known))} instead.`;
    if (!seen.has(line)) { seen.add(line); out.push(line); }
  }
  return out;
}

/** Who holds a team job, team by team: "Joseph heads Operations, and Wairimu heads Sales." */
function teamJobsSaid(rule: 'departmentHead' | 'budgetOwner', d: Duties, known: WhatIsKnown): string[] {
  const key = rule === 'departmentHead' ? 'departmentHeads' : 'budgetOwners';
  const held = known.teams.filter((t) => d[key]?.[t]).map((t) => {
    const me = isMe(known, d[key]![t]);
    const who = me ? 'you' : first(known, d[key]![t]);
    return rule === 'departmentHead' ? `${who} ${me ? 'head' : 'heads'} ${t}` : `${who} ${me ? 'hold' : 'holds'} the ${t} budget`;
  });
  const none = known.teams.filter((t) => !d[key]?.[t]);
  const out: string[] = [];
  if (held.length) out.push(`${capital(held.length > 1 ? `${held.slice(0, -1).join(', ')}, and ${held[held.length - 1]}` : held[0])}.`);
  if (none.length) out.push(`Nobody is named ${rule === 'departmentHead' ? `as the head of ${andList(none)}` : `as holding the ${andList(none)} budget`} yet, so for people in ${none.length > 1 ? 'those teams' : none[0]} that part goes to the next person on the list.`);
  return out;
}

function escalationSaid(steps: Rule[][], days: number | null | undefined, d: Duties, known: WhatIsKnown): string[] {
  if (!days) return ['If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.'];
  const n = `${inWords(days)} working ${days === 1 ? 'day' : 'days'}`;
  const out: string[] = [];
  const seen = new Set<string>();
  /* Each time a request is passed on, it waits the same number of days again, so one sentence says each pass. */
  for (const s of steps) {
    for (let i = 0; i + 1 < s.length; i++) {
      const who = ruleShort(s[i], d, known);
      const line = `If ${who} ${agree(who, 'have', 'has')} not answered after ${n}, or ${agree(who, 'are', 'is')} on leave that day, it goes to ${ruleSaid(s[i + 1], d, known)}.`;
      if (!seen.has(line)) { seen.add(line); out.push(line); }
    }
  }
  return out;
}

/**
 * The whole thing said back in plain sentences, from the plan alone, so the same function says what is
 * proposed and, after the yes, what was stored.
 */
export function theSetUpSaid(plan: Plan, known: WhatIsKnown): string[] {
  const d = dutiesNow(plan, known);
  const out: string[] = [];
  const steps = plan.steps ?? [[...THE_LINE_STEP]];
  const longer = plan.suite === 'leave' ? longerSteps(plan) : null;
  const uses = (r: Rule) => [...steps.flat(), ...(plan.stepsAbove ?? []).flat(), ...(longer ?? []).flat()].includes(r);
  if (plan.suite === 'leave') {
    /* With types of leave, the policy says each, annual leave first with its days a year; without, the one number, as before. */
    if (!plan.policy?.kinds?.length) out.push(`Each person has ${plan.days} ${plan.days === 1 ? 'day' : 'days'} of leave a year.`);
    out.push(...thePolicySaid(plan.policy, plan.days, known));
    out.push(...forSomeSaid(plan, known));
    if (longer && plan.longer?.above) {
      /* Leave by length: up to the length, the steps every request takes; above it, its own. */
      const seen = new Set<string>();
      out.push(...stepsSaid(`${WHAT.leave} of up to ${upToWorkingDays(plan.longer.above)}`, steps, d, known, seen));
      out.push(...stepsSaid(`${WHAT.leave} of ${moreThanWorkingDays(plan.longer.above)}`, longer, d, known, seen));
    } else out.push(...stepsSaid(WHAT.leave, steps, d, known));
  } else if (plan.suite === 'spend') {
    out.push(`People ask to spend in ${plan.currency}.`);
    out.push(...stepsSaid(`${WHAT.spend} of up to ${money(plan.currency, plan.limit ?? 0)}`, steps, d, known));
    if (plan.stepsAbove) out.push(...stepsSaid(`${WHAT.spend} of more than ${money(plan.currency, plan.limit ?? 0)}`, plan.stepsAbove, d, known));
    out.push(...forSomeSaid(plan, known));
  } else if (plan.suite === 'time') {
    out.push(`People give their hours for ${andList(plan.clients ?? [])}, each week.`);
    out.push(...stepsSaid(WHAT.time, steps, d, known));
    if (plan.hoursAWeek) out.push(`Each person is asked for ${plan.hoursAWeek} hours a week.`);
    else out.push('Nobody is asked for a set number of hours.');
    out.push(...forSomeSaid(plan, known));
    if (plan.cutOff) {
      const day = `${plan.cutOff.day.charAt(0).toUpperCase()}${plan.cutOff.day.slice(1)}`;
      out.push(`The hours for each week are due by ${day} at ${plan.cutOff.time}, Lagos time.`);
    } else out.push('There is no cut-off for the hours.');
  } else {
    out.push(`Each person is reviewed ${plan.every === 'Every 12 months' ? 'every 12 months' : 'every 6 months'}.`);
    out.push(plan.writer === 'An admin'
      ? 'An admin writes each review with the person.'
      : 'The person’s manager writes each review with them. If the person has no manager in Groundwork, an admin writes it instead.');
    return out;
  }
  if (uses('departmentHead')) out.push(...teamJobsSaid('departmentHead', d, known));
  if (uses('budgetOwner')) out.push(...teamJobsSaid('budgetOwner', d, known));
  for (const r of ['finance', 'hr', 'chiefExecutive'] as const) {
    if ((uses(r) || (r === 'hr' && plan.suite === 'leave' && plan.tellHr)) && !d[r]) {
      out.push(`Nobody is named ${r === 'finance' ? 'to look after finance' : r === 'hr' ? 'to look after HR' : 'as the chief executive'} yet, so that part goes to the next person on the list.`);
    }
  }
  /* A job the person reading holds, said to them as "you", with why it comes to them. HR on the leave board says so below. */
  const tellsHr = plan.suite === 'leave' && !!plan.tellHr;
  for (const r of ['chiefExecutive', 'finance', 'hr'] as const) {
    if (!uses(r) || !isMe(known, d[r]) || (r === 'hr' && tellsHr)) continue;
    out.push(`${r === 'chiefExecutive' ? 'You are the chief executive' : r === 'finance' ? 'You look after finance' : 'You look after HR'}, so that part comes to you.`);
  }
  if (known.mayNameJobs === false && out.some((l) => /^Nobody is named /.test(l))) {
    out.push('Only an admin can name who holds each job.');
  }
  if (plan.suite === 'leave') {
    const hr = d.hr ? `${first(known, d.hr)}, who looks after HR,` : 'Whoever looks after HR';
    /* Said to whoever looks after HR: "You look after HR, so you see ...". */
    const sees = isMe(known, d.hr) ? 'You look after HR, so you see' : `${hr} sees`;
    if (plan.tellHr === 'every') out.push(`${sees} every leave request on the leave board, when it is asked for and when it is decided.`);
    else if (plan.tellHr === 'approved') out.push(`${sees} each approved leave request on the leave board.`);
    else out.push('HR is not shown leave requests.');
  }
  out.push(...escalationSaid([...steps, ...(plan.stepsAbove ?? []), ...(longer ?? [])], plan.escalateAfter, d, known));
  return out;
}

/** The numbers set for some people, each with who it covers today by name. */
function forSomeSaid(plan: Plan, known: WhatIsKnown): string[] {
  return plan.forSome?.length ? theseNumbersSaid(plan.forSome, known.forWhom ?? {}, known.here ?? [], plan.currency ?? null) : [];
}

export function theSayBack(plan: Plan, known: WhatIsKnown): string {
  const on = known.on ? `${capital(SUITE_IN_WORDS[plan.suite])} are already switched on, and this replaces how they work. ` : `${capital(SUITE_IN_WORDS[plan.suite])} will be switched on. `;
  /* A paragraph to open, one line for each rule, and the question on its own (Hafsah's screenshots, 20 November 2026: one block of text). */
  return `Here is how ${SUITE_IN_WORDS[plan.suite]} will work. ${on.trim()}\n\n${theSetUpSaid(plan, known).map((l) => `- ${l}`).join('\n')}\n\nShall I set it up like this? Nothing changes until you say yes.`;
}

export const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

export const SET_UP_DONE = (suite: SetUpSuite, said: string[]) =>
  `I have set it up, and ${SUITE_IN_WORDS[suite]} are switched on. ${said.join(' ')} You can change any of it by telling me, or on the Suites page.`;
export const SET_UP_NOT_DONE = (suite: SetUpSuite) => `I have not set up ${SUITE_IN_WORDS[suite]}. Nothing has changed.`;
export const SET_UP_STOPPED = (suite: SetUpSuite) => `I have stopped setting up ${SUITE_IN_WORDS[suite]}. Nothing has changed.`;
export const SET_UP_CHANGE_NOT_READ =
  'I did not catch what to change. Say yes to set it up as I said it, or no to leave everything as it is. You can also tell me what to change, for example “make it three working days”.';
export const SET_UP_CHANGED = (sayBack: string) => `I have changed that. ${sayBack}`;

/** The duty whose holder sets up each suite (decision 85): HR for leave and reviews, finance for spending and time sheets. */
export const THE_DUTY_FOR: Record<SetUpSuite, 'hr' | 'finance'> = { leave: 'hr', reviews: 'hr', spend: 'finance', time: 'finance' };
const LOOKS_AFTER: Record<'hr' | 'finance', string> = { hr: 'looks after HR', finance: 'looks after finance' };

/**
 * Said to somebody who may not set this suite up: who may, by first name, and that nothing changed.
 * `holder` is the first name of whoever holds the duty that sets it up (HR or finance), or null.
 */
export function onlyAnAdminSetsThisUp(suite: SetUpSuite, admins: string[], holder: string | null = null): string {
  const duty = LOOKS_AFTER[THE_DUTY_FOR[suite]];
  const who = holder ? `an admin or ${holder}, who ${duty},` : `an admin or whoever ${duty}`;
  const head = `Only ${who} can set up how ${SUITE_IN_WORDS[suite]} work in your organisation, so I have not changed anything.`;
  const others = admins.filter((a) => a !== holder);
  if (!others.length) return holder ? `${head} If you would like it set up or changed, you could ask ${holder}.` : head;
  const ask = others.length > 3
    ? `one of your admins, such as ${others[0]} or ${others[1]}`
    : `${orList(others)}, who ${others.length === 1 ? 'is an admin' : 'are admins'} here`;
  return `${head} If you would like it set up or changed, you could ask ${holder ? `${holder}, or ` : ''}${ask}.`;
}

// ---------------------------------------------- what is written on the yes ----------------------------------------------

export interface WhatToWrite {
  answers: Record<string, unknown>;
  duties: Duties | null;
  workflows: Record<string, unknown> | null;
  leaveRules: Record<string, unknown> | null;
  timeRules: Record<string, unknown> | null;
  /** Spending: who approves, as its steps by amount, the one place that says it (the-spending-rules.ts). */
  spendRules: Record<string, unknown> | null;
  /** The numbers for some people, each written through `SuitesService.setForWhom`. */
  forWhom: ANumberSaid[];
  /** Leave: the offices and the public holidays said back, written through `SuitesService.setLeavePlaces`; the yes confirms them. */
  leavePlaces: { offices?: { name: string; country: string; people?: string[] }[]; holidays?: { office: string | null; year: number; list: { on: string; name: string; confirmed: boolean; drafted: boolean }[] }[] } | null;
}

/** The steps by amount a spending set-up says: below the limit its own steps when they are not just the manager, and above it the steps above. */
export function theSpendingRowsOf(plan: Pick<Plan, 'steps' | 'limit' | 'stepsAbove'>): { above: number; steps: Step[] }[] {
  const justTheManager = !plan.steps?.length || (plan.steps.length === 1 && plan.steps[0][0] === 'manager');
  const rows: { above: number; steps: Step[] }[] = [];
  if (!justTheManager) rows.push({ above: 0, steps: plan.steps as Step[] });
  if (typeof plan.limit === 'number' && plan.stepsAbove?.length) rows.push({ above: plan.limit, steps: plan.stepsAbove as Step[] });
  return rows.filter((r, i) => !rows.slice(i + 1).some((x) => x.above === r.above));
}

/**
 * What the yes writes, for each SuitesService method. Checked here with the same functions the
 * services check with, so a write never fails halfway on something the conversation could have caught.
 * Null when anything would be refused.
 */
export function whatToWrite(plan: Plan, known: WhatIsKnown): WhatToWrite | null {
  const suite = suiteOf(plan.suite);
  if (!suite) return null;
  const people = new Set(known.people.map((p) => p.id));
  const a = known.answers ?? {};
  let answers: Record<string, unknown>;
  if (plan.suite === 'leave') answers = { days: plan.days };
  else if (plan.suite === 'time') answers = { clients: plan.clients };
  else if (plan.suite === 'reviews') answers = { every: plan.every, writer: plan.writer };
  else {
    /*
     * The spending suite's own page still asks for one person who approves anything above the limit.
     * Here the steps above the limit are set by rule and replace that person entirely
     * (who-may-decide.ts, theStepsFor), so the person kept is the one already there, else whoever
     * holds the first job those steps name, else the admin setting it up. Asked of Hafsah in the report.
     */
    const d = dutiesNow(plan, known);
    const firstHolder = (plan.stepsAbove ?? []).flat().map((r) => (r === 'finance' || r === 'hr' || r === 'chiefExecutive' ? d[r] : undefined)).find(Boolean);
    const above = typeof a.above === 'string' && people.has(a.above) ? a.above : firstHolder ?? known.me;
    answers = { currency: plan.currency, limit: plan.limit, above };
  }
  if (!checkAnswers(suite, answers, people)) return null;

  /* Only the jobs the said-back names are written: a job named on the way and then no longer used is not kept. */
  const used = new Set(rulesThatNeedSomebody(plan));
  const duties: Duties = {};
  if (used.has('finance') && plan.duties.finance) duties.finance = plan.duties.finance;
  if (used.has('hr') && plan.duties.hr) duties.hr = plan.duties.hr;
  if (used.has('chiefExecutive') && plan.duties.chiefExecutive) duties.chiefExecutive = plan.duties.chiefExecutive;
  if (used.has('departmentHead') && plan.duties.departmentHeads) duties.departmentHeads = plan.duties.departmentHeads;
  if (used.has('budgetOwner') && plan.duties.budgetOwners) duties.budgetOwners = plan.duties.budgetOwners;
  const hasDuties = known.mayNameJobs !== false && Object.keys(duties).length > 0;
  if (hasDuties && 'refused' in changeDuties(known.duties ?? {}, duties, people, new Set(known.teams))) return null;

  let workflows: Record<string, unknown> | null = null;
  if (plan.suite !== 'reviews') {
    /* Spending keeps only its days in the workflows: who approves it is its steps by amount. */
    const w: Record<string, unknown> = plan.suite === 'spend' ? { escalateAfter: plan.escalateAfter ?? null } : { steps: plan.steps, escalateAfter: plan.escalateAfter ?? null };
    workflows = { [plan.suite]: w };
    if ('refused' in changeWorkflows({}, workflows)) return null;
  }
  let leaveRules: Record<string, unknown> | null = null;
  if (plan.suite === 'leave') {
    /* Leave by length is kept as a threshold of the leave rules; none said, none kept, so what is stored is what was said back. */
    const longer = longerSteps(plan);
    leaveRules = { ...thePolicyAsRules(plan.policy, plan.days), tellHr: plan.tellHr ?? null, thresholds: longer && plan.longer?.above ? [{ above: plan.longer.above, steps: longer }] : null };
    if ('refused' in changeLeaveRules({}, leaveRules)) return null;
  }
  let leavePlaces: WhatToWrite['leavePlaces'] = null;
  if (plan.suite === 'leave' && (plan.policy?.offices || plan.policy?.holidays?.length)) {
    leavePlaces = {};
    if (plan.policy.offices) leavePlaces.offices = plan.policy.offices.map((o) => ({ name: o.name, country: o.country, ...(o.people ? { people: o.people.filter((id) => people.has(id)) } : {}) }));
    const byPlace = new Map<string, { office: string | null; year: number; list: { on: string; name: string; confirmed: boolean; drafted: boolean }[] }>();
    for (const h of plan.policy.holidays ?? []) {
      const year = Number(h.on.slice(0, 4));
      const k = `${h.office ?? ''}|${year}`;
      const e = byPlace.get(k) ?? { office: h.office, year, list: [] };
      /* The admin read each date in the say-back and said yes: that yes confirms them. */
      e.list.push({ on: h.on, name: h.name, confirmed: true, drafted: true });
      byPlace.set(k, e);
    }
    if (byPlace.size) leavePlaces.holidays = [...byPlace.values()];
  }
  let timeRules: Record<string, unknown> | null = null;
  if (plan.suite === 'time') {
    timeRules = { every: 'week', hoursAWeek: plan.hoursAWeek ?? null, cutOff: plan.cutOff ?? null };
    if ('refused' in changeTimeRules({}, timeRules, { people, teams: new Set(known.teams), clients: plan.clients ?? [] })) return null;
  }
  let spendRules: Record<string, unknown> | null = null;
  if (plan.suite === 'spend') {
    const rows = theSpendingRowsOf(plan);
    spendRules = { thresholds: rows.length ? rows : null };
    if ('refused' in changeSpendRules({}, spendRules)) return null;
  }
  const forWhom = plan.forSome ?? [];
  let check: ForWhom = known.forWhom ?? {};
  for (const n of forWhom) {
    const c = changeForWhom(check, n);
    if ('refused' in c) return null;
    check = c.forWhom;
  }
  return { answers, duties: hasDuties ? duties : null, workflows, leaveRules, timeRules, spendRules, forWhom, leavePlaces };
}

/** What the services returned after the yes, read back as a plan, so the reply says what was stored. */
export function planFromStored(suite: SetUpSuite, stored: {
  answers: Record<string, unknown>;
  steps?: Step[] | null;
  escalateAfter?: number | null;
  tellHr?: 'every' | 'approved' | null;
  /** Leave by length as stored, or spending's steps by amount. The conversation sets one for leave; the first is read back. */
  thresholds?: { above: number; steps: Step[] }[] | null;
  hoursAWeek?: number | null;
  cutOff?: { day: unknown; time: string } | null;
  /** The numbers set for some people, as stored. */
  forWhom?: ForWhom | null;
  /** Leave: the policy as stored, read back by a-leave-policy-set-up-by-talking.ts. */
  leavePolicy?: LeavePolicyPlan | null;
}): Plan {
  const a = stored.answers ?? {};
  const rulesOnly = (s: Step[] | null | undefined) => (s ? s.map((x) => x.filter((r): r is Rule => typeof r === 'string')) : undefined);
  const plan: Plan = { suite, duties: {}, skipped: [], after: true };
  const setting = THE_SETTING_OF[suite];
  if (setting && stored.forWhom?.[setting]?.length) plan.forSome = stored.forWhom[setting]!.map((e) => ({ setting, who: e.who, value: e.value }));
  if (suite === 'leave') {
    const t = stored.thresholds?.[0];
    Object.assign(plan, { days: a.days, tellHr: stored.tellHr ?? null, longer: t ? { above: t.above, add: rulesOnly([...t.steps]), also: false } : null });
    if (stored.leavePolicy) plan.policy = stored.leavePolicy;
  }
  if (suite === 'spend') {
    /* Read back from the steps by amount: a row at nothing is the steps below the limit, the next row the limit and the steps above it. */
    const rows = stored.thresholds ?? [];
    const base = rows.find((r) => r.above === 0);
    const above = rows.find((r) => r.above > 0);
    Object.assign(plan, { currency: a.currency, limit: above?.above ?? a.limit, stepsAbove: rulesOnly(above?.steps) });
    Object.assign(plan, { steps: rulesOnly(base?.steps) ?? [[...THE_LINE_STEP]], escalateAfter: stored.escalateAfter ?? null });
    return plan;
  }
  if (suite === 'time') Object.assign(plan, { clients: a.clients, hoursAWeek: stored.hoursAWeek ?? null, cutOff: stored.cutOff ?? null });
  if (suite === 'reviews') Object.assign(plan, { every: a.every, writer: a.writer });
  if (suite !== 'reviews') Object.assign(plan, { steps: rulesOnly(stored.steps), escalateAfter: stored.escalateAfter ?? null });
  return plan;
}
