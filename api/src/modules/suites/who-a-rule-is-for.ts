import type { PrismaService } from '../prisma/prisma.service';
import { thePeopleHere, type APersonHere } from './the-people-and-their-lines';

/**
 * WHO A RULE IS FOR (Batch S, S1, Hafsah 19 November 2026: "rules that can differ by role, department or person").
 *
 * Every number a suite asks for has one shape: the number for everyone, which the suite keeps as it always has, and exceptions
 * for a job title, an app role, a team or one person. The most specific wins: a person before a team, a team before a job title
 * or an app role. One function reads it for every suite (`theRuleFor`): the days of leave a year (the-leave-board.service.ts),
 * the hours asked a week (the-time-sheets.service.ts) and how much a manager approves on their own before a request to spend
 * takes the steps above that amount (the-spending.service.ts, the-approvals-queue.service.ts). The screen and the chat write the
 * same shape through `SuitesService.setForWhom`.
 *
 * WHERE IT IS KEPT. In the existing `OrganizationSuite` table, one row for each organisation with the key `forWhom`, beside
 * `duties`, `workflows`, `leaveRules`, `spendRules` and `timeRules`. No migration.
 */
export const FOR_WHOM_ROW = 'forWhom';

export type ASetting = 'leave.days' | 'time.hoursAWeek' | 'spend.limit';
export const SETTINGS: ASetting[] = ['leave.days', 'time.hoursAWeek', 'spend.limit'];
export const SUITE_OF: Record<ASetting, 'leave' | 'time' | 'spend'> = { 'leave.days': 'leave', 'time.hoursAWeek': 'time', 'spend.limit': 'spend' };
const RANGE: Record<ASetting, [number, number]> = { 'leave.days': [0, 365], 'time.hoursAWeek': [0, 80], 'spend.limit': [0, 1e12] };

export type WhoKind = 'person' | 'team' | 'title' | 'appRole';
export interface AnException { who: { kind: WhoKind; value: string }; value: number }
export type ForWhom = Partial<Record<ASetting, AnException[]>>;

/** The people an exception covers, as far as the rules read them. */
export type APerson = Pick<APersonHere, 'userId' | 'title' | 'team' | 'appRole'>;

const MAX_EXCEPTIONS = 50;
const APP_ROLES = ['ADMIN', 'LEAD', 'MEMBER'];
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
/** "field agents" and "Field agent" are the same job title; so are "managers" and "manager". */
const oneOf = (s: string) => norm(s).replace(/(?<=[a-z]{3})s$/, '');

/** Whether a job title is the one named: the same title, or a title that ends in it ("Sales manager" is a manager). */
export function aTitleIs(title: string | null | undefined, named: string): boolean {
  if (!title) return false;
  const t = oneOf(title);
  const n = oneOf(named);
  return !!n && (t === n || t.endsWith(` ${n}`));
}

function covers(e: AnException, p: APerson): boolean {
  switch (e.who.kind) {
    case 'person': return e.who.value === p.userId;
    case 'team': return !!p.team && norm(p.team) === norm(e.who.value);
    case 'appRole': return p.appRole === e.who.value;
    case 'title': return aTitleIs(p.title, e.who.value);
  }
}

const RANK: Record<WhoKind, number> = { person: 0, team: 1, title: 2, appRole: 3 };

/** THE ONE READER. The number this setting has for this person: the most specific exception that covers them, else everyone's. */
export function theRuleFor<T extends number | null | undefined>(person: APerson | null | undefined, forWhom: ForWhom, setting: ASetting, everyone: T): number | T {
  const found = person ? theExceptionFor(person, forWhom[setting]) : null;
  return found ? found.value : everyone;
}

/** The exception that decides for this person: the most specific that covers them, or null. */
function theExceptionFor(person: APerson, list: AnException[] | undefined): AnException | null {
  return [...(list ?? [])].filter((e) => covers(e, person)).sort((a, b) => RANK[a.who.kind] - RANK[b.who.kind])[0] ?? null;
}

/**
 * For a board that reads many people's requests: each person an exception covers, with their number. Somebody left out has the
 * organisation's number. Empty, with no read of the people, when nothing is set for anybody.
 */
export async function theRuleForEach(prisma: PrismaService, organizationId: string, setting: ASetting): Promise<Map<string, number>> {
  const forWhom = await readForWhom(prisma, organizationId);
  if (!forWhom[setting]?.length) return new Map();
  const out = new Map<string, number>();
  for (const p of await thePeopleHere(prisma, organizationId)) {
    const n = theRuleFor(p, forWhom, setting, undefined);
    if (n !== undefined) out.set(p.userId, n);
  }
  return out;
}

/** What is kept, read with care: anything that is not valid is left out. */
export function forWhomFrom(answers: unknown): ForWhom {
  const a = (answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {}) as Record<string, unknown>;
  const out: ForWhom = {};
  for (const s of SETTINGS) {
    const list = Array.isArray(a[s]) ? (a[s] as unknown[]).map((x) => anException(s, x)).filter((x): x is AnException => !!x) : [];
    if (list.length) out[s] = list.slice(0, MAX_EXCEPTIONS);
  }
  return out;
}

function anException(setting: ASetting, x: any): AnException | null {
  const kind = x?.who?.kind;
  const value = typeof x?.who?.value === 'string' ? x.who.value.trim().replace(/\s+/g, ' ') : '';
  const [lo, hi] = RANGE[setting];
  if (!['person', 'team', 'title', 'appRole'].includes(kind) || !value || value.length > 80) return null;
  if (kind === 'appRole' && !APP_ROLES.includes(value)) return null;
  if (typeof x.value !== 'number' || !Number.isFinite(x.value) || x.value < lo || x.value > hi) return null;
  return { who: { kind, value }, value: x.value };
}

export async function readForWhom(prisma: PrismaService, organizationId: string): Promise<ForWhom> {
  const row = await (prisma as any).organizationSuite
    ?.findUnique?.({ where: { organizationId_suite: { organizationId, suite: FOR_WHOM_ROW } }, select: { answers: true } })
    ?.catch?.(() => null);
  return forWhomFrom(row?.answers);
}

export const FOR_WHOM_REFUSED = {
  badSetting: 'Say which setting this is for: days of leave a year, hours a week, or how much a manager approves on their own.',
  badException: 'Say who it is for (a job title, an app role, a team or one person) and give a number in the range the setting allows.',
};

/**
 * One change: the exception for this setting and this "who" is set to the number, or removed when the number is null. Returns
 * what to keep, or the refusal.
 */
export function changeForWhom(kept: ForWhom, input: unknown): { forWhom: ForWhom } | { refused: string } {
  const g = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const setting = g.setting as ASetting;
  if (!SETTINGS.includes(setting)) return { refused: FOR_WHOM_REFUSED.badSetting };
  const next: ForWhom = JSON.parse(JSON.stringify(kept));
  const same = (e: AnException) => e.who.kind === g.who?.kind && norm(e.who.value) === norm(String(g.who?.value ?? ''));
  const rest = (next[setting] ?? []).filter((e) => !same(e));
  if (g.value === null) {
    if (rest.length) next[setting] = rest; else delete next[setting];
    return { forWhom: next };
  }
  const e = anException(setting, g);
  if (!e) return { refused: FOR_WHOM_REFUSED.badException };
  next[setting] = [...rest, e].slice(-MAX_EXCEPTIONS);
  return { forWhom: next };
}

// ------------------------------------------------ in words ------------------------------------------------

const APP_ROLE_SAID: Record<string, string> = { ADMIN: 'Every admin', LEAD: 'Every lead', MEMBER: 'Every member' };
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const money = (currency: string | null, n: number) => `${currency ? `${currency} ` : ''}${n.toLocaleString('en-US')}`;

/** "Anyone whose job title is Field agent", "Anyone in Sales", "Every lead", "Joseph Kamau". */
export function whoSaid(who: AnException['who'], nameOf: (userId: string) => string | null | undefined): string {
  switch (who.kind) {
    case 'person': return nameOf(who.value) || 'One person who has left';
    case 'team': return `Anyone in ${who.value}`;
    case 'appRole': return APP_ROLE_SAID[who.value] ?? who.value;
    case 'title': return `Anyone whose job title is ${who.value}`;
  }
}

/** One setting's number, said for one subject: "has 25 days of leave a year". */
export function theNumberSaid(setting: ASetting, n: number, currency: string | null = null): string {
  switch (setting) {
    case 'leave.days': return `has ${n} ${n === 1 ? 'day' : 'days'} of leave a year`;
    case 'time.hoursAWeek': return n ? `is asked for ${n} ${n === 1 ? 'hour' : 'hours'} a week` : 'is not asked for a number of hours a week';
    case 'spend.limit': return `has their manager approve requests to spend of up to ${money(currency, n)} on their own, and anything above that takes the steps set for larger amounts`;
  }
}

/**
 * Each exception, said back in full sentences with who it covers today, by name: "Anyone whose job title is Field agent has 18
 * days of leave a year. That is Amina Otieno and Brian Mwangi today." With nobody covered: "Nobody is covered by this today."
 */
export function theExceptionsSaid(forWhom: ForWhom, setting: ASetting, people: Pick<APersonHere, 'userId' | 'name' | 'title' | 'team' | 'appRole'>[], currency: string | null = null): string[] {
  const nameOf = (id: string) => people.find((p) => p.userId === id)?.name;
  return (forWhom[setting] ?? []).map((e) => {
    const who = whoSaid(e.who, nameOf);
    if (e.who.kind === 'person') return `${who} ${theNumberSaid(setting, e.value, currency)}.`;
    /* Only the people this exception decides for: somebody a more specific one covers is said under that one. */
    const covered = people.filter((p) => theExceptionFor(p, forWhom[setting]) === e).map((p) => p.name).filter(Boolean);
    const today = covered.length ? `That is ${covered.length > 6 ? `${listed(covered.slice(0, 5))} and ${covered.length - 5} others` : listed(covered)} today.`
      : e.who.kind === 'title' && !people.some((p) => aTitleIs(p.title, e.who.value)) ? 'Nobody has this job title yet, so it will apply to whoever is given it.'
      : 'Nobody is covered by this today.';
    return `${who} ${theNumberSaid(setting, e.value, currency)}. ${today}`;
  });
}
