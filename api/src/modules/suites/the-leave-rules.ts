import type { PrismaService } from '../prisma/prisma.service';
import { saidAsADay } from './who-is-away';
import { stepsFrom, stepsSaid, MAX_STEPS } from './the-approval-steps';
import type { Step } from './who-may-decide';

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
}

export interface LeaveRules {
  kinds?: ALeaveKind[];
  noticeDays?: number;
  blackouts?: { from: Day; to: Day; why?: string }[];
  eligibleAfterDays?: number;
  tellHr?: 'approved' | 'every';
  /** Leave by length: longer than `above` working days, these steps. Lowest first. */
  thresholds?: ALeaveThreshold[];
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
  badThresholds: `Give up to ${MAX_LEAVE_THRESHOLDS} lengths of leave, each a whole number of working days from 1 to 365 that no other length has, and between one and ${MAX_STEPS} steps chosen from the person's manager, the head of their team, whoever holds their team's budget, finance, HR, the chief executive and an admin.`,
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

function kindFrom(v: any): ALeaveKind | 'bad' | 'bad document' {
  if (!v || typeof v !== 'object' || typeof v.name !== 'string') return 'bad';
  const raw = v.name.trim();
  if (raw.length < 2 || raw.length > 40) return 'bad';
  const days = v.days === null || v.days === undefined ? null : wholeIn(v.days, 0, 365);
  if (v.days !== null && v.days !== undefined && days === null) return 'bad';
  const out: ALeaveKind = { key: aKindsKey(raw), name: asAName(raw), days };
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
  return out;
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
export function changeLeaveRules(kept: LeaveRules, input: unknown): { rules: LeaveRules } | { refused: string } {
  const g = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const next: LeaveRules = JSON.parse(JSON.stringify(kept));
  if (g.kinds !== undefined) {
    if (g.kinds === null || (Array.isArray(g.kinds) && !g.kinds.length)) delete next.kinds;
    else {
      if (!Array.isArray(g.kinds) || g.kinds.length > MAX_KINDS) return { refused: LEAVE_RULES_REFUSED.badKinds };
      const kinds: ALeaveKind[] = [];
      for (const v of g.kinds) {
        const k = kindFrom(v);
        if (k === 'bad') return { refused: LEAVE_RULES_REFUSED.badKinds };
        if (k === 'bad document') return { refused: LEAVE_RULES_REFUSED.badDocument };
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
  if (r.kind?.document && r.days > (r.kind.documentAfterDays ?? 0)) {
    const longer = r.kind.documentAfterDays ? ` of more than ${inWords(r.kind.documentAfterDays)} working ${r.kind.documentAfterDays === 1 ? 'day' : 'days'}` : '';
    out.push(you
      ? `${r.kind.name}${longer} needs ${r.kind.document}, so please have it ready.`
      : `${r.kind.name}${longer} needs ${r.kind.document}. Ask ${who} for it if you have not had it.`);
  }
  return out;
}

/** The rules said back to the admin who sets them, in full sentences. */
export function theLeaveRulesSaid(rules: LeaveRules, perYear: number | null, hr: string | null): string[] {
  const out: string[] = [];
  if (rules.kinds?.length) {
    for (const k of rules.kinds) {
      out.push(k.days == null ? `${k.name} has no set number of days.` : `Each person has ${k.days} ${k.days === 1 ? 'day' : 'days'} of ${inASentence(k)} a year.`);
      if (k.noticeDays) out.push(`${k.name} needs ${noticeInWords(k.noticeDays)}.`);
      if (k.document) {
        out.push(k.documentAfterDays
          ? `${k.name} of more than ${inWords(k.documentAfterDays)} working ${k.documentAfterDays === 1 ? 'day' : 'days'} needs ${k.document}.`
          : `${k.name} needs ${k.document}.`);
      }
    }
    out.push(`When somebody does not say which kind, Groundwork takes it as ${inASentence(rules.kinds[0])}.`);
  } else {
    out.push(perYear == null
      ? 'There are no kinds of leave set, so every request is simply leave.'
      : `There are no kinds of leave set, so every request is simply leave, and each person has ${perYear} ${perYear === 1 ? 'day' : 'days'} a year.`);
  }
  if (rules.noticeDays) out.push(`Leave needs ${noticeInWords(rules.noticeDays)}.`);
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
