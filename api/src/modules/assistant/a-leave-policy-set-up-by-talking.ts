import {
  MONTH_NAMES, STANDARD_KINDS, WEEKDAY_NAMES, aKindSaid, aKindsKey, changeLeaveRules, theCalendarSaid, theWeekSaid,
  type ALeaveKind, type LeaveRules,
} from '../suites/the-leave-rules';
import { MONDAY_TO_FRIDAY } from '../suites/the-leave-calendar';
import { saidAsADay } from '../suites/who-is-away';

/**
 * THE LEAVE POLICY, SET UP BY TALKING (Hafsah, 20 November 2026).
 *
 * "Ask if weekends, public holidays count as leave day, ask about public holidays respected and if its typical for the country, do
 * they have a multi country office with different holidays, what about compassion leave, maternity leave, sick leave, how early must
 * someone apply for any of these leaves. How long is each of these, do you have off days etc, how does annual leave accrue, when must
 * you take it, does it accrue, is there paternity leave, is this for biological parents or adoptive parents etc."
 *
 * These are the leave set-up's questions about the policy, asked one at a time after the days a year, and only what is not already
 * known: from what is stored, or from a written policy the model read into the set-up (a-policy-read-into-the-set-up.ts), which
 * writes each answer in the plain words the readings below take. What is read here decides nothing by itself: it is said back with
 * the rest of the set-up, and written only on the admin's yes, through the same SuitesService methods the Suites page uses.
 */

export type Day = string;

export interface AKindPlanned {
  key: string;
  name: string;
  per?: 'year' | 'occasion';
  /** Days a year or each time; null for no set number. Left out: not asked yet. */
  days?: number | null;
  paid?: boolean;
  noticeDays?: number;
  /** Who it is for, in words; null when everyone. */
  whoFor?: string | null;
  adoptive?: boolean;
  /** A document needed after a number of working days, or null for none. */
  document?: { what: string; after: number } | null;
  everyDay?: boolean;
}

export interface AnOfficePlanned { name: string; country: string; people?: string[] }

export interface LeavePolicyPlan {
  /** The types of leave; empty when there is only annual leave, which then stays the one number of days, as before. */
  kinds?: AKindPlanned[];
  /** With only annual leave: the notice all leave needs, in days. */
  noticeDays?: number;
  week?: number[];
  weekendsCount?: boolean;
  holidaysCount?: boolean;
  country?: string | null;
  /** Whether they give the country's usual public holidays, so the list is drafted for them to check. */
  usualHolidays?: boolean;
  /** The public holidays said back: drafted by the model for the admin to check, or as the admin gave them. `office` null is the organisation's own. */
  holidays?: { office: string | null; on: Day; name: string }[];
  /** True while the holidays are the model's draft, not yet agreed: the say-back asks the admin to check each date. */
  holidaysDrafted?: boolean;
  /** Offices in other countries; empty when they said they have none. */
  offices?: AnOfficePlanned[];
  accrual?: 'start' | 'monthly';
  yearStarts?: number;
  carryOver?: number | 'all';
  carryExpires?: number | null;
}

export interface AQuestion { key: string; ask: string }

/** The people the set-up knows, for the office questions. */
interface Known { people: { id: string; name: string; team: string | null }[]; teams: string[] }

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const lower = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const YES = /^(?:y|yes|yep|yeah|yup|sure|ok|okay|correct|of course|they do|it is|it does|we do|always|definitely|true)\b/i;
const NO = /^(?:n|no|nope|nah|none|nobody|not really|they don'?t|it isn'?t|it doesn'?t|we don'?t|never|nothing|false)\b/i;

/** Every key the policy asks, so the set-up can tell them from its other questions. */
export const isAPolicyKey = (key: string) => key.startsWith('policy:') || key.startsWith('kind:') || key.startsWith('office:');

const standard = (key: string) => STANDARD_KINDS.find((k) => k.key === key);

// ------------------------------------------------ the questions ------------------------------------------------

/**
 * Every policy question still to ask, in order: the types of leave, each type's details, the working week and what counts, the
 * country and its holidays, offices in other countries, and how annual leave builds up. `all` gives every question, answered or
 * not, for reading a change said after the say-back.
 */
export function policyQuestions(policy: LeavePolicyPlan | undefined, known: Known, all = false): AQuestion[] {
  const p = policy ?? {};
  const out: AQuestion[] = [];
  const want = (asked: boolean, q: AQuestion) => { if (all || !asked) out.push(q); };
  want(p.kinds !== undefined, {
    key: 'policy:kinds',
    ask: 'Which types of leave do you have? For example, annual, sick, compassionate, maternity, paternity, adoption and unpaid leave. You can name others too.',
  });
  if (p.kinds && !p.kinds.length) want(p.noticeDays !== undefined, { key: 'policy:notice', ask: 'How many days’ notice does leave need before it starts? You can say none.' });
  for (const k of p.kinds ?? []) {
    const s = standard(k.key);
    const n = lower(k.name);
    if (k.key !== 'annual') {
      want(k.days !== undefined, { key: `kind:${k.key}:days`, ask: `How long is ${n}? For example, “10 days a year” or “5 days each time”. You can say there is no set number.` });
      if (!s?.unpaid) want(k.paid !== undefined, { key: `kind:${k.key}:paid`, ask: `Is ${n} paid?` });
    }
    if (!s?.noNotice) want(k.noticeDays !== undefined, { key: `kind:${k.key}:notice`, ask: `How many days’ notice does ${n} need before it starts? You can say none.` });
    if (k.key !== 'annual') want(k.whoFor !== undefined, { key: `kind:${k.key}:whoFor`, ask: `Who can take ${n}? For example, everyone, or only after 6 months of service.` });
    if (s?.asksAdoptive) want(k.adoptive !== undefined, { key: `kind:${k.key}:adoptive`, ask: `Is ${n} for birth parents only, or for adoptive parents too?` });
    if (s?.asksDocument) want(k.document !== undefined, { key: `kind:${k.key}:document`, ask: `Does ${n} need a document, such as a sick note, once it is longer than a number of days? You can say no.` });
  }
  want(p.week !== undefined, { key: 'policy:week', ask: 'Which days of the week do people work? For example, Monday to Friday.' });
  const off = [6, 0, 1, 2, 3, 4, 5].filter((d) => !(p.week ?? MONDAY_TO_FRIDAY).includes(d)).map((d) => WEEKDAY_NAMES[d]);
  if (off.length) want(p.weekendsCount !== undefined, { key: 'policy:weekends', ask: `When somebody's leave runs over ${andList(off)}, do those days count as leave days?` });
  want(p.holidaysCount !== undefined, { key: 'policy:holidays', ask: 'When a public holiday falls inside somebody’s leave, does it count as a leave day?' });
  want(p.country !== undefined, { key: 'policy:country', ask: 'Which country is your organisation in?' });
  if (p.country) want(p.usualHolidays !== undefined, { key: 'policy:usual', ask: `Do you give the usual public holidays of ${p.country}? If you say yes, I will draft the list for you to check before anything is set. Holidays that follow the moon, such as Eid, are added when their dates are announced.` });
  want(p.offices !== undefined, { key: 'policy:offices', ask: 'Do you have offices in other countries, with their own public holidays? If so, name each office and its country, for example “Lagos, in Nigeria”. You can say no.' });
  (p.offices ?? []).forEach((o, i) => {
    want(o.people !== undefined, { key: `office:${i}:people`, ask: `Who works from the ${o.name} office? Name the people, or their team. Everybody else follows the public holidays of ${p.country ?? 'your organisation'}.` });
  });
  if (all) out.push({ key: 'policy:holidayList', ask: 'Which public holidays are there, with their dates? Write each as its name and its date.' });
  want(p.accrual !== undefined, { key: 'policy:accrual', ask: 'Is annual leave given all at the start of the leave year, or built up each month?' });
  want(p.yearStarts !== undefined, { key: 'policy:yearStarts', ask: 'In which month does the leave year start? For example, January.' });
  want(p.carryOver !== undefined, { key: 'policy:carryOver', ask: 'Can people carry annual leave they have not used into the next leave year? You can say no, all of it, or up to a number of days.' });
  if (p.carryOver) want(p.carryExpires !== undefined, { key: 'policy:carryExpires', ask: 'By the end of which month must carried-over days be used, or are they lost? You can say they never expire.' });
  return out;
}

/** An answer that only moves past a question, for listing the questions further on (a-policy-read-into-the-set-up.ts). Nothing here is kept. */
export function aPlaceholderFor(key: string): string {
  if (key === 'policy:kinds') return STANDARD_KINDS.map((k) => k.key).join(', ');
  if (key.endsWith(':days')) return 'no set number';
  if (key.endsWith(':paid') || key === 'policy:usual') return 'yes';
  if (key.endsWith(':notice')) return 'none';
  if (key.endsWith(':whoFor')) return 'everyone';
  if (key.endsWith(':adoptive')) return 'adoptive parents too';
  if (key === 'policy:week') return 'Monday to Friday';
  if (key === 'policy:country') return 'Kenya';
  if (key === 'policy:accrual') return 'at the start';
  if (key === 'policy:yearStarts') return 'January';
  if (key === 'policy:carryOver') return 'up to 5 days';
  if (key === 'policy:carryExpires') return 'March';
  return 'no';
}

// ------------------------------------------------ the answers ------------------------------------------------

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30 };
function aNumber(t: string): number | null {
  const m = /(\d+(?:\.\d+)?)/.exec(t);
  if (m) return Number(m[1]);
  for (const [w, n] of Object.entries(NUMBER_WORDS)) if (new RegExp(String.raw`\b${w}\b`, 'i').test(t)) return n;
  return null;
}
const DAY_NAMES = WEEKDAY_NAMES.map((d) => d.toLowerCase());
const dayIn = (w: string) => DAY_NAMES.findIndex((d) => w.toLowerCase().startsWith(d.slice(0, 3)));
const monthIn = (t: string) => {
  const i = MONTH_NAMES.findIndex((m) => new RegExp(String.raw`\b${m.slice(0, 3)}`, 'i').test(t));
  return i < 0 ? null : i + 1;
};

/** "annual, sick, maternity and study leave": the standard types by their keys, any other by its own name, annual first. */
function kindsIn(t: string): AKindPlanned[] {
  const items = t.split(/\s*(?:,|;|\n|\band\b|&)\s*/i).map((x) => x.trim().replace(/^[-*•]\s*/, '').replace(/[.]+$/, '')).filter((x) => x.length >= 2 && x.length <= 40);
  const out: AKindPlanned[] = [];
  for (const item of items) {
    const key = aKindsKey(item);
    if (!key || out.some((k) => k.key === key)) continue;
    const s = standard(key);
    out.push(s ? { key: s.key, name: s.name, per: s.per, ...(s.noNotice ? { noticeDays: 0 } : {}), ...(s.unpaid ? { paid: false } : {}) } : { key, name: capital(/\bleave\b/i.test(item) ? item : `${item} leave`) });
  }
  if (!out.length) return out;
  /* Only annual leave: no types, the one number of days, as before. */
  if (out.length === 1 && out[0].key === 'annual') return [{ ...out[0] }];
  const annual = out.find((k) => k.key === 'annual') ?? { key: 'annual', name: 'Annual leave', per: 'year' as const };
  return [annual, ...out.filter((k) => k.key !== 'annual')].slice(0, 12);
}

/** "Monday to Friday", "Mon-Sat", "Sunday to Thursday", "Monday, Tuesday, Thursday". */
function weekIn(t: string): number[] | null {
  const words = t.toLowerCase().match(/\b(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/g) ?? [];
  const days = words.map(dayIn).filter((d) => d >= 0);
  if (!days.length) return null;
  if (days.length === 2 && /\bto\b|\bthrough\b|\buntil\b|-|–/.test(t)) {
    const order = [1, 2, 3, 4, 5, 6, 0];
    const a = order.indexOf(days[0]), b = order.indexOf(days[1]);
    const out: number[] = [];
    for (let i = a; ; i = (i + 1) % 7) { out.push(order[i]); if (i === b || out.length > 7) break; }
    return [...new Set(out)].sort();
  }
  return [...new Set(days)].sort();
}

/** "Lagos, in Nigeria; Accra in Ghana", "Kampala (Uganda)". */
function officesIn(t: string): AnOfficePlanned[] | null {
  const items = t.split(/\s*(?:;|\n|\band\b(?=\s+(?:the\s+)?[A-Z]))\s*/).map((x) => x.trim().replace(/[.]+$/, '')).filter(Boolean);
  const out: AnOfficePlanned[] = [];
  for (const item of items) {
    const m = /^(?:an?\s+|the\s+|one\s+in\s+)?(.+?)(?:\s+office)?\s*(?:,\s*in|,|\s+in|\()\s*(.+?)\)?$/i.exec(item);
    if (!m) return null;
    const name = capital(m[1].trim().slice(0, 80)), country = capital(m[2].trim().slice(0, 80));
    if (!name || !country || out.some((o) => o.name.toLowerCase() === name.toLowerCase())) continue;
    out.push({ name, country });
  }
  return out.length ? out.slice(0, 20) : null;
}

/** "New Year's Day on 2027-01-01; Madaraka Day on 2027-06-01". */
function holidaysIn(t: string, office: string | null): { office: string | null; on: Day; name: string }[] | null {
  const out: { office: string | null; on: Day; name: string }[] = [];
  for (const m of t.matchAll(/([^;\n]+?)\s+(?:on\s+)?(\d{4}-\d{2}-\d{2})/g)) {
    const on = m[2];
    if (Number.isNaN(new Date(`${on}T00:00:00Z`).getTime())) continue;
    const name = m[1].trim().replace(/^[-*•,]\s*/, '').replace(/[,:]+$/, '').slice(0, 80);
    if (name && !out.some((h) => h.on === on)) out.push({ office, on, name });
  }
  return out.length ? out : null;
}

/**
 * One answer read into the policy. Returns the policy with the answer in it, or the question to ask again in plain words. Nothing
 * is stored here.
 */
export function takeAPolicyAnswer(policy: LeavePolicyPlan | undefined, key: string, message: string, known: Known): { policy: LeavePolicyPlan } | { again: string } {
  const t = (message ?? '').trim().replace(/[ \t]+/g, ' ');
  const p: LeavePolicyPlan = JSON.parse(JSON.stringify(policy ?? {}));
  if (!t) return { again: 'I did not catch an answer there. Could you say it again?' };
  const kindPart = /^kind:([^:]+):(.+)$/.exec(key);
  if (kindPart) {
    const k = p.kinds?.find((x) => x.key === kindPart[1]);
    if (!k) return { again: 'Which type of leave do you mean?' };
    const field = kindPart[2];
    if (field === 'days') {
      if (NO.test(t) || /\bno\s+(?:set\s+)?(?:number|limit)\b|\bas\s+(?:long\s+as\s+)?needed\b/i.test(t)) { k.days = null; return { policy: p }; }
      const n = aNumber(t);
      if (n == null || n < 0 || n > 365) return { again: `How long is ${lower(k.name)}? Say a number of days a year, or a number of days each time, for example “5 days each time”.` };
      const weeks = /\bweeks?\b/i.test(t), months = /\bmonths?\b/i.test(t);
      k.days = Math.round(weeks ? n * 7 : months ? n * 30 : n);
      /* Weeks and months are spans of the calendar: every day inside them counts. */
      if (weeks || months) k.everyDay = true;
      k.per = /\beach\b|\bper\s+(?:time|occasion|birth|child|event|case)\b|\bevery\s+time\b|\ba\s+time\b|\bat\s+a\s+time\b/i.test(t) ? 'occasion'
        : /\b(?:a|per|each|every)\s+year\b|\bannual(?:ly)?\b|\byearly\b/i.test(t) ? 'year'
        : standard(k.key)?.per ?? 'year';
      return { policy: p };
    }
    if (field === 'paid') {
      if (/\bunpaid\b|\bnot\s+paid\b|\bwithout\s+pay\b/i.test(t) || NO.test(t)) k.paid = false;
      else if (/\bpaid\b|\bfull\s+pay\b|\bhalf\s+pay\b/i.test(t) || YES.test(t)) k.paid = true;
      else return { again: `Is ${lower(k.name)} paid? You can say yes or no.` };
      return { policy: p };
    }
    if (field === 'notice') {
      if (NO.test(t) || /\bno\s+notice\b/i.test(t)) { k.noticeDays = 0; return { policy: p }; }
      const n = aNumber(t);
      if (n == null || n < 0 || n > 365) return { again: `How many days’ notice does ${lower(k.name)} need? Give a number of days, or say none.` };
      k.noticeDays = Math.round(/\bweeks?\b/i.test(t) ? n * 7 : /\bmonths?\b/i.test(t) ? n * 30 : n);
      return { policy: p };
    }
    if (field === 'whoFor') {
      if (NO.test(t) || /^(?:everyone|everybody|anyone|anybody|all\s+staff|all)[.!]?$/i.test(t)) { k.whoFor = null; return { policy: p }; }
      const w = t.replace(/^(?:it\s+is\s+)?(?:for\s+|only\s+for\s+)/i, '').replace(/[.\s]+$/, '');
      if (w.length > 120) return { again: `Who can take ${lower(k.name)}? Say it in a few words, for example “after 6 months of service”.` };
      k.whoFor = w;
      return { policy: p };
    }
    if (field === 'adoptive') {
      if (/\bbirth\b[^.]*\bonly\b|\bonly\b[^.]*\bbirth\b|\bnot\s+(?:for\s+)?adopt/i.test(t) || NO.test(t)) k.adoptive = false;
      else if (/\badopt/i.test(t) || /\bboth\b/i.test(t)) k.adoptive = true;
      else return { again: `Can adoptive parents take ${lower(k.name)} too? You can say yes or no.` };
      return { policy: p };
    }
    if (field === 'document') {
      if (NO.test(t)) { k.document = null; return { policy: p }; }
      const after = aNumber(t.replace(/^.*?\bafter\b/i, '')) ?? 0;
      const what = t.replace(/\bafter\b.*$/i, '').replace(/^(?:yes|yeah|it\s+does|they\s+need|needs?|it\s+needs)[,.\s]*/i, '').trim().replace(/[,.\s]+$/, '') || 'a document';
      k.document = { what: /^(?:a|an|the|their)\s/i.test(what) ? lower(what) : `a ${lower(what)}`, after: Math.min(60, Math.round(after)) };
      return { policy: p };
    }
    return { again: 'I did not catch that. Could you say it again?' };
  }
  const officePart = /^office:(\d+):people$/.exec(key);
  if (officePart) {
    const o = p.offices?.[Number(officePart[1])];
    if (!o) return { again: 'Which office do you mean?' };
    if (NO.test(t) || /^nobody\s+yet\b/i.test(t)) { o.people = []; return { policy: p }; }
    const ids = new Set<string>();
    for (const team of known.teams) if (new RegExp(String.raw`\b${team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i').test(t)) for (const x of known.people) if (x.team === team) ids.add(x.id);
    for (const x of known.people) {
      const first = x.name.split(/\s+/)[0];
      if (new RegExp(String.raw`\b${x.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i').test(t) || (first.length > 1 && new RegExp(String.raw`\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i').test(t) && known.people.filter((y) => y.name.split(/\s+/)[0] === first).length === 1)) ids.add(x.id);
    }
    if (!ids.size) return { again: `I could not find those people. Who works from the ${o.name} office? Name them, or their team, or say nobody yet.` };
    o.people = [...ids];
    return { policy: p };
  }
  switch (key) {
    case 'policy:kinds': {
      if (NO.test(t)) { p.kinds = []; return { policy: p }; }
      const kinds = kindsIn(t.replace(/^(?:we\s+(?:only\s+)?have\s+|just\s+|only\s+)/i, ''));
      if (kinds.length === 1 && kinds[0].key === 'annual') { p.kinds = []; return { policy: p }; }
      if (!kinds.length) return { again: 'Which types of leave do you have? Name them, for example “annual, sick, maternity and paternity leave”.' };
      /* What was already said of a type is kept when the list is said again. */
      p.kinds = kinds.map((k) => ({ ...k, ...(p.kinds?.find((x) => x.key === k.key) ?? {}) }));
      return { policy: p };
    }
    case 'policy:notice': {
      if (NO.test(t) || /\bno\s+notice\b/i.test(t)) { p.noticeDays = 0; return { policy: p }; }
      const n = aNumber(t);
      if (n == null || n < 0 || n > 365) return { again: 'How many days’ notice does leave need? Give a number of days, or say none.' };
      p.noticeDays = Math.round(/\bweeks?\b/i.test(t) ? n * 7 : /\bmonths?\b/i.test(t) ? n * 30 : n);
      return { policy: p };
    }
    case 'policy:week': {
      const w = weekIn(t);
      if (!w) return { again: 'Which days do people work? Say the days, for example “Monday to Friday”.' };
      p.week = w;
      return { policy: p };
    }
    case 'policy:weekends':
    case 'policy:holidays': {
      const yes = YES.test(t) || /\b(?:they|it)\s+(?:do|does)\s+count\b|^count\b/i.test(t);
      const no = NO.test(t) || /\b(?:do|does)\s+not\s+count\b|\bdon'?t\s+count\b|\bfree\b/i.test(t);
      if (yes === no) return { again: 'Do they count as leave days? You can say yes or no.' };
      if (key === 'policy:weekends') p.weekendsCount = yes; else p.holidaysCount = yes;
      return { policy: p };
    }
    case 'policy:country': {
      const c = t.replace(/^(?:we\s+are\s+|it\s+is\s+|our\s+organisation\s+is\s+)?(?:in\s+|based\s+in\s+)?/i, '').replace(/[.\s]+$/, '');
      if (!c || c.length > 80) return { again: 'Which country? Say its name, for example Kenya.' };
      p.country = capital(c);
      return { policy: p };
    }
    case 'policy:usual': {
      if (NO.test(t)) { p.usualHolidays = false; return { policy: p }; }
      if (YES.test(t) || /\busual\b|\bdraft\b/i.test(t)) { p.usualHolidays = true; return { policy: p }; }
      return { again: `Do you give the usual public holidays of ${p.country ?? 'your country'}? You can say yes or no.` };
    }
    case 'policy:offices': {
      if (NO.test(t) || /^(?:just|only)\s+(?:one|the\s+one)\b/i.test(t)) { p.offices = []; return { policy: p }; }
      const o = officesIn(t);
      if (!o) return { again: 'Name each office and its country, for example “Lagos, in Nigeria”, or say no.' };
      p.offices = o.map((x) => ({ ...x, ...(p.offices?.find((y) => y.name === x.name)?.people ? { people: p.offices!.find((y) => y.name === x.name)!.people } : {}) }));
      return { policy: p };
    }
    case 'policy:holidayList': {
      const h = holidaysIn(t, null);
      if (!h) return { again: 'Write each public holiday as its name and its date, for example “Madaraka Day on 2027-06-01”.' };
      p.holidays = h;
      p.holidaysDrafted = false;
      return { policy: p };
    }
    case 'policy:accrual': {
      if (/\bmonth/i.test(t)) p.accrual = 'monthly';
      else if (/\bstart\b|\bbeginning\b|\bonce\b|\bup\s*front\b|\ball\s+at\b|\bin\s+full\b|\bat\s+once\b/i.test(t)) p.accrual = 'start';
      else return { again: 'Is annual leave given all at the start of the leave year, or built up each month?' };
      return { policy: p };
    }
    case 'policy:yearStarts': {
      const m = monthIn(t);
      if (!m) return { again: 'Which month does the leave year start in? For example, January.' };
      p.yearStarts = m;
      return { policy: p };
    }
    case 'policy:carryOver': {
      if (NO.test(t) || /\bnot\s+carried\b|\bcannot\b|\bcan'?t\b|\blost\b/i.test(t)) { p.carryOver = 0 as never; delete p.carryExpires; return { policy: p }; }
      if (/\ball\b|\beverything\b|\bno\s+limit\b|\bunlimited\b/i.test(t)) { p.carryOver = 'all'; return { policy: p }; }
      const n = aNumber(t);
      if (n == null || n < 0 || n > 365) return { again: 'How many days can be carried over? Say a number, all of them, or no.' };
      p.carryOver = Math.round(n) as never;
      if (!p.carryOver) delete p.carryExpires;
      return { policy: p };
    }
    case 'policy:carryExpires': {
      if (NO.test(t) || /\bnever\b|\bdo(?:n'?t| not)\s+expire\b|\bno\s+expiry\b/i.test(t)) { p.carryExpires = null; return { policy: p }; }
      const m = monthIn(t);
      if (!m) return { again: 'By the end of which month must carried-over days be used? For example, March. You can say they never expire.' };
      p.carryExpires = m;
      return { policy: p };
    }
  }
  return { again: 'I did not catch that. Could you say it again?' };
}

// ------------------------------------------------ what is kept ------------------------------------------------

/** The kinds as the leave rules keep them, annual leave with the days a year. */
function kindsAsKept(policy: LeavePolicyPlan, days: number | undefined): Record<string, unknown>[] | null {
  if (!policy.kinds?.length) return null;
  return policy.kinds.map((k) => ({
    key: k.key, name: k.name,
    days: k.key === 'annual' ? (days ?? null) : (k.days ?? null),
    ...(k.key !== 'annual' && k.per === 'occasion' ? { per: 'occasion' } : {}),
    ...(k.paid !== undefined ? { paid: k.paid } : {}),
    ...(k.noticeDays !== undefined ? { noticeDays: k.noticeDays } : {}),
    ...(k.whoFor ? { whoFor: k.whoFor } : {}),
    ...(k.adoptive !== undefined ? { adoptive: k.adoptive } : {}),
    ...(k.document ? { document: k.document.what, documentAfterDays: k.document.after } : {}),
    ...(k.everyDay ? { everyDay: true } : {}),
  }));
}

/** The part of the leave rules the policy says, for `SuitesService.setLeaveRules`. A part not said is left out, so what is kept stays. */
export function thePolicyAsRules(policy: LeavePolicyPlan | undefined, days: number | undefined): Record<string, unknown> {
  const p = policy ?? {};
  const out: Record<string, unknown> = {};
  const kinds = kindsAsKept(p, days);
  if (kinds) out.kinds = kinds;
  if (p.kinds && !p.kinds.length && p.noticeDays !== undefined) out.noticeDays = p.noticeDays || null;
  if (p.week) out.workingWeek = p.week;
  if (p.weekendsCount !== undefined) out.weekendsCount = p.weekendsCount;
  if (p.holidaysCount !== undefined) out.holidaysCount = p.holidaysCount;
  if (p.country !== undefined) out.country = p.country;
  if (p.accrual) out.accrual = p.accrual;
  if (p.yearStarts) out.yearStarts = p.yearStarts;
  if (p.carryOver !== undefined) out.carryOver = p.carryOver || null;
  if (p.carryExpires !== undefined) out.carryExpires = p.carryExpires;
  return out;
}

/** What is stored, as a policy plan, so a set-up started again asks nothing already set, and the reply after the yes says what was kept. */
export function policyFromStored(rules: LeaveRules, places: { offices: { name: string; country: string; people: string[] }[]; holidays: { office: string | null; on: Day; name: string }[] } | null): LeavePolicyPlan {
  const p: LeavePolicyPlan = {};
  if (rules.kinds?.length) {
    p.kinds = rules.kinds.map((k: ALeaveKind) => ({
      key: k.key, name: k.name, per: k.per === 'occasion' ? 'occasion' : 'year', days: k.days,
      ...(k.paid !== undefined ? { paid: k.paid } : {}),
      ...(k.noticeDays !== undefined ? { noticeDays: k.noticeDays } : {}),
      ...(k.whoFor ? { whoFor: k.whoFor } : {}),
      ...(k.adoptive !== undefined ? { adoptive: k.adoptive } : {}),
      ...(k.document ? { document: { what: k.document, after: k.documentAfterDays ?? 0 } } : {}),
      ...(k.everyDay ? { everyDay: true } : {}),
    }));
  }
  /* Only what an admin has set is read back as answered; a calendar never set is asked. */
  const set = !!(rules.workingWeek || rules.weekendsCount || rules.holidaysCount || rules.country || rules.accrual || rules.yearStarts || rules.carryOver);
  if (set) {
    if (!rules.kinds?.length) { p.kinds = []; p.noticeDays = rules.noticeDays ?? 0; }
    p.week = rules.workingWeek ?? MONDAY_TO_FRIDAY;
    p.weekendsCount = !!rules.weekendsCount;
    p.holidaysCount = !!rules.holidaysCount;
    p.country = rules.country ?? null;
    p.accrual = rules.accrual ?? 'start';
    p.yearStarts = rules.yearStarts ?? 1;
    p.carryOver = rules.carryOver ?? (0 as never);
    if (rules.carryOver) p.carryExpires = rules.carryExpires ?? null;
  }
  if (places && (set || places.offices.length || places.holidays.length)) {
    p.offices = places.offices.map((o) => ({ name: o.name, country: o.country, people: o.people }));
    if (places.holidays.length) { p.holidays = places.holidays; p.usualHolidays = true; } else if (p.country) p.usualHolidays = false;
  }
  return p;
}

// ------------------------------------------------ said back ------------------------------------------------

/** The policy said back in full sentences, by the same functions that say the stored rules (the-leave-rules.ts), with offices and holidays. */
export function thePolicySaid(policy: LeavePolicyPlan | undefined, days: number | undefined, known: Known): string[] {
  const p = policy ?? {};
  const out: string[] = [];
  const changed = changeLeaveRules({}, thePolicyAsRules(p, days));
  const rules = 'rules' in changed ? changed.rules : {};
  for (const k of rules.kinds ?? []) out.push(...aKindSaid(k));
  if ((rules.kinds?.length ?? 0) > 1) out.push(`When somebody does not say which type, Groundwork takes it as ${lower(rules.kinds![0].name)}.`);
  if (p.kinds && !p.kinds.length && p.noticeDays !== undefined) out.push(p.noticeDays ? `Leave needs ${p.noticeDays} ${p.noticeDays === 1 ? 'day’s' : 'days’'} notice.` : 'Leave needs no notice.');
  out.push(...theCalendarSaid(rules).filter((l) => !/^Groundwork carries leave over/.test(l)));
  if (p.offices?.length) {
    for (const o of p.offices) {
      const who = (o.people ?? []).map((id) => known.people.find((x) => x.id === id)?.name).filter((x): x is string => !!x);
      out.push(`The ${o.name} office is in ${o.country}, and follows its public holidays.${who.length ? ` ${andList(who)} ${who.length === 1 ? 'works' : 'work'} from it.` : ' Nobody is tied to it yet.'}`);
    }
    out.push(`Everybody not tied to an office follows the public holidays of ${p.country ?? 'your organisation'}.`);
  } else if (p.offices) out.push('You have no offices in other countries.');
  if (p.holidays?.length) {
    const places = [...new Set(p.holidays.map((h) => h.office))];
    for (const place of places) {
      const list = p.holidays.filter((h) => h.office === place).sort((a, b) => a.on.localeCompare(b.on));
      const where = place ? `the ${place} office` : (p.country ?? 'your organisation');
      out.push(`The public holidays for ${where} are ${andList(list.map((h) => `${h.name} on ${saidAsADay(h.on)}`))}.`);
    }
    /* Found with the real model, 20 November 2026: it drafted Eid al-Fitr 2027 on 9 May and Eid al-Adha on 16 July, both wrong. Holidays set by the moon are not guessed. */
    if (p.holidaysDrafted) out.push('I drafted these dates, so please check each one before you say yes. Once you say yes, they count as public holidays in everybody’s leave. Holidays that follow the moon, such as Eid, are not in this list, because their dates are set when they are announced. Add each one when its date is announced, on the Suites page under the leave settings, in Add a public holiday.');
  } else if (p.usualHolidays && p.country) {
    out.push(`I could not draft the public holidays of ${p.country}, so none are set yet. You can add them on the Suites page.`);
  }
  return out;
}

// ------------------------------------------------ drafting the public holidays ------------------------------------------------

export const DRAFT_THE_HOLIDAYS_PROMPT_KEY = 'suites.draft-the-public-holidays';
export const DRAFT_THE_HOLIDAYS_PROMPT = `List the public holidays of a country for one calendar year, as an organisation there would give them to its staff. Give each holiday's usual English name and its date as YYYY-MM-DD for that year. Easter and the holidays tied to it can be worked out, so give them. Leave out every holiday that follows the moon and is set when it is announced (Eid al-Fitr, Eid al-Adha, Mawlid, Diwali and the like): never guess its date. Leave out anything you are not sure is a public holiday there.`;
const DRAFT_SCHEMA = {
  name: 'the_holidays',
  description: 'The public holidays, each with its name and date.',
  input_schema: {
    type: 'object',
    properties: { holidays: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, on: { type: 'string' } }, required: ['name', 'on'] } } },
    required: ['holidays'],
  },
};

/** The year whose holidays are drafted: this year until October, and next year from then on, so the list is of use. */
export const theYearToDraft = (today: Date) => (today.getUTCMonth() >= 9 ? today.getUTCFullYear() + 1 : today.getUTCFullYear());

/**
 * A country's public holidays for one year, drafted by the model for the admin to check. Only real days of that year are kept, each
 * once, at most 30. Nothing goes to any service but the model. Empty without a model.
 */
export async function draftThePublicHolidays(
  engine: { extract?: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> } | null | undefined,
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  country: string,
  year: number,
): Promise<{ on: Day; name: string }[]> {
  if (typeof engine?.extract !== 'function' || !country.trim()) return [];
  const version = await prompts?.getActive(DRAFT_THE_HOLIDAYS_PROMPT_KEY).catch(() => null);
  const raw = await engine.extract(version?.content ?? DRAFT_THE_HOLIDAYS_PROMPT, [{ role: 'user', content: `The country: ${country.slice(0, 80)}. The year: ${year}.` }], DRAFT_SCHEMA, { thinkingBudget: 256 }).catch(() => null);
  const out: { on: Day; name: string }[] = [];
  for (const h of Array.isArray(raw?.holidays) ? raw.holidays : []) {
    const on = typeof h?.on === 'string' ? h.on.trim() : '';
    const name = typeof h?.name === 'string' ? h.name.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
    const d = new Date(`${on}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(on) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== on || d.getUTCFullYear() !== year || !name) continue;
    if (!out.some((x) => x.on === on)) out.push({ on, name });
  }
  return out.sort((a, b) => a.on.localeCompare(b.on)).slice(0, 30);
}
