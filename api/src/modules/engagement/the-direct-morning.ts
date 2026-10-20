import { isASalesKind } from '../board/the-kind-of-work';
import { theDealsOnRecord, theUnitsOf, type ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { theOtherQuotesPrice } from '../board/what-needs-you-and-what-to-do';
import { thePromisesCarriedOver, type APromiseCarriedOver } from '../board/a-promise-carried-over';
import { theSalesMorning, theThingWithItsDeal, type TheSalesMorning } from './the-sales-morning-from-the-record';
import { theCollectionsBoardFor } from '../board/the-collections-board.service';
import type { TheCollectionsBoard } from '../board/the-collections-board';
import { anAmount, money as billMoney } from '../board/the-collections-board';
import { theCollectionsTypeFor } from '../board/the-collections-record';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';

/**
 * THE DIRECT MORNING (Hafsah, 20 October 2026; behind `organizations.direct_morning_on`, organisation/the-direct-morning-switch.ts).
 *
 * The lead's morning summary and the top of her board are one picture, built here once, in four parts and in this order:
 *   1. Are we going to hit the target?  What is sold, what is paid, what is likely by the target's day, the gap, and whether the
 *      open deals cover it.
 *   2. What needs you today?            Each a named decision, with its customer, its amount and who is waiting.
 *   3. What's about to close?           Customer, amount, day.
 *   4. Who on the team needs you?       A name, what they did or did not do, and the move.
 * Hafsah's example, with her test numbers, is the shape:
 *   "Good morning Grace. Target: 65 of 120 sold, 40 paid. 6 more likely by 30 October. You're 49 short, and the open deals cover only
 *    28 of them, so the team needs new leads this week. Needs you today: Juja Hardware wants 5 units at KES 4,500 instead of 5,000, and
 *    Joseph is waiting for your yes or no. ... Closing: Savannah Cafe pays the KES 15,000 deposit on Friday. Your team: Kevin has 2
 *    sales with proof. Joseph has promised the Tuskys samples 3 times without delivering, so call him. ..."
 *
 * EVERY NUMBER IS FROM THE RECORD, read the way the lead's board reads it: the counts are the board's own (`objectives[].fromTheDeals`,
 * each deal's group, `toCloseTheGap`), so the summary and the board never disagree. Nothing is asked of the lead about her own
 * definitions: where she confirmed a rule (what counts as a sale, the stall rule), the board already applies it.
 *
 * WHAT IS NEVER SAID. Only what the lead's board already serves her, and the record of her own check-in. Nothing that judges a person:
 * no pattern, no coaching, no verdict and no label (person-judgements.ts holds those back, and nothing here reads them). A team line
 * says what happened and the move, about the work: a sale with proof, a promise not kept three check-ins running, leads that have not
 * answered, a check-in not made.
 *
 * SHORT. Every line has a rank. Where the message has no room, the lines with the lowest rank go, whole, never cut mid-sentence; the
 * target's first line always stays.
 */

export type AMorningPartKey = 'target' | 'needsYou' | 'closing' | 'team';

export interface AMorningLine {
  text: string;
  /** Lower goes first when there is no room for everything; ties keep their order. */
  rank: number;
}

export interface TheMorningPart {
  key: AMorningPartKey;
  /** The heading on the board, in the prototype's words. */
  heading: string;
  /** The words the message opens the part with: "Target:", "Needs you today:", "Closing:", "Your team:". */
  lead: string;
  lines: AMorningLine[];
}

export interface TheDirectMorning {
  groundId: string;
  label: string;
  kind: 'sales' | 'collections';
  parts: TheMorningPart[];
  /** The email's subject line, after the lead's first name: "49 short of 120, and Joseph needs your yes on Juja Hardware". */
  subjectAfterTheName: string;
  /** Kept in the app (the check-in is not answered on WhatsApp): nothing of it goes to a phone. */
  keptInTheApp?: boolean;
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* Small helpers                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------------- */

const DAY = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const keyIn = (d: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const noon = (key: string) => new Date(`${key}T12:00:00Z`);
const plus = (key: string, n: number) => new Date(noon(key).getTime() + n * DAY).toISOString().slice(0, 10);
const weekdayOf = (key: string) => WEEKDAYS[noon(key).getUTCDay()];
const dayAndMonth = (key: string) => { const [, m, d] = key.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };
const stop = (s: string) => String(s ?? '').trim().replace(/[.\s]+$/, '');
const sentence = (s: string) => (/[.!?][”"’)]?$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const field = (fields: Record<string, unknown> | null | undefined, k: string) => String((fields ?? {})[k] ?? '').trim();
const commas = (n: number) => Math.round(n).toLocaleString('en-US');

/** "today", "tomorrow", "on Friday" within the week, "on 30 October" after it. */
export function aDayFromToday(key: string, today: string): string {
  const days = Math.round((noon(key).getTime() - noon(today).getTime()) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1 && days < 7) return `on ${weekdayOf(key)}`;
  return `on ${dayAndMonth(key)}`;
}

/** "since Monday" within the week, "since 9 October" before it. */
export function sinceADay(key: string, today: string): string {
  const days = Math.round((noon(today).getTime() - noon(key).getTime()) / DAY);
  if (days === 1) return 'since yesterday';
  if (days > 1 && days < 7) return `since ${weekdayOf(key)}`;
  return `since ${dayAndMonth(key)}`;
}

/** The working day before today: yesterday, or Friday on a Monday (and Saturday and Sunday are skipped unless the team works them). */
export function theWorkingDayBefore(today: string, workingDays: number[] | null | undefined): string {
  const works = (workingDays ?? []).length ? new Set(workingDays) : new Set([1, 2, 3, 4, 5]);
  let k = plus(today, -1);
  for (let i = 0; i < 7 && !works.has(noon(k).getUTCDay()); i++) k = plus(k, -1);
  return k;
}

/** First names, with the surname added only where two people share a first name. */
export function theNamesToCall(people: { id: string; name: string }[]): Map<string, string> {
  const firsts = people.map((p) => String(p.name ?? '').trim().split(/\s+/)[0] ?? '');
  const out = new Map<string, string>();
  people.forEach((p, i) => {
    const first = firsts[i];
    const twice = firsts.filter((f) => f && f === first).length > 1;
    out.set(p.id, twice ? String(p.name).trim() : first || String(p.name ?? '').trim());
  });
  return out;
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* The four parts of a sales check-in                                                                                         */
/* ------------------------------------------------------------------------------------------------------------------------- */

export interface AWaitOnRecord {
  id: string;
  fromParticipantId: string | null;
  onParticipantId: string | null;
  onLabel: string | null;
  what: string | null;
  status: string;
  blockerKind?: string | null;
  createdAt: Date | string;
  dueOn?: Date | string | null;
  clearedAt?: Date | string | null;
}

export interface TheSalesMorningInput {
  /** The lead's board, as she is served it. */
  board: any;
  groundId: string;
  label: string;
  /** The lead's own rows on the check-in. */
  hers: ReadonlySet<string>;
  /** Everybody on the check-in: id, full name, whether they only manage, and whether they have left. */
  people: { id: string; name: string; managingOnly?: boolean; left?: boolean }[];
  /** Every wait on record that is still open. */
  waits: AWaitOnRecord[];
  /** The deals as the record holds them, with their payment record read (for when a customer said they will pay). */
  deals: ADealOnRecord[];
  carried: APromiseCarriedOver[];
  sales: TheSalesMorning | null;
  /** Each person's latest completed check-in. */
  lastCheckIn: Record<string, Date | null>;
  /** Each person's first check-in opened, so somebody who never checked in is told only once one was due. */
  firstOpened: Record<string, Date | null>;
  workingDays: number[] | null;
  now: Date;
  zone: string;
  /** For theThingWithItsDeal: what was said, by whom. */
  lines: { text: string; participantId: string | null }[];
}

const THE_TEAMS_AIM = (objectives: any[]) =>
  objectives.find((o) => !o?.ownerParticipantId && !o?.owner && o?.fromTheDeals && typeof o?.target === 'number')
  ?? objectives.find((o) => !o?.ownerParticipantId && !o?.owner && typeof o?.target === 'number')
  ?? null;

/** "by 30 October" from the aim's own words, else null. */
export function theAimsDay(name: string | null | undefined): string | null {
  const m = /\bby\s+((?:\d{1,2}(?:st|nd|rd|th)?\s+[A-Z][a-z]+)|(?:[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?))\b/.exec(String(name ?? ''));
  if (!m) return null;
  const t = m[1].replace(/(\d)(?:st|nd|rd|th)/, '$1');
  const a = /^(\d{1,2})\s+([A-Z][a-z]+)$/.exec(t);
  if (a) return `${Number(a[1])} ${a[2]}`;
  const b = /^([A-Z][a-z]+)\s+(\d{1,2})$/.exec(t);
  return b ? `${Number(b[2])} ${b[1]}` : null;
}

const OPEN_GROUPS = new Set(['possible', 'cooling', 'likely']);
const isWon = (r: any) => /^won$/i.test(String(r?.stage ?? '').trim()) || r?.group === 'won' || r?.group === 'said-won';
const theDealRows = (board: any): any[] => ((board?.workRecords ?? []) as any[]).filter((s) => s?.section === 'Deal grid').flatMap((s) => (s.rows ?? []) as any[]).filter((r) => (r.kind ?? 'deal') === 'deal' && String(r.name ?? '').trim());

/** 1. ARE WE GOING TO HIT THE TARGET? */
export function theTargetLines(board: any, now: Date, zone: string): { lines: AMorningLine[]; gap: number | null; target: number | null; heading: string } {
  const aim = THE_TEAMS_AIM((board?.objectives ?? []) as any[]);
  const heading = String(board?.headline?.question ?? '').trim() || 'Will we reach the target?';
  if (!aim) return { lines: [{ text: 'No team target is on record yet, so set one in your check-in.', rank: 0 }], gap: null, target: null, heading };
  const target = Number(aim.target);
  const counted = aim.fromTheDeals ?? null;
  const sold = Number(counted?.sold ?? aim.count ?? 0);
  const paid = counted && typeof counted.proven === 'number' ? Number(counted.proven) : null;
  const by = theAimsDay(aim.name) ?? null;
  const rows = theDealRows(board);
  const likely = rows.filter((r) => r.group === 'likely' && !isWon(r));
  const likelyUnits = likely.reduce((n, r) => n + (theUnitsOf(r.fields) ?? 0), 0);
  const lines: AMorningLine[] = [];
  lines.push({ text: `${commas(sold)} of ${commas(target)} sold${paid !== null ? `, ${commas(paid)} paid` : ''}.`, rank: 0 });
  lines.push({ text: likelyUnits > 0 ? `${commas(likelyUnits)} more likely${by ? ` by ${by}` : ''}.` : `None of the open deals is likely${by ? ` by ${by}` : ''} yet.`, rank: 1 });
  const gap = target - sold - likelyUnits;
  if (gap <= 0) {
    lines.push({ text: sold >= target ? 'You have reached the target.' : 'With the likely deals, you reach the target.', rank: 1 });
    return { lines, gap: Math.max(0, gap), target, heading };
  }
  /* What the open deals hold: the deals the board lists to close the gap, else every open deal not already counted as likely. */
  const listed = new Set(((board?.toCloseTheGap?.deals ?? []) as any[]).map((d) => String(d?.name ?? '').trim().toLowerCase()).filter(Boolean));
  const open = rows.filter((r) => !isWon(r) && r.group !== 'likely' && (listed.size ? listed.has(String(r.name).trim().toLowerCase()) : OPEN_GROUPS.has(String(r.group))));
  const cover = open.reduce((n, r) => n + (theUnitsOf(r.fields) ?? 0), 0);
  lines.push({
    text: cover >= gap
      ? `You're ${commas(gap)} short, and the open deals cover it if they close, so keep them moving.`
      : cover > 0
        ? `You're ${commas(gap)} short, and the open deals cover only ${commas(cover)} of them, so the team needs new leads this week.`
        : `You're ${commas(gap)} short, and no open deal covers any of it, so the team needs new leads this week.`,
    rank: 1,
  });
  return { lines, gap, target, heading };
}

const A_DECISION = /\b(?:decision|decide|approv\w*|yes or no|go-ahead|sign[- ]off on the price|price)\b/i;
const A_VAGUE_HOLDER = /\b(?:unknown|someone|somebody|nobody|anyone|whoever|not sure)\b/i;
const wordsOf = (t: string) => String(t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'from'].includes(w));
/** The holder is somebody: not empty, not "an unknown source", and not the thing waited for said again ("the pricing decision"). */
export function aNamedHolder(onLabel: string | null | undefined, what: string | null | undefined): string | null {
  const h = String(onLabel ?? '').trim();
  if (!h || A_VAGUE_HOLDER.test(h)) return null;
  const hw = wordsOf(h);
  const tw = new Set(wordsOf(String(what ?? '')));
  if (hw.length && hw.every((w) => tw.has(w) || /^decision|^pricing|^approval/.test(w))) return null;
  return h;
}

/** The deal of this rep a price names, with its units and the price on every other quote. */
function theDealAPriceIsFor(what: string, rep: string | null, deals: ADealOnRecord[]): { deal: ADealOnRecord; units: number | null; each: string; list: number | null } | null {
  const amount = (String(what ?? '').match(/\d[\d,]*/) ?? [])[0]?.replace(/,/g, '') ?? null;
  if (!amount) return null;
  const deal = deals.find((d) => !d.dropped && d.ownerParticipantId === rep && field(d.fields, 'Price each').replace(/,/g, '').includes(amount));
  if (!deal) return null;
  return { deal, units: theUnitsOf(deal.fields), each: field(deal.fields, 'Price each'), list: theOtherQuotesPrice(deals.filter((d) => d.id !== deal.id)) };
}

/** 2. WHAT NEEDS YOU TODAY? */
export function theNeedsYouLines(input: TheSalesMorningInput, name: (pid: string | null) => string | null): { lines: AMorningLine[]; first: string | null } {
  const today = keyIn(input.now, input.zone);
  const lines: AMorningLine[] = [];
  let first: string | null = null;
  const priced = new Set<string>();
  const theirs = input.waits
    .filter((w) => String(w.status).toUpperCase() !== 'CLEARED' && !w.clearedAt && w.fromParticipantId && !input.hers.has(w.fromParticipantId) && name(w.fromParticipantId))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  /* Price decisions first: a customer, an amount, and the rep who waits for the answer. One line for one deal, however many times it was said. */
  for (const w of theirs) {
    const rep = name(w.fromParticipantId)!;
    const onHer = !!w.onParticipantId && input.hers.has(w.onParticipantId);
    const onSomebodyOutside = !w.onParticipantId;
    if (!onHer && !onSomebodyOutside) continue;
    if (!A_DECISION.test(String(w.what ?? '')) && !onHer) continue;
    const p = theDealAPriceIsFor(String(w.what ?? ''), w.fromParticipantId, input.deals);
    if (!p || priced.has(p.deal.id)) continue;
    priced.add(p.deal.id);
    const ask = `${p.deal.name} wants ${p.units ? `${p.units} units at ` : ''}${p.each}${p.list ? ` instead of ${commas(p.list)}` : ''}`;
    const holder = onHer ? null : aNamedHolder(w.onLabel, w.what);
    const say = onHer || !holder
      ? `${ask}, and ${rep} is waiting for your yes or no.`
      : `${ask}, and ${rep} is waiting for a yes or no from ${holder}, so get it for ${rep}.`;
    lines.push({ text: say, rank: 2 });
    first = first ?? `${rep} needs your yes on ${p.deal.name}`;
  }
  /* Then a decision she said she would make, that a customer still waits on. */
  for (const d of input.sales?.decisionsSheOwes ?? []) {
    const m = /^You said(?: on (\d+ \w+))? that you would decide (?:on )?(.+?) for (.+?)(?:, and (.+?) is still waiting)?\.$/.exec(d.text);
    lines.push({ text: m ? `${m[3]} wants ${m[2]}, and you said${m[1] ? ` on ${m[1]}` : ''} that you would decide.` : sentence(d.text), rank: 3 });
    first = first ?? (m ? `${m[3]} is waiting for your decision` : null);
  }
  /* Then what a rep waits on her for, and what a rep waits for that nobody has been named to give. */
  const said = new Set<string>();
  for (const w of theirs) {
    const rep = name(w.fromParticipantId)!;
    const what = stop(String(w.what ?? ''));
    if (!what || /\b(?:I|me|my|we|our)\b/.test(what)) continue;
    if (theDealAPriceIsFor(what, w.fromParticipantId, input.deals)) continue;
    const key = `${w.fromParticipantId}|${wordsOf(what).sort().join(' ')}`;
    if (said.has(key)) continue;
    const since = sinceADay(keyIn(new Date(w.createdAt), input.zone), today);
    if (w.onParticipantId && input.hers.has(w.onParticipantId)) {
      said.add(key);
      lines.push({ text: `${rep} has been waiting for ${what} from you ${since}.`, rank: 4 });
      first = first ?? `${rep} is waiting on you`;
      continue;
    }
    if (!w.onParticipantId && !aNamedHolder(w.onLabel, w.what) && String(w.status).toUpperCase() === 'BLOCKING') {
      said.add(key);
      lines.push({ text: A_DECISION.test(what)
        ? `${rep} is waiting for ${what}, and nobody has been named to make it, so make it or say who will.`
        : `${rep} is waiting for ${what}, and nobody has been named to give it, so send it or say who will.`, rank: 5 });
      first = first ?? `${rep} is waiting on ${what}`;
    }
  }
  if (!lines.length) lines.push({ text: 'Nothing is waiting on you today.', rank: 6 });
  return { lines, first };
}

/** 3. WHAT'S ABOUT TO CLOSE? Customer, amount, day: within the next seven days. */
export function theClosingLines(input: TheSalesMorningInput): AMorningLine[] {
  const today = keyIn(input.now, input.zone);
  const lastDay = plus(today, 7);
  const out: { key: string; text: string }[] = [];
  const named = new Set<string>();
  const amountOf = (d: ADealOnRecord) => {
    const v = field(d.fields, 'Value') || field(d.fields, 'Quoted');
    return /\d/.test(v) && !/deposit/i.test(v) ? v : null;
  };
  for (const d of input.deals) {
    if (d.dropped) continue;
    const won = /^won$/i.test(String(d.stage ?? '').trim());
    /* A customer's deposit or payment due, as an open wait on them with its day. */
    const contact = String(d.fields?.Contact ?? '').trim().toLowerCase();
    const due = input.waits.find((w) => !w.onParticipantId && w.fromParticipantId === d.ownerParticipantId && w.dueOn && !w.clearedAt
      && String(w.status).toUpperCase() !== 'CLEARED' && (String(w.onLabel ?? '').trim().toLowerCase() === contact || String(w.onLabel ?? '').trim().toLowerCase() === d.name.toLowerCase())
      && /\b(?:deposit|payment|pay|balance|signed|order|agreement)\b/i.test(String(w.what ?? '')));
    if (due) {
      const key = keyIn(new Date(due.dueOn as any), 'UTC');
      if (key >= today && key <= lastDay) {
        const what = stop(String(due.what ?? '')).replace(new RegExp(`\\s+from\\s+${d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '');
        const verb = /\b(?:signed|agreement|order)\b/i.test(what) ? 'sends' : 'pays';
        out.push({ key, text: `${d.name} ${verb} ${what} ${aDayFromToday(key, today)}.` });
        named.add(d.id);
        continue;
      }
    }
    if (won) continue;
    /* A day the customer said they will pay, from the deal's own next step. */
    const pays = /^pays(?: on delivery)? on \w+day (\d{1,2}) (\w+)$/i.exec(String(d.paysWhen ?? '').trim());
    if (pays) {
      const m = MONTHS.findIndex((x) => x.toLowerCase() === pays[2].toLowerCase());
      const key = m >= 0 ? `${today.slice(0, 4)}-${String(m + 1).padStart(2, '0')}-${String(Number(pays[1])).padStart(2, '0')}` : '';
      if (key && key >= today && key <= lastDay) {
        const amount = amountOf(d);
        const units = theUnitsOf(d.fields);
        const how = /on delivery/i.test(String(d.paysWhen)) ? ' on delivery' : '';
        out.push({ key, text: `${d.name} pays${amount ? ` ${amount}` : ''}${units ? ` for ${units} units` : ''}${how} ${aDayFromToday(key, today)}.` });
        named.add(d.id);
        continue;
      }
    }
    /* A buying date the customer gave, inside the week. */
    const buys = field(d.fields, 'Buying date');
    if (/^\d{4}-\d{2}-\d{2}$/.test(buys) && buys >= today && buys <= lastDay) {
      const amount = amountOf(d);
      const units = theUnitsOf(d.fields);
      out.push({ key: buys, text: `${d.name} buys${units ? ` ${units} units` : ''}${amount ? ` for ${amount}` : ''} ${aDayFromToday(buys, today)}.` });
      named.add(d.id);
    }
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  if (!out.length) return [{ text: 'Nothing is booked to close in the next seven days.', rank: 7 }];
  return out.map((o, i) => ({ text: o.text, rank: i === 0 ? 3 : 8 }));
}

/** 4. WHO ON THE TEAM NEEDS YOU, AND WHAT TO DO. One line each, the one that matters most for that person. */
export function theTeamLines(input: TheSalesMorningInput, name: (pid: string | null) => string | null): AMorningLine[] {
  const today = keyIn(input.now, input.zone);
  const before = theWorkingDayBefore(today, input.workingDays);
  const rows = theDealRows(input.board);
  const out: AMorningLine[] = [];
  for (const p of input.people) {
    if (input.hers.has(p.id) || p.managingOnly || p.left) continue;
    const who = name(p.id);
    if (!who) continue;
    const said: AMorningLine[] = [];
    /* A promise to a colleague not kept, three check-ins running. */
    const carried = input.carried.find((c) => c.participantId === p.id);
    if (carried) {
      const w = input.waits.find((x) => x.id === carried.waitId);
      const thing = w ? theThingWithItsDeal(stop(String(w.what ?? '')), w.fromParticipantId, input.deals as any, input.lines) : stop(carried.says.replace(/, promised three check-ins running, still not done\.?$/, ''));
      said.push({ text: `${who} has promised ${thing.replace(/^(?![Tt]he\b)/, 'the ')} 3 times without delivering, so call ${who}.`.replace(/\bthe the\b/i, 'the'), rank: 9 });
    }
    /* A check-in not made since the last working day. */
    const last = input.lastCheckIn[p.id] ?? null;
    const opened = input.firstOpened[p.id] ?? null;
    if (last) {
      const k = keyIn(last, input.zone);
      if (k < before) said.push({ text: `${who} hasn't checked in ${sinceADay(k, today)}.`, rank: 10 });
    } else if (opened && keyIn(opened, input.zone) <= before) {
      said.push({ text: `${who} hasn't checked in yet.`, rank: 10 });
    }
    /* A sale on record with no proof. */
    const noProof = rows.filter((r) => r.ownerParticipantId === p.id && r.group === 'said-won');
    if (noProof.length) said.push({ text: `${noProof.length === 1 ? `${who}'s sale to ${noProof[0].name} has` : `${who} has ${noProof.length} sales that have`} no proof yet, so ask ${who} for the payment record.`, rank: 12 });
    /* Leads that have not answered for a week. */
    const silent = rows.filter((r) => r.ownerParticipantId === p.id && !isWon(r) && r.notAnsweringSince && keyIn(new Date(`${r.notAnsweringSince}T12:00:00Z`), 'UTC') <= plus(today, -7));
    if (silent.length) said.push({ text: silent.length === 1 ? `${who}'s lead ${silent[0].name} hasn't answered in a week; tell ${who} to drop it.` : `${who} has ${silent.length} leads that haven't answered in a week; tell ${who} to drop them.`, rank: 11 });
    /* Sales with proof: said, so the lead can say well done. */
    const proven = rows.filter((r) => r.ownerParticipantId === p.id && r.group === 'won');
    if (proven.length) said.push({ text: `${who} has ${proven.length} ${proven.length === 1 ? 'sale' : 'sales'} with proof, so tell ${who} well done.`, rank: 13 });
    said.sort((a, b) => a.rank - b.rank);
    if (said[0]) out.push(said[0]);
  }
  return out.sort((a, b) => a.rank - b.rank);
}

/** The four parts of one sales check-in, from the lead's board as she is served it and the record beside it. */
export function theSalesDirectMorning(input: TheSalesMorningInput): TheDirectMorning {
  const names = theNamesToCall(input.people.map((p) => ({ id: p.id, name: p.name })));
  const name = (pid: string | null) => (pid ? names.get(pid) ?? null : null);
  const target = theTargetLines(input.board, input.now, input.zone);
  const needs = theNeedsYouLines(input, name);
  const subject = [
    target.gap !== null && target.target !== null ? (target.gap > 0 ? `${commas(target.gap)} short of ${commas(target.target)}` : `${commas(target.target)} reached`) : null,
    needs.first,
  ].filter(Boolean) as string[];
  return {
    groundId: input.groundId,
    label: input.label,
    kind: 'sales',
    parts: [
      { key: 'target', heading: target.heading, lead: 'Target:', lines: target.lines },
      { key: 'needsYou', heading: 'What needs you today', lead: 'Needs you today:', lines: needs.lines },
      { key: 'closing', heading: 'About to close', lead: 'Closing:', lines: theClosingLines(input) },
      { key: 'team', heading: 'Your team today', lead: 'Your team:', lines: theTeamLines(input, name) },
    ],
    subjectAfterTheName: subject.length ? subject.join(', and ') : `today on ${input.label}`,
  };
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* The four parts of a "collect what's owed" check-in                                                                         */
/* ------------------------------------------------------------------------------------------------------------------------- */

/**
 * FOR A "COLLECT WHAT'S OWED" CHECK-IN (Muchemi & Co's fee notes): what is owed in total and what is paid with proof; what fell due
 * today and why (the event it waited for); who to chase (the client, the amount, who follows it up); and what needs the partner. Read
 * from the collections board the lead is served, so the summary and the board agree.
 */
export function theCollectionsDirectMorning(groundId: string, label: string, c: TheCollectionsBoard, now: Date, zone: string, lastCheckIn: Record<string, Date | null>, people: { id: string; name: string; isTheLead: boolean }[], workingDays: number[] | null): TheDirectMorning {
  const today = keyIn(now, zone);
  const word = c.billWord || 'invoice';
  const rows = c.every?.rows ?? [];
  let owed = 0; let paidProven = 0; let paidSaid = 0; let currency = 'KES';
  for (const r of rows) {
    const a = anAmount(r.amount);
    if (!a) continue;
    currency = a.currency;
    if (r.group === 'paid') { if (r.payment?.mark === 'proven') paidProven += a.value; else paidSaid += a.value; }
    else owed += a.value;
  }
  const unpaid = rows.filter((r) => r.group !== 'paid');
  const target: AMorningLine[] = [
    { text: `${billMoney(owed, currency)} is owed on ${unpaid.length} ${unpaid.length === 1 ? word : `${word}s`}, and ${billMoney(paidProven, currency)} is paid with proof.`, rank: 0 },
  ];
  if (paidSaid > 0) target.push({ text: `Another ${billMoney(paidSaid, currency)} is paid on somebody's word, with no proof filed yet.`, rank: 1 });
  /* What fell due today, and why. */
  const fell = rows.filter((r) => r.group !== 'paid' && /\btoday\b/i.test(String(r.fallsDue ?? '')));
  for (const r of fell) target.push({ text: `${r.number ?? capital(word)} for ${r.who}${r.amount ? `, ${r.amount},` : ''} fell due today${/because|when|after/i.test(r.fallsDue) ? `, ${stop(r.fallsDue.replace(/^.*?today,?\s*/i, ''))}` : ''}.`, rank: 1 });
  /* What needs the partner: the board's own What needs you, said as it is. */
  const needs: AMorningLine[] = [
    ...(c.needsYou?.rows ?? []).map((r, i) => ({ text: sentence(`${stop(r.title)}. ${stop(r.says)}`), rank: 2 + i })),
    ...(c.needsYou?.toConfirm ?? []).map((r) => ({ text: sentence(`${stop(r.title)}. ${stop(r.says)}`), rank: 3 })),
  ];
  if (!needs.length) needs.push({ text: 'Nothing is waiting on you today.', rank: 6 });
  /* Who to chase: the client, the amount, who follows it up. */
  const chase = unpaid.filter((r) => ['behind-in-touch', 'not-heard', 'blocked', 'on-track'].includes(r.group))
    .map((r) => ({ text: `${r.who}${r.number ? ` (${r.number})` : ''} owes ${r.amount ?? 'an amount nobody has said yet'}${r.followsUp ? `, and ${r.followsUp} follows it up` : ', and nobody follows it up yet, so name who will'}.`, rank: r.group === 'not-heard' || r.group === 'behind-in-touch' ? 4 : 8 }));
  if (!chase.length) chase.push({ text: `No ${word} needs chasing today.`, rank: 9 });
  /* The team: who has not checked in since the last working day. */
  const before = theWorkingDayBefore(today, workingDays);
  const names = theNamesToCall(people.map((p) => ({ id: p.id, name: p.name })));
  const team: AMorningLine[] = [];
  for (const p of people) {
    if (p.isTheLead) continue;
    const last = lastCheckIn[p.id] ?? null;
    if (last && keyIn(last, zone) < before) team.push({ text: `${names.get(p.id)} hasn't checked in ${sinceADay(keyIn(last, zone), today)}.`, rank: 10 });
  }
  return {
    groundId, label, kind: 'collections',
    parts: [
      { key: 'target', heading: 'What is owed, and what is paid', lead: 'Owed:', lines: target },
      { key: 'needsYou', heading: 'What needs you today', lead: 'Needs you today:', lines: needs },
      { key: 'closing', heading: 'Who to chase', lead: 'To chase:', lines: chase },
      { key: 'team', heading: 'Your team today', lead: 'Your team:', lines: team },
    ],
    subjectAfterTheName: `${billMoney(owed, currency)} owed on ${label}${fell.length ? `, and ${fell.length === 1 ? `${fell[0].who} fell due today` : `${fell.length} fell due today`}` : ''}`,
  };
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* Saying it: as the board draws it, inside the template, by email                                                            */
/* ------------------------------------------------------------------------------------------------------------------------- */

/** What the board's top serves: each part with its heading and its sentences, nothing left out. */
export interface TheMorningServed {
  groundId: string;
  kind: TheDirectMorning['kind'];
  parts: { key: AMorningPartKey; heading: string; lines: string[] }[];
}

export const asServedOnTheBoard = (m: TheDirectMorning): TheMorningServed => ({
  groundId: m.groundId,
  kind: m.kind,
  parts: m.parts.filter((p) => p.lines.length).map((p) => ({ key: p.key, heading: p.heading, lines: p.lines.map((l) => sentence(l.text)) })),
});

/**
 * THE FOUR PARTS IN ONE PARAGRAPH, at most `room` characters: "Target: ... Needs you today: ... Closing: ... Your team: ...". Where it
 * does not fit, the lines with the lowest rank go, whole; a part with no line left is left out with its opening word. The check-in is
 * named first where the lead is told about more than one.
 */
export function theParagraph(mornings: TheDirectMorning[], room: number): { text: string; leftOut: number } {
  const several = mornings.length > 1;
  type Piece = { m: number; p: number; l: number; text: string; rank: number };
  const pieces: Piece[] = [];
  mornings.forEach((m, mi) => m.parts.forEach((part, pi) => part.lines.forEach((line, li) => pieces.push({ m: mi, p: pi, l: li, text: sentence(line.text), rank: line.rank }))));
  const kept = new Set(pieces.map((_, i) => i));
  const say = () => {
    const out: string[] = [];
    mornings.forEach((m, mi) => {
      const bits: string[] = [];
      m.parts.forEach((part, pi) => {
        const ls = pieces.map((x, i) => ({ x, i })).filter(({ x, i }) => kept.has(i) && x.m === mi && x.p === pi).map(({ x }) => x.text);
        if (ls.length) bits.push(`${part.lead} ${ls.join(' ')}`);
      });
      if (bits.length) out.push(`${several ? `In “${m.label}”. ` : ''}${bits.join(' ')}`);
    });
    return out.join(' ');
  };
  let text = say();
  /* Leave out the lowest-ranked line, then the next, until it fits; the first line of each check-in's target always stays. */
  const order = pieces.map((x, i) => ({ x, i })).filter(({ x }) => !(x.p === 0 && x.l === 0)).sort((a, b) => b.x.rank - a.x.rank || b.i - a.i);
  let leftOut = 0;
  for (const { i } of order) {
    if (text.length <= room) break;
    kept.delete(i);
    leftOut++;
    text = say();
  }
  return { text, leftOut };
}

/** The email: the same four parts, each under its heading, and the link to the board. */
export function theEmailParts(mornings: TheDirectMorning[]): { heading: string; lines: string[] }[] {
  const several = mornings.length > 1;
  return mornings.flatMap((m) => m.parts.filter((p) => p.lines.length).map((p) => ({ heading: several ? `${p.heading}, in ${m.label}` : p.heading, lines: p.lines.map((l) => sentence(l.text)) })));
}

export function theSubject(firstName: string | null | undefined, mornings: TheDirectMorning[]): string {
  const name = String(firstName ?? '').trim() || 'Good morning';
  const about = mornings[0]?.subjectAfterTheName ?? 'today';
  return `${name}: ${about}`;
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* Read from the record                                                                                                        */
/* ------------------------------------------------------------------------------------------------------------------------- */

/**
 * THE DIRECT MORNING FOR ONE CHECK-IN, for the lead who runs it, from her board as served and the record beside it. Null where the
 * switch is off for the organisation, where the reader does not run it, or where the check-in is neither a sales check-in nor a
 * "collect what's owed" one (those keep the summary as it was).
 */
export async function theDirectMorningFor(
  prisma: any,
  opts: { groundId: string; leadUserId: string; board: any; now?: Date },
): Promise<TheDirectMorning | null> {
  const now = opts.now ?? new Date();
  const ground = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: opts.groundId },
    select: { id: true, label: true, organizationId: true, initiatorId: true, kindOfWork: true, scenario: true, workingDays: true, overWhatsApp: true,
      participants: { select: { id: true, userId: true, partyType: true, nameGiven: true, managingOnly: true, leftAt: true, user: { select: { firstName: true, lastName: true } } } } },
  })).catch(() => null) as any;
  if (!ground || ground.initiatorId !== opts.leadUserId) return null;
  if (!(await theDirectMorningIsOn(prisma, ground.organizationId))) return null;
  const zone = (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  const people = ((ground.participants ?? []) as any[]).map((p) => ({
    id: p.id,
    name: `${String(p.user?.firstName ?? p.nameGiven ?? '').trim()} ${String(p.user?.lastName ?? '').trim()}`.trim() || String(p.nameGiven ?? '').trim(),
    managingOnly: !!p.managingOnly, left: !!p.leftAt, isTheLead: p.userId === opts.leadUserId || p.partyType === 'INITIATOR', userId: p.userId,
  }));
  const hers = new Set(people.filter((p) => p.isTheLead).map((p) => p.id));
  const checkIns: any[] = ((await Promise.resolve(prisma?.checkIn?.findMany?.({ where: { groundId: ground.id }, select: { id: true, participantId: true, status: true, isSetup: true, completedAt: true, availableFrom: true, createdAt: true } })).catch(() => [])) ?? []) as any[];
  const lastCheckIn: Record<string, Date | null> = {};
  const firstOpened: Record<string, Date | null> = {};
  for (const c of checkIns) {
    if (c.isSetup) continue;
    const opened = c.availableFrom ? new Date(c.availableFrom) : c.createdAt ? new Date(c.createdAt) : null;
    if (opened && opened <= now && (!firstOpened[c.participantId] || opened < (firstOpened[c.participantId] as Date))) firstOpened[c.participantId] = opened;
    if (String(c.status).toUpperCase() !== 'COMPLETED' || !c.completedAt) continue;
    const at = new Date(c.completedAt);
    if (at > now) continue;
    if (!lastCheckIn[c.participantId] || at > (lastCheckIn[c.participantId] as Date)) lastCheckIn[c.participantId] = at;
  }
  const kept = ground.overWhatsApp === false;

  /* A "collect what's owed" check-in reads the collections board, as the lead is served it. */
  if (await theCollectionsTypeFor(prisma, ground.id).catch(() => null)) {
    const leadRow = people.find((p) => p.isTheLead)?.id ?? null;
    const c = opts.board?.collections ?? await theCollectionsBoardFor(prisma, ground.id, { runsIt: true, participantId: leadRow }, now).catch(() => null);
    if (!c) return null;
    return { ...theCollectionsDirectMorning(ground.id, ground.label, c, now, zone, lastCheckIn, people, ground.workingDays ?? null), ...(kept ? { keptInTheApp: true } : {}) };
  }
  if (!isASalesKind(ground.kindOfWork) || !opts.board) return null;

  const waits: AWaitOnRecord[] = ((await Promise.resolve(prisma?.groundDependency?.findMany?.({ where: { groundId: ground.id } })).catch(() => [])) ?? []) as any[];
  const open = waits.filter((w) => String(w.status).toUpperCase() !== 'CLEARED' && !w.clearedAt);
  const deals: ADealOnRecord[] = await theDealsOnRecord(prisma, ground.id, { paymentRecord: true }).catch(() => [] as ADealOnRecord[]);
  const lines: any[] = (((await Promise.resolve(prisma?.recordEntry?.findMany?.({ where: { participant: { groundId: ground.id }, disputedAt: null }, select: { text: true, type: true, participantId: true, checkInId: true, createdAt: true } })).catch(() => [])) ?? []) as any[])
    .map((l) => ({ ...l, text: cleanText(String(l.text ?? '')) }));
  const turns: any[] = ((await Promise.resolve(prisma?.conversationTurn?.findMany?.({ where: { checkIn: { groundId: ground.id } }, select: { checkInId: true, role: true, content: true }, orderBy: { createdAt: 'asc' } })).catch(() => [])) ?? []) as any[];
  const carried = thePromisesCarriedOver(open as any, checkIns.filter((c) => !c.completedAt || new Date(c.completedAt) <= now), lines, turns, deals.map((d) => d.name));
  const sales = await theSalesMorning(prisma, ground.id, opts.leadUserId, now, zone).catch(() => null);
  return {
    ...theSalesDirectMorning({
      board: opts.board, groundId: ground.id, label: ground.label, hers, people, waits: open, deals, carried, sales, lastCheckIn, firstOpened,
      workingDays: ground.workingDays ?? null, now, zone, lines,
    }),
    ...(kept ? { keptInTheApp: true } : {}),
  };
}
