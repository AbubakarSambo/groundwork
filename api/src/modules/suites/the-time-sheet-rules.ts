import type { PrismaService } from '../prisma/prisma.service';
import { hoursAsRead } from './hours-said-in-chat';

/**
 * THE TIME SHEET RULES AN ADMIN SETS (decision 85, item 3; build step 11 of
 * docs/suites-against-the-workflow-model.md).
 *
 *   - who keeps a time sheet: everybody who is not a guest, or the teams and people the admin names.
 *     Anybody else may still give their hours, as today; the rules only say who is asked for them;
 *   - how often the hours are sent: each week (as today), or each month;
 *   - the hours asked of each person a week;
 *   - a cut-off day and time, in Lagos time (Africa/Lagos, one hour ahead of UTC all year): a weekday
 *     for a weekly time sheet, or a day of the month (or its last day) for a monthly one;
 *   - billable or not, for each client or project, with what holds for every other one. A person can
 *     say that one entry is billable or not, and that entry follows what they said.
 *   - Who approves is the approval steps an admin already sets (`PUT /suites/workflows`), through the
 *     one resolver every request uses (who-may-decide.ts). Nothing here names an approver.
 *
 * HOURS ARE FOR BILLING ONLY (decision 10). Nothing here rates how much anybody works. A person reads
 * where they stand against the hours asked, and nobody else reads that sentence.
 *
 * NOTHING CHANGES BY ITSELF. With nothing set, nobody is asked for a number of hours, there is no
 * cut-off, every hour is billable, and every reader reads exactly what they read before.
 *
 * WHERE IT IS KEPT. In the existing `OrganizationSuite` table, one row for each organisation with the
 * key `timeRules`, beside `duties`, `workflows`, `leaveRules` and `spendRules`. An admin or whoever
 * holds the finance duty sets it (`SuitesService.setTimeRules`, decision 85), and each change is kept
 * in the rules history.
 */
export const TIME_RULES_ROW = 'timeRules';

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface TimeRules {
  /** Who is asked for a time sheet. Unset: everybody in the organisation who is not a guest. */
  submitters?: { teams?: string[]; people?: string[] };
  /** How often the hours are sent. Unset: each week. */
  every?: 'week' | 'month';
  /** The hours asked of each person a week. */
  hoursAWeek?: number;
  /** When the hours are due, in Lagos time. A weekday for each week; a day of the month, or "last", for each month. */
  cutOff?: { day: Weekday | number | 'last'; time: string };
  /** Billable or not for each client or project; `otherwise` for every other one. Unset: every hour is billable. */
  billable?: { clients?: Record<string, boolean>; otherwise?: boolean };
}

export const MAX_HOURS_A_WEEK = 80;
const MAX_SUBMITTERS = 200;

export const TIME_RULES_REFUSED = {
  onlyAnAdmin: 'Only an admin or whoever looks after finance can set the time sheet rules.',
  badEvery: 'Say whether hours are sent each week or each month.',
  badHours: `Give the hours asked of each person a week as a number from 1 to ${MAX_HOURS_A_WEEK}.`,
  badCutOff: 'Give the cut-off as a day and a time such as 17:00. For hours sent each week the day is a weekday, such as Friday. For hours sent each month it is a day of the month from 1 to 28, or the last day.',
  badSubmitters: 'Name the teams and the people who keep a time sheet, each from your staff directory and your organisation.',
  badBillable: 'Say for each client or project on the list whether its hours are billable, and whether the hours on every other one are.',
};

const isWeekday = (x: unknown): x is Weekday => typeof x === 'string' && (WEEKDAYS as readonly string[]).includes(x.toLowerCase());
const isTime = (x: unknown): x is string => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const isEvery = (x: unknown): x is 'week' | 'month' => x === 'week' || x === 'month';

function cutOffFrom(v: any, every: 'week' | 'month'): TimeRules['cutOff'] | null {
  if (!v || typeof v !== 'object' || !isTime(v.time)) return null;
  if (every === 'week') return isWeekday(v.day) ? { day: v.day.toLowerCase() as Weekday, time: v.time } : null;
  if (v.day === 'last') return { day: 'last', time: v.time };
  return Number.isInteger(v.day) && v.day >= 1 && v.day <= 28 ? { day: v.day, time: v.time } : null;
}

function billableFrom(v: any): TimeRules['billable'] | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out: NonNullable<TimeRules['billable']> = {};
  if (v.clients !== undefined && v.clients !== null) {
    if (typeof v.clients !== 'object' || Array.isArray(v.clients)) return null;
    const cs: Record<string, boolean> = {};
    for (const [k, b] of Object.entries(v.clients)) {
      if (typeof b !== 'boolean' || !k.trim()) return null;
      cs[k.trim()] = b;
    }
    if (Object.keys(cs).length) out.clients = cs;
  }
  if (v.otherwise !== undefined && v.otherwise !== null) {
    if (typeof v.otherwise !== 'boolean') return null;
    out.otherwise = v.otherwise;
  }
  return out.clients || out.otherwise !== undefined ? out : null;
}

/** What is kept, read with care: anything that is not valid is left out. */
export function timeRulesFrom(answers: unknown): TimeRules {
  const a = (answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {}) as Record<string, any>;
  const out: TimeRules = {};
  if (a.submitters && typeof a.submitters === 'object') {
    const teams = Array.isArray(a.submitters.teams) ? a.submitters.teams.filter((t: unknown): t is string => typeof t === 'string' && !!t.trim()) : [];
    const people = Array.isArray(a.submitters.people) ? a.submitters.people.filter((p: unknown): p is string => typeof p === 'string' && !!p) : [];
    if (teams.length || people.length) out.submitters = { ...(teams.length ? { teams } : {}), ...(people.length ? { people } : {}) };
  }
  if (isEvery(a.every)) out.every = a.every;
  if (typeof a.hoursAWeek === 'number' && a.hoursAWeek >= 1 && a.hoursAWeek <= MAX_HOURS_A_WEEK) out.hoursAWeek = a.hoursAWeek;
  const c = cutOffFrom(a.cutOff, out.every ?? 'week');
  if (c) out.cutOff = c;
  const b = billableFrom(a.billable);
  if (b) out.billable = b;
  return out;
}

export async function readTimeRules(prisma: PrismaService, organizationId: string): Promise<TimeRules> {
  const row = await (prisma as any).organizationSuite
    ?.findUnique({ where: { organizationId_suite: { organizationId, suite: TIME_RULES_ROW } }, select: { answers: true } })
    ?.catch?.(() => null);
  return timeRulesFrom(row?.answers);
}

/** Whether any rule is set at all. With none, every reader reads what they read before. */
export const anyTimeRule = (r: TimeRules) => Object.keys(r).length > 0;

/**
 * An admin's change, laid over what is kept. A part given as null is cleared; one left out is kept.
 * People are sign-in ids of the organisation's own people; teams are departments in the staff directory;
 * clients are the ones on the time sheets suite's list.
 */
export function changeTimeRules(
  kept: TimeRules,
  input: unknown,
  known: { people: Set<string>; teams: Set<string>; clients: string[] },
): { rules: TimeRules } | { refused: string } {
  const g = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const next: TimeRules = JSON.parse(JSON.stringify(kept));
  if (g.every !== undefined) {
    if (g.every === null) delete next.every;
    else if (!isEvery(g.every)) return { refused: TIME_RULES_REFUSED.badEvery };
    else next.every = g.every;
  }
  if (g.hoursAWeek !== undefined) {
    if (g.hoursAWeek === null) delete next.hoursAWeek;
    else if (typeof g.hoursAWeek !== 'number' || !Number.isFinite(g.hoursAWeek) || g.hoursAWeek < 1 || g.hoursAWeek > MAX_HOURS_A_WEEK || Math.round(g.hoursAWeek * 4) !== g.hoursAWeek * 4) return { refused: TIME_RULES_REFUSED.badHours };
    else next.hoursAWeek = g.hoursAWeek;
  }
  if (g.cutOff !== undefined) {
    if (g.cutOff === null) delete next.cutOff;
    else {
      const c = cutOffFrom(g.cutOff, next.every ?? 'week');
      if (!c) return { refused: TIME_RULES_REFUSED.badCutOff };
      next.cutOff = c;
    }
  } else if (next.cutOff && g.every !== undefined && !cutOffFrom(next.cutOff, next.every ?? 'week')) {
    /* How often changed, and the kept cut-off no longer fits it: it must be given again. */
    return { refused: TIME_RULES_REFUSED.badCutOff };
  }
  if (g.submitters !== undefined) {
    if (g.submitters === null) delete next.submitters;
    else {
      const s = g.submitters;
      const teams = s?.teams ?? [];
      const people = s?.people ?? [];
      if (typeof s !== 'object' || !Array.isArray(teams) || !Array.isArray(people) || teams.length + people.length > MAX_SUBMITTERS) return { refused: TIME_RULES_REFUSED.badSubmitters };
      const byKey = new Map([...known.teams].map((t) => [t.toLowerCase(), t]));
      const ts: string[] = [];
      for (const t of teams) {
        const found = typeof t === 'string' ? byKey.get(t.trim().toLowerCase()) : undefined;
        if (!found) return { refused: TIME_RULES_REFUSED.badSubmitters };
        if (!ts.includes(found)) ts.push(found);
      }
      for (const p of people) if (typeof p !== 'string' || !known.people.has(p)) return { refused: TIME_RULES_REFUSED.badSubmitters };
      const ps = [...new Set(people as string[])];
      if (!ts.length && !ps.length) delete next.submitters;
      else next.submitters = { ...(ts.length ? { teams: ts } : {}), ...(ps.length ? { people: ps } : {}) };
    }
  }
  if (g.billable !== undefined) {
    if (g.billable === null) delete next.billable;
    else {
      const b = billableFrom(g.billable);
      if (!b) return { refused: TIME_RULES_REFUSED.badBillable };
      const cs: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(b.clients ?? {})) {
        const client = known.clients.find((c) => c.toLowerCase() === k.toLowerCase());
        if (!client) return { refused: TIME_RULES_REFUSED.badBillable };
        cs[client] = v;
      }
      next.billable = { ...(Object.keys(cs).length ? { clients: cs } : {}), ...(b.otherwise !== undefined ? { otherwise: b.otherwise } : {}) };
    }
  }
  return { rules: next };
}

// ------------------------------------------------ a person ------------------------------------------------

/** Whether the rules ask this person for a time sheet. Unset: everybody who is not a guest. */
export function isAskedForHours(rules: TimeRules, person: { userId: string; team: string | null; role: string | null }): boolean {
  if (!person.role || person.role === 'GUEST') return false;
  const s = rules.submitters;
  if (!s) return true;
  if (s.people?.includes(person.userId)) return true;
  const team = person.team?.trim().toLowerCase();
  return !!team && !!s.teams?.some((t) => t.toLowerCase() === team);
}

/** Whether one entry's hours are billable: what the person said of it, else its client's rule, else the rest's. */
export function isBillable(rules: TimeRules, client: string, said?: boolean | null): boolean {
  if (typeof said === 'boolean') return said;
  const b = rules.billable;
  if (!b) return true;
  const own = Object.entries(b.clients ?? {}).find(([k]) => k.toLowerCase() === client.toLowerCase());
  if (own) return own[1];
  return b.otherwise ?? true;
}

/** "not billable" or "billable" said in the person's own words, or null when neither was. */
export function billableSaidIn(message: string): boolean | null {
  const t = (message ?? '').toLowerCase();
  if (/\b(not\s+billable|non[- ]?billable|unbillable|not\s+to\s+be\s+billed|not\s+for\s+billing)\b/.test(t)) return false;
  if (/\bbillable\b/.test(t)) return true;
  return null;
}

// ------------------------------------------------ Lagos time ------------------------------------------------

const DAY = 86_400_000;
const LAGOS_MS = 60 * 60 * 1000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Today's date in Lagos, as a day. */
export const lagosDay = (now: Date): string => iso(new Date(now.getTime() + LAGOS_MS));
/** The Monday of this week in Lagos. */
export function lagosMonday(now: Date): string {
  const d = new Date(`${lagosDay(now)}T00:00:00.000Z`);
  return iso(new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY));
}
/** A day and a time in Lagos, as the moment it is. */
const atLagos = (day: string, time: string) => new Date(`${day}T${time}:00.000+01:00`);
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const weekdayOf = (day: string) => WEEKDAY_NAMES[(new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7];
const longDay = (day: string) => `${weekdayOf(day)} ${Number(day.slice(8, 10))} ${MONTH_NAMES[Number(day.slice(5, 7)) - 1]}`;

/** This week's cut-off, for a weekly time sheet: the day, the moment, and whether it has passed. */
function thisWeeksCutOff(rules: TimeRules, now: Date): { day: string; at: Date } | null {
  const c = rules.cutOff;
  if (!c || (rules.every ?? 'week') !== 'week' || !isWeekday(c.day)) return null;
  const monday = new Date(`${lagosMonday(now)}T00:00:00.000Z`);
  const day = iso(new Date(monday.getTime() + WEEKDAYS.indexOf(c.day as Weekday) * DAY));
  return { day, at: atLagos(day, c.time) };
}

/** This month's cut-off, for a monthly time sheet. */
function thisMonthsCutOff(rules: TimeRules, now: Date): { day: string; at: Date; month: string } | null {
  const c = rules.cutOff;
  if (!c || rules.every !== 'month') return null;
  const today = lagosDay(now);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dayNo = c.day === 'last' ? last : Number(c.day);
  const day = `${today.slice(0, 7)}-${String(dayNo).padStart(2, '0')}`;
  return { day, at: atLagos(day, c.time), month: MONTH_NAMES[m - 1] };
}

// ------------------------------------------------ in words ------------------------------------------------

/**
 * WHERE THE PERSON STANDS THIS WEEK, in full sentences, for that person only. Null when no rule asks
 * anything of them. It says the hours they gave and what is still asked, never how much they work.
 *   "You have recorded 31 hours this week. You still need 9 hours by Friday at 17:00."
 */
export function whereYouStand(rules: TimeRules, minutesThisWeek: number, now: Date): string | null {
  if (!rules.hoursAWeek && !rules.cutOff) return null;
  const out: string[] = [];
  out.push(minutesThisWeek > 0 ? `You have recorded ${hoursAsRead(minutesThisWeek / 60)} this week.` : 'You have not recorded any hours this week.');
  const week = thisWeeksCutOff(rules, now);
  const passed = !!week && now.getTime() > week.at.getTime();
  const by = week ? `${weekdayOf(week.day)} at ${rules.cutOff!.time}` : null;
  if (rules.hoursAWeek) {
    const left = rules.hoursAWeek * 60 - minutesThisWeek;
    if (left <= 0) out.push(`That is the ${hoursAsRead(rules.hoursAWeek)} a week your organisation asks for.`);
    else if (by && !passed) out.push(`You still need ${hoursAsRead(left / 60)} by ${by}.`);
    else if (by) out.push(`You still need ${hoursAsRead(left / 60)}. The cut-off was ${by}, so please send them as soon as you can.`);
    else out.push(`You still need ${hoursAsRead(left / 60)} this week.`);
  } else if (by) {
    out.push(passed ? `The cut-off for this week's hours was ${by}.` : `Please send this week's hours by ${by}.`);
  }
  const month = thisMonthsCutOff(rules, now);
  if (month) {
    out.push(now.getTime() > month.at.getTime()
      ? `The cut-off for ${month.month}'s hours was ${longDay(month.day)} at ${rules.cutOff!.time}.`
      : `Please send ${month.month}'s hours by ${longDay(month.day)} at ${rules.cutOff!.time}.`);
  }
  return out.join(' ');
}

/** Whether the person still owes hours this week, so Today has something to say. */
export function stillNeedsHours(rules: TimeRules, minutesThisWeek: number): boolean {
  return !!rules.hoursAWeek && rules.hoursAWeek * 60 > minutesThisWeek;
}

const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The cut-off in words, for the admin. */
function cutOffSaid(rules: TimeRules): string {
  const c = rules.cutOff;
  if (!c) return 'There is no cut-off.';
  if ((rules.every ?? 'week') === 'week') return `The cut-off is ${WEEKDAY_NAMES[WEEKDAYS.indexOf(c.day as Weekday)]} at ${c.time}, Lagos time, each week.`;
  return c.day === 'last'
    ? `The cut-off is the last day of each month at ${c.time}, Lagos time.`
    : `The cut-off is the ${ordinal(Number(c.day))} of each month at ${c.time}, Lagos time.`;
}

/**
 * The rules said back to the admin who sets them, in full sentences. `approval` is the approval
 * steps said ("A week of hours goes to the person's manager."), `names` turns a sign-in id into a name.
 */
export function theTimeRulesSaid(rules: TimeRules, approval: string | null, names: (id: string) => string | null): string[] {
  const out: string[] = [];
  const s = rules.submitters;
  if (!s) out.push('Everybody in the organisation who is not a guest keeps a time sheet.');
  else {
    const people = (s.people ?? []).map(names).filter((n): n is string => !!n);
    const teams = s.teams ?? [];
    const one = people.length === 1;
    const who = teams.length && people.length
      ? `People in ${listed(teams)} keep a time sheet, and so ${one ? 'does' : 'do'} ${listed(people)}.`
      : teams.length
        ? `People in ${listed(teams)} keep a time sheet.`
        : `${listed(people)} ${one ? 'keeps' : 'keep'} a time sheet.`;
    out.push(`${who} Anybody else may still give their hours.`);
  }
  out.push(rules.every === 'month' ? 'Hours are sent each month.' : 'Hours are sent each week.');
  out.push(rules.hoursAWeek ? `Each person is asked for ${hoursAsRead(rules.hoursAWeek)} a week.` : 'No number of hours is asked for each week.');
  out.push(cutOffSaid(rules));
  const b = rules.billable;
  if (!b) out.push('Every hour is billable, so the billing file holds every approved hour.');
  else {
    const yes = Object.entries(b.clients ?? {}).filter(([, v]) => v).map(([k]) => k);
    const no = Object.entries(b.clients ?? {}).filter(([, v]) => !v).map(([k]) => k);
    if (yes.length) out.push(`Hours on ${listed(yes)} are billable.`);
    if (no.length) out.push(`Hours on ${listed(no)} are not billable.`);
    out.push(`Hours on ${yes.length || no.length ? 'every other client or project' : 'every client or project'} are ${(b.otherwise ?? true) ? 'billable' : 'not billable'}.`);
    out.push('A person can say that one entry is billable or not billable, and that entry follows what they said.');
  }
  if (approval) out.push(approval);
  out.push('Hours are for billing only. They never appear in anyone’s check-in report, their signals or a review.');
  return out;
}

/** "The hours on Internal are not billable." for each entry of a say-back that is not billable, or billable against its rule. */
export function billableSaidBack(rules: TimeRules, entries: { client: string }[], said: boolean | null): string[] {
  if (!rules.billable && said === null) return [];
  const out: string[] = [];
  for (const e of entries) {
    const byRule = isBillable(rules, e.client);
    const is = isBillable(rules, e.client, said);
    if (!is) out.push(`The hours on ${e.client} are not billable.`);
    else if (!byRule) out.push(`The hours on ${e.client} are billable, as you said.`);
  }
  return out;
}
