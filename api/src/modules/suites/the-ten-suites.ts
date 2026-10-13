/**
 * THE TEN SUITES (E, U.17), as the prototype's Suites page lists them (docs/prototype/screens/
 * E-suites/suites-admin.txt): their groups, names and lines are the prototype's words exactly.
 *
 * WHO EACH ONE IS FOR, from docs/modules.md, section E: three are for admins only (when someone
 * leaves, the role map, equipment); the other seven are for admins and leads. A lead is told only
 * which of those seven are on, as suites-lead.txt shows.
 *
 * THE FIRST QUESTIONS. docs/modules.md says an admin answers "two or three questions" before a suite
 * switches on. No prototype screen shows them, so each one below asks only for something that suite's
 * own board, as the prototype draws it, cannot work without, in the fewest plain words. Three suites
 * need nothing first (the role map, to-dos, customers and deals), so they switch on straight away.
 * These are listed for Hafsah in docs/morning-report-ui.md (item 28). Nothing uses the answers until
 * each suite's board is built.
 */

export type SuiteKey =
  | 'onboard' | 'leave' | 'time' | 'reviews' | 'leaving' | 'roles'
  | 'spend' | 'todos' | 'customers' | 'equipment';

export type SuiteGroup = 'People' | 'Money' | 'Work';

export type Question =
  | { id: string; kind: 'person'; ask: string }
  | { id: string; kind: 'number'; ask: string; min: number; max: number }
  | { id: string; kind: 'choice'; ask: string; options: string[] }
  | { id: string; kind: 'lines'; ask: string };

export interface Suite {
  key: SuiteKey;
  group: SuiteGroup;
  name: string;
  line: string;
  /** False for the three suites that are for admins only. */
  forLeads: boolean;
  questions: Question[];
}

const WHO_APPROVES = ['Their manager', 'An admin'];
/** The currencies spending may be in, by their short names, as the prototype writes "KES 18,000" (item 28). */
export const CURRENCIES = ['KES', 'UGX', 'TZS', 'RWF', 'ETB', 'NGN', 'GHS', 'ZAR', 'USD', 'EUR', 'GBP'];

export const SUITES: readonly Suite[] = [
  {
    key: 'onboard', group: 'People', name: 'Onboarding', forLeads: true,
    line: 'A new person’s to-dos, and what each helper must do to set them up.',
    questions: [
      { id: 'papers', kind: 'person', ask: 'Who sets up a new person’s pay and papers?' },
      { id: 'equipment', kind: 'person', ask: 'Who gives a new person their laptop and phone?' },
    ],
  },
  {
    key: 'leave', group: 'People', name: 'Leave requests', forLeads: true,
    line: 'People ask for time off in a check-in or chat. Groundwork checks their days left and who else is off.',
    questions: [
      { id: 'days', kind: 'number', ask: 'How many days of leave does each person have in a year?', min: 0, max: 365 },
      { id: 'approver', kind: 'choice', ask: 'Who approves a request for time off?', options: WHO_APPROVES },
    ],
  },
  {
    key: 'time', group: 'People', name: 'Time sheets', forLeads: true,
    line: 'People say how many hours they spent, and on which client or project. Used for billing only.',
    questions: [
      { id: 'clients', kind: 'lines', ask: 'Which clients or projects do people give their hours for? Write one on each line.' },
      { id: 'approver', kind: 'choice', ask: 'Who approves each week’s hours?', options: WHO_APPROVES },
    ],
  },
  {
    key: 'reviews', group: 'People', name: 'Performance reviews', forLeads: true,
    line: 'A review every 6 months, built from what each person did and proved, with their own view beside it.',
    questions: [
      { id: 'every', kind: 'choice', ask: 'How often is each person reviewed?', options: ['Every 6 months', 'Every 12 months'] },
      { id: 'writer', kind: 'choice', ask: 'Who writes each review with the person?', options: WHO_APPROVES },
    ],
  },
  {
    key: 'leaving', group: 'People', name: 'When someone leaves', forLeads: false,
    line: 'Handover, returning equipment, removing access and final pay, each with an owner.',
    questions: [
      { id: 'access', kind: 'person', ask: 'Who removes a person’s access on their last day?' },
      { id: 'pay', kind: 'person', ask: 'Who works out their final pay?' },
    ],
  },
  {
    key: 'roles', group: 'People', name: 'Role map', forLeads: false,
    line: 'Every role, what it owns, and who holds it. Shows jobs nobody owns.',
    questions: [],
  },
  {
    key: 'spend', group: 'Money', name: 'Spending and budgets', forLeads: true,
    line: 'People ask to spend in chat. Groundwork checks the budget and sends it to the right person. Shows each team’s budget against what was spent.',
    questions: [
      { id: 'currency', kind: 'choice', ask: 'Which currency do people spend in?', options: CURRENCIES },
      { id: 'limit', kind: 'number', ask: 'What is the most a manager may approve on their own?', min: 0, max: 1_000_000_000 },
      { id: 'above', kind: 'person', ask: 'Who approves anything above that?' },
    ],
  },
  {
    key: 'todos', group: 'Work', name: 'To-dos', forLeads: true,
    line: 'Everything people said they will do, in each check-in.',
    questions: [],
  },
  {
    key: 'customers', group: 'Work', name: 'Customers and deals', forLeads: true,
    line: 'One list of customers and deals for the whole company, kept up to date by the sales check-ins.',
    questions: [],
  },
  {
    key: 'equipment', group: 'Work', name: 'Equipment', forLeads: false,
    line: 'See who has each laptop, phone and demo freezer, and what needs fixing.',
    questions: [
      { id: 'keeper', kind: 'person', ask: 'Who looks after equipment and repairs?' },
    ],
  },
];

export const GROUPS: readonly SuiteGroup[] = ['People', 'Money', 'Work'];

export function suiteOf(key: string): Suite | undefined {
  return SUITES.find((s) => s.key === key);
}

export type Answers = Record<string, string | number | string[]>;

/**
 * The admin's answers, checked against the suite's questions. Returns the answers to keep, or null
 * when one is missing or is not something the question allows. `people` is who may be chosen: the
 * organisation's own people, never a guest from another company.
 */
export function checkAnswers(suite: Suite, given: unknown, people: Set<string>): Answers | null {
  const input = (given && typeof given === 'object' ? given : {}) as Record<string, unknown>;
  const kept: Answers = {};
  for (const q of suite.questions) {
    const v = input[q.id];
    if (q.kind === 'person') {
      if (typeof v !== 'string' || !people.has(v)) return null;
      kept[q.id] = v;
    } else if (q.kind === 'number') {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
      if (typeof n !== 'number' || !Number.isFinite(n) || n < q.min || n > q.max) return null;
      kept[q.id] = n;
    } else if (q.kind === 'choice') {
      if (typeof v !== 'string' || !q.options.includes(v)) return null;
      kept[q.id] = v;
    } else {
      const lines = (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : [])
        .map((x) => (typeof x === 'string' ? x.trim().slice(0, 120) : ''))
        .filter(Boolean)
        .slice(0, 100);
      if (lines.length === 0) return null;
      kept[q.id] = lines;
    }
  }
  return kept;
}
