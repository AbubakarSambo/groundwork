import { isASalesKind } from '../board/the-kind-of-work';
import { theDealsOnRecord, theUnitsOf, type ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { theOtherQuotesPrice } from '../board/what-needs-you-and-what-to-do';
import { thePromisesCarriedOver, type APromiseCarriedOver } from '../board/a-promise-carried-over';
import { theSalesMorning, theThingWithItsDeal, type TheSalesMorning } from './the-sales-morning-from-the-record';
import { theCollectionsBoardFor } from '../board/the-collections-board.service';
import type { TheCollectionsBoard, ABillOnTheBoard } from '../board/the-collections-board';
import { anAmount, money as billMoney, theDueDay } from '../board/the-collections-board';
import { theBillsOnRecord, theBillsThisReaderMayRead, withTheEventsSaid } from '../board/the-collections-board.service';
import { F } from '../board/the-collections-record';
import { asHappened } from '../board/a-fee-note-due-on-an-event';
import { theCollectionsTypeFor } from '../board/the-collections-record';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';
import { theirDay, twoMissedDaysSaid, notInTodaySaid, onTimeSaid, mayBeNudged, type ASessionOnRecord, type TheirDay } from './who-answers-and-when';
import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { readThePersonsRecord, type AStoredPersonsRecord } from '../board/the-persons-record-store';
import { whoGroundworkCouldNotMove, type AKindOfCheckIn } from '../board/what-the-lead-reads-about-each-person';

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
 * WHAT IS NEVER SAID. Only what the lead's board already serves her, the record of her own check-in, and each person's stored record
 * (board/the-persons-record-store.ts). No pattern, no verdict and no label. A team line says what happened and the move, about the work.
 *
 * ONLY WHAT NEEDS THE LEAD, IN THE MESSAGE (Groundwork does the managing, part 2; Hafsah, 21 October 2026). The summary and its email
 * carry the target in one line, the decisions only she can make, and the people Groundwork could not move: a promise not kept three
 * check-ins running, two check-ins missed in a row, and a person Groundwork already coached in their check-ins with nothing changed
 * since (what-the-lead-reads-about-each-person.ts; read only where the organisation keeps judgements of a person on). Where none of
 * that holds, one line says so: "Nothing needs you today." What is about to close, credit for a sale with proof or for checking in on
 * time, a sale with no proof yet, leads gone quiet and a check-in not made today are Groundwork's to manage: they are marked
 * `boardOnly`, stay at the top of her board, and are never put in the message.
 *
 * SHORT. Every line has a rank. Where the message has no room, the lines with the lowest rank go, whole, never cut mid-sentence; the
 * target's first line always stays.
 */

export type AMorningPartKey = 'target' | 'needsYou' | 'closing' | 'team';

export interface AMorningLine {
  text: string;
  /** Lower goes first when there is no room for everything; ties keep their order. */
  rank: number;
  /** Shown at the top of the lead's board and never put in her morning message (Groundwork's to manage, not hers). */
  boardOnly?: boolean;
}

export interface TheMorningPart {
  key: AMorningPartKey;
  /** The heading on the board, in the prototype's words. */
  heading: string;
  /** The words the message opens the part with: "Target:", "Needs you today:", "Closing:", "Your team:". These four colon labels stay: they are Hafsah's one allowed exception to the wording rule (21 October), so no wording check should take them out. Empty where the line says it alone ("Nothing needs you today."). */
  lead: string;
  lines: AMorningLine[];
}

export interface TheDirectMorning {
  groundId: string;
  label: string;
  kind: 'sales' | 'collections' | 'matter';
  parts: TheMorningPart[];
  /** The email's subject line, after the lead's first name: "49 short of 120, and Joseph needs your yes on Juja Hardware". */
  subjectAfterTheName: string;
  /** Kept in the app (the check-in is not answered on WhatsApp): nothing of it goes to a phone. */
  keptInTheApp?: boolean;
  /**
   * The team members the lead may nudge today (nudges that get answers): their session is open and not answered, and they are past
   * their usual time or missed a day before today (who-answers-and-when.ts). The board draws "Nudge Peter" for each, to the lead alone.
   */
  mayBeNudged?: { participantId: string; firstName: string }[];
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
  /** Every session on record (who-answers-and-when.ts): who is past their usual time today, who missed two days, who keeps answering on time. */
  sessions?: ASessionOnRecord[];
  workingDays: number[] | null;
  now: Date;
  zone: string;
  /** For theThingWithItsDeal: what was said, by whom. */
  lines: { text: string; participantId: string | null }[];
  /** Each person's stored record, by their place in the check-in. Absent where the organisation keeps judgements of a person off. */
  records?: ReadonlyMap<string, AStoredPersonsRecord>;
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
  /* Sold on a deposit only is said as such, never as paid (final real-model check, item 10). */
  const onADeposit = counted && typeof counted.deposit === 'number' && counted.deposit > 0 ? Number(counted.deposit) : 0;
  const by = theAimsDay(aim.name) ?? null;
  const rows = theDealRows(board);
  const likely = rows.filter((r) => r.group === 'likely' && !isWon(r));
  const likelyUnits = likely.reduce((n, r) => n + (theUnitsOf(r.fields) ?? 0), 0);
  /* THE TARGET IN ONE LINE (Hafsah, 21 October): sold, paid, what is likely by the target's day, the gap, and whether the open deals cover
     it. "75 of 120 sold, 47 paid, 45 short, and the open deals cover 40." */
  const said = [`${commas(sold)} of ${commas(target)} sold`, ...(paid !== null ? [`${commas(paid)} paid`] : []), ...(onADeposit ? [`${commas(onADeposit)} on a deposit`] : []), ...(likelyUnits > 0 ? [`${commas(likelyUnits)} more likely${by ? ` by ${by}` : ''}`] : [])].join(', ');
  const gap = target - sold - likelyUnits;
  if (gap <= 0) {
    return { lines: [{ text: sold >= target ? `${said}, and you have reached the target.` : `${said}, and with the likely deals you reach the target.`, rank: 0 }], gap: Math.max(0, gap), target, heading };
  }
  /* What the open deals hold: the deals the board lists to close the gap, else every open deal not already counted as likely. */
  const listed = new Set(((board?.toCloseTheGap?.deals ?? []) as any[]).map((d) => String(d?.name ?? '').trim().toLowerCase()).filter(Boolean));
  const open = rows.filter((r) => !isWon(r) && r.group !== 'likely' && (listed.size ? listed.has(String(r.name).trim().toLowerCase()) : OPEN_GROUPS.has(String(r.group))));
  const cover = open.reduce((n, r) => n + (theUnitsOf(r.fields) ?? 0), 0);
  /* How much the open deals hold against the gap, never only "they cover it" (final real-model check, item 11). */
  const text = cover >= gap
    ? `${said}, ${commas(gap)} short, and the open deals hold ${commas(cover)}, which covers it if they close.`
    : cover > 0
      ? `${said}, ${commas(gap)} short, and the open deals cover ${commas(cover)}.`
      : `${said}, ${commas(gap)} short, and no open deal covers any of it.`;
  return { lines: [{ text, rank: 0 }], gap, target, heading };
}

const A_DECISION = /\b(?:decision|decide|approv\w*|yes or no|go-ahead|sign[- ]off on the price|price)\b/i;
const A_VAGUE_HOLDER = /\b(?:unknown|someone|somebody|nobody|anyone|whoever|not sure)\b/i;
const wordsOf = (t: string) => String(t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'from'].includes(w));
/*
 * ONE WAIT, ONE PLAIN SENTENCE: who waits, on whom, since when, and for what (Wanjiru's morning, 20 October). Two lines read wrong:
 * "Brian is waiting on the court's e-filing portal for the e-filing portal to be working." said the portal twice, and "Brian has been
 * waiting for the Nyota Logistics fee dispute from you since Thursday." made a dispute the thing he waits to be given.
 */
/** A matter waited on, rather than a thing to be given: "the Nyota Logistics fee dispute". Only where the words name nothing else. */
const A_MATTER = /\b(?:dispute|claim|case|matter|issue|situation)$/i;
const NO_PREPOSITION = /^(?:(?!\b(?:on|with|about|for|of|to|from|in|by|at)\b).)*$/i;
/** A thing waited on to be in a state: "the e-filing portal to be working". */
const A_STATE = /^(.+?)(\s+to\s+(?:be|start|work|come|reflect|clear|arrive)\b.*)$/i;

/** "Peter has been waiting on you since Thursday for a specific area to focus on." / "... about the Nyota Logistics fee dispute." */
export function aWaitOnYouSaid(rep: string, what: string, since: string): string {
  const about = A_MATTER.test(what) && NO_PREPOSITION.test(what);
  return `${rep} has been waiting on you ${since} ${about ? 'about' : 'for'} ${what}.`;
}

/** "Brian has been waiting since 13 October for the court's e-filing portal to be working." / "Aisha has been waiting on Mr. Baraka since Monday for proof of payment for FN-006." */
export function aWaitOnAHolderSaid(rep: string, holder: string, what: string, since: string): string {
  const st = A_STATE.exec(what);
  if (st) {
    const theThing = wordsOf(st[1]);
    const theHolder = new Set(wordsOf(holder));
    if (theThing.length && theThing.every((w) => theHolder.has(w))) return `${rep} has been waiting ${since} for ${holder}${st[2]}.`;
  }
  return `${rep} has been waiting on ${holder} ${since} for ${what}.`;
}

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
      lines.push({ text: aWaitOnYouSaid(rep, what, since), rank: 4 });
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
  /* Then a difference people said that is hers to settle, as the board lists it. */
  for (const d of ((input.board?.decisions ?? []) as any[]).filter((x) => x?.source === 'divergence' && /^you$/i.test(String(x?.owner ?? '')))) {
    const m = /^People in this check-in said different things about (.+?), so it needs settling\.?$/i.exec(String(d.question ?? '').trim());
    if (m) lines.push({ text: `People said different things about ${m[1]}, so settle it with them.`, rank: 6 });
  }
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
  /* What is about to close is the team's to close: on the board, never in the message (Hafsah, 21 October). */
  if (!out.length) return [{ text: 'Nothing is booked to close in the next seven days.', rank: 7, boardOnly: true }];
  return out.map((o, i) => ({ text: o.text, rank: i === 0 ? 3 : 8, boardOnly: true }));
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
    /* Somebody Groundwork already coached in their check-ins, with nothing changed since (what-the-lead-reads-about-each-person.ts). */
    const notMoved = whoGroundworkCouldNotMove(input.records?.get(p.id) ?? null, who, 'sales');
    /* Rank 2: when the message has no room, kept with the decisions only she can make, before a wait, a difference to settle or a promise carried over (Wanjiru's two check-ins in one message). */
    if (notMoved) said.push({ text: notMoved, rank: 2 });
    /* A promise to a colleague not kept, three check-ins running. */
    const carried = input.carried.find((c) => c.participantId === p.id);
    if (carried) {
      const w = input.waits.find((x) => x.id === carried.waitId);
      const thing = w ? theThingWithItsDeal(stop(String(w.what ?? '')), w.fromParticipantId, input.deals as any, input.lines) : stop(carried.says.replace(/, promised three check-ins running, still not done\.?$/, ''));
      said.push({ text: `${who} has promised ${thing.replace(/^(?![Tt]he\b)/, 'the ')} 3 times without delivering, so call ${who}.`.replace(/\bthe the\b/i, 'the'), rank: 9 });
    }
    /* A check-in not made: two missed days (call them), not in today by their usual time, or not since the last working day. */
    const day = input.sessions ? theirDay(p.id, input.sessions, input.now, input.zone) : null;
    said.push(...theCheckInLines(p.id, who, day, input.lastCheckIn, input.firstOpened, today, before, input.workingDays, input.zone));
    /* A sale on record with no proof. */
    const noProof = rows.filter((r) => r.ownerParticipantId === p.id && r.group === 'said-won');
    if (noProof.length) said.push({ text: `${noProof.length === 1 ? `${who}'s sale to ${noProof[0].name} has` : `${who} has ${noProof.length} sales that have`} no proof yet, so ask ${who} for the payment record.`, rank: 12, boardOnly: true });
    /* Leads that have not answered for a week. */
    const silent = rows.filter((r) => r.ownerParticipantId === p.id && !isWon(r) && r.notAnsweringSince && keyIn(new Date(`${r.notAnsweringSince}T12:00:00Z`), 'UTC') <= plus(today, -7));
    if (silent.length) said.push({ text: silent.length === 1 ? `${who}'s lead ${silent[0].name} hasn't answered in a week; tell ${who} to drop it.` : `${who} has ${silent.length} leads that haven't answered in a week; tell ${who} to drop them.`, rank: 11, boardOnly: true });
    /* Sales with proof: said, so the lead can say well done. */
    const proven = rows.filter((r) => r.ownerParticipantId === p.id && r.group === 'won');
    if (proven.length) said.push({ text: `${who} has ${proven.length} ${proven.length === 1 ? 'sale' : 'sales'} with proof, so tell ${who} well done.`, rank: 13, boardOnly: true });
    said.sort((a, b) => a.rank - b.rank);
    if (said[0]) out.push(said[0]);
    /* Credit for answering on time, beside whatever else is said about them (facts only, no label). */
    const credit = day && !day.lateToday && !day.missedDays.length ? onTimeSaid(who, day, today) : null;
    if (credit) out.push({ text: credit, rank: 14, boardOnly: true });
  }
  return out.sort((a, b) => a.rank - b.rank);
}

/**
 * NOTHING NEEDS YOU TODAY (Hafsah, 21 October). Where no line of what needs her and no line about her team goes in the message, the
 * part of what needs her is one line that says so, with no label in front of it: "Target: 75 of 120 sold, ... Nothing needs you today."
 */
export function withNothingNeedsYou(parts: TheMorningPart[]): { parts: TheMorningPart[]; nothing: boolean } {
  const inTheMessage = (k: AMorningPartKey) => parts.filter((p) => p.key === k).flatMap((p) => p.lines).some((l) => !l.boardOnly);
  if (inTheMessage('needsYou') || inTheMessage('team')) return { parts, nothing: false };
  const nothing: TheMorningPart = { key: 'needsYou', heading: 'What needs you today', lead: '', lines: [{ text: 'Nothing needs you today.', rank: 1 }] };
  const at = parts.findIndex((p) => p.key === 'needsYou');
  const out = at >= 0 ? parts.map((p, i) => (i === at ? { ...nothing, lines: [...nothing.lines, ...p.lines] } : p)) : [...parts.slice(0, 1), nothing, ...parts.slice(1)];
  return { parts: out, nothing: true };
}

/** The lines about the team Groundwork could not move, from each person's stored record, for the people who are not the lead. */
function theRecordLines(people: { id: string; managingOnly?: boolean; left?: boolean }[], hers: ReadonlySet<string>, names: Map<string, string>, records: ReadonlyMap<string, AStoredPersonsRecord> | undefined, kind: AKindOfCheckIn): Map<string, AMorningLine> {
  const out = new Map<string, AMorningLine>();
  if (!records) return out;
  for (const p of people) {
    if (hers.has(p.id) || p.managingOnly || p.left) continue;
    const who = names.get(p.id);
    const line = who ? whoGroundworkCouldNotMove(records.get(p.id) ?? null, who, kind) : null;
    if (line) out.set(p.id, { text: line, rank: 2 });
  }
  return out;
}

/**
 * THE CHECK-IN LINES FOR ONE PERSON (nudges that get answers). With the sessions read: two missed days in a row is "Peter hasn't checked
 * in for 2 days, on Monday 19 October and Tuesday 20 October, so call Peter." (rank 8, before a promise not kept); past their usual time
 * today is "Peter hasn't checked in today, and last checked in yesterday." (rank 10). Otherwise, as before: not since the last working day.
 */
export function theCheckInLines(
  pid: string, who: string, day: TheirDay | null, lastCheckIn: Record<string, Date | null>, firstOpened: Record<string, Date | null>,
  today: string, before: string, workingDays: number[] | null, zone: string,
): AMorningLine[] {
  if (day) {
    const two = twoMissedDaysSaid(who, day, workingDays);
    if (two) return [{ text: two, rank: 8 }];
    /* One day not in yet is Groundwork's to chase (its reminders, and the lead's own Nudge button on the board): never in the message. */
    const notIn = notInTodaySaid(who, day, today);
    if (notIn) return [{ text: notIn, rank: 10, boardOnly: true }];
  }
  const last = lastCheckIn[pid] ?? null;
  const opened = firstOpened[pid] ?? null;
  if (last) {
    const k = keyIn(last, zone);
    if (k < before) return [{ text: `${who} hasn't checked in ${sinceADay(k, today)}.`, rank: 10, boardOnly: true }];
  } else if (opened && keyIn(opened, zone) <= before) {
    return [{ text: `${who} hasn't checked in yet.`, rank: 10, boardOnly: true }];
  }
  return [];
}

/** The team members the lead may nudge today, by their first names as the morning calls them. */
export function whoMayBeNudged(
  people: { id: string; name: string; managingOnly?: boolean; left?: boolean }[], hers: ReadonlySet<string>, sessions: ASessionOnRecord[] | undefined, now: Date, zone: string,
): { participantId: string; firstName: string }[] {
  if (!sessions) return [];
  const names = theNamesToCall(people.map((p) => ({ id: p.id, name: p.name })));
  return people
    .filter((p) => !hers.has(p.id) && !p.managingOnly && !p.left && names.get(p.id))
    .filter((p) => mayBeNudged(theirDay(p.id, sessions, now, zone)))
    .map((p) => ({ participantId: p.id, firstName: names.get(p.id)! }));
}

/** The four parts of one sales check-in, from the lead's board as she is served it and the record beside it. */
export function theSalesDirectMorning(input: TheSalesMorningInput): TheDirectMorning {
  const names = theNamesToCall(input.people.map((p) => ({ id: p.id, name: p.name })));
  const name = (pid: string | null) => (pid ? names.get(pid) ?? null : null);
  const target = theTargetLines(input.board, input.now, input.zone);
  const needs = theNeedsYouLines(input, name);
  const { parts, nothing } = withNothingNeedsYou([
    { key: 'target', heading: target.heading, lead: 'Target:', lines: target.lines },
    { key: 'needsYou', heading: 'What needs you today', lead: 'Needs you today:', lines: needs.lines },
    { key: 'closing', heading: 'About to close', lead: 'Closing:', lines: theClosingLines(input) },
    { key: 'team', heading: 'Your team today', lead: 'Your team:', lines: theTeamLines(input, name) },
  ]);
  const subject = [
    target.gap !== null && target.target !== null ? (target.gap > 0 ? `${commas(target.gap)} short of ${commas(target.target)}` : `${commas(target.target)} reached`) : null,
    needs.first ?? (nothing ? 'nothing needs you today' : null),
  ].filter(Boolean) as string[];
  return {
    groundId: input.groundId,
    label: input.label,
    kind: 'sales',
    parts,
    subjectAfterTheName: subject.length ? subject.join(', and ') : `today on ${input.label}`,
  };
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* The four parts of a "collect what's owed" check-in                                                                         */
/* ------------------------------------------------------------------------------------------------------------------------- */

/**
 * FOR A "COLLECT WHAT'S OWED" CHECK-IN (Muchemi & Co's fee notes): what is owed in total and what is paid with proof; what fell due
 * today and why (the event it waited for); what needs the partner; and who to chase (the client, the amount, who follows it up). Read
 * from the bills on record as the collections board reads them (the-collections-board.service), with each bill's event where the
 * partner may read it, so the summary and the board agree.
 */
export interface TheCollectionsMorningInput {
  groundId: string;
  label: string;
  billWord: string;
  /** A lender's loans, not invoices or fee notes: each is a borrower's, and said as theirs (browser test, 21 October 2026). */
  loans?: boolean;
  bills: ABillOnTheBoard[];
  /** The collections board's own rows for this reader, for who said a bill is paid. */
  served: TheCollectionsBoard | null;
  people: { id: string; name: string; isTheLead?: boolean; managingOnly?: boolean; left?: boolean }[];
  hers: ReadonlySet<string>;
  waits: AWaitOnRecord[];
  lastCheckIn: Record<string, Date | null>;
  firstOpened: Record<string, Date | null>;
  sessions?: ASessionOnRecord[];
  workingDays: number[] | null;
  now: Date;
  zone: string;
  /** Each person's stored record, by their place in the check-in. Absent where the organisation keeps judgements of a person off. */
  records?: ReadonlyMap<string, AStoredPersonsRecord>;
}

const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

export function theCollectionsDirectMorning(input: TheCollectionsMorningInput): TheDirectMorning {
  const { now, zone } = input;
  const today = keyIn(now, zone);
  const word = input.loans ? 'loan' : input.billWord || 'invoice';
  const names = theNamesToCall(input.people.map((p) => ({ id: p.id, name: p.name })));
  const name = (pid: string | null) => (pid ? (input.hers.has(pid) ? 'you' : names.get(pid) ?? null) : null);
  const Name = (pid: string | null) => { const n = name(pid); return n ? capital(n) : null; };
  const f = (b: ABillOnTheBoard, k: string) => field(b.fields as any, k);
  /* Who follows a bill up: the person named for it, else the person who keeps it, as the board says it. */
  /* A loan is the borrower's to repay, not to follow up: only somebody named for it follows it up (browser test: "Peter follows it up" of Peter's own loan). */
  const followerOf = (b: ABillOnTheBoard): string | null => String((b.fields as any)?._followsUp ?? '').trim() || (input.loans ? null : b.ownerParticipantId) || null;
  /* A row with no number and no amount is not a bill anybody can chase ("the Nyota dispute"). */
  const bills = input.bills.filter((b) => f(b, F.number) || anAmount(f(b, F.amount)));
  const whoOwes = (b: ABillOnTheBoard) => (input.loans ? Name(b.ownerParticipantId) ?? 'A borrower' : f(b, F.client) || f(b, F.matter) || b.name);
  /* A loan is said as the borrower's ("Peter’s loan"), never "loan for loan" (browser test, 21 October 2026). */
  const numbered = (b: ABillOnTheBoard) => (input.loans ? `${whoOwes(b)}’s loan` : `${f(b, F.number) || b.name} for ${whoOwes(b)}`);
  /* The amount, or for a paid bill the amount paid, where the record kept no amount (the board reads the same, theBillsOnRecord). */
  const amountOf = (b: ABillOnTheBoard) => anAmount(f(b, F.amount)) ?? (b.stage === 'Paid' ? anAmount(f(b, F.paid)) : null);
  const servedRow = (b: ABillOnTheBoard) => (input.served?.every?.rows ?? []).find((r) => r.id === b.id) ?? null;
  const paid = bills.filter((b) => b.stage === 'Paid');
  const proven = paid.filter((b) => (b.proof ?? []).length > 0);
  const onAWord = paid.filter((b) => !(b.proof ?? []).length);
  const unpaid = bills.filter((b) => b.stage !== 'Paid');
  let currency = 'KES';
  const sum = (xs: ABillOnTheBoard[]) => xs.reduce((n, b) => { const a = amountOf(b); if (a) currency = a.currency; return n + (a?.value ?? 0); }, 0);
  /*
   * OWED IS EVERYTHING NOT PAID WITH PROOF (final real-model check, item 9). A payment counts only when it is in the bank, so a bill
   * marked paid on somebody's word is still owed, and is said so beside it. "KES 70,000 is owed on 3 fee notes" left out FN-006 and FN-007,
   * which were paid only on Aisha's word.
   */
  const owedBills = [...unpaid, ...onAWord];
  const owed = sum(owedBills);
  const noAmount = owedBills.filter((b) => !amountOf(b)).length;
  const plural = (n: number) => (n === 1 ? word : `${word}s`);

  /* 1. What is owed, what is paid with proof, and what fell due today and why. */
  const target: AMorningLine[] = [{
    text: `${billMoney(owed, currency)} is owed on ${owedBills.length} ${plural(owedBills.length)}${noAmount ? `, and ${noAmount === owedBills.length ? (noAmount === 1 ? 'it has' : 'none of them has') : `${noAmount} of them ${noAmount === 1 ? 'has' : 'have'}`} no amount on record` : ''}.${onAWord.length ? ` ${onAWord.length === 1 ? 'One of them is' : `${onAWord.length} of them are`} marked paid on somebody’s word, with no slip or message on file.` : ''} ${proven.length ? `${billMoney(sum(proven), currency)} is paid with proof.` : 'Nothing is paid with proof yet.'}`,
    rank: 0,
  }];
  /* Marked paid with no proof is the people's to back (each one's record says it to the partner where Groundwork could not move them). */
  if (onAWord.length) target.push({ text: `${listed(onAWord.map(numbered))} ${onAWord.length === 1 ? 'is' : 'are'} marked paid, ${billMoney(sum(onAWord), currency)}${onAWord.length > 1 ? ' in all' : ''}, with no proof filed.`, rank: 1, boardOnly: true });
  const fell = unpaid.filter((b) => theDueDay(b) === today);
  for (const b of fell) {
    const why = b.event?.event ? asHappened(b.event.event) : f(b, F.dueWhen) ? asHappened(f(b, F.dueWhen)) : '';
    target.push({ text: `${numbered(b)}${amountOf(b) ? `, ${billMoney(amountOf(b)!.value, amountOf(b)!.currency)},` : ''} fell due today${why ? `, because ${why}` : ''}.`, rank: 1 });
  }
  if (!fell.length) target.push({ text: `No ${word} fell due today.`, rank: 6, boardOnly: true });

  /* 2. What needs the partner: a dispute, an event to confirm, what somebody waits on her for, a payment she marked with no proof. */
  const needs: AMorningLine[] = [];
  let first: string | null = null;
  for (const b of unpaid.filter((x) => f(x, F.disputed))) {
    const by = Name(followerOf(b));
    needs.push({ text: `${whoOwes(b)} disputes ${f(b, F.number) || b.name}, saying ${stop(f(b, F.disputed)).replace(/^./, (c) => c.toLowerCase())}${by && by !== 'You' ? `, and ${by} follows it up` : ''}, so decide whether to correct it.`, rank: 2 });
    first = first ?? `${whoOwes(b)} disputes ${f(b, F.number) || b.name}`;
  }
  for (const c of input.served?.needsYou?.toConfirm ?? []) needs.push({ text: sentence(stop(c.title)), rank: 3 });
  const said = new Set<string>();
  for (const w of input.waits) {
    if (String(w.status).toUpperCase() === 'CLEARED' || w.clearedAt || !w.fromParticipantId || input.hers.has(w.fromParticipantId)) continue;
    if (!w.onParticipantId || !input.hers.has(w.onParticipantId)) continue;
    const what = stop(String(w.what ?? ''));
    if (!what || /\b(?:it|this|that|them)\b/i.test(what) || /\b(?:I|me|my)\b/.test(what)) continue;
    const key = `${w.fromParticipantId}|${wordsOf(what).sort().join(' ')}`;
    if (said.has(key)) continue;
    said.add(key);
    const rep = Name(w.fromParticipantId);
    if (!rep) continue;
    needs.push({ text: aWaitOnYouSaid(rep, what, sinceADay(keyIn(new Date(w.createdAt), zone), today)), rank: 3 });
    first = first ?? `${rep} is waiting on you`;
  }
  for (const b of onAWord) {
    const row = servedRow(b);
    /* Only where she said it herself, in her own line: never of a bill somebody else said was paid (item 9). */
    if (row && /as you said/i.test(row.payment?.says ?? '') && (!b.paidSaidBy || input.hers.has(b.paidSaidBy))) needs.push({ text: `You said ${numbered(b)} is paid, so file the bank slip or the M-Pesa message.`, rank: 5 });
  }

  /* 3. Who to chase: the client, the amount, who follows it up. What fell due first, then what is behind, then a payment said with no proof. */
  const chase: { text: string; rank: number; key: string }[] = [];
  for (const b of unpaid.filter((x) => !f(x, F.disputed))) {
    const due = theDueDay(b);
    const by = Name(followerOf(b));
    const amount = amountOf(b);
    const followed = by ? (by === 'You' ? 'and you follow it up' : `and ${by} follows it up`) : 'and nobody follows it up yet, so name who will';
    if (due && due <= today) {
      const why = b.event?.event ? `, when ${asHappened(b.event.event)}` : '';
      chase.push({ text: `${numbered(b)}${amount ? `, ${billMoney(amount.value, amount.currency)},` : ''} fell due ${due === today ? 'today' : `on ${dayAndMonth(due)}`}${why}, and nothing is paid yet.${by ? ` ${by === 'You' ? 'You follow' : `${by} follows`} it up.` : input.loans ? '' : ' Nobody follows it up yet, so name who will.'}`, rank: 4, key: due });
    } else if (amount) {
      chase.push({ text: input.loans ? `${whoOwes(b)} owes ${billMoney(amount.value, amount.currency)} on their loan${by ? `, ${followed}` : ''}.` : `${whoOwes(b)} owes ${billMoney(amount.value, amount.currency)} on ${f(b, F.number) || b.name}, ${followed}.`, rank: 8, key: due ?? '9999' });
    }
  }
  for (const b of onAWord) {
    const row = servedRow(b);
    const sayer = /as (\w+) said/i.exec(row?.payment?.says ?? '')?.[1];
    if (sayer && !/^you$/i.test(sayer)) chase.push({ text: `Ask ${sayer} for the proof that ${numbered(b)} is paid.`, rank: 9, key: '9999' });
  }
  chase.sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key));
  if (!chase.length) chase.push({ text: `No ${word} needs chasing today.`, rank: 9, key: '' });

  /* 4. The team: who Groundwork could not move, then who has not checked in since the last working day. */
  const team = theCheckInsNotMade(input.people, input.hers, input.lastCheckIn, input.firstOpened, today, input.workingDays, zone, names, input.sessions, now, theRecordLines(input.people, input.hers, names, input.records, 'collections'));
  const { parts, nothing } = withNothingNeedsYou([
    /* What is owed and what is collected is the partner's target ("Target:", one of the four labels kept, 21 October). */
    { key: 'target', heading: `What is owed, and what is paid`, lead: 'Target:', lines: target },
    { key: 'needsYou', heading: 'What needs you today', lead: 'Needs you today:', lines: needs },
    /* Who to chase is the team's to chase: on the board, never in the message. */
    { key: 'closing', heading: 'Who to chase', lead: 'To chase:', lines: chase.map(({ text, rank }) => ({ text, rank, boardOnly: true })) },
    { key: 'team', heading: 'Your team today', lead: 'Your team:', lines: team },
  ]);
  return {
    groundId: input.groundId, label: input.label, kind: 'collections',
    parts,
    subjectAfterTheName: `${billMoney(owed, currency)} owed${first ? `, and ${first}` : fell.length ? `, and ${fell.length === 1 ? `${numbered(fell[0])} fell due today` : `${fell.length} fell due today`}` : nothing ? ', and nothing needs you today' : ''}`,
  };
}

/** Who has not checked in since the last working day, one line each. */
export function theCheckInsNotMade(
  people: { id: string; managingOnly?: boolean; left?: boolean }[], hers: ReadonlySet<string>,
  lastCheckIn: Record<string, Date | null>, firstOpened: Record<string, Date | null>, today: string, workingDays: number[] | null, zone: string, names: Map<string, string>,
  sessions?: ASessionOnRecord[], now?: Date, fromTheRecord?: ReadonlyMap<string, AMorningLine>,
): AMorningLine[] {
  const before = theWorkingDayBefore(today, workingDays);
  const out: AMorningLine[] = [];
  for (const p of people) {
    if (hers.has(p.id) || p.managingOnly || p.left) continue;
    const who = names.get(p.id);
    if (!who) continue;
    const notMoved = fromTheRecord?.get(p.id);
    if (notMoved) out.push(notMoved);
    const day = sessions && now ? theirDay(p.id, sessions, now, zone) : null;
    out.push(...theCheckInLines(p.id, who, day, lastCheckIn, firstOpened, today, before, workingDays, zone));
    const credit = day && !day.lateToday && !day.missedDays.length ? onTimeSaid(who, day, today) : null;
    if (credit) out.push({ text: credit, rank: 14, boardOnly: true });
  }
  return out.sort((a, b) => a.rank - b.rank);
}

/**
 * FOR ANY OTHER CHECK-IN THE LEAD RUNS WITH THE SWITCH ON (Muchemi & Co's litigation team): what needs her (a wait on her, a difference
 * people said that she has to settle), what is due in the next seven days, and who has not checked in. No target part: there is no
 * number to count.
 */
export function theMatterDirectMorning(input: { groundId: string; label: string; board: any; people: TheCollectionsMorningInput['people']; hers: ReadonlySet<string>; waits: AWaitOnRecord[]; items: { kind: string; name: string; dueAt: Date | string | null; ownerParticipantId: string | null }[]; lastCheckIn: Record<string, Date | null>; firstOpened: Record<string, Date | null>; sessions?: ASessionOnRecord[]; workingDays: number[] | null; now: Date; zone: string; records?: ReadonlyMap<string, AStoredPersonsRecord> }): TheDirectMorning {
  const today = keyIn(input.now, input.zone);
  const names = theNamesToCall(input.people.map((p) => ({ id: p.id, name: p.name })));
  const name = (pid: string | null) => (pid ? names.get(pid) ?? null : null);
  const needs: AMorningLine[] = [];
  let first: string | null = null;
  const said = new Set<string>();
  for (const w of input.waits) {
    if (String(w.status).toUpperCase() === 'CLEARED' || w.clearedAt || !w.fromParticipantId || input.hers.has(w.fromParticipantId)) continue;
    const rep = name(w.fromParticipantId);
    const what = stop(String(w.what ?? ''));
    if (!rep || !what || /\b(?:it|this|that|them)\b/i.test(what) || /\b(?:I|me|my)\b/.test(what)) continue;
    const key = `${w.fromParticipantId}|${wordsOf(what).sort().join(' ')}`;
    if (said.has(key)) continue;
    if (w.onParticipantId && input.hers.has(w.onParticipantId)) {
      said.add(key);
      needs.push({ text: aWaitOnYouSaid(rep, what, sinceADay(keyIn(new Date(w.createdAt), input.zone), today)), rank: 2 });
      first = first ?? `${rep} is waiting on you`;
    } else if (!w.onParticipantId && String(w.status).toUpperCase() === 'BLOCKING') {
      said.add(key);
      const holder = aNamedHolder(w.onLabel, w.what);
      needs.push({ text: holder ? aWaitOnAHolderSaid(rep, holder, what, sinceADay(keyIn(new Date(w.createdAt), input.zone), today)) : `${rep} is waiting for ${what}, and nobody has been named to give it, so say who will.`, rank: 4 });
    }
  }
  for (const d of ((input.board?.decisions ?? []) as any[]).filter((x) => x?.source === 'divergence' && /^you$/i.test(String(x?.owner ?? '')))) {
    const m = /^People in this check-in said different things about (.+?), so it needs settling\.?$/i.exec(String(d.question ?? '').trim());
    /* Never about "this" or "it": a line with no thing in it tells her nothing to settle (final real-model check, item 9). */
    if (m && !/^(?:this|that|it|them|these|those|the same thing)$/i.test(m[1].trim())) needs.push({ text: `People said different things about ${m[1]}, so settle it with them.`, rank: 5 });
  }
  const lastDay = plus(today, 7);
  const due = input.items.filter((i) => i.dueAt && keyIn(new Date(i.dueAt), 'UTC') >= today && keyIn(new Date(i.dueAt), 'UTC') <= lastDay)
    .sort((a, b) => new Date(a.dueAt as any).getTime() - new Date(b.dueAt as any).getTime())
    /* What is due this week is the team's to deliver: on the board, never in the message. */
    .map((i) => ({ text: `${capital(stop(i.name))} is due ${aDayFromToday(keyIn(new Date(i.dueAt as any), 'UTC'), today)}${name(i.ownerParticipantId) ? `, and ${name(i.ownerParticipantId)} has it` : ''}.`, rank: 7, boardOnly: true }));
  const team = theCheckInsNotMade(input.people, input.hers, input.lastCheckIn, input.firstOpened, today, input.workingDays, input.zone, names, input.sessions, input.now, theRecordLines(input.people, input.hers, names, input.records, 'matter'));
  const { parts, nothing } = withNothingNeedsYou([
    { key: 'needsYou', heading: 'What needs you today', lead: 'Needs you today:', lines: needs },
    { key: 'closing', heading: 'Due in the next seven days', lead: 'Due this week:', lines: due },
    { key: 'team', heading: 'Your team today', lead: 'Your team:', lines: team },
  ]);
  return {
    groundId: input.groundId, label: input.label, kind: 'matter',
    parts,
    subjectAfterTheName: first ?? (nothing ? 'nothing needs you today' : `today on ${input.label}`),
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
  /* A line marked for the board alone never goes in the message. */
  mornings.forEach((m, mi) => m.parts.forEach((part, pi) => part.lines.forEach((line, li) => { if (!line.boardOnly) pieces.push({ m: mi, p: pi, l: li, text: sentence(line.text), rank: line.rank }); })));
  const kept = new Set(pieces.map((_, i) => i));
  const say = () => {
    const out: string[] = [];
    mornings.forEach((m, mi) => {
      const bits: string[] = [];
      m.parts.forEach((part, pi) => {
        const ls = pieces.map((x, i) => ({ x, i })).filter(({ x, i }) => kept.has(i) && x.m === mi && x.p === pi).map(({ x }) => x.text);
        if (ls.length) bits.push(part.lead ? `${part.lead} ${ls.join(' ')}` : ls.join(' '));
      });
      if (bits.length) out.push(`${several ? `In “${m.label}”. ` : ''}${bits.join(' ')}`);
    });
    return out.join(' ');
  };
  let text = say();
  /* Leave out the lowest-ranked line, then the next, until it fits; the first line of each check-in's target always stays. */
  const firstOfEach = new Set(mornings.map((_, mi) => pieces.findIndex((x) => x.m === mi)));
  const order = pieces.map((x, i) => ({ x, i })).filter(({ i }) => !firstOfEach.has(i)).sort((a, b) => b.x.rank - a.x.rank || b.i - a.i);
  let leftOut = 0;
  for (const { i } of order) {
    if (text.length <= room) break;
    kept.delete(i);
    leftOut++;
    text = say();
  }
  return { text, leftOut };
}

/** The email: the same parts as the message, each under its heading, and the link to the board. A line for the board alone is left out. */
export function theEmailParts(mornings: TheDirectMorning[]): { heading: string; lines: string[] }[] {
  const several = mornings.length > 1;
  return mornings.flatMap((m) => m.parts
    .map((p) => ({ heading: several ? `${p.heading}, in ${m.label}` : p.heading, lines: p.lines.filter((l) => !l.boardOnly).map((l) => sentence(l.text)) }))
    .filter((p) => p.lines.length));
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
 * switch is off for the organisation or where the reader does not run it. A sales check-in reads its deals, a "collect what's owed"
 * one its bills, and any other check-in what waits on the lead, what is due and who has not checked in.
 */
export async function theDirectMorningFor(
  prisma: any,
  opts: { groundId: string; leadUserId: string; board: any; now?: Date },
): Promise<TheDirectMorning | null> {
  const now = opts.now ?? new Date();
  const ground = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: opts.groundId },
    select: { id: true, label: true, organizationId: true, initiatorId: true, kindOfWork: true, scenario: true, workingDays: true, overWhatsApp: true, cadence: true,
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
  const checkIns: any[] = ((await Promise.resolve(prisma?.checkIn?.findMany?.({ where: { groundId: ground.id }, select: { id: true, participantId: true, sessionNumber: true, status: true, isSetup: true, completedAt: true, availableFrom: true, createdAt: true, closedReason: true } })).catch(() => [])) ?? []) as any[];
  const lastCheckIn: Record<string, Date | null> = {};
  const firstOpened: Record<string, Date | null> = {};
  for (const c of checkIns) {
    if (c.isSetup) continue;
    const opened = c.availableFrom ? new Date(c.availableFrom) : c.createdAt ? new Date(c.createdAt) : null;
    if (opened && opened <= now && (!firstOpened[c.participantId] || opened < (firstOpened[c.participantId] as Date))) firstOpened[c.participantId] = opened;
    /* A session the clock closed with nothing said is not a check-in made. */
    if (String(c.status).toUpperCase() !== 'COMPLETED' || !c.completedAt || /auto|expired|timed/i.test(String(c.closedReason ?? ''))) continue;
    const at = new Date(c.completedAt);
    if (at > now) continue;
    if (!lastCheckIn[c.participantId] || at > (lastCheckIn[c.participantId] as Date)) lastCheckIn[c.participantId] = at;
  }
  const kept = ground.overWhatsApp === false;
  /* A daily check-in's open session is missed on each working day it stays open (item 5 of the final check). */
  const sessions = checkIns.map((c) => ({ ...c, opensDaily: String(ground.cadence ?? '').toUpperCase() === 'DAILY', workingDays: ground.workingDays ?? null })) as ASessionOnRecord[];
  /* Each person's stored record, read only (never rebuilt here), where the organisation keeps judgements of a person on. */
  const records = await theStoredRecords(prisma, ground.organizationId, people.filter((p) => !p.isTheLead && !p.managingOnly && !p.left).map((p) => p.id), ground.id);
  const nudgeable = { mayBeNudged: whoMayBeNudged(people, hers, sessions, now, zone) };

  const waitsAll: AWaitOnRecord[] = ((await Promise.resolve(prisma?.groundDependency?.findMany?.({ where: { groundId: ground.id } })).catch(() => [])) ?? []) as any[];
  const openWaits = waitsAll.filter((w) => String(w.status).toUpperCase() !== 'CLEARED' && !w.clearedAt);

  /* A "collect what's owed" check-in reads the bills as the collections board reads them for the person who runs it. */
  const collections = await theCollectionsTypeFor(prisma, ground.id).catch(() => null);
  if (collections) {
    const leadRow = people.find((p) => p.isTheLead)?.id ?? null;
    const served = opts.board?.collections ?? await theCollectionsBoardFor(prisma, ground.id, { runsIt: true, participantId: leadRow }, now).catch(() => null);
    const bills = await withTheEventsSaid(prisma, theBillsThisReaderMayRead(await theBillsOnRecord(prisma, ground.id), { runsIt: true, participantId: leadRow }), { userId: opts.leadUserId, isTheLead: true }, zone).catch(() => []);
    return {
      ...theCollectionsDirectMorning({ groundId: ground.id, label: ground.label, billWord: collections.billWord, loans: collections.type === 'loans', bills, served, people, hers, waits: openWaits, lastCheckIn, firstOpened, sessions, workingDays: ground.workingDays ?? null, now, zone, records }),
      ...nudgeable,
      ...(kept ? { keptInTheApp: true } : {}),
    };
  }
  if (!isASalesKind(ground.kindOfWork)) {
    const items: any[] = ((await Promise.resolve(prisma?.workItem?.findMany?.({ where: { groundId: ground.id } })).catch(() => [])) ?? []) as any[];
    return {
      ...theMatterDirectMorning({ groundId: ground.id, label: ground.label, board: opts.board, people, hers, waits: openWaits, items, lastCheckIn, firstOpened, sessions, workingDays: ground.workingDays ?? null, now, zone, records }),
      ...nudgeable,
      ...(kept ? { keptInTheApp: true } : {}),
    };
  }
  if (!opts.board) return null;
  const open = openWaits;
  const deals: ADealOnRecord[] = await theDealsOnRecord(prisma, ground.id, { paymentRecord: true }).catch(() => [] as ADealOnRecord[]);
  const lines: any[] = (((await Promise.resolve(prisma?.recordEntry?.findMany?.({ where: { participant: { groundId: ground.id }, disputedAt: null }, select: { text: true, type: true, participantId: true, checkInId: true, createdAt: true } })).catch(() => [])) ?? []) as any[])
    .map((l) => ({ ...l, text: cleanText(String(l.text ?? '')) }));
  const turns: any[] = ((await Promise.resolve(prisma?.conversationTurn?.findMany?.({ where: { checkIn: { groundId: ground.id } }, select: { checkInId: true, role: true, content: true }, orderBy: { createdAt: 'asc' } })).catch(() => [])) ?? []) as any[];
  const carried = thePromisesCarriedOver(open as any, checkIns.filter((c) => !c.completedAt || new Date(c.completedAt) <= now), lines, turns, deals.map((d) => d.name));
  const sales = await theSalesMorning(prisma, ground.id, opts.leadUserId, now, zone).catch(() => null);
  return {
    ...theSalesDirectMorning({
      board: opts.board, groundId: ground.id, label: ground.label, hers, people, waits: open, deals, carried, sales, lastCheckIn, firstOpened, sessions,
      workingDays: ground.workingDays ?? null, now, zone, lines, records,
    }),
    ...nudgeable,
    ...(kept ? { keptInTheApp: true } : {}),
  };
}

/**
 * Each person's stored record in this check-in, by their place in it, read only. Empty where the organisation keeps judgements of a
 * person off (nothing is built for its people then, and nothing that reads one is said), or where none is kept yet.
 */
export async function theStoredRecords(prisma: any, organizationId: string | null | undefined, participantIds: string[], groundId: string): Promise<Map<string, AStoredPersonsRecord>> {
  const out = new Map<string, AStoredPersonsRecord>();
  if (!participantIds.length || !prisma?.personRecord?.findUnique) return out;
  if (!(await thePersonJudgementsAreOn(prisma, organizationId))) return out;
  for (const id of participantIds) {
    const r = await readThePersonsRecord(prisma, id);
    if (r && r.groundId === groundId) out.set(id, r);
  }
  return out;
}
