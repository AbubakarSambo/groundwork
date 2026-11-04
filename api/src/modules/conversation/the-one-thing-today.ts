import { PartyType } from '@prisma/client';
import { theDealsOnRecord, theUnitsOf, type ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { thePromisesCarriedOver } from '../board/a-promise-carried-over';
import { notAnsweringSince, theContactOf, theNamesOnOurSide, thePeopleAtEachCustomer } from '../board/a-deal-that-has-stalled';
import { theBillsOnRecord, theBillsThisReaderMayRead } from '../board/the-collections-board.service';
import { anAmount, money, theDueDay, type ABillOnTheBoard } from '../board/the-collections-board';
import { F, FOLLOWS_UP_ID } from '../board/the-collections-record';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';
import { aCheckInStartedFromTheAnchor } from './the-anchor-weekly-check-in';
import { forHumans } from '../presentation/outbound';

/**
 * EACH TEAM MEMBER'S OPENING, THE ONE THING THAT MATTERS TO THEM TODAY (the direct morning, part 3; Hafsah, 20 October 2026; behind
 * `organizations.direct_morning_on`, organisation/the-direct-morning-switch.ts).
 *
 * A team member (never the lead) is opened with one personal question about the one thing on record that matters to them today,
 * answerable in one reply: "Joseph, Juja Hardware is waiting on the KES 4,500 price for 5 units. What's happening with it, and what's
 * next?". Somebody who is late (they missed their previous session, or answered it a day late) gets the short version, at most two
 * things: "Just two things today, Joseph. What's happening with ..., and ...?".
 *
 * WHERE THE ONE THING COMES FROM. The record only, for this person, in this order:
 *   1. something a colleague or the lead is waiting on them for (an open wait on them), most overdue first; where it is a promise of
 *      theirs carried over three check-ins running (a-promise-carried-over), it is said as that;
 *   2. a deal of theirs waiting on a price: a wait of theirs naming a price that one of their deals carries as its price each;
 *   3. a deal of theirs whose customer said they would pay or buy today or tomorrow;
 *   4. a sale of theirs marked won with no payment record;
 *   5. a lead of theirs that has not answered for a week.
 * On a "collect what's owed" check-in, a bill they follow up that is disputed, due, or marked paid with no proof comes after the waits
 * and in place of the deals. Names, customers, amounts and days are said. Nothing is read from patterns, coaching or verdicts (what
 * person-judgements.ts holds back), and nothing judges the person: it says what is on record and asks what is next.
 *
 * WHO IS NAMED. Somebody waiting on them is named the way this reader may read them: the lead by first name, a colleague by first name
 * where the check-in names people to each other (peers-are-named.ts), else "a colleague". What a colleague said in the check-in is
 * theirs to read (they are in it); the lead's judgement is never read here, only what she is waiting for.
 *
 * NOTHING SPECIFIC ON RECORD: null, and the opening is today's, exactly. Never for the lead, someone who only manages, someone who left,
 * an evaluation check-in, or with the switch off.
 */

export interface AThingThatMatters {
  /** What it is about, so two things are never one thing twice. */
  key: string;
  /** Lower comes first. */
  rank: number;
  /** Ties within a rank: lower first (the most overdue, the oldest). */
  order: number;
  /** After "{Name}, ": "Juja Hardware is waiting on the KES 4,500 price for 5 units." */
  says: string;
  /** "What's happening with it, and what's next?" */
  asks: string;
  /** For the short version, a question without its mark: "what's happening with the KES 4,500 price for Juja Hardware". */
  short: string;
  /** For an email's subject, after "{Name}, ": "Juja Hardware is waiting on a price". */
  subject: string;
}

export interface ATeamMembersOpening {
  /** The words the person reads first, and the first question of the check-in, word for word. */
  text: string;
  /** The email subject that carries it. */
  subject: string;
  late: boolean;
  things: AThingThatMatters[];
  firstName: string | null;
}

/* ------------------------------------------------------------------------------------------------------------------------- */

const DAY = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const keyIn = (d: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const noon = (key: string) => new Date(`${key}T12:00:00Z`);
const plus = (key: string, n: number) => new Date(noon(key).getTime() + n * DAY).toISOString().slice(0, 10);
const daysFrom = (a: string, b: string) => Math.round((noon(b).getTime() - noon(a).getTime()) / DAY);
const dayAndMonth = (key: string) => { const [, m, d] = key.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };
const stop = (s: string) => String(s ?? '').trim().replace(/[.\s]+$/, '');
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const field = (fields: Record<string, unknown> | null | undefined, k: string) => String((fields ?? {})[k] ?? '').trim();
const isOpen = (w: { status?: string | null; clearedAt?: unknown }) => String(w.status ?? '').toUpperCase() !== 'CLEARED' && !w.clearedAt;
const FIRST_PERSON = /\b(?:I|me|my|mine|we|us|our)\b/;

/** "on Monday 19 October" for a day past, "today", "tomorrow", "on Friday 23 October". */
export function aDayInFull(key: string, today: string): string {
  const n = daysFrom(today, key);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return `on ${WEEKDAYS[noon(key).getUTCDay()]} ${dayAndMonth(key)}`;
}

/** "since yesterday", "since Monday" within the week, "since 9 October" before it. */
export function sinceTheDay(key: string, today: string): string {
  const n = daysFrom(key, today);
  if (n <= 0) return 'since this morning';
  if (n === 1) return 'since yesterday';
  if (n < 7) return `since ${WEEKDAYS[noon(key).getUTCDay()]}`;
  return `since ${dayAndMonth(key)}`;
}

/** "them" for a thing said in the plural ("the samples for Tuskys Westgate"), "it" otherwise. */
function itOrThem(thing: string): string {
  const head = String(thing ?? '').trim().replace(/^(?:the|a|an|some|your|his|her|their)\s+/i, '').split(/\s+/)[0] ?? '';
  return /[^s]s$/i.test(head) ? 'them' : 'it';
}

/** The wait's own words, said to the person it is on: their name's possessive becomes "your"; null where it cannot be said to them plainly. */
function whatTheyAreWaitedOnFor(what: string | null | undefined, theirFirstName: string | null): string | null {
  let w = stop(cleanText(String(what ?? '')));
  if (!w || FIRST_PERSON.test(w)) return null;
  if (theirFirstName) {
    const n = theirFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    w = w.replace(new RegExp(`\\b${n}(?:\\s+\\S+)?['’]s\\b`, 'g'), 'your');
    if (new RegExp(`\\b${n}\\b`).test(w)) return null;
  }
  return w.replace(/^To\b/, 'to');
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* The words, from the things                                                                                                 */
/* ------------------------------------------------------------------------------------------------------------------------- */

/** The opening a person reads, from the things that matter to them (best first). Null where there is none. */
export function theOpeningFrom(firstName: string | null, things: AThingThatMatters[], late: boolean, label: string): ATeamMembersOpening | null {
  const sorted = [...things].sort((a, b) => a.rank - b.rank || a.order - b.order);
  const kept: AThingThatMatters[] = [];
  for (const t of sorted) if (!kept.some((k) => k.key === t.key)) kept.push(t);
  if (!kept.length) return null;
  const name = String(firstName ?? '').trim() || null;
  if (late) {
    const two = kept.slice(0, 2);
    const asked = two.length === 2 ? `${capital(two[0].short)}, and ${two[1].short}?` : `${capital(two[0].short)}?`;
    return {
      text: `Just ${two.length === 2 ? 'two things' : 'one thing'} today${name ? `, ${name}` : ''}. ${asked}`,
      subject: `${name ? `${name}, just` : 'Just'} ${two.length === 2 ? 'two things' : 'one thing'} today on ${label}`,
      late: true, things: two, firstName: name,
    };
  }
  const one = kept[0];
  return {
    text: `${name ? `${name}, ${one.says}` : capital(one.says)} ${one.asks}`,
    subject: name ? `${name}, ${one.subject}` : capital(one.subject),
    late: false, things: [one], firstName: name,
  };
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* The things, from the record                                                                                                */
/* ------------------------------------------------------------------------------------------------------------------------- */

export interface AWaitRead {
  id: string;
  fromParticipantId: string | null;
  onParticipantId: string | null;
  onLabel?: string | null;
  what: string | null;
  status: string;
  createdAt: Date | string;
  dueOn?: Date | string | null;
  clearedAt?: Date | string | null;
}

export interface TheRecordForOnePerson {
  participantId: string;
  firstName: string | null;
  /** How this reader calls each other person on the check-in, by their row: a first name, or "a colleague". */
  callThem: (participantId: string | null) => string | null;
  waits: AWaitRead[];
  /** The waits on them that are a promise of theirs carried over three check-ins running. */
  carriedWaitIds: ReadonlySet<string>;
  deals: ADealOnRecord[];
  /** Each of their open deals with the day its customer stopped answering, where the record says so. */
  silentSince: Map<string, Date>;
  bills: ABillOnTheBoard[] | null;
  billWord: string;
  now: Date;
  zone: string;
}

const A_PRICE = /\b(?:price|pricing|discount|offer|quote)\b/i;
const A_CUSTOMERS_DECISION = /\b(?:decision|decide|decides|approval|approve|sign-?off)\b/i;
const PAY_WORDS =/\b(?:deposit|payment|pay|balance|paid)\b/i;
const amountOfADeal = (d: ADealOnRecord) => {
  const v = field(d.fields, 'Value');
  if (/\d/.test(v) && !/deposit/i.test(v)) return v;
  const q = field(d.fields, 'Quoted');
  return /\d/.test(q) ? q : null;
};

/** Every thing on record that matters to this person today, each with its rank (theOpeningFrom picks). */
export function theThingsThatMatter(r: TheRecordForOnePerson): AThingThatMatters[] {
  const today = keyIn(r.now, r.zone);
  const out: AThingThatMatters[] = [];
  const mine = r.participantId;

  /* 1. Somebody waiting on them, most overdue first: a day it was due that has passed, the earliest first; then the oldest. */
  for (const w of r.waits) {
    if (!isOpen(w) || w.onParticipantId !== mine || !w.fromParticipantId || w.fromParticipantId === mine) continue;
    const who = r.callThem(w.fromParticipantId);
    const what = whatTheyAreWaitedOnFor(w.what, r.firstName);
    if (!who || !what) continue;
    /* Said after "{Name}, ", so a colleague stays "a colleague"; a name keeps its own capital. */
    const Who = who;
    const due = w.dueOn ? keyIn(new Date(w.dueOn), 'UTC') : null;
    const since = keyIn(new Date(w.createdAt), r.zone);
    const overdue = !!due && due < today;
    const order = overdue ? noon(due!).getTime() : 1e15 + new Date(w.createdAt).getTime();
    if (r.carriedWaitIds.has(w.id)) {
      const them = itOrThem(what);
      out.push({
        key: `wait:${w.id}`, rank: 1, order,
        says: `you've promised ${who === 'a colleague' ? 'a colleague' : Who} ${what} three times.`,
        asks: `What day will ${who === 'a colleague' ? 'they' : Who} have ${them}?`,
        short: `what day will ${who === 'a colleague' ? 'your colleague' : Who} have ${what}`,
        subject: `what day will ${who === 'a colleague' ? 'your colleague' : Who} have ${what}?`,
      });
      continue;
    }
    const when = due ? (overdue ? `, which was due ${aDayInFull(due, today)}` : `, due ${aDayInFull(due, today)}`) : `, ${sinceTheDay(since, today)}`;
    out.push({
      key: `wait:${w.id}`, rank: 1, order,
      says: `${Who} is waiting on you for ${what}${when}.`,
      asks: `When will ${who === 'a colleague' ? 'they' : Who} have it?`,
      short: `when will ${who === 'a colleague' ? 'your colleague' : Who} have ${what}`,
      subject: `${Who} is waiting on you for ${what}`,
    });
  }

  if (r.bills) {
    /* On a "collect what's owed" check-in, the bills they follow up: disputed, then due, then marked paid with no proof. */
    for (const b of r.bills) {
      const number = field(b.fields, F.number) || b.name;
      const client = field(b.fields, F.client) || field(b.fields, F.matter) || '';
      const amount = anAmount(field(b.fields, F.amount));
      if (!field(b.fields, F.number) && !amount) continue;
      const theBill = `${number}${client ? ` for ${client}` : ''}${amount ? `, ${money(amount.value, amount.currency)},` : ''}`;
      const disputed = stop(field(b.fields, F.disputed));
      const paid = b.stage === 'Paid';
      const due = theDueDay(b);
      const order = new Date(b.createdAt).getTime();
      if (!paid && disputed) {
        out.push({
          key: `bill:${b.id}`, rank: 2, order,
          says: `${client || 'the client'} disputes ${number}, saying ${disputed.replace(/^./, (c) => c.toLowerCase())}.`,
          asks: `What is the next step on it, and by what day?`,
          short: `what is the next step on the ${number} dispute`,
          subject: `${client || 'the client'} disputes ${number}`,
        });
      } else if (!paid && due && due <= today) {
        out.push({
          key: `bill:${b.id}`, rank: 3, order: noon(due).getTime(),
          says: `${theBill} fell due ${aDayInFull(due, today)}.`,
          asks: `Has ${client || 'the client'} paid, and if not, what day will they?`,
          short: `has ${client || 'the client'} paid ${number}`,
          subject: `${number} fell due ${aDayInFull(due, today)}`,
        });
      } else if (paid && !(b.proof ?? []).length) {
        out.push({
          key: `bill:${b.id}`, rank: 4, order,
          says: `${theBill} is marked paid, and no payment record is filed for it yet.`,
          asks: `Can you send the bank slip or the M-Pesa message?`,
          short: `can you send the payment record for ${number}`,
          subject: `${number} is marked paid with no payment record yet`,
        });
      }
    }
    return out;
  }

  const theirs = r.deals.filter((d) => d.ownerParticipantId === mine && !d.dropped);
  const won = (d: ADealOnRecord) => /^won$/i.test(String(d.stage ?? '').trim());

  /* 2. A deal of theirs waiting on a price: a wait of theirs that names the price the deal carries. One line per deal. */
  const priced = new Set<string>();
  for (const w of [...r.waits].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    if (!isOpen(w) || w.fromParticipantId !== mine || w.onParticipantId === mine) continue;
    const what = String(w.what ?? '');
    const amount = (what.match(/\d[\d,]*/) ?? [])[0]?.replace(/,/g, '') ?? null;
    if (!amount || !A_PRICE.test(what)) continue;
    const deal = theirs.find((d) => !won(d) && field(d.fields, 'Price each').replace(/,/g, '').includes(amount));
    if (!deal || priced.has(deal.id)) continue;
    priced.add(deal.id);
    const each = field(deal.fields, 'Price each');
    const units = theUnitsOf(deal.fields);
    out.push({
      key: `deal:${deal.id}`, rank: 2, order: new Date(w.createdAt).getTime(),
      says: `${deal.name} is waiting on the ${each} price${units ? ` for ${units} ${units === 1 ? 'unit' : 'units'}` : ''}.`,
      asks: `What's happening with it, and what's next?`,
      short: `what's happening with the ${each} price for ${deal.name}`,
      subject: `${deal.name} is waiting on a price`,
    });
  }

  /* And a deal of theirs waiting on the customer's decision: a wait of theirs on the deal's contact, or on the customer, for a decision. */
  for (const w of [...r.waits].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    if (!isOpen(w) || w.fromParticipantId !== mine || w.onParticipantId || !A_CUSTOMERS_DECISION.test(String(w.what ?? ''))) continue;
    const on = String(w.onLabel ?? '').trim();
    const norm = (s: string) => s.toLowerCase().replace(/[.]/g, '').replace(/\s+/g, ' ').trim();
    const deal = on ? theirs.find((d) => !won(d) && !priced.has(d.id) && (norm(theContactOf(d.fields) ?? '') === norm(on) || norm(d.name) === norm(on))) : null;
    const what = stop(cleanText(String(w.what ?? '')));
    if (!deal || !what || FIRST_PERSON.test(what)) continue;
    priced.add(deal.id);
    const atTheCustomer = norm(on) === norm(deal.name) ? deal.name : `${on} at ${deal.name}`;
    out.push({
      key: `deal:${deal.id}`, rank: 2, order: 1e14 + new Date(w.createdAt).getTime(),
      says: `you're waiting on ${atTheCustomer} for ${what}.`,
      asks: `Has ${norm(on) === norm(deal.name) ? 'the customer' : on} decided, and what's next?`,
      short: `has ${atTheCustomer} decided`,
      subject: `${deal.name} is waiting on a decision`,
    });
  }

  /* 3. A customer who said they would pay or buy today or tomorrow. */
  for (const d of theirs) {
    const amount = amountOfADeal(d);
    const units = theUnitsOf(d.fields);
    const forWhat = `${amount ? ` ${amount}` : ''}${units ? ` for ${units} ${units === 1 ? 'unit' : 'units'}` : ''}`;
    /* A deposit or payment they wait on from the customer, with its day. */
    const contact = (theContactOf(d.fields) ?? '').toLowerCase();
    const wait = r.waits.find((w) => isOpen(w) && w.fromParticipantId === mine && !w.onParticipantId && w.dueOn && PAY_WORDS.test(String(w.what ?? ''))
      && [contact, d.name.toLowerCase()].filter(Boolean).includes(String(w.onLabel ?? '').trim().toLowerCase()));
    const waitDay = wait ? keyIn(new Date(wait.dueOn as any), 'UTC') : null;
    if (wait && waitDay && (waitDay === today || waitDay === plus(today, 1))) {
      const what = stop(String(wait.what ?? '')).replace(/^the\s+/i, '');
      out.push({
        key: `deal:${d.id}`, rank: 3, order: noon(waitDay).getTime(),
        says: `${d.name} said they would pay the ${what} ${aDayInFull(waitDay, today)}.`,
        asks: waitDay === today ? `Has it come in?` : `Is that still on for tomorrow?`,
        short: waitDay === today ? `has the ${what} from ${d.name} come in` : `is the ${what} from ${d.name} still on for tomorrow`,
        subject: `${d.name} said they would pay ${aDayInFull(waitDay, today)}`,
      });
      continue;
    }
    if (won(d)) continue;
    const pays = /^pays( on delivery)? on \w+day (\d{1,2}) (\w+)$/i.exec(String(d.paysWhen ?? '').trim());
    if (pays) {
      const m = MONTHS.findIndex((x) => x.toLowerCase() === pays[3].toLowerCase());
      const key = m >= 0 ? `${today.slice(0, 4)}-${String(m + 1).padStart(2, '0')}-${String(Number(pays[2])).padStart(2, '0')}` : '';
      if (key === today || key === plus(today, 1)) {
        const onDelivery = !!pays[1];
        out.push({
          key: `deal:${d.id}`, rank: 3, order: noon(key).getTime(),
          says: `${d.name} said they would pay${forWhat}${onDelivery ? ' on delivery' : ''} ${aDayInFull(key, today)}.`,
          asks: key === today ? (onDelivery ? `Has it been delivered and paid?` : `Has the money come in?`) : (onDelivery ? `Is the delivery set for tomorrow?` : `Is that still on for tomorrow?`),
          short: key === today ? `has ${d.name} paid` : `is ${d.name} still on for tomorrow`,
          subject: `${d.name} said they would pay ${aDayInFull(key, today)}`,
        });
        continue;
      }
    }
    const buys = field(d.fields, 'Buying date');
    if (/^\d{4}-\d{2}-\d{2}$/.test(buys) && (buys === today || buys === plus(today, 1))) {
      out.push({
        key: `deal:${d.id}`, rank: 3, order: noon(buys).getTime(),
        says: `${d.name} said they would buy${units ? ` ${units} ${units === 1 ? 'unit' : 'units'}` : ''}${amount ? ` for ${amount}` : ''} ${aDayInFull(buys, today)}.`,
        asks: buys === today ? `Have they bought?` : `Is that still on for tomorrow?`,
        short: buys === today ? `has ${d.name} bought` : `is ${d.name} still buying tomorrow`,
        subject: `${d.name} said they would buy ${aDayInFull(buys, today)}`,
      });
    }
  }

  /* 4. A sale marked won with no payment record. The oldest first. */
  for (const d of theirs) {
    if (!won(d) || d.paid) continue;
    const amount = amountOfADeal(d);
    out.push({
      key: `deal:${d.id}`, rank: 4, order: (d.stageSaidOn ?? d.firstOnRecordAt ?? new Date(0)).getTime?.() ?? 0,
      says: `${d.name} is marked won${amount ? ` for ${amount}` : ''}, and no payment record is filed for it yet.`,
      asks: `Can you send the M-Pesa message or the receipt?`,
      short: `can you send the payment record for ${d.name}`,
      subject: `${d.name} is marked won with no payment record yet`,
    });
  }

  /* 5. A lead that has not answered for a week. The longest quiet first. */
  for (const d of theirs) {
    if (won(d)) continue;
    const since = r.silentSince.get(d.id);
    if (!since) continue;
    const key = keyIn(since, r.zone);
    if (key > plus(today, -7)) continue;
    out.push({
      key: `deal:${d.id}`, rank: 5, order: since.getTime(),
      says: `${d.name} hasn't answered ${sinceTheDay(key, today)}.`,
      asks: `Is there a next step with them, or are you dropping it?`,
      short: `is there a next step with ${d.name}, or are you dropping it`,
      subject: `${d.name} hasn't answered ${sinceTheDay(key, today)}`,
    });
  }
  return out;
}

/** Late: their previous session was missed (closed by the clock with nothing said), or answered on a later day than it opened. */
export function wasLateLastTime(previous: { status: string; completedAt: Date | string | null; availableFrom: Date | string | null; createdAt?: Date | string | null; closedReason?: string | null } | null, saidAnything: boolean, zone: string): boolean {
  if (!previous) return false;
  const status = String(previous.status ?? '').toUpperCase();
  if (status === 'MISSED' || /auto|expired|timed|missed/i.test(String(previous.closedReason ?? ''))) return true;
  if (status === 'COMPLETED' && !saidAnything) return true;
  if (status !== 'COMPLETED' || !previous.completedAt) return false;
  const opened = previous.availableFrom ?? previous.createdAt ?? null;
  if (!opened) return false;
  return keyIn(new Date(previous.completedAt), zone) > keyIn(new Date(opened), zone);
}

/* ------------------------------------------------------------------------------------------------------------------------- */
/* Read from the record                                                                                                        */
/* ------------------------------------------------------------------------------------------------------------------------- */

/**
 * THE OPENING FOR ONE TEAM MEMBER'S CHECK-IN, or null: the switch is off, the reader runs the check-in (or only manages, or left),
 * it is an evaluation check-in, or nothing specific is on record (then today's opening goes, exactly as it would).
 */
export async function aTeamMembersOpeningFor(
  prisma: any,
  opts: { groundId: string; participantId: string; sessionNumber?: number | null; now?: Date },
): Promise<ATeamMembersOpening | null> {
  /* The switch first, on one small read, so nothing more is read with it off. */
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: opts.groundId }, select: { organizationId: true } })).catch(() => null) as any;
  if (!g || !(await Promise.resolve(theDirectMorningIsOn(prisma, g.organizationId)).catch(() => false))) return null;
  const open = await whatIsOpenFor(prisma, opts);
  if (!open) return null;
  const opening = theOpeningFrom(open.firstName, open.things, open.late, open.label);
  /* In the house's own style, once, so the phone, the mailbox and the check-in read the same words. */
  return opening ? { ...opening, text: forHumans(opening.text) || opening.text } : null;
}

/** What is open for one team member, from the record only: their first name, the things that matter to them today, and whether they were late. */
export interface WhatIsOpen { organizationId: string; firstName: string | null; things: AThingThatMatters[]; late: boolean; label: string }

/**
 * THE SAME READING, WITH NO SWITCH: what the prepared opening's fact line is written from (the-opening-prepared-in-advance). Null for the
 * lead, somebody who only manages or left, an evaluation check-in or the anchor's weekly one, exactly as the opening above.
 */
export async function whatIsOpenFor(
  prisma: any,
  opts: { groundId: string; participantId: string; sessionNumber?: number | null; now?: Date },
): Promise<WhatIsOpen | null> {
  const now = opts.now ?? new Date();
  try {
    const ground = await Promise.resolve(prisma?.ground?.findUnique?.({
      where: { id: opts.groundId },
      select: { id: true, label: true, organizationId: true, initiatorId: true, scenario: true, startedFrom: true, peersVisibleToEachOther: true,
        participants: { select: { id: true, userId: true, partyType: true, nameGiven: true, managingOnly: true, leftAt: true, createdAt: true, user: { select: { firstName: true, lastName: true } } } } },
    })).catch(() => null) as any;
    if (!ground) return null;
    /* An evaluation check-in weighs one person, and the anchor's weekly check-in opens with its own words: neither is changed here. */
    if (isEvaluationCheckIn(ground.scenario) || aCheckInStartedFromTheAnchor(ground)) return null;
    const people: any[] = ground.participants ?? [];
    const me = people.find((p) => p.id === opts.participantId);
    if (!me || me.managingOnly || me.leftAt) return null;
    const isLead = (p: any) => p.partyType === PartyType.INITIATOR || (!!ground.initiatorId && p.userId === ground.initiatorId);
    if (isLead(me)) return null;
    const zone = (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
    const firstOf = (p: any) => String(p?.user?.firstName ?? p?.nameGiven ?? '').trim().split(/\s+/)[0] || null;
    const named = peersAreNamedOn(ground, { participantId: opts.participantId });
    const callThem = (pid: string | null) => {
      const p = people.find((x) => x.id === pid);
      if (!p) return null;
      if (isLead(p)) return firstOf(p);
      return named ? firstOf(p) ?? 'a colleague' : 'a colleague';
    };

    const checkIns: any[] = ((await Promise.resolve(prisma?.checkIn?.findMany?.({ where: { groundId: ground.id }, select: { id: true, participantId: true, sessionNumber: true, status: true, isSetup: true, completedAt: true, availableFrom: true, createdAt: true, closedReason: true } })).catch(() => [])) ?? []) as any[];
    const waits: AWaitRead[] = ((await Promise.resolve(prisma?.groundDependency?.findMany?.({ where: { groundId: ground.id } })).catch(() => [])) ?? []) as any[];
    const lines: any[] = (((await Promise.resolve(prisma?.recordEntry?.findMany?.({ where: { participant: { groundId: ground.id }, disputedAt: null }, select: { text: true, participantId: true, checkInId: true, createdAt: true } })).catch(() => [])) ?? []) as any[])
      .map((l) => ({ ...l, text: cleanText(String(l.text ?? '')) }));
    const turns: any[] = ((await Promise.resolve(prisma?.conversationTurn?.findMany?.({ where: { checkIn: { groundId: ground.id } }, select: { checkInId: true, role: true, content: true }, orderBy: { createdAt: 'asc' } })).catch(() => [])) ?? []) as any[];

    /* Late: their session before this one. */
    const mine = checkIns.filter((c) => c.participantId === me.id && !c.isSetup);
    const thisNumber = opts.sessionNumber ?? (mine.filter((c) => String(c.status).toUpperCase() !== 'COMPLETED').sort((a, b) => a.sessionNumber - b.sessionNumber)[0]?.sessionNumber ?? null);
    const previous = thisNumber != null ? mine.find((c) => c.sessionNumber === thisNumber - 1) ?? null : null;
    const saidAnything = !!previous && turns.some((t) => t.checkInId === previous.id && String(t.role ?? '').toUpperCase() === 'PERSON' && String(t.content ?? '').trim());
    const late = wasLateLastTime(previous, saidAnything, zone);

    const open = waits.filter(isOpen);
    const done = checkIns.filter((c) => !c.completedAt || new Date(c.completedAt) <= now);

    let bills: ABillOnTheBoard[] | null = null;
    let billWord = 'invoice';
    let deals: ADealOnRecord[] = [];
    const silentSince = new Map<string, Date>();
    if (ground.scenario === 'COLLECTIONS') {
      const all = await theBillsOnRecord(prisma, ground.id).catch(() => [] as ABillOnTheBoard[]);
      bills = theBillsThisReaderMayRead(all, { runsIt: false, participantId: me.id })
        .filter((b) => (String((b.fields ?? {})[FOLLOWS_UP_ID] ?? '').trim() || b.ownerParticipantId) === me.id);
      const org = await Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: ground.organizationId }, select: { billWord: true } })).catch(() => null) as any;
      billWord = String(org?.billWord ?? '').trim() || 'invoice';
    } else {
      deals = await theDealsOnRecord(prisma, ground.id, { paymentRecord: true }).catch(() => [] as ADealOnRecord[]);
      const theirs = deals.filter((d) => d.ownerParticipantId === me.id && !d.dropped && !/^won$/i.test(String(d.stage ?? '').trim()));
      if (theirs.length) {
        const ourSide = await theNamesOnOurSide(prisma, ground.organizationId, people).catch(() => [] as string[]);
        const peopleAt: Map<string, string[]> = await thePeopleAtEachCustomer(prisma, ground.id, theirs.map((d) => ({ id: d.id, name: d.name, ownerParticipantId: d.ownerParticipantId })), ourSide).catch(() => new Map<string, string[]>());
        for (const d of theirs) {
          const since = notAnsweringSince(d.name, lines, { people: ourSide, contact: theContactOf(d.fields), peopleThere: peopleAt.get(d.id) ?? [] });
          if (since && since <= now) silentSince.set(d.id, since);
        }
      }
    }
    const carried = thePromisesCarriedOver(open as any, done, lines, turns, deals.map((d) => d.name)).filter((c) => c.participantId === me.id);
    const things = theThingsThatMatter({
      participantId: me.id, firstName: firstOf(me), callThem, waits: open, carriedWaitIds: new Set(carried.map((c) => c.waitId)),
      deals, silentSince, bills, billWord, now, zone,
    });
    return { organizationId: ground.organizationId, firstName: firstOf(me), things, late, label: String(ground.label ?? 'your check-in') };
  } catch {
    /* Nothing that could not be read changes what anybody reads: today's opening goes. */
    return null;
  }
}

/**
 * WHAT THE MODEL IS TOLD, ON EVERY TURN AFTER THE OPENING (a block the code builds, never the stored prompt, so the version that runs is
 * this file's). The opening question was written by the product from the record and is already asked, word for word, as the first
 * message. The model follows the person's answer to it, then carries on as its runtime context says. Structure as context, never a script.
 */
export function theOneThingTodayBlock(opening: ATeamMembersOpening | null): string {
  if (!opening) return '';
  const facts = opening.things.map((t) => `- ${capital(t.says.replace(/^you've/, 'They have').replace(/\bon you\b/, 'on them'))}`).join('\n');
  return [
    "TODAY'S OPENING QUESTION (written from the record and already asked, word for word, as your first message in this check-in):",
    `"${opening.text}"`,
    'What the record holds behind it:',
    facts,
    opening.late
      ? 'They were late last time, so keep today short: settle these one or two things first, in plain words, and do not add others unless they bring them up.'
      : 'Follow their answer to it first: what happened, what is next, and the day it happens. Do not ask the same question again once they have answered it.',
    'Then carry on as the rest of your instructions say. Never call the person late, slow or anything else about who they are.',
  ].join('\n');
}
