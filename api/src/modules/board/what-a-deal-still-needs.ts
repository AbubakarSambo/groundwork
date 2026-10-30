import { aLineIsAbout } from './a-deals-value-and-buying-date';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';
import { aDaySaidInFull } from './a-day-said-in-full';
import { theCallsNotAnswered, theDaysInWords, NUMBER_SAID } from './what-needs-you-and-what-to-do';

/**
 * WHAT A DEAL STILL NEEDS, AND FROM WHOM, IN ONE LINE (Hafsah's quality pass, 18 October: Q3, B-5, B-16, R-2, R-4).
 *
 * Grace's gap list read each deal's "Next step" as the record writer first kept it, so four of six were out of date or the
 * customer's: Ngong Road Minimart still read "Send the quote, by tomorrow by noon" a day after Kevin sent it, Juja Hardware "Speak to
 * the owner" after Joseph had, and Savannah Cafe "Pay a KES 15,000 deposit on Friday", which is Jane's promise, not Kevin's step.
 * Grace asks of each deal what it still needs and who owes it. So the line is read, in this order, from what is open on record:
 *  1. a won deal: the customer's own promise ("Delivery on Friday 16 October, and Greenfield Supermarket pays on delivery."), or
 *     what its owner said they will do for it;
 *  2. a wait on whoever runs the check-in, about this deal: "Your answer on KES 4,500 a unit, then a buying date from Mr Kariuki.";
 *  3. a wait on a colleague, about this deal: "Joseph's samples, promised for Thursday 15 October. Nothing since says they came.";
 *  4. a wait on the customer: their payment ("Jane pays the KES 15,000 deposit on Friday 16 October.") or the owner's follow-up
 *     ("Kevin follows up with Ali on Monday 19 October. The quote of KES 20,000 is sent.");
 *  5. something the customer asked for that nobody has answered ("Answer Wanjiru on KES 12,000 off 10 units, then call her next week.");
 *  6. a quote the customer has, with nothing booked: "Nothing booked. Rose has your KES 10,000 quote. Ask Rose when Mama Mboga Mart will buy."
 * Null where none of these is on record: the row keeps the step it had. Every word is the record's: names, amounts and days.
 * Only waits and lines this reader is already served are given here.
 */

export interface AWaitAboutADeal {
  fromParticipantId: string | null;
  onParticipantId: string | null;
  onLabel: string | null;
  what: string | null;
  then?: string | null;
  status: string;
  dueSaid?: string | null;
  dueOn?: Date | string | null;
  triedSaid?: string | null;
  createdAt: Date | string;
}

export interface ADealsLine {
  text: string;
  participantId: string | null;
  type?: string | null;
  createdAt: Date | string;
}

export interface ADealToSay {
  name: string;
  ownerParticipantId: string | null;
  group?: string | null;
  stage?: string | null;
  fields?: Record<string, string> | null;
  buyingDate?: string | null;
  paysWhen?: string | null;
  /** The day the record says the customer stopped answering. */
  notAnsweringSince?: string | null;
}

export interface WhoIsWho {
  /** The reader's own row, so their own is said as "you". */
  me: string | null;
  /** Whoever runs the check-in. */
  lead: string | null;
  /** A person's first name, by their row. */
  firstName: (pid: string | null) => string | null;
}

const OPEN = new Set(['WAITING', 'BLOCKING', 'OPEN']);
const AMOUNTS = /\d[\d,]*(?:\.\d+)?/g;
const amountsIn = (s: string) => new Set((String(s ?? '').match(AMOUNTS) ?? []).map((a) => a.replace(/,/g, '')).filter((a) => a.length >= 3));
const field = (d: ADealToSay, k: string) => String(d.fields?.[k] ?? '').trim();
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const stop = (s: string) => s.trim().replace(/[.\s]+$/, '');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const theDayOf = (w: AWaitAboutADeal): Date | null => (w.dueOn ? new Date(w.dueOn) : theDayTheyMeant(w.dueSaid ?? null, new Date(w.createdAt)));

/** Whether a wait is about this deal: it names the customer or their person, or an amount the deal holds. */
function aWaitIsAbout(w: AWaitAboutADeal, d: ADealToSay): boolean {
  if (w.fromParticipantId !== d.ownerParticipantId) return false;
  const words = `${w.what ?? ''} ${w.then ?? ''}`;
  const contact = field(d, 'Contact');
  if (aLineIsAbout(words, { name: d.name, fields: contact ? { Contact: contact } : null })) return true;
  if (contact && w.onLabel && w.onLabel.trim().toLowerCase() === contact.toLowerCase()) return true;
  const held = new Set<string>();
  for (const k of ['Price each', 'Value', 'Quoted', 'Need']) for (const a of amountsIn(field(d, k))) held.add(a);
  return [...amountsIn(words)].some((a) => held.has(a));
}

/** The line, and the day it is booked for where the record gives one (drawn on the grid as "Next step booked"). */
export interface WhatItStillNeeds { says: string; on: Date | null }

export function whatTheDealStillNeeds(d: ADealToSay, waits: readonly AWaitAboutADeal[], lines: readonly ADealsLine[], who: WhoIsWho): WhatItStillNeeds | null {
  const said = (says: string, on: Date | null = null): WhatItStillNeeds => ({ says, on });
  const owner = d.ownerParticipantId;
  const ownerSaid = owner === who.me ? 'You' : (who.firstName(owner) ?? null);
  const contact = field(d, 'Contact');
  const open = waits.filter((w) => OPEN.has(String(w.status).toUpperCase()) && aWaitIsAbout(w, d));
  const won = /^won$/i.test(String(d.stage ?? '')) || d.group === 'won';

  /* 1. A won deal: the customer's promise, or what its owner said they will do. */
  if (won) {
    const pays = d.paysWhen ?? null;
    const onDelivery = pays?.match(/^pays on delivery on (.+)$/);
    if (onDelivery) return said(`Delivery on ${onDelivery[1]}, and ${d.name} pays on delivery.`);
    if (pays) return said(`${d.name} ${pays}.`);
    const promise = [...lines]
      .filter((l) => l.participantId === owner && String(l.type ?? '').toUpperCase() === 'COMMITMENT' && aLineIsAbout(l.text, { name: d.name, fields: null }) && !/^(?:i|we)\b/i.test(l.text.trim()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (promise && ownerSaid) return said(`${ownerSaid} will ${lowerFirst(stop(promise.text))}.`);
    return null;
  }

  /* 2. A wait on whoever runs the check-in. */
  const onTheLead = open.find((w) => !!who.lead && w.onParticipantId === who.lead);
  if (onTheLead) {
    const whose = who.lead === who.me ? 'Your' : `${who.firstName(who.lead) ?? 'The lead'}'s`;
    let thing = stop(String(onTheLead.what ?? '')).replace(/^(?:an?|the)\s+answer\s+(?:on|about|to)\s+/i, '').replace(new RegExp(`\\s+(?:for|at|from)\\s+${escape(d.name)}$`, 'i'), '');
    const each = field(d, 'Price each');
    const eachAmount = [...amountsIn(each)][0];
    if (eachAmount && [...amountsIn(thing)].includes(eachAmount)) thing = `${each} a unit`;
    const then = !d.buyingDate && contact ? `, then a buying date from ${contact}` : '';
    return said(`${whose} answer on ${thing}${then}.`);
  }

  /* 3. A wait on a colleague. */
  const onAColleague = open
    .filter((w) => !!w.onParticipantId && w.onParticipantId !== owner && w.onParticipantId !== who.lead)
    .sort((a, b) => Number(!!theDayOf(b)) - Number(!!theDayOf(a)) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (onAColleague) {
    const holder = onAColleague.onParticipantId === who.me ? 'Your' : `${who.firstName(onAColleague.onParticipantId) ?? 'A colleague'}'s`;
    const thing = stop(String(onAColleague.what ?? ''))
      .replace(/^(?:the|a|an|some)\s+/i, '')
      .replace(new RegExp(`\\s+for\\s+${escape(d.name)}$`, 'i'), '');
    const day = theDayOf(onAColleague);
    const many = /s$/i.test(thing.split(/\s+/).pop() ?? '');
    return day
      ? said(`${holder} ${thing}, promised for ${aDaySaidInFull(day)}. Nothing since says ${many ? 'they' : 'it'} came.`, day)
      : said(`${holder} ${thing}. Nothing since says ${many ? 'they' : 'it'} came.`);
  }

  /* A customer gone quiet: what the owner tried, from their own lines (standing decision 4: no stall rule marks it). */
  if (d.notAnsweringSince) {
    const calls = theCallsNotAnswered({ name: d.name, fields: d.fields ?? null, ownerParticipantId: owner, notAnsweringSince: d.notAnsweringSince }, lines);
    if (calls && ownerSaid) {
      const n = calls.calls === 1 ? 'a call' : `${NUMBER_SAID[calls.calls] ?? calls.calls} calls`;
      return said(`${contact || d.name} has not answered ${n} from ${ownerSaid === 'You' ? 'you' : ownerSaid}, on ${theDaysInWords(calls.days)}.`);
    }
  }

  /* 4. A wait on the customer: their payment, or the owner's follow-up. */
  const onTheCustomer = open.filter((w) => !w.onParticipantId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const aPayment = onTheCustomer.find((w) => /\b(?:deposit|payment|pay|KES|Ksh)\b/i.test(String(w.what ?? '')) && theDayOf(w));
  if (aPayment) {
    const thing = stop(String(aPayment.what ?? '')).replace(/^(?:a|an)\s+/i, 'the ');
    return said(`${String(aPayment.onLabel ?? contact).trim()} pays ${thing} on ${aDaySaidInFull(theDayOf(aPayment)!)}.`, theDayOf(aPayment));
  }
  const quoted = field(d, 'Quoted');
  const quoteSent = quoted ? ` ${ownerSaid === 'You' ? 'Your' : 'The'} quote of ${quoted} is sent.` : '';
  const aFollowUp = onTheCustomer.find((w) => /\b(?:follow(?:ing)?\s+up|call|ring|chase)\b/i.test(String(w.triedSaid ?? '')) && theDayTheyMeant(w.triedSaid ?? null, new Date(w.createdAt)));
  if (aFollowUp && ownerSaid) {
    const day = theDayTheyMeant(aFollowUp.triedSaid ?? null, new Date(aFollowUp.createdAt))!;
    const person = String(aFollowUp.onLabel ?? contact).trim();
    const verb = /\bcall|ring\b/i.test(String(aFollowUp.triedSaid)) ? (ownerSaid === 'You' ? 'call' : 'calls') : (ownerSaid === 'You' ? 'follow up with' : 'follows up with');
    return said(`${ownerSaid} ${verb} ${person} on ${aDaySaidInFull(day)}.${quoteSent}`, day);
  }

  /* 5. Something the customer asked for that nobody has answered. */
  const ask = anUnansweredAsk(d, lines);
  if (ask) {
    const what = ask.amount ? `KES ${ask.amount.toLocaleString('en-GB')} off${ask.units ? ` ${ask.units} units` : ''}` : 'the discount';
    const next = field(d, 'Next step');
    return said(`Answer ${contact || d.name} on ${what}${next ? `, then ${lowerFirst(stop(next))}` : ''}.`);
  }

  /* 6. A quote the customer has, with nothing booked. */
  if (quoted && !d.buyingDate && contact && !field(d, 'Next step')) {
    if (ownerSaid === 'You') return said(`Nothing booked. ${contact} has your ${quoted} quote. Ask ${contact} when ${d.name} will buy.`);
    return said(`Nothing booked. ${contact} has ${ownerSaid ? `${ownerSaid}'s` : 'the'} ${quoted} quote, and no buying date is on record.`);
  }
  return null;
}

/**
 * WHAT A DEAL IS WORTH, AS THE GRID SAYS IT BESIDE ITS OWNER (Hafsah's quality pass, 18 October, B-13). A price nobody has agreed is
 * not a value: Juja Hardware reads "5 units, KES 22,500 if you agree KES 4,500" while Joseph waits on Grace for that price. A quote
 * the customer has, with no other value, reads "KES 30,000 quoted". Otherwise the deal's own value, or null.
 */
export function theValueLine(d: ADealToSay, waits: readonly AWaitAboutADeal[], who: WhoIsWho, units: number | null): string | null {
  const value = field(d, 'Value');
  const quoted = field(d, 'Quoted');
  const each = field(d, 'Price each');
  const eachAmount = [...amountsIn(each)][0];
  const unagreed = eachAmount && waits.some((w) => OPEN.has(String(w.status).toUpperCase()) && !!who.lead && w.onParticipantId === who.lead
    && w.fromParticipantId === d.ownerParticipantId && [...amountsIn(`${w.what ?? ''}`)].includes(eachAmount));
  /* The deal's units lead its line wherever the record holds them, read by theUnitsOf, the same count that closes the gap (boards audit, S9). */
  const many = units ? `${units} ${units === 1 ? 'unit' : 'units'}` : null;
  if (unagreed && value) {
    const agree = who.lead === who.me ? 'you agree' : `${who.firstName(who.lead) ?? 'the lead'} agrees to`;
    return `${many ? `${many}, ` : ''}${value} if ${agree} ${each}`;
  }
  const money = quoted && (!value || [...amountsIn(value)].join() === [...amountsIn(quoted)].join()) ? `${quoted} quoted` : value || null;
  return [many, money].filter(Boolean).join(', ') || null;
}

/**
 * A DISCOUNT THE CUSTOMER ASKED FOR THAT NOBODY HAS ANSWERED, from the owner's own lines: the ask ("Wanjiru at Mama Pima Stores asked
 * for a 12,000 KES discount for 10 units."), a line of theirs since saying it is not answered ("I haven't responded to the discount
 * request yet."), and none since saying it was. With the amount, the units and the day it was first asked.
 */
export function anUnansweredAsk(d: ADealToSay, lines: readonly ADealsLine[]): { amount: number | null; units: number | null; on: Date } | null {
  const contact = field(d, 'Contact');
  const owners = [...lines].filter((l) => l.participantId === d.ownerParticipantId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const asks = owners.filter((l) => aLineIsAbout(l.text, { name: d.name, fields: contact ? { Contact: contact } : null }) && /\bdiscount\b|\boff\b/i.test(l.text) && /\basked for\b|\bwants?\b/i.test(l.text));
  const last = asks[asks.length - 1];
  if (!last) return null;
  const unanswered = owners.some((l) => new Date(l.createdAt) >= new Date(asks[0].createdAt) && /\bha(?:ve|s)n['’]?t (?:responded|answered|replied)\b|\bno answer\b/i.test(l.text) && /\bdiscount|\brequest|\bprice\b/i.test(l.text));
  const answered = owners.some((l) => new Date(l.createdAt) > new Date(last.createdAt) && /\b(?:agreed|approved|gave (?:her|him|them) the discount|said no to the discount|turned down the discount)\b/i.test(l.text));
  if (!unanswered || answered) return null;
  const amount = last.text.match(/(?:KES|Ksh)\s?(\d[\d,]*)|(\d[\d,]*)\s?(?:KES|Ksh)/i);
  const units = last.text.match(/\bfor\s+(\d+)\s+units?\b/i);
  return {
    amount: amount ? Number(String(amount[1] ?? amount[2]).replace(/,/g, '')) : null,
    units: units ? Number(units[1]) : null,
    on: new Date(asks[0].createdAt),
  };
}
