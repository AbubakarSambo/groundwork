import type { Rule } from '../suites/who-may-decide';
import type { Duties } from '../suites/who-holds-each-duty';
import { RULE_IN_WORDS } from '../suites/the-approval-steps';
import { aNumberIn } from './a-suite-set-up-by-talking';

/**
 * APPROVAL STEPS FOR SPENDING, SAID IN ONE SENTENCE TO ASK (Hafsah, 26 October 2026).
 *
 * Grace wrote "Spending over KES 20,000 should be approved by Mercy in finance first, and then by me." and was told "I cannot answer
 * that one yet". Now the amount and each approver, in order, are read by rules (no model), turned into roles, and written into the
 * spending rules' thresholds: the same setting the spending page and the policy board write. Ask then says exactly what it set.
 *
 * A person is turned into the job they hold, never kept by name (decision 85): Mercy, who looks after finance, is "whoever looks
 * after finance"; "me" is the job the speaker holds, or "an admin" when they are one. Somebody who holds no job is not guessed at: Ask
 * says so, and nothing is set.
 */

const SPEND_WORDS = /\b(?:spend(?:ing)?|expenses?|payments?|purchases?|requests? to spend)\b/i;
const OVER = /\b(?:over|above|more than|from)\b\s*(?:[A-Z]{3}\s*)?\d/i;
const APPROVED = /\bapprov(?:e|ed|al|es)\b/i;

/** Whether a message sets approval steps for spending by amount, in so many words. */
export function setsSpendingSteps(message: string): boolean {
  const m = String(message ?? '');
  return SPEND_WORDS.test(m) && OVER.test(m) && APPROVED.test(m) && /\b(?:then|first|after that|followed by)\b/i.test(m);
}

const ROLE_WORDS: [RegExp, Rule][] = [
  [/\bfinance\b/i, 'finance'],
  [/\b(?:hr|human resources|people team)\b/i, 'hr'],
  [/\b(?:chief executive|ceo|managing director|md)\b/i, 'chiefExecutive'],
  [/\b(?:budget (?:holder|owner)|holds? (?:their|the) (?:team'?s )?budget)\b/i, 'budgetOwner'],
  [/\bhead of (?:their|the|his|her) (?:team|department)\b|\bdepartment head\b/i, 'departmentHead'],
  [/\b(?:their|his|her|the person'?s|line) (?:manager|lead)\b|\bthe lead\b|\btheir boss\b/i, 'manager'],
  [/\ban? admin\b/i, 'admin'],
];

export interface APerson { userId: string; first: string; full: string }

/** Who holds which whole-organisation job, as a role. */
function theJobOf(userId: string, duties: Duties): Rule | null {
  if (duties.finance === userId) return 'finance';
  if (duties.hr === userId) return 'hr';
  if (duties.chiefExecutive === userId) return 'chiefExecutive';
  return null;
}

export type ReadSteps =
  | { above: number; steps: Rule[]; who: (string | null)[] }
  | { notRead: string };

/**
 * The amount and the steps, in order. `speaker` is who said it; `isAdmin` whether they are one; `people` the organisation's people by
 * first name, to turn a name into the job that person holds.
 */
export function theStepsSaid(message: string, speaker: APerson, isAdmin: boolean, people: APerson[], duties: Duties): ReadSteps {
  const m = String(message ?? '');
  const amountAt = OVER.exec(m);
  const above = amountAt ? aNumberIn(m.slice(amountAt.index)) : null;
  if (!above || above <= 0) return { notRead: 'I could not tell the amount. Say it like "Spending over KES 20,000 should be approved by finance first, and then by their manager."' };
  /* The approvers, after "approved by", split at "first", "then", "and then", "after that" and "followed by". */
  const after = m.slice(m.search(APPROVED)).replace(/^\w+\s*(?:by\s+)?/i, '');
  const parts = after.split(/\b(?:and then|then|after that|followed by|and finally|finally)\b|,/i)
    .map((p) => p.replace(/\b(?:first|by|should|must|be|approved|approve|it|and|lastly)\b/gi, ' ').replace(/[.!?]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!parts.length) return { notRead: 'I could not tell who approves. Say who, in order, like "finance first, and then their manager".' };
  const steps: Rule[] = [];
  const who: (string | null)[] = [];
  for (const p of parts) {
    if (/^(?:me|myself|i)$/i.test(p) || /\bme\b/i.test(p) && !ROLE_WORDS.some(([re]) => re.test(p))) {
      const job = theJobOf(speaker.userId, duties);
      if (job) { steps.push(job); who.push(speaker.first); continue; }
      if (isAdmin) { steps.push('admin'); who.push(speaker.first); continue; }
      return { notRead: 'You hold no job that approves spending, so I cannot make you a step. Name the job instead, like finance or their manager.' };
    }
    const person = people.find((x) => x.first && new RegExp(String.raw`\b${x.first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i').test(p));
    const byWords = ROLE_WORDS.find(([re]) => re.test(p))?.[1] ?? null;
    if (person) {
      const job = theJobOf(person.userId, duties);
      if (!job) return { notRead: `${person.first} holds no job that approves spending yet. Approvers are set by job, so make ${person.first} the finance person first on Suites, or say the job, like finance or their manager.` };
      if (byWords && byWords !== job) return { notRead: `${person.first} does not look after ${RULE_IN_WORDS[byWords].replace(/^whoever looks after /, '')}. Say the job, or make ${person.first} hold it first on Suites.` };
      steps.push(job); who.push(person.first); continue;
    }
    if (byWords) { steps.push(byWords); who.push(null); continue; }
    return { notRead: `I could not tell who "${p}" is. Say the job, like finance, their manager or an admin.` };
  }
  return { above, steps: steps.slice(0, 5), who: who.slice(0, 5) };
}

const money = (currency: string | null, n: number) => `${currency ? `${currency} ` : ''}${n.toLocaleString('en-US')}`;

/** What Ask says once it has set them: each step by its job, with the person who holds it now. */
export function theStepsSetSaid(currency: string | null, read: { above: number; steps: Rule[]; who: (string | null)[] }, speakerFirst: string): string {
  const step = (r: Rule, i: number) => {
    const name = read.who[i];
    const said = RULE_IN_WORDS[r];
    return name ? `${said} (${name === speakerFirst ? 'you' : name})` : said;
  };
  const order = read.steps.length === 1
    ? `goes to ${step(read.steps[0], 0)}`
    : `goes first to ${step(read.steps[0], 0)}, ${read.steps.slice(1).map((r, i) => `and then to ${step(r, i + 1)}`).join(', ')}`;
  return `Done. A request to spend over ${money(currency, read.above)} now ${order}. Each one approves only after the one before. You can see and change it on the spending page.`;
}
