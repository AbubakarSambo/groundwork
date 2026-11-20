import type { PrismaService } from '../prisma/prisma.service';
import { saidAsADay } from './who-is-away';
import { stepsFrom, stepsSaid, MAX_STEPS } from './the-approval-steps';
import type { Step } from './who-may-decide';
import { MONDAY_TO_FRIDAY, type ABalanceRule, type TheCalendarRules } from './the-leave-calendar';

/**
 * THE LEAVE RULES AN ADMIN SETS (decision 85, item 1; build step 8 of
 * docs/suites-against-the-workflow-model.md).
 *
 *   - kinds of leave (annual, sick, and any others the admin names), each with its own number of days
 *     a year, or none;
 *   - the notice needed, for all leave or for one kind;
 *   - blackout periods, when nobody takes leave;
 *   - who may take leave: only after a number of days here (for example the first 90);
 *   - a document needed for a kind after a number of working days (for example a sick note after two);
 *   - HR told: whoever holds the HR duty (who-holds-each-duty.ts) is told of each approved request, or
 *     of each request, as the admin chooses;
 *   - leave by length (decision 85, Hafsah's example: "If it's more than 10 working days, department
 *     head also approves"): thresholds by working days, the way spending has thresholds by amount, each
 *     with its own approval steps, through the same steps and resolver every request uses
 *     (who-may-decide.ts, `theStepsFor('leave', answers, days)`). A request longer than a threshold
 *     takes that threshold's steps; longer than two, the higher one's. With none set, every request
 *     takes the approval steps exactly as before.
 *
 * NOTHING CHANGES BY ITSELF. With nothing set, every request is "leave", one number of days a year
 * from the suite's own answer, no notice, no blackout, nobody is turned away and HR is told nothing:
 * exactly what ran before. The rules never stop a request. The person is told in their say-back when
 * one applies ("Annual leave needs two weeks’ notice, and this starts in five days. Shall I still send
 * it to Wairimu?"), and whoever decides reads the same.
 *
 * WHERE IT IS KEPT. In the existing `OrganizationSuite` table, one row for each organisation with the
 * key `leaveRules`, beside `duties` and `workflows`, so switching the leave suite on again keeps it.
 * An admin or whoever holds the HR duty sets it (`SuitesService.setLeaveRules`, decision 85), and each
 * change is kept in the history.
 *
 * THE LEAVE POLICY (Hafsah, 20 November 2026) is kept here too, beside the kinds: for each kind whether it is
 * paid, its days a year or each time, who it is for in words and whether adoptive parents are included, and
 * its own approval steps; whether weekends and public holidays count as leave days and which weekdays people
 * work; how annual leave builds up, the month the leave year starts, what is carried over and when that
 * expires; and the organisation's own country. Offices and public holidays are dated rows of their own
 * (`LeaveOffice`, `PublicHoliday`). The days a request uses and the days left are counted from all of this in
 * one place, the-leave-calendar.ts.
 *
 * THE KIND OF LEAVE is read by whoever decides it, an admin, a lead of the team, and HR when told,
 * as decision 85 says ("Sarah, Annual Leave"). It never reaches the engine: who-is-away.ts still gives
 * the dates only (decision 31), and nothing about a kind reaches a check-in, a report or a colleague.
 */
export const LEAVE_RULES_ROW = 'leaveRules';

export type Day = string;

export interface ALeaveKind {
  /** Kept on each request (`LeaveRequest.kind`): "annual", "sick", "compassionate". */
  key: string;
  /** As people say it: "Annual leave", "Sick leave". */
  name: string;
  /** Days a year for each person, or null for no set number. */
  days: number | null;
  /** Days' notice for this kind, in place of the rule for all leave. */
  noticeDays?: number;
  /** A document is needed once a request of this kind is longer than this many working days. */
  documentAfterDays?: number;
  /** The document, as people say it: "a sick note". */
  document?: string;
  /** "occasion" when `days` is how long it is each time it is taken (maternity leave of 90 days), not a number a year. */
  per?: 'occasion';
  /** Whether it is paid. Left out: not said. */
  paid?: boolean;
  /** Who it is for, in the admin's words: "birth or adoptive parents", "after 6 months of service". */
  whoFor?: string;
  /** Whether adoptive parents may take it as well as birth parents. Left out: not said. */
  adoptive?: boolean;
  /** Its own approval steps, in place of the leave rules' steps. Left out: the same steps as all leave. */
  steps?: Step[];
  /** Weekends and public holidays inside it count as leave days, whatever the rule for all leave. */
  everyDay?: boolean;
}

/** The types of leave most policies have, as the set-up offers them. The admin may name any other. */
export const STANDARD_KINDS: { key: string; name: string; per: 'year' | 'occasion'; noNotice?: boolean; asksAdoptive?: boolean; unpaid?: boolean; asksDocument?: boolean }[] = [
  { key: 'annual', name: 'Annual leave', per: 'year' },
  { key: 'sick', name: 'Sick leave', per: 'year', noNotice: true, asksDocument: true },
  { key: 'compassionate', name: 'Compassionate leave', per: 'occasion', noNotice: true },
  { key: 'maternity', name: 'Maternity leave', per: 'occasion', asksAdoptive: true },
  { key: 'paternity', name: 'Paternity leave', per: 'occasion', asksAdoptive: true },
  { key: 'adoption', name: 'Adoption leave', per: 'occasion' },
  { key: 'unpaid', name: 'Unpaid leave', per: 'year', unpaid: true },
];

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface LeaveRules {
  kinds?: ALeaveKind[];
  noticeDays?: number;
  blackouts?: { from: Day; to: Day; why?: string }[];
  eligibleAfterDays?: number;
  tellHr?: 'approved' | 'every';
  /** Leave by length: longer than `above` working days, these steps. Lowest first. */
  thresholds?: ALeaveThreshold[];
  /** The weekdays people work, 0 for Sunday to 6 for Saturday. Left out: Monday to Friday. */
  workingWeek?: number[];
  /** Whether weekends inside a request count as leave days. Left out: they do not. */
  weekendsCount?: boolean;
  /** Whether public holidays inside a request count as leave days. Left out: they do not. */
  holidaysCount?: boolean;
  /** The organisation's own country, as the admin says it ("Kenya"). Its public holidays are the rows with no office. */
  country?: string;
  /** Annual leave: all at the start of the leave year, or built up each month. Left out: all at the start. */
  accrual?: 'start' | 'monthly';
  /** The month the leave year starts, 1 to 12. Left out: January. */
  yearStarts?: number;
  /** Annual leave carried into the next leave year: up to a number of days, or all. Left out: none. */
  carryOver?: number | 'all';
  /** Carried-over days must be used by the end of this month of the new leave year, 1 to 12. Left out: they never expire. */
  carryExpires?: number;
  /** Leave left is carried over only from leave years that start on or after this day (the leave year after carry-over was set). */
  carryFrom?: Day;
}

/** Leave longer than this many working days takes these steps. */
export interface ALeaveThreshold {
  above: number;
  steps: Step[];
}

export const MAX_KINDS = 12;
export const MAX_LEAVE_THRESHOLDS = 5;
export const MAX_BLACKOUTS = 20;

export const LEAVE_RULES_REFUSED = {
  onlyAnAdmin: 'Only an admin or whoever looks after HR can set the leave rules.',
  badKinds: `Give up to ${MAX_KINDS} kinds of leave, each with a name of 2 to 40 letters and a number of days a year from 0 to 365, or none.`,
  sameKindTwice: 'Two kinds of leave have the same name. Give each kind its own name.',
  badDocument: 'Say which document is needed, in up to 60 letters, and after how many working days, from 0 to 60.',
  badNotice: 'Give the notice as a whole number of days from 0 to 365.',
  badBlackouts: `Give up to ${MAX_BLACKOUTS} blackout periods, each with a first and a last day, the last on or after the first, and a reason of up to 120 letters if you want one.`,
  badEligibility: 'Give the number of days somebody must have been here before they take leave, from 0 to 730.',
  badTellHr: 'Say whether HR is told of each approved request or of each request.',
  badWeek: 'Give the days people work as weekdays, at least one.',
  badYes: 'Say yes or no.',
  badCountry: 'Give the country in up to 80 letters.',
  badAccrual: 'Say whether annual leave is given all at the start of the leave year or built up each month.',
  badMonth: 'Give a month, from January to December.',
  badCarryOver: 'Say how many days of annual leave can be carried into the next year, from 0 to 365, or all of them.',
  badKindDetails: 'Say who each kind of leave is for in up to 120 letters, and give its approval steps chosen from the person\'s manager, their manager\'s manager, the head of their team, whoever holds their team\'s budget, finance, HR, the chief executive and an admin.',
  badThresholds: `Give up to ${MAX_LEAVE_THRESHOLDS} lengths of leave, each a whole number of working days from 1 to 365 that no other length has, and between one and ${MAX_STEPS} steps chosen from the person's manager, their manager's manager, the head of their team, whoever holds their team's budget, finance, HR, the chief executive and an admin.`,
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (x: unknown): x is Day => typeof x === 'string' && ISO.test(x) && !Number.isNaN(new Date(`${x}T00:00:00Z`).getTime());
const wholeIn = (x: unknown, lo: number, hi: number): number | null => (typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi ? x : null);

/** "Annual leave" gives "annual", "Sick leave" "sick", "Compassionate leave" "compassionate". At most 16 letters. */
export function aKindsKey(name: string): string {
  const k = name.toLowerCase().replace(/\bleave\b/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 16).replace(/-+$/, '');
  return k || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16) || 'leave';
}

/** "Annual leave" for a name given as "annual" or "Annual". */
const asAName = (name: string) => {
  const n = name.trim().replace(/\s+/g, ' ');
  const withLeave = /\bleave\b/i.test(n) ? n : `${n} leave`;
  return `${withLeave.charAt(0).toUpperCase()}${withLeave.slice(1)}`;
};

function kindFrom(v: any): ALeaveKind | 'bad' | 'bad document' | 'bad details' {
  if (!v || typeof v !== 'object' || typeof v.name !== 'string') return 'bad';
  const raw = v.name.trim();
  if (raw.length < 2 || raw.length > 40) return 'bad';
  const days = v.days === null || v.days === undefined ? null : wholeIn(v.days, 0, 365);
  if (v.days !== null && v.days !== undefined && days === null) return 'bad';
  const known = STANDARD_KINDS.find((k) => k.key === v.key || k.key === aKindsKey(raw));
  const out: ALeaveKind = { key: known?.key ?? aKindsKey(raw), name: asAName(raw), days };
  if (v.noticeDays !== undefined && v.noticeDays !== null) {
    const n = wholeIn(v.noticeDays, 0, 365);
    if (n === null) return 'bad';
    out.noticeDays = n;
  }
  if ((v.document !== undefined && v.document !== null) || (v.documentAfterDays !== undefined && v.documentAfterDays !== null)) {
    const doc = typeof v.document === 'string' ? v.document.trim() : '';
    const after = wholeIn(v.documentAfterDays ?? 0, 0, 60);
    if (!doc || doc.length > 60 || after === null) return 'bad document';
    out.document = doc;
    out.documentAfterDays = after;
  }
  if (v.per === 'occasion') out.per = 'occasion';
  if (typeof v.paid === 'boolean') out.paid = v.paid;
  if (typeof v.adoptive === 'boolean') out.adoptive = v.adoptive;
  if (v.everyDay === true) out.everyDay = true;
  if (v.whoFor !== undefined && v.whoFor !== null) {
    const w = typeof v.whoFor === 'string' ? v.whoFor.trim().replace(/\s+/g, ' ') : '';
    if (!w || w.length > 120) return 'bad details';
    out.whoFor = w.replace(/[.\s]+$/, '');
  }
  if (v.steps !== undefined && v.steps !== null) {
    const steps = stepsFrom(v.steps);
    if (!steps) return 'bad details';
    out.steps = steps;
  }
  return out;
}

const WEEKDAYS_OK = (v: unknown): v is number[] => Array.isArray(v) && v.length >= 1 && v.length <= 7 && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);

/** The policy's parts that are not kinds, read with care; anything that is not valid is left out. */
function thePolicyFrom(a: Record<string, any>, out: LeaveRules): void {
  if (WEEKDAYS_OK(a.workingWeek)) {
    const w = [...new Set(a.workingWeek as number[])].sort();
    if (w.join() !== MONDAY_TO_FRIDAY.join()) out.workingWeek = w;
  }
  if (a.weekendsCount === true) out.weekendsCount = true;
  if (a.holidaysCount === true) out.holidaysCount = true;
  if (typeof a.country === 'string' && a.country.trim() && a.country.trim().length <= 80) out.country = a.country.trim();
  if (a.accrual === 'monthly') out.accrual = 'monthly';
  const ys = wholeIn(a.yearStarts, 1, 12);
  if (ys && ys !== 1) out.yearStarts = ys;
  if (a.carryOver === 'all') out.carryOver = 'all';
  else { const c = wholeIn(a.carryOver, 1, 365); if (c) out.carryOver = c; }
  const ce = wholeIn(a.carryExpires, 1, 12);
  if (ce && out.carryOver) out.carryExpires = ce;
  if (out.carryOver && isDay(a.carryFrom)) out.carryFrom = a.carryFrom;
}

/** Leave thresholds as given, lowest first, or null when any is not valid. */
function leaveThresholdsFrom(v: unknown): ALeaveThreshold[] | null {
  if (!Array.isArray(v) || v.length > MAX_LEAVE_THRESHOLDS) return null;
  const out: ALeaveThreshold[] = [];
  for (const t of v as any[]) {
    const above = wholeIn(t?.above, 1, 365);
    const steps = stepsFrom(t?.steps);
    if (above === null || !steps || out.some((x) => x.above === above)) return null;
    out.push({ above, steps });
  }
  return out.sort((a, b) => a.above - b.above);
}

/** What is kept, read with care: anything that is not valid is left out. */
export function leaveRulesFrom(answers: unknown): LeaveRules {
  const a = (answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {}) as Record<string, any>;
  const out: LeaveRules = {};
  thePolicyFrom(a, out);
  if (Array.isArray(a.kinds)) {
    const kinds = a.kinds.map(kindFrom).filter((k): k is ALeaveKind => typeof k === 'object');
    if (kinds.length) out.kinds = kinds.slice(0, MAX_KINDS);
  }
  const notice = wholeIn(a.noticeDays, 0, 365);
  if (notice) out.noticeDays = notice;
  if (Array.isArray(a.blackouts)) {
    const b = a.blackouts.filter((x: any) => x && isDay(x.from) && isDay(x.to) && x.to >= x.from)
      .map((x: any) => ({ from: x.from, to: x.to, ...(typeof x.why === 'string' && x.why.trim() ? { why: x.why.trim().slice(0, 120) } : {}) }));
    if (b.length) out.blackouts = b.slice(0, MAX_BLACKOUTS);
  }
  const eligible = wholeIn(a.eligibleAfterDays, 0, 730);
  if (eligible) out.eligibleAfterDays = eligible;
  if (a.tellHr === 'approved' || a.tellHr === 'every') out.tellHr = a.tellHr;
  if (Array.isArray(a.thresholds)) {
    const t = leaveThresholdsFrom(a.thresholds.filter((x: any) => wholeIn(x?.above, 1, 365) !== null && stepsFrom(x?.steps)));
    if (t?.length) out.thresholds = t;
  }
  return out;
}

export async function readLeaveRules(prisma: PrismaService, organizationId: string): Promise<LeaveRules> {
  const row = await (prisma as any).organizationSuite
    ?.findUnique({ where: { organizationId_suite: { organizationId, suite: LEAVE_RULES_ROW } }, select: { answers: true } })
    .catch(() => null);
  return leaveRulesFrom(row?.answers);
}

/**
 * An admin's change, laid over what is kept. A part given as null is cleared; one left out is kept.
 * `kinds` and `blackouts` are replaced whole. Returns the rules to keep, or the refusal.
 */
export function changeLeaveRules(kept: LeaveRules, input: unknown, today: Date = new Date()): { rules: LeaveRules } | { refused: string } {
  const g = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const next: LeaveRules = JSON.parse(JSON.stringify(kept));
  const yesNo = (key: 'weekendsCount' | 'holidaysCount'): string | null => {
    if (g[key] === undefined) return null;
    if (g[key] === null || g[key] === false) delete next[key];
    else if (g[key] === true) next[key] = true;
    else return LEAVE_RULES_REFUSED.badYes;
    return null;
  };
  if (g.workingWeek !== undefined) {
    if (g.workingWeek === null) delete next.workingWeek;
    else if (!WEEKDAYS_OK(g.workingWeek)) return { refused: LEAVE_RULES_REFUSED.badWeek };
    else {
      const w = [...new Set(g.workingWeek as number[])].sort();
      if (w.join() === MONDAY_TO_FRIDAY.join()) delete next.workingWeek; else next.workingWeek = w;
    }
  }
  for (const k of ['weekendsCount', 'holidaysCount'] as const) { const r = yesNo(k); if (r) return { refused: r }; }
  if (g.country !== undefined) {
    if (g.country === null || (typeof g.country === 'string' && !g.country.trim())) delete next.country;
    else if (typeof g.country !== 'string' || g.country.trim().length > 80) return { refused: LEAVE_RULES_REFUSED.badCountry };
    else next.country = g.country.trim();
  }
  if (g.accrual !== undefined) {
    if (g.accrual === null || g.accrual === 'start') delete next.accrual;
    else if (g.accrual === 'monthly') next.accrual = 'monthly';
    else return { refused: LEAVE_RULES_REFUSED.badAccrual };
  }
  if (g.yearStarts !== undefined) {
    if (g.yearStarts === null || g.yearStarts === 1) delete next.yearStarts;
    else { const m = wholeIn(g.yearStarts, 1, 12); if (m === null) return { refused: LEAVE_RULES_REFUSED.badMonth }; next.yearStarts = m; }
  }
  if (g.carryOver !== undefined) {
    const had = !!next.carryOver;
    if (g.carryOver === null || g.carryOver === 0) { delete next.carryOver; delete next.carryExpires; delete next.carryFrom; }
    else if (g.carryOver === 'all') next.carryOver = 'all';
    else { const c = wholeIn(g.carryOver, 1, 365); if (c === null) return { refused: LEAVE_RULES_REFUSED.badCarryOver }; next.carryOver = c; }
    /* Leave left over is carried only from the next leave year on, the first one Groundwork records from its start. */
    if (next.carryOver && !had) next.carryFrom = theNextLeaveYearFrom(today, g.yearStarts ?? next.yearStarts);
  }
  if (g.carryExpires !== undefined) {
    if (g.carryExpires === null) delete next.carryExpires;
    else { const m = wholeIn(g.carryExpires, 1, 12); if (m === null) return { refused: LEAVE_RULES_REFUSED.badMonth }; if (next.carryOver) next.carryExpires = m; }
  }
  if (g.kinds !== undefined) {
    if (g.kinds === null || (Array.isArray(g.kinds) && !g.kinds.length)) delete next.kinds;
    else {
      if (!Array.isArray(g.kinds) || g.kinds.length > MAX_KINDS) return { refused: LEAVE_RULES_REFUSED.badKinds };
      const kinds: ALeaveKind[] = [];
      for (const v of g.kinds) {
        const k = kindFrom(v);
        if (k === 'bad') return { refused: LEAVE_RULES_REFUSED.badKinds };
        if (k === 'bad document') return { refused: LEAVE_RULES_REFUSED.badDocument };
        if (k === 'bad details') return { refused: LEAVE_RULES_REFUSED.badKindDetails };
        if (kinds.some((x) => x.key === k.key)) return { refused: LEAVE_RULES_REFUSED.sameKindTwice };
        kinds.push(k);
      }
      next.kinds = kinds;
    }
  }
  if (g.noticeDays !== undefined) {
    if (g.noticeDays === null || g.noticeDays === 0) delete next.noticeDays;
    else {
      const n = wholeIn(g.noticeDays, 0, 365);
      if (n === null) return { refused: LEAVE_RULES_REFUSED.badNotice };
      next.noticeDays = n;
    }
  }
  if (g.blackouts !== undefined) {
    if (g.blackouts === null || (Array.isArray(g.blackouts) && !g.blackouts.length)) delete next.blackouts;
    else {
      if (!Array.isArray(g.blackouts) || g.blackouts.length > MAX_BLACKOUTS) return { refused: LEAVE_RULES_REFUSED.badBlackouts };
      const out: { from: Day; to: Day; why?: string }[] = [];
      for (const x of g.blackouts) {
        if (!x || !isDay(x.from) || !isDay(x.to) || x.to < x.from) return { refused: LEAVE_RULES_REFUSED.badBlackouts };
        if (x.why !== undefined && x.why !== null && (typeof x.why !== 'string' || x.why.trim().length > 120)) return { refused: LEAVE_RULES_REFUSED.badBlackouts };
        out.push({ from: x.from, to: x.to, ...(typeof x.why === 'string' && x.why.trim() ? { why: x.why.trim() } : {}) });
      }
      next.blackouts = out;
    }
  }
  if (g.eligibleAfterDays !== undefined) {
    if (g.eligibleAfterDays === null || g.eligibleAfterDays === 0) delete next.eligibleAfterDays;
    else {
      const n = wholeIn(g.eligibleAfterDays, 0, 730);
      if (n === null) return { refused: LEAVE_RULES_REFUSED.badEligibility };
      next.eligibleAfterDays = n;
    }
  }
  if (g.tellHr !== undefined) {
    if (g.tellHr === null) delete next.tellHr;
    else if (g.tellHr === 'approved' || g.tellHr === 'every') next.tellHr = g.tellHr;
    else return { refused: LEAVE_RULES_REFUSED.badTellHr };
  }
  if (g.thresholds !== undefined) {
    if (g.thresholds === null || (Array.isArray(g.thresholds) && !g.thresholds.length)) delete next.thresholds;
    else {
      const t = leaveThresholdsFrom(g.thresholds);
      if (!t) return { refused: LEAVE_RULES_REFUSED.badThresholds };
      next.thresholds = t;
    }
  }
  return { rules: next };
}

/** The first day of the leave year after the one `today` is in. */
function theNextLeaveYearFrom(today: Date, yearStarts?: number): Day {
  const s = wholeIn(yearStarts, 1, 12) ?? 1;
  const y = today.getUTCFullYear(), m = today.getUTCMonth() + 1;
  return new Date(Date.UTC(m >= s ? y + 1 : y, s - 1, 1)).toISOString().slice(0, 10);
}

/** What the leave calendar reads of the rules (the-leave-calendar.ts). */
export const theCalendarRulesOf = (rules: LeaveRules): TheCalendarRules => ({ workingWeek: rules.workingWeek, weekendsCount: rules.weekendsCount, holidaysCount: rules.holidaysCount });

/** The key of annual leave: the kind keyed "annual", or else the first kind. Accrual and carry-over are only for it. */
export const theAnnualKey = (rules: LeaveRules): string | null => (rules.kinds?.length ? (rules.kinds.find((k) => k.key === 'annual') ?? rules.kinds[0]).key : null);

/**
 * How the days of one kind are given, for its balance (the-leave-calendar.ts). With no kinds, the suite's one number, which is
 * annual leave. A kind taken each time (maternity leave) has no number a year, so no balance.
 */
export function theBalanceRuleOf(rules: LeaveRules, kind: ALeaveKind | null, perYear: number | null): ABalanceRule {
  const days = kind ? (kind.per === 'occasion' ? null : kind.days) : perYear;
  const annual = !kind || kind.key === theAnnualKey(rules);
  return {
    perYear: days,
    yearStarts: rules.yearStarts,
    ...(annual ? { accrual: rules.accrual, carryOver: rules.carryOver, carryExpires: rules.carryExpires ?? null, carryFrom: rules.carryFrom ?? null } : {}),
  };
}

// ------------------------------------------------ kinds ------------------------------------------------

/** The kind a request is kept under, from what the person said: a kind's name in their words, or else the first kind. */
export function theKindSaid(message: string | null | undefined, rules: LeaveRules): ALeaveKind | null {
  const kinds = rules.kinds ?? [];
  if (!kinds.length) return null;
  const t = ` ${(message ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  const named = kinds.find((k) => {
    const words = k.name.toLowerCase().replace(/\bleave\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
    return (words && t.includes(` ${words} `)) || t.includes(` ${k.key.replace(/-/g, ' ')} `);
  });
  return named ?? kinds[0];
}

/** The kind a kept request belongs to. A request kept before kinds were set, or under a kind since removed, counts as the first kind. */
export function theKindOf(kind: string | null | undefined, rules: LeaveRules): ALeaveKind | null {
  const kinds = rules.kinds ?? [];
  if (!kinds.length) return null;
  return kinds.find((k) => k.key === kind) ?? kinds[0];
}

/** Whether weekends count as leave days for a request of this kind, so its days are said as days of leave, not working days. */
export const everyDayCounts = (rules: LeaveRules, kind: ALeaveKind | null | undefined) => !!(rules.weekendsCount || kind?.everyDay);

/** "annual leave", for the middle of a sentence. */
export const inASentence = (k: ALeaveKind) => `${k.name.charAt(0).toLowerCase()}${k.name.slice(1)}`;

// ------------------------------------------------ in words ------------------------------------------------

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => (n >= 0 && n <= 10 ? NUMBERS[n] : String(n));

/** "more than ten working days", "more than one working day". */
export const moreThanWorkingDays = (n: number) => `more than ${inWords(n)} working ${n === 1 ? 'day' : 'days'}`;

/** "two weeks’ notice", "one day’s notice", "10 days’ notice". */
export function noticeInWords(days: number): string {
  if (days >= 7 && days % 7 === 0) { const w = days / 7; return `${inWords(w)} ${w === 1 ? 'week’s' : 'weeks’'} notice`; }
  return `${inWords(days)} ${days === 1 ? 'day’s' : 'days’'} notice`;
}

const DAY = 86_400_000;
const at = (d: Day) => new Date(`${d}T00:00:00.000Z`).getTime();
const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const from = (a: Day, b: Day) => (a === b ? `on ${saidAsADay(a)}` : `from ${saidAsADay(a)} to ${saidAsADay(b)}`);

export interface ARequestToCheck {
  kind: ALeaveKind | null;
  startsOn: Day;
  endsOn: Day;
  /** Working days it takes. */
  days: number;
  /** The day it was asked for: today for a say-back, `askedAt` for a request already sent. */
  askedOn: Day;
  /** When the person was first in this organisation here, or null when not known. */
  hereSince: Date | null;
}

/**
 * Each rule that applies to one request, in full sentences, for two readers. `you` is the person who
 * asked, reading their own say-back ("Annual leave needs two weeks’ notice, and this starts in five
 * days."); for whoever decides, the person is named ("Annual leave needs two weeks’ notice, and Aisha
 * asked five days before it starts."). Empty when no rule applies.
 */
export function theRulesThatApply(rules: LeaveRules, r: ARequestToCheck, reader: { you: true } | { name: string }): string[] {
  const out: string[] = [];
  const you = 'you' in reader;
  const who = you ? 'you' : (reader as { name: string }).name;
  const whose = you ? 'your' : `${(reader as { name: string }).name}'s`;
  const what = r.kind ? r.kind.name : 'Leave';

  const notice = r.kind?.noticeDays ?? rules.noticeDays;
  if (notice) {
    const ahead = Math.round((at(r.startsOn) - at(r.askedOn)) / DAY);
    if (ahead < notice) {
      const when = ahead <= 0 ? (ahead === 0 ? 'today' : 'already') : ahead === 1 ? 'tomorrow' : `in ${inWords(ahead)} days`;
      out.push(you
        ? `${what} needs ${noticeInWords(notice)}, and this ${ahead < 0 ? 'has already started' : `starts ${when}`}.`
        : `${what} needs ${noticeInWords(notice)}, and ${who} asked ${ahead <= 0 ? 'on or after the first day' : `${inWords(ahead)} ${ahead === 1 ? 'day' : 'days'} before it starts`}.`);
    }
  }
  for (const b of rules.blackouts ?? []) {
    if (r.startsOn <= b.to && b.from <= r.endsOn) {
      out.push(`Nobody can take leave ${from(b.from, b.to)}${b.why ? `, because of ${b.why.replace(/[.\s]+$/, '')}` : ''}, and ${whose} days fall in that time.`);
    }
  }
  if (rules.eligibleAfterDays) {
    const here = r.hereSince ? Math.floor((at(r.askedOn) - at(dayOf(r.hereSince))) / DAY) : null;
    if (here !== null && here < rules.eligibleAfterDays) {
      out.push(`Leave can be taken once somebody has been here ${rules.eligibleAfterDays} days, and ${who} ${you ? 'have' : 'has'} been here ${here} ${here === 1 ? 'day' : 'days'}.`);
    }
  }
  if (r.kind?.per === 'occasion' && r.kind.days != null && r.days > r.kind.days) {
    out.push(you
      ? `${r.kind.name} is up to ${r.kind.days} ${r.kind.days === 1 ? 'day' : 'days'} each time, and this is ${r.days} ${r.days === 1 ? 'day' : 'days'}.`
      : `${r.kind.name} is up to ${r.kind.days} ${r.kind.days === 1 ? 'day' : 'days'} each time, and ${who} asked for ${r.days} ${r.days === 1 ? 'day' : 'days'}.`);
  }
  if (r.kind?.document && r.days > (r.kind.documentAfterDays ?? 0)) {
    const longer = r.kind.documentAfterDays ? ` of more than ${inWords(r.kind.documentAfterDays)} working ${r.kind.documentAfterDays === 1 ? 'day' : 'days'}` : '';
    out.push(you
      ? `${r.kind.name}${longer} needs ${r.kind.document}, so please have it ready.`
      : `${r.kind.name}${longer} needs ${r.kind.document}. Ask ${who} for it if you have not had it.`);
  }
  return out;
}

/** One type of leave in full sentences: how long, paid or not, who it is for, notice, documents and its own approval steps. */
export function aKindSaid(k: ALeaveKind): string[] {
  const out: string[] = [];
  out.push(k.days == null ? `${k.name} has no set number of days.`
    : k.per === 'occasion' ? `${k.name} is up to ${k.days} ${k.days === 1 ? 'day' : 'days'} each time it is taken.`
    : `Each person has ${k.days} ${k.days === 1 ? 'day' : 'days'} of ${inASentence(k)} a year.`);
  /* "Unpaid leave is unpaid" says nothing: its name already does. */
  if (k.paid !== undefined && !(k.key === 'unpaid' && !k.paid)) out.push(`${k.name} is ${k.paid ? 'paid' : 'unpaid'}.`);
  if (k.whoFor) out.push(`${k.name} is for ${k.whoFor}.`);
  if (k.adoptive === true) out.push(`Adoptive parents can take ${inASentence(k)} as well as birth parents.`);
  else if (k.adoptive === false) out.push(`${k.name} is for birth parents only.`);
  if (k.noticeDays) out.push(`${k.name} needs ${noticeInWords(k.noticeDays)}.`);
  else if (k.noticeDays === 0) out.push(`${k.name} needs no notice.`);
  if (k.document) {
    out.push(k.documentAfterDays
      ? `${k.name} of more than ${inWords(k.documentAfterDays)} working ${k.documentAfterDays === 1 ? 'day' : 'days'} needs ${k.document}.`
      : `${k.name} needs ${k.document}.`);
  }
  if (k.everyDay) out.push(`${k.name} counts every day, weekends and public holidays included.`);
  if (k.steps?.length) out.push(`${k.name} ${stepsSaid(k.steps)}.`);
  return out;
}

/** The rules said back to the admin who sets them, in full sentences. */
export function theLeaveRulesSaid(rules: LeaveRules, perYear: number | null, hr: string | null): string[] {
  const out: string[] = [];
  if (rules.kinds?.length) {
    for (const k of rules.kinds) out.push(...aKindSaid(k));
    out.push(`When somebody does not say which kind, Groundwork takes it as ${inASentence(rules.kinds[0])}.`);
  } else {
    out.push(perYear == null
      ? 'There are no kinds of leave set, so every request is simply leave.'
      : `There are no kinds of leave set, so every request is simply leave, and each person has ${perYear} ${perYear === 1 ? 'day' : 'days'} a year.`);
  }
  if (rules.noticeDays) out.push(`Leave needs ${noticeInWords(rules.noticeDays)}.`);
  out.push(...theCalendarSaid(rules));
  for (const b of rules.blackouts ?? []) out.push(`Nobody can take leave ${from(b.from, b.to)}${b.why ? `, because of ${b.why.replace(/[.\s]+$/, '')}` : ''}.`);
  if (rules.eligibleAfterDays) out.push(`Leave can be taken once somebody has been here ${rules.eligibleAfterDays} days. Groundwork counts from the day they were added to your organisation.`);
  if (rules.tellHr) {
    const each = rules.tellHr === 'approved' ? 'each approved request' : 'each request, when it is asked for and when it is decided';
    out.push(hr ? `${hr}, who looks after HR, is told of ${each}, on the leave board.` : `HR is to be told of ${each}, but nobody is named for HR yet. Name somebody under who holds each duty.`);
  }
  for (const t of rules.thresholds ?? []) out.push(`Leave of ${moreThanWorkingDays(t.above)} ${stepsSaid(t.steps)}.`);
  if ((rules.thresholds?.length ?? 0) > 1) out.push('If leave is longer than two of these lengths, the longest one counts. Leave that is not longer than any of them follows the approval steps as they are.');
  else if (rules.thresholds?.length) out.push('Shorter leave follows the approval steps as they are.');
  if (!rules.noticeDays && !rules.blackouts?.length && !rules.eligibleAfterDays && !rules.thresholds?.length && !rules.kinds?.some((k) => k.noticeDays || k.document)) {
    out.push('No notice, blackout periods or other rules are set, so Groundwork only checks the days left and who else is off. A rule never stops a request; the person and whoever decides it are told when one applies.');
  } else {
    out.push('A rule never stops a request. The person is told when one applies, before they send it, and so is whoever decides it.');
  }
  return out;
}

/** Whether the admin has set any part of the leave calendar or of how annual leave builds up. Nothing set: nothing more is said. */
export const hasACalendarSet = (r: LeaveRules) =>
  !!(r.workingWeek || r.weekendsCount || r.holidaysCount || r.country || r.accrual || r.yearStarts || r.carryOver);

/** "Monday to Friday", "Monday to Saturday", "Sunday to Thursday", or the days listed when they are not in a row. */
export function theWeekSaid(week: number[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const w = order.filter((d) => week.includes(d));
  const at = w.map((d) => order.indexOf(d));
  const inARow = at.every((x, i) => i === 0 || x === at[i - 1] + 1);
  if (w.length > 2 && inARow) return `${WEEKDAY_NAMES[w[0]]} to ${WEEKDAY_NAMES[w[w.length - 1]]}`;
  const names = w.map((d) => WEEKDAY_NAMES[d]);
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The leave calendar and how annual leave builds up, said in full sentences. Nothing when none of it is set. */
export function theCalendarSaid(rules: LeaveRules): string[] {
  if (!hasACalendarSet(rules)) return [];
  const out: string[] = [];
  const week = rules.workingWeek ?? MONDAY_TO_FRIDAY;
  const off = [6, 0, 1, 2, 3, 4, 5].filter((d) => !week.includes(d)).map((d) => WEEKDAY_NAMES[d]);
  out.push(`People work ${theWeekSaid(week)}.`);
  if (off.length) {
    const days = off.length < 2 ? off[0] : `${off.slice(0, -1).join(', ')} and ${off[off.length - 1]}`;
    out.push(rules.weekendsCount ? `${days} inside somebody's leave count as leave days.` : `${days} do not count as leave days.`);
  }
  out.push(rules.holidaysCount ? 'Public holidays inside somebody\'s leave count as leave days.' : 'Public holidays do not count as leave days.');
  if (rules.country) out.push(`Your organisation is in ${rules.country}.`);
  const annual = rules.kinds?.length ? inASentence(theKindOf(theAnnualKey(rules), rules)!) : 'leave';
  const Annual = `${annual.charAt(0).toUpperCase()}${annual.slice(1)}`;
  out.push(`The leave year starts in ${MONTH_NAMES[(rules.yearStarts ?? 1) - 1]}.`);
  out.push(rules.accrual === 'monthly'
    ? `${Annual} builds up each month, with a twelfth of the year's days added at the end of each month.`
    : `${Annual} is given all at the start of the leave year.`);
  if (!rules.carryOver) out.push(`${Annual} that is not used by the end of the leave year is not carried over.`);
  else {
    out.push(rules.carryOver === 'all'
      ? `All ${annual} that is not used is carried into the next leave year.`
      : `Up to ${rules.carryOver} ${rules.carryOver === 1 ? 'day' : 'days'} of ${annual} that ${rules.carryOver === 1 ? 'is' : 'are'} not used can be carried into the next leave year.`);
    out.push(rules.carryExpires
      ? `Carried-over days must be used by the end of ${MONTH_NAMES[rules.carryExpires - 1]}, or they are lost.`
      : 'Carried-over days do not expire.');
    if (rules.carryFrom) out.push(`Groundwork carries leave over from the leave year that starts on ${saidAsADay(rules.carryFrom)}, the first one it records in full.`);
  }
  return out;
}

/**
 * Since when this person has been in the organisation here: the earlier of the day they joined it in
 * Groundwork and the day their entry was added to the staff directory. Groundwork knows no start date
 * of employment, so this is said plainly to the admin (`theLeaveRulesSaid`). Null when neither is known.
 */
export async function hereSince(prisma: PrismaService, organizationId: string, userId: string): Promise<Date | null> {
  const p = prisma as any;
  const [m, e] = await Promise.all([
    p.organizationMembership?.findUnique?.({ where: { userId_organizationId: { userId, organizationId } }, select: { createdAt: true } })?.catch?.(() => null) ?? null,
    p.person?.findFirst?.({ where: { organizationId, linkedUserId: userId }, select: { createdAt: true } })?.catch?.(() => null) ?? null,
  ]);
  const ds = [m?.createdAt, e?.createdAt].filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  return ds.length ? new Date(Math.min(...ds.map((d) => d.getTime()))) : null;
}
