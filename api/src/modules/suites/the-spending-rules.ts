import type { PrismaService } from '../prisma/prisma.service';
import type { ARule, Step } from './who-may-decide';
import { stepsFrom, RULE_IN_WORDS, MAX_STEPS } from './the-approval-steps';

/**
 * THE SPENDING RULES AN ADMIN SETS (decision 85, item 2; build step 9 of
 * docs/suites-against-the-workflow-model.md).
 *
 *   - categories the admin names (fuel, travel, equipment, or the organisation's projects), and what a
 *     category is called when Groundwork asks for one ("Which project is this for?");
 *   - evidence: a receipt or a quote, needed for a category (above an amount, or always), or for any
 *     request above an amount. Groundwork keeps only that it is needed and, once finance has it, that
 *     it was given. It keeps no file (where files would live is for Hafsah to say);
 *   - more than one threshold by amount, each with its own approval steps, through the same steps and
 *     resolver every request uses (who-may-decide.ts). A request above a threshold takes that
 *     threshold's steps; above two, the higher one's.
 *
 * THE ONE PLACE THAT SAYS WHO APPROVES A REQUEST TO SPEND (Hafsah's plan of 2 November, step 0). The
 * steps by amount are the only owner. Below the lowest amount, the person's manager approves, or else
 * an admin. The settings card's two answers are the lowest amount and its step: "What is the most a
 * manager may approve on their own?" is that amount, and "Who approves anything above that?" is the
 * person that step names (`{ named }`). So the card, the board's steps, Ask and the policy board all
 * read and write the same rows (`theCardsAnswers`, `withTheCardsAnswers`). Finance is never an
 * approver unless a step says so: whoever looks after finance checks, notes the receipt or quote, and
 * records it paid after the last approval (the-spending-for-finance.service.ts).
 *
 * NOTHING CHANGES BY ITSELF. With nothing set, a request has no category and needs no evidence. A rule
 * about evidence never stops a request: the person is told before they send it, and so is whoever
 * decides it. Only a missing category is asked for, because the request cannot be kept under the
 * rules without it.
 *
 * WHERE IT IS KEPT. In the existing `OrganizationSuite` table, one row for each organisation with the
 * key `spendRules`, beside `duties`, `workflows` and `leaveRules`. An admin or whoever holds the finance
 * duty sets it (`SuitesService.setSpendRules`, decision 85), and each change is kept in the rules history.
 */
export const SPEND_RULES_ROW = 'spendRules';

export type Evidence = 'receipt' | 'quote';
export const EVIDENCE: Evidence[] = ['receipt', 'quote'];

export interface ASpendCategory {
  /** As people say it: "Fuel", "Kisumu depot". */
  name: string;
  /** A receipt or a quote needed for this category. */
  evidence?: Evidence;
  /** Only above this amount. Unset: always. */
  evidenceAbove?: number;
}

export interface AThreshold {
  /** Above this amount, these steps. */
  above: number;
  steps: Step[];
}

export interface SpendRules {
  categories?: ASpendCategory[];
  /** What a category is called when Groundwork asks: "project" asks "Which project is this for?". Unset: "category". */
  categoryCalled?: string;
  /** A receipt or a quote needed for any request above an amount. */
  evidence?: { what: Evidence; above: number };
  /** Thresholds by amount, lowest first, each with its own steps. */
  thresholds?: AThreshold[];
}

export const MAX_CATEGORIES = 30;
export const MAX_THRESHOLDS = 5;
const MAX_AMOUNT = 1e12;

export const SPEND_RULES_REFUSED = {
  onlyAnAdmin: 'Only an admin or whoever looks after finance can set the spending rules.',
  badCategories: `Give up to ${MAX_CATEGORIES} categories, each with a name of 2 to 40 letters.`,
  sameCategoryTwice: 'Two categories have the same name. Give each category its own name.',
  badEvidence: 'Say whether a receipt or a quote is needed, and above which amount, from 0 up.',
  badCalled: 'Say what a category is called in 2 to 30 letters, for example "project".',
  badThresholds: `Give up to ${MAX_THRESHOLDS} amounts, each 0 or more and each only once, and for each between one and ${MAX_STEPS} steps chosen from the person's manager, the head of their team, whoever holds their team's budget, finance, HR, the chief executive, an admin and a person in the organisation.`,
};

const amountIn = (x: unknown, lo = 0): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= MAX_AMOUNT ? x : null);
const isEvidence = (x: unknown): x is Evidence => x === 'receipt' || x === 'quote';
const keyOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

function categoryFrom(v: any): ASpendCategory | 'bad' | 'bad evidence' {
  if (!v || typeof v !== 'object' || typeof v.name !== 'string') return 'bad';
  const name = v.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 40) return 'bad';
  const out: ASpendCategory = { name };
  if (v.evidence !== undefined && v.evidence !== null) {
    if (!isEvidence(v.evidence)) return 'bad evidence';
    out.evidence = v.evidence;
    if (v.evidenceAbove !== undefined && v.evidenceAbove !== null) {
      const above = amountIn(v.evidenceAbove);
      if (above === null) return 'bad evidence';
      if (above > 0) out.evidenceAbove = above;
    }
  } else if (v.evidenceAbove !== undefined && v.evidenceAbove !== null) return 'bad evidence';
  return out;
}

function thresholdsFrom(v: unknown): AThreshold[] | null {
  if (!Array.isArray(v) || v.length > MAX_THRESHOLDS) return null;
  const out: AThreshold[] = [];
  for (const t of v as any[]) {
    const above = amountIn(t?.above, 0);
    const steps = stepsFrom(t?.steps, true);
    if (above === null || !steps || out.some((x) => x.above === above)) return null;
    out.push({ above, steps });
  }
  return out.sort((a, b) => a.above - b.above);
}

/** What is kept, read with care: anything that is not valid is left out. */
export function spendRulesFrom(answers: unknown): SpendRules {
  const a = (answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {}) as Record<string, any>;
  const out: SpendRules = {};
  if (Array.isArray(a.categories)) {
    const seen = new Set<string>();
    const cs = a.categories.map(categoryFrom).filter((c): c is ASpendCategory => typeof c === 'object')
      .filter((c) => (seen.has(keyOf(c.name)) ? false : (seen.add(keyOf(c.name)), true)));
    if (cs.length) out.categories = cs.slice(0, MAX_CATEGORIES);
  }
  if (typeof a.categoryCalled === 'string' && a.categoryCalled.trim().length >= 2 && a.categoryCalled.trim().length <= 30) out.categoryCalled = a.categoryCalled.trim().toLowerCase();
  if (a.evidence && isEvidence(a.evidence.what) && amountIn(a.evidence.above) !== null) out.evidence = { what: a.evidence.what, above: a.evidence.above };
  if (Array.isArray(a.thresholds)) {
    const t = thresholdsFrom(a.thresholds.filter((x: any) => amountIn(x?.above) !== null && stepsFrom(x?.steps, true)));
    if (t?.length) out.thresholds = t;
  }
  return out;
}

export async function readSpendRules(prisma: PrismaService, organizationId: string): Promise<SpendRules> {
  const row = await (prisma as any).organizationSuite
    ?.findUnique({ where: { organizationId_suite: { organizationId, suite: SPEND_RULES_ROW } }, select: { answers: true } })
    ?.catch?.(() => null);
  return spendRulesFrom(row?.answers);
}

/**
 * An admin's change, laid over what is kept. A part given as null (or an empty list) is cleared; one
 * left out is kept. `categories` and `thresholds` are replaced whole. Returns the rules, or the refusal.
 */
export function changeSpendRules(kept: SpendRules, input: unknown): { rules: SpendRules } | { refused: string } {
  const g = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const next: SpendRules = JSON.parse(JSON.stringify(kept));
  if (g.categories !== undefined) {
    if (g.categories === null || (Array.isArray(g.categories) && !g.categories.length)) delete next.categories;
    else {
      if (!Array.isArray(g.categories) || g.categories.length > MAX_CATEGORIES) return { refused: SPEND_RULES_REFUSED.badCategories };
      const cs: ASpendCategory[] = [];
      for (const v of g.categories) {
        const c = categoryFrom(v);
        if (c === 'bad') return { refused: SPEND_RULES_REFUSED.badCategories };
        if (c === 'bad evidence') return { refused: SPEND_RULES_REFUSED.badEvidence };
        if (cs.some((x) => keyOf(x.name) === keyOf(c.name))) return { refused: SPEND_RULES_REFUSED.sameCategoryTwice };
        cs.push(c);
      }
      next.categories = cs;
    }
  }
  if (g.categoryCalled !== undefined) {
    if (g.categoryCalled === null || g.categoryCalled === '') delete next.categoryCalled;
    else {
      const c = typeof g.categoryCalled === 'string' ? g.categoryCalled.trim() : '';
      if (c.length < 2 || c.length > 30 || !/^[a-z][a-z \-]*$/i.test(c)) return { refused: SPEND_RULES_REFUSED.badCalled };
      next.categoryCalled = c.toLowerCase();
    }
  }
  if (g.evidence !== undefined) {
    if (g.evidence === null) delete next.evidence;
    else {
      const above = amountIn(g.evidence?.above);
      if (!isEvidence(g.evidence?.what) || above === null) return { refused: SPEND_RULES_REFUSED.badEvidence };
      next.evidence = { what: g.evidence.what, above };
    }
  }
  if (g.thresholds !== undefined) {
    if (g.thresholds === null || (Array.isArray(g.thresholds) && !g.thresholds.length)) delete next.thresholds;
    else {
      const t = thresholdsFrom(g.thresholds);
      if (!t) return { refused: SPEND_RULES_REFUSED.badThresholds };
      next.thresholds = t;
    }
  }
  return { rules: next };
}

// ------------------------------------------------ a request ------------------------------------------------

/**
 * The category named in the person's words, matched by its whole name ("fuel", "Kisumu depot").
 * Null when none is named, or when more than one is, so Groundwork asks rather than guesses.
 */
export function theCategoryIn(words: string | null | undefined, rules: SpendRules): ASpendCategory | null {
  const cs = rules.categories ?? [];
  if (!cs.length) return null;
  const t = ` ${(words ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  const named = cs.filter((c) => {
    const w = c.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return !!w && (t.includes(` ${w} `) || t.includes(` ${w}s `));
  });
  return named.length === 1 ? named[0] : null;
}

/** A category given by name ("Fuel"), or null when it is not one of the organisation's. */
export function theCategoryCalled(name: unknown, rules: SpendRules): ASpendCategory | null {
  if (typeof name !== 'string' || !name.trim()) return null;
  return (rules.categories ?? []).find((c) => keyOf(c.name) === keyOf(name)) ?? null;
}

/** The evidence a request needs: a receipt, a quote, or both, each with why. Empty when none. */
export function theEvidenceNeeded(rules: SpendRules, amount: number, category: ASpendCategory | null): { what: Evidence; because: 'category' | 'amount'; above: number | null }[] {
  const out: { what: Evidence; because: 'category' | 'amount'; above: number | null }[] = [];
  if (category?.evidence && amount > (category.evidenceAbove ?? 0)) out.push({ what: category.evidence, because: 'category', above: category.evidenceAbove ?? null });
  if (rules.evidence && amount > rules.evidence.above && !out.some((e) => e.what === rules.evidence!.what)) out.push({ what: rules.evidence.what, because: 'amount', above: rules.evidence.above });
  return out;
}

/** The highest threshold a request is above, or null. */
export function theThresholdCrossed(rules: { thresholds?: AThreshold[] } | null | undefined, amount: number): AThreshold | null {
  const crossed = (rules?.thresholds ?? []).filter((t) => amount > t.above);
  return crossed.length ? crossed[crossed.length - 1] : null;
}

// ------------------------------------------------ in words ------------------------------------------------

const group = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
const money = (currency: string | null, n: number) => `${currency ? `${currency} ` : ''}${group(n)}`;
const listed = (xs: string[], joiner = 'and') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${joiner} ${xs[xs.length - 1]}`);
const aOf = (e: Evidence) => (e === 'receipt' ? 'a receipt' : 'a quote');

/** "Which project is this for? It can be Atlas, Kisumu or Naivas." */
export function whichCategory(rules: SpendRules): string {
  const called = rules.categoryCalled ?? 'category';
  return `Which ${called} is this for? It can be ${listed((rules.categories ?? []).map((c) => c.name), 'or')}.`;
}

/** Asked again when the reply named none of them. */
export function whichCategoryAgain(rules: SpendRules): string {
  return `I could not find that among them. ${whichCategory(rules)} You can also say no, and I will not send it.`;
}

/**
 * The evidence needed, in full sentences. For the person asking: "Spending on Fuel needs a receipt, so
 * please keep it for finance." For whoever decides: "Spending on Fuel needs a receipt."
 */
export function theEvidenceSaid(needs: ReturnType<typeof theEvidenceNeeded>, category: ASpendCategory | null, currency: string | null, you: boolean): string[] {
  return needs.map((e) => {
    const what = e.because === 'category' && category
      ? `Spending on ${category.name}${e.above ? ` over ${money(currency, e.above)}` : ''}`
      : e.above ? `Any request over ${money(currency, e.above)}` : 'Every request';
    if (!you) return `${what} needs ${aOf(e.what)}.`;
    return e.what === 'receipt' ? `${what} needs a receipt, so please keep it for finance.` : `${what} needs a quote, so please have one ready for finance.`;
  });
}

/** Who the route names, for saying it: a named person's first name, and the first name of whoever looks after finance. */
export interface TheRouteNames { nameOf?: (userId: string) => string | null | undefined; finance?: string | null }

const ruleWords = (r: ARule, names: TheRouteNames) => (typeof r === 'object' ? names.nameOf?.(r.named) || 'the person named' : RULE_IN_WORDS[r]);
const orElse = (s: Step, names: TheRouteNames) => s.slice(1).map((r) => `, or else ${ruleWords(r, names)}`).join('');

/** "the person’s manager approves, or else an admin"; with more steps, "X approves first, and then Y approves". */
function whoApproves(steps: Step[], names: TheRouteNames): string {
  if (steps.length === 1) return `${ruleWords(steps[0][0], names)} approves${orElse(steps[0], names)}`;
  return steps.map((s, i) => `${i ? 'then ' : ''}${ruleWords(s[0], names)} approves${i ? '' : ' first'}${orElse(s, names)}`).join(', and ');
}

/** The steps below the lowest amount: the person's manager, or else an admin. */
export const THE_STEPS_BELOW_EVERY_AMOUNT: Step[] = [['manager', 'admin']];

/**
 * THE WHOLE ROUTE OF A REQUEST TO SPEND, said where it is set: who approves at each amount, and then finance's part. "Up to KES 10,000,
 * the person’s manager approves, or else an admin. Over KES 10,000, Wanjiru approves. Once it is approved, Njeri in finance checks it,
 * notes the receipt or quote, and records it paid."
 */
export function theRouteSaid(rules: SpendRules, currency: string | null, names: TheRouteNames = {}): string[] {
  const out: string[] = [];
  const t = rules.thresholds ?? [];
  const cap = (x: string) => `${x.charAt(0).toUpperCase()}${x.slice(1)}`;
  if (!t.length) out.push(`For any amount, ${whoApproves(THE_STEPS_BELOW_EVERY_AMOUNT, names)}.`);
  else if (t[0].above > 0) out.push(`Up to ${money(currency, t[0].above)}, ${whoApproves(THE_STEPS_BELOW_EVERY_AMOUNT, names)}.`);
  for (const x of t) out.push(`${x.above > 0 ? `Over ${money(currency, x.above)}` : 'For any amount'}, ${whoApproves(x.steps, names)}.`);
  if (t.length > 1) out.push('A request over more than one of these amounts follows the highest one.');
  if (t.some((x) => x.steps.length > 1)) out.push('Each approval sends it to the next step, and only the last step ends it. A decline ends it at any step.');
  out.push(names.finance
    ? `Once it is approved, ${names.finance} in finance checks it, notes the receipt or quote, and records it paid.`
    : 'Once it is approved, whoever looks after finance checks it, notes the receipt or quote, and records it paid. Nobody looks after finance yet, so an admin does this.');
  return out.map(cap);
}

/**
 * THE SETTINGS CARD'S ANSWERS, READ FROM THE STEPS BY AMOUNT. "What is the most a manager may approve on their own?" is the lowest
 * amount above nothing, and "Who approves anything above that?" the person its first step names. Kept nowhere else. A row at nothing
 * (steps for any amount, set by talking or on the board) is not the card's, unless it names one person, which is a limit of nothing.
 */
const theCardsRow = (rules: SpendRules) => (rules.thresholds ?? []).find((t) => t.above > 0 || (t.steps.length === 1 && typeof t.steps[0][0] === 'object'));
export function theCardsAnswers(rules: SpendRules): { limit: number | null; above: string | null } {
  const lowest = theCardsRow(rules);
  const named = lowest?.steps[0]?.find((r): r is { named: string } => typeof r === 'object');
  return { limit: lowest?.above ?? null, above: named?.named ?? null };
}

/**
 * The settings card saved: its two answers become the lowest amount and its step, in the same rows the board edits. When nothing
 * the card says has changed, the rows stay as they are, so a currency saved again never undoes the board's steps.
 */
export function withTheCardsAnswers(rules: SpendRules, given: { limit?: unknown; above?: unknown }): SpendRules {
  const now = theCardsAnswers(rules);
  const limit = typeof given.limit === 'number' && given.limit >= 0 ? given.limit : null;
  const above = typeof given.above === 'string' && given.above.trim() ? given.above.trim() : null;
  if (limit === now.limit && above === now.above) return rules;
  const card = theCardsRow(rules);
  const rest = (rules.thresholds ?? []).filter((x) => x !== card && x.above !== limit);
  const thresholds = [...rest, ...(limit !== null ? [{ above: limit, steps: [[above ? { named: above } : 'admin']] as Step[] }] : [])].sort((a, b) => a.above - b.above);
  const next: SpendRules = { ...rules };
  if (thresholds.length) next.thresholds = thresholds; else delete next.thresholds;
  return next;
}

/** The rules said back to the admin who sets them, in full sentences: the route first, then categories and evidence. */
export function theSpendRulesSaid(rules: SpendRules, currency: string | null, names: TheRouteNames = {}): string[] {
  const out: string[] = theRouteSaid(rules, currency, names);
  const called = rules.categoryCalled ?? 'category';
  if (rules.categories?.length) {
    out.push(`Each request to spend is for one ${called}: ${listed(rules.categories.map((c) => c.name))}. When somebody does not say which, Groundwork asks “Which ${called} is this for?” before it sends anything.`);
    for (const c of rules.categories) {
      if (c.evidence) out.push(`Spending on ${c.name}${c.evidenceAbove ? ` over ${money(currency, c.evidenceAbove)}` : ''} needs ${aOf(c.evidence)}.`);
    }
  } else {
    out.push('There are no categories set, so a request to spend is kept in the person’s own words.');
  }
  if (rules.evidence) out.push(`${rules.evidence.above ? `Any request over ${money(currency, rules.evidence.above)}` : 'Every request'} needs ${aOf(rules.evidence.what)}.`);
  if (rules.categories?.some((c) => c.evidence) || rules.evidence) {
    out.push('Groundwork keeps only that a receipt or a quote is needed and whether finance has had it. It keeps no file. A rule about evidence never stops a request: the person is told before they send it, and so is whoever decides it.');
  }
  return out;
}
