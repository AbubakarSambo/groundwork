import { BILL, F, FOLLOWS_UP_ID, NOT_YET_RAISED, aDay, theCollectionsTypeFor } from './the-collections-record';
import { theStagesKept } from './a-deals-stages-are-kept';
import { DUE_ON_AN_EVENT, theEventWaitedFor, theEventAsSaid, type ALineKept } from './a-fee-note-due-on-an-event';
import { theWordForTheBill, theBillsPlural } from '../grounds/collect-whats-owed';

/**
 * RAISING INVOICES ON TIME (release plan, Release 3; Hafsah's brief of 24 October 2026, part 2).
 *
 * Money stops getting lost between "the work is done" and "the invoice went out". A bill at "Not yet raised" in a "Collect what's
 * owed" check-in should be raised from a day, and this file works out that day, why, who raises it, how late it is, and the
 * sentences each reader is told. It reads the record only and writes nothing; the record writer (the-collections-record) still
 * moves a bill to Invoiced when the person who raised it says so, with its number, amount and day, or files the invoice on it.
 *
 * WHEN A BILL SHOULD BE RAISED, from what is already kept on it:
 *  - on a date: its "Falls due" day, or the day kept as its due date, once that day has come;
 *  - when an event is reported in a check-in: the day kept by a-fee-note-due-on-an-event when the matter's check-in said it happened;
 *  - when a milestone is accepted: the day kept under `_fromAMilestone` (written by Release 5's projects; nothing writes it yet);
 *  - when a sale is won, for an organisation that invoices after a sale: the day kept under `_fromASale` (a-sale-won-is-an-invoice-to-raise).
 * The earliest of these that has come is the day. A bill with none of them is not "due to raise": the board keeps saying nobody has
 * said when it falls due.
 *
 * WHO RAISES IT. The person in the check-in whose role here is about accounts, invoices, billing or fee notes; else the person who
 * follows the bill up; else whoever runs the check-in. Groundwork never raises or drafts the invoice (drafting is Release 3B).
 *
 * LATE. A bill is late to raise from the day after the day it should have been raised. Raised late is the day it moved to Invoiced
 * against that day; "more than five days after" is the line a pattern is named on, and only after it has happened more than once.
 */

export const FROM_A_SALE = '_fromASale';
export const FROM_A_MILESTONE = '_fromAMilestone';
/** Days after it fell due beyond which an invoice counts as raised late in the pattern. */
export const RAISED_LATE_AFTER_DAYS = 5;

export interface ASaleKept { dealId: string; deal: string; day: string; groundId?: string }
export interface AMilestoneKept { milestone: string; day: string }

export interface ABillToRead {
  id: string;
  groundId: string;
  name: string;
  stage: string | null;
  dueAt: Date | string | null;
  fields: Record<string, unknown> | null;
  ownerParticipantId: string | null;
  createdAt?: Date | string | null;
}

export interface WhyItIsDue {
  day: string;
  /** What made it due, as a clause: "the reply was filed on Wednesday 14 October". */
  because: string;
  /** The same without its day ("the reply was filed"); null where it was simply due on a date. */
  what: string | null;
  source: 'date' | 'event' | 'milestone' | 'sale';
}

export interface AnInvoiceToRaise {
  billId: string;
  groundId: string;
  client: string;
  matter: string | null;
  amount: string | null;
  number: string | null;
  /** "second" where the client already has a fee note raised: one more than those raised or numbered before it. */
  ordinal: string | null;
  why: WhyItIsDue;
  /** Whole days since the day it should have been raised; 0 on the day itself. */
  daysLate: number;
}

const field = (r: { fields?: Record<string, unknown> | null }, k: string) => String((r.fields ?? {})[k] ?? '').trim();
const DAY = 86_400_000;
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Wednesday 14 October" from "2026-10-14". */
export function aDayInFull(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Whole days from one YYYY-MM-DD to another. */
export const daysBetween = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / DAY);

const theDayKeptAsDue = (b: ABillToRead): string | null => aDay(field(b, F.fallsDue)) ?? (b.dueAt ? new Date(b.dueAt).toISOString().slice(0, 10) : null);

/** Why and from when a bill should be raised, from what is kept on it; null where nothing on it says so, or the day has not come. */
export function whenItShouldBeRaised(b: ABillToRead, today: string): WhyItIsDue | null {
  const f = (b.fields ?? {}) as Record<string, any>;
  const reasons: WhyItIsDue[] = [];
  const kept = f[DUE_ON_AN_EVENT] as ALineKept | undefined;
  if (kept?.day && aDay(kept.day)) {
    const ev = theEventWaitedFor(field(b, F.dueWhen));
    const happened = ev ? `the ${ev.subject} was ${ev.participle}` : theEventAsSaid(field(b, F.dueWhen));
    if (happened) reasons.push({ day: kept.day, because: `${happened} on ${aDayInFull(kept.day)}`, what: happened, source: 'event' });
  }
  const sale = f[FROM_A_SALE] as ASaleKept | undefined;
  if (sale?.day && aDay(sale.day)) reasons.push({ day: sale.day, because: `the sale to ${sale.deal} was won on ${aDayInFull(sale.day)}`, what: `the sale to ${sale.deal} was won`, source: 'sale' });
  const milestone = f[FROM_A_MILESTONE] as AMilestoneKept | undefined;
  if (milestone?.day && aDay(milestone.day)) reasons.push({ day: milestone.day, because: `${milestone.milestone} was accepted on ${aDayInFull(milestone.day)}`, what: `${milestone.milestone} was accepted`, source: 'milestone' });
  const onADate = theDayKeptAsDue(b);
  if (onADate) reasons.push({ day: onADate, because: `it was due to go out on ${aDayInFull(onADate)}`, what: null, source: 'date' });
  const due = reasons.filter((r) => r.day <= today).sort((a, c) => (a.day < c.day ? -1 : a.day > c.day ? 1 : 0));
  return due[0] ?? null;
}

/**
 * The day a bill was raised: the day it was kept at Invoiced (or Due, where it went straight there). Null while it has not, and null
 * where the record never kept that day (a bill first heard of as already paid), so a raising day is never guessed.
 */
export function theDayItWasRaised(b: ABillToRead): string | null {
  if (!b.stage || b.stage === NOT_YET_RAISED) return null;
  const moved = theStagesKept(b.fields).find((s) => s.stage === 'Invoiced' || s.stage === 'Due');
  return moved ? new Date(moved.on).toISOString().slice(0, 10) : null;
}

/** Longest a raising can trail its day and still be read as late rather than as a wrong date on record. */
const A_PLAUSIBLE_GAP_DAYS = 90;

/** The bills still to raise whose day has come, most overdue first. */
export function theInvoicesToRaise(bills: ABillToRead[], today: string): AnInvoiceToRaise[] {
  const order = (b: ABillToRead) => (b.createdAt ? new Date(b.createdAt).getTime() : 0);
  const clientOf = (b: ABillToRead) => field(b, F.client) || String(b.name ?? '').trim();
  const out: AnInvoiceToRaise[] = [];
  for (const b of bills) {
    if (b.stage !== NOT_YET_RAISED) continue;
    const why = whenItShouldBeRaised(b, today);
    if (!why) continue;
    const client = clientOf(b);
    if (!client) continue;
    /* Its place among the client's fee notes: after every one already raised or numbered, then by the order they were kept. */
    const theirs = bills.filter((x) => clientOf(x).toLowerCase() === client.toLowerCase());
    const raisedBefore = theirs.filter((x) => x.id !== b.id && (x.stage !== NOT_YET_RAISED || !!field(x, F.number))).length;
    const waitingBefore = theirs.filter((x) => x.id !== b.id && x.stage === NOT_YET_RAISED && !field(x, F.number) && order(x) < order(b)).length;
    const at = raisedBefore + waitingBefore;
    out.push({
      billId: b.id,
      groundId: b.groundId,
      client,
      matter: field(b, F.matter) || null,
      amount: field(b, F.amount) || null,
      number: field(b, F.number) || null,
      ordinal: at > 0 && at < ORDINALS.length ? ORDINALS[at] : null,
      why,
      daysLate: Math.max(0, daysBetween(why.day, today)),
    });
  }
  return out.sort((a, c) => c.daysLate - a.daysLate);
}

const possessive = (name: string) => (/s$/i.test(name) ? `${name}’` : `${name}’s`);
const lateWords = (n: number) => (n === 1 ? 'one day' : `${n} days`);

/** "It was due to go out on Wednesday 14 October, when the reply was filed." */
export function whenItWasDue(why: WhyItIsDue): string {
  return `It was due to go out on ${aDayInFull(why.day)}${why.what ? `, when ${why.what}` : ''}.`;
}

const theBillNamed = (i: Pick<AnInvoiceToRaise, 'client' | 'ordinal' | 'matter'>, bill: string) =>
  `${possessive(i.client)} ${i.ordinal ? `${i.ordinal} ` : ''}${bill}${i.matter && !i.client.toLowerCase().includes(i.matter.toLowerCase()) ? ` for ${i.matter}` : ''}`;

/**
 * What the person who raises invoices is told, in plain sentences: what to raise and when, the amount, and why it is due now.
 * "Raise Kasarani Foods’ second fee note today. It is for KES 250,000. It was due to go out on Wednesday 14 October, when the reply was filed."
 */
export function whatToRaise(i: AnInvoiceToRaise, billWord: string): string {
  const bill = theWordForTheBill({ billWord });
  const when = i.daysLate === 0 ? 'today' : `now, because it is ${lateWords(i.daysLate)} late`;
  return `Raise ${theBillNamed(i, bill)} ${when}.${i.amount ? ` It is for ${i.amount}.` : ''} ${whenItWasDue(i.why)}`;
}

/** The lead's line, under Needs you, for one that is late to raise. */
export function whatIsLateToRaise(i: AnInvoiceToRaise, billWord: string, raiser: string | null): string {
  const bill = theWordForTheBill({ billWord });
  const named = theBillNamed(i, bill);
  const first = i.daysLate === 0
    ? `${named.charAt(0).toUpperCase()}${named.slice(1)} is due to be raised today${i.amount ? `, for ${i.amount}` : ''}.`
    : `${named.charAt(0).toUpperCase()}${named.slice(1)}${i.amount ? ` for ${i.amount}` : ''} is ${lateWords(i.daysLate)} late to raise.`;
  return `${first} ${whenItWasDue(i.why)}${raiser ? ` ${raiser} has not said it is raised.` : ''}`;
}

/**
 * The pattern, named only after it has happened more than once: of the last four bills that had a day to be raised by and were raised,
 * how many went out more than five days after it. "Njeri raised 3 of the last 4 fee notes more than 5 days after they fell due."
 */
export function theRaisingPattern(bills: ABillToRead[], raiser: string, billWord: string): { says: string; instances: string[] } | null {
  const bills_ = theBillsPlural(theWordForTheBill({ billWord }));
  const raised = bills
    .map((b) => {
      const on = theDayItWasRaised(b);
      if (!on) return null;
      const why = whenItShouldBeRaised(b, on);
      if (!why) return null;
      const late = daysBetween(why.day, on);
      /* A day years before it was raised is a date on record that is wrong, not lateness: it is left out, never counted. */
      if (late < 0 || late > A_PLAUSIBLE_GAP_DAYS) return null;
      return { b, on, why, late };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, c) => (a.on < c.on ? 1 : a.on > c.on ? -1 : 0))
    .slice(0, 4);
  const late = raised.filter((x) => x.late > RAISED_LATE_AFTER_DAYS);
  if (late.length < 2) return null;
  return {
    says: `${raiser} raised ${late.length} of the last ${raised.length} ${bills_} more than ${RAISED_LATE_AFTER_DAYS} days after they fell due.`,
    instances: late.map((x) => {
      const n = field(x.b, F.number);
      const client = field(x.b, F.client) || x.b.name;
      return `${n ? `${n} for ${client}` : client} fell due on ${aDayInFull(x.why.day)} and was raised on ${aDayInFull(x.on)}, ${x.late} days later.`;
    }),
  };
}

const RAISES_INVOICES = /\b(account|accounts|accountant|invoic\w*|billing|bills?|fee notes?|financ\w*|bookkeep\w*)\b/i;

/** Who raises the invoices in a check-in: the person whose role here is about them; else who follows the bill up; else its lead. */
export function whoRaisesInvoices(people: { id: string; role: string | null; isTheLead: boolean }[], followsUp: string | null): string | null {
  const byRole = people.find((p) => !p.isTheLead && RAISES_INVOICES.test(String(p.role ?? '')));
  if (byRole) return byRole.id;
  if (followsUp && people.some((p) => p.id === followsUp)) return followsUp;
  return people.find((p) => p.isTheLead)?.id ?? null;
}

export const INVOICES_TO_RAISE_HEADING = 'INVOICES THIS PERSON SHOULD RAISE NOW';

/** The knowledge the raiser's check-in is given: what to raise, and how to follow it up. Empty where there is nothing. */
export function theInvoicesToRaiseBlock(lines: string[]): string {
  if (!lines.length) return '';
  return `${INVOICES_TO_RAISE_HEADING}
This person raises the invoices. These are due to go out now, most overdue first:
${lines.map((l) => `- ${l}`).join('\n')}
Bring up the first one early, once, in your own words, with the client, the amount and why it is due now. Ask them to tell you when it is raised, and to add the invoice or say its number, amount and the day it went out. Do not ask about one they have said is raised. Groundwork never raises or writes an invoice; they raise it in their own system.`;
}

/** Every bill kept in the organisation's "Collect what's owed" check-ins, for the readers below. */
export async function theOrganisationsBills(prisma: any, organizationId: string): Promise<ABillToRead[]> {
  const grounds = ((await Promise.resolve(prisma?.ground?.findMany?.({ where: { organizationId, scenario: 'COLLECTIONS' }, select: { id: true } })).catch(() => [])) ?? []) as any[];
  if (!grounds.length) return [];
  return ((await Promise.resolve(prisma?.workItem?.findMany?.({
    where: { groundId: { in: grounds.map((g) => g.id) }, kind: BILL },
    select: { id: true, groundId: true, name: true, stage: true, dueAt: true, fields: true, ownerParticipantId: true, createdAt: true },
  })).catch(() => [])) ?? []) as ABillToRead[];
}

/** Release 3's switch, read from the organisation. */
export async function theRelease3InvoicesIsOn(prisma: any, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  try {
    const o = await prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { release3InvoicesOn: true } });
    return o?.release3InvoicesOn === true;
  } catch {
    return false;
  }
}

/** The people of a "Collect what's owed" check-in, with their role here, for whoRaisesInvoices. */
export async function thePeopleWhoMayRaise(prisma: any, groundId: string): Promise<{ id: string; role: string | null; isTheLead: boolean; firstName: string; userId: string | null }[]> {
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { initiatorId: true } })).catch(() => null);
  const ps = ((await Promise.resolve(prisma?.groundParticipant?.findMany?.({
    where: { groundId },
    select: { id: true, userId: true, roleAsDescribed: true, nameGiven: true, user: { select: { firstName: true, jobTitle: true } } },
  })).catch(() => [])) ?? []) as any[];
  return ps.map((p) => ({
    id: p.id,
    userId: p.userId ?? null,
    role: [p.roleAsDescribed, p.user?.jobTitle].filter(Boolean).join(' ') || null,
    isTheLead: !!g?.initiatorId && p.userId === g.initiatorId,
    firstName: String(p.user?.firstName ?? p.nameGiven ?? '').trim().split(/\s+/)[0] || 'Somebody',
  }));
}

/** The block for one check-in: only on a "Collect what's owed" check-in, only for the person who raises its invoices, Release 3 on. */
export async function whatThisPersonShouldRaise(prisma: any, checkIn: { groundId: string; participantId: string }, now: Date = new Date()): Promise<{ block: string; lines: string[] }> {
  const empty = { block: '', lines: [] as string[] };
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { organizationId: true, scenario: true } })).catch(() => null);
  if (!g || g.scenario !== 'COLLECTIONS' || !(await theRelease3InvoicesIsOn(prisma, g.organizationId))) return empty;
  const people = await thePeopleWhoMayRaise(prisma, checkIn.groundId);
  const bills = (await theOrganisationsBills(prisma, g.organizationId)).filter((b) => b.groundId === checkIn.groundId);
  const today = now.toISOString().slice(0, 10);
  const billWord = (await theCollectionsTypeFor(prisma, checkIn.groundId).catch(() => null))?.billWord ?? '';
  const lines = theInvoicesToRaise(bills, today)
    .filter((i) => whoRaisesInvoices(people, field(bills.find((b) => b.id === i.billId)!, FOLLOWS_UP_ID) || null) === checkIn.participantId)
    .map((i) => whatToRaise(i, billWord));
  return { block: theInvoicesToRaiseBlock(lines), lines };
}

/**
 * A SALE WON IS AN INVOICE TO RAISE, for an organisation that invoices after a sale (both switches on). After a sales check-in
 * completes, each deal at Won that has no bill yet becomes one, at "Not yet raised", in the organisation's latest "Collect what's
 * owed" check-in: the deal's name as the client, its Value as the amount where one was said, and the day it was won kept under
 * `_fromASale`, which is the day it should be raised from. A deal never makes two bills. With no "Collect what's owed" check-in,
 * nothing is written: there is nobody to raise it in Groundwork yet. Returns how many it wrote.
 */
export async function aSaleWonIsAnInvoiceToRaise(prisma: any, groundId: string, now: Date = new Date()): Promise<number> {
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true, scenario: true } })).catch(() => null);
  if (!g?.organizationId || g.scenario === 'COLLECTIONS') return 0;
  const o = await Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: g.organizationId }, select: { release3InvoicesOn: true, invoicesAfterASaleOn: true } })).catch(() => null);
  if (o?.release3InvoicesOn !== true || o?.invoicesAfterASaleOn !== true) return 0;
  const won = ((await Promise.resolve(prisma?.workItem?.findMany?.({ where: { groundId, kind: 'deal', stage: 'Won' }, select: { id: true, name: true, fields: true } })).catch(() => [])) ?? []) as any[];
  if (!won.length) return 0;
  const target = ((await Promise.resolve(prisma?.ground?.findMany?.({ where: { organizationId: g.organizationId, scenario: 'COLLECTIONS' }, select: { id: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 })).catch(() => [])) ?? [])[0];
  if (!target) return 0;
  const bills = await theOrganisationsBills(prisma, g.organizationId);
  const already = new Set(bills.map((b) => String(((b.fields ?? {}) as any)[FROM_A_SALE]?.dealId ?? '')).filter(Boolean));
  let wrote = 0;
  for (const d of won) {
    if (already.has(d.id)) continue;
    const wonOn = theStagesKept(d.fields).filter((s) => s.stage === 'Won').map((s) => new Date(s.on).toISOString().slice(0, 10))[0] ?? now.toISOString().slice(0, 10);
    const value = String(((d.fields ?? {}) as any).Value ?? '').trim();
    const sale: ASaleKept = { dealId: d.id, deal: String(d.name ?? '').trim(), day: wonOn, groundId };
    await prisma.workItem.create({
      data: { groundId: target.id, kind: BILL, name: sale.deal, stage: NOT_YET_RAISED, fields: { [F.client]: sale.deal, ...(value ? { [F.amount]: value } : {}), [FROM_A_SALE]: sale } },
    });
    wrote++;
  }
  return wrote;
}

/**
 * THE LEAD'S LINES: in the check-ins she runs, each invoice at least a day late to raise, said once, most overdue first. Release 3 off,
 * none. Read by the morning summary (engagement/the-leads-daily-nudge) under Needs you.
 */
export async function theInvoicesLateToRaiseFor(prisma: any, organizationId: string, groundIds: string[], now: Date = new Date()): Promise<{ billId: string; groundId: string; daysLate: number; text: string }[]> {
  if (!groundIds.length || !(await theRelease3InvoicesIsOn(prisma, organizationId))) return [];
  const today = now.toISOString().slice(0, 10);
  const bills = (await theOrganisationsBills(prisma, organizationId)).filter((b) => groundIds.includes(b.groundId));
  const out: { billId: string; groundId: string; daysLate: number; text: string }[] = [];
  for (const gid of [...new Set(bills.map((b) => b.groundId))]) {
    const here = bills.filter((b) => b.groundId === gid);
    const late = theInvoicesToRaise(here, today).filter((i) => i.daysLate >= 1);
    if (!late.length) continue;
    const billWord = (await theCollectionsTypeFor(prisma, gid).catch(() => null))?.billWord ?? '';
    const people = await thePeopleWhoMayRaise(prisma, gid);
    for (const i of late) {
      const raiserId = whoRaisesInvoices(people, field(here.find((b) => b.id === i.billId)!, FOLLOWS_UP_ID) || null);
      const raiser = people.find((p) => p.id === raiserId);
      out.push({ billId: i.billId, groundId: gid, daysLate: i.daysLate, text: whatIsLateToRaise(i, billWord, raiser && !raiser.isTheLead ? raiser.firstName : null) });
    }
  }
  return out.sort((a, b) => b.daysLate - a.daysLate);
}
