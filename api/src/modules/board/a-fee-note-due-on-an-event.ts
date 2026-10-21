import { whatTheSwitchboardServes } from './the-switchboard';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { BILL, F, NOT_YET_RAISED, aDay, theCollectionsTypeFor } from './the-collections-record';
import { withTheStageKept } from './a-deals-stages-are-kept';

/**
 * A FEE NOTE DUE ON AN EVENT (release plan, Release 2: "Due on an event: when the litigation check-in reports the event a fee note
 * waits for (for example, the reply was filed), the fee note becomes due that day and shows under What needs you"; Release 2,
 * pull request 3 of 3).
 *
 * WHEN. Once per check-in, as it completes (the board listener), and only on a check-in the switchboard reads as the matter board:
 * a PULSE_CHECK whose type is "legal matter", read from its own record, in an organisation with Release 2 on. Off, nothing here
 * runs and nothing is written.
 *
 * WHAT IT READS. The lines said in that one check-in, and the open bills of the organisation's "Collect what's owed" check-ins of
 * the invoices or fee notes type that wait for an event: a "Due when" and no day yet ("the reply is filed", "the hearing date is
 * set").
 *
 * DETERMINISTIC, AND NEVER A GUESS. No model is asked. A line makes a bill due only when all of these hold:
 *  - it names the bill's matter, or its client where that client has no other matter waiting for the same event;
 *  - it names the thing the event is about ("the reply", "the hearing date") and says it happened, in so many words: "was filed",
 *    "has been filed", "is set", "we filed the reply";
 *  - it does not say it will happen, should happen, has not happened, or that something waits until it happens.
 * Then the bill's day is written as the day it happened ("on 20 October" where the line says the day, else the day of the line),
 * an invoiced bill moves to Due (a stage never moves back), and the line is kept on the bill as the source, under a key that starts
 * with "_" so it is never served as a detail. Where a line comes close and is not clearly the same (the same matter and a word of
 * the event, or the event with no matter named), nothing changes: it is kept on the bill for the lead to confirm, and the
 * collections board lists it for her. Her yes writes the day; her no is kept, so the same line is not asked about again.
 */

/** Kept on a bill: the line that made it due, and where it was said. */
export const DUE_ON_AN_EVENT = '_dueOnAnEvent';
/** Kept on a bill: lines that came close, waiting for the lead's answer. */
export const MAY_BE_DUE = '_mayBeDue';
/** Kept on a bill: lines the lead said did not make it due. */
export const NOT_DUE_FROM = '_notDueFrom';

/** A line from a matter check-in, as it is kept on a bill. */
export interface ALineKept {
  lineId: string;
  /** The check-in it was said in, and its name. */
  groundId: string;
  label: string;
  /** Who said it, as a participant of that check-in. */
  saidBy: string | null;
  text: string;
  /** When it was said. */
  at: string;
  /** The day the event happened, as YYYY-MM-DD. */
  day: string;
  /** Set where the lead confirmed it. */
  confirmedBy?: 'the lead';
}

/** The words, lower case, with only letters, digits and spaces. */
export const plainWords = (s: unknown) => String(s ?? '').toLowerCase().replace(/[‘’`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** "the reply was filed", from "the reply is filed": the event, said as having happened. */
export const asHappened = (event: string) => String(event ?? '').trim().replace(/[.\s]+$/, '').replace(/^when\s+/i, '').replace(/\b(is|are)\b/, (w) => (w === 'is' ? 'was' : 'were')).replace(/^./, (c) => c.toLowerCase());
/** "the reply is filed", as a bill keeps it, without "when" and with no full stop. */
export const theEventAsSaid = (event: string) => String(event ?? '').trim().replace(/[.\s]+$/, '').replace(/^when\s+/i, '').replace(/^./, (c) => c.toLowerCase());
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface AnEventWaitedFor {
  /** "reply", "hearing date". */
  subject: string;
  /** "filed", "set". */
  participle: string;
}

/** The event a bill waits for, read from its "Due when": "the reply is filed" is the reply, filed. Null where it cannot be read so. */
export function theEventWaitedFor(dueWhen: unknown): AnEventWaitedFor | null {
  const s = plainWords(dueWhen).replace(/^(?:when|once|after|upon|on)\s+/, '');
  /* "when I get the hearing date" is the hearing date, set (messages test, 19 October, finding 4: it was read as the event "i", "the"). */
  const got = s.match(/^(?:i|we|they|you|he|she)\s+(?:get|receive|have|hear|learn|know|am given|are given|is given)\s+(?:of\s+)?(?:(?:the|our|their|a|an)\s+)?(.+)$/);
  if (got) {
    const thing = got[1].trim();
    if (!thing || thing.split(' ').length > 5) return null;
    return { subject: thing, participle: /\b(?:date|day|time)$/.test(thing) ? 'set' : 'received' };
  }
  const m = s.match(/^(?:(?:the|our|their|a|an)\s+)?(.+?)\s+(?:is|are|gets|get|has been|have been|was|were)\s+([a-z]+)(?:\s.*)?$/);
  if (!m) return null;
  const subject = m[1].trim();
  if (!subject || subject.split(' ').length > 5) return null;
  return { subject, participle: m[2] };
}

/** Said before the event or around it, these mean it has not happened (or is only waited for). */
const NOT_YET = /\b(?:not|never|no|yet|will|would|should|could|might|may|must|shall|going|expected|expect|plan|planned|hope|due|until|till|once|when|whenever|if|unless|before|after|waits?|waiting|to)\b|n't\b/;
/** Past forms that say it was done by somebody: "we filed the reply". */
const IRREGULAR_PAST = new Set(['set', 'held', 'heard', 'sent', 'paid', 'won', 'lost', 'made', 'given', 'read', 'done', 'served', 'delivered', 'issued', 'struck', 'written', 'taken', 'brought', 'put', 'agreed', 'signed', 'closed', 'fixed']);

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** "on 20 October", straight after the event, as YYYY-MM-DD in the year of the line, never after the line. */
function theDayAfterTheEvent(rest: string, saidOn: string): string | null {
  const m = rest.match(/^\s*on\s+(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)/);
  if (!m) return null;
  const month = MONTHS.findIndex((x) => x === m[2] || (m[2].length >= 3 && x.startsWith(m[2])));
  if (month < 0) return null;
  const year = Number(saidOn.slice(0, 4));
  for (const y of [year, year - 1]) {
    const day = aDay(`${y}-${String(month + 1).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`);
    if (day && day <= saidOn) return day;
  }
  return null;
}

/**
 * WHAT ONE LINE SAYS OF ONE EVENT. `happened`: it says, in so many words, that the event happened. `touches`: it has the last word
 * of the thing the event is about ("date" for "the hearing date") and the word for what happens to it ("set"), without saying the
 * event happened. `day`: the day it says it happened.
 */
export function whatALineSaysOfTheEvent(text: string, ev: AnEventWaitedFor, saidOn: string): { happened: boolean; touches: boolean; day: string | null } {
  const line = plainWords(text);
  const subj = esc(ev.subject);
  const part = esc(ev.participle);
  const head = esc(ev.subject.split(' ').slice(-1)[0]);
  /* Close: the last word of what it is about and the word for what happens to it are both there ("the mention date is set" beside
     "the hearing date is set"). "The reply is drafted" is not close to "the reply is filed". */
  const touches = new RegExp(`\\b${head}\\b`).test(line) && new RegExp(`\\b${part}\\b`).test(line);
  /* Between the thing and what happened to it: up to four words, or the matter it is in ("the reply in Kasarani Foods v. Tumaini Traders
     was filed", messages test, 19 October, finding 4). */
  const between = `((?: [a-z0-9']+){0,4}?|(?: (?:in|for|on|of|at|about) [a-z0-9']+(?: [a-z0-9']+){0,7}?))`;
  /* `subjectFirst`: what is between the thing and what happened to it is in m[1], and what follows in the last group. */
  const tries: { re: RegExp; subjectFirst: boolean }[] = [
    { re: new RegExp(`\\b${subj}\\b${between} (?:was|were|is|are|has been|have been|had been|got|has now been|was finally|is now) ${part}\\b(.*)$`), subjectFirst: true },
  ];
  /* A date said for it is that date set: "the hearing date for Kasarani Foods v. Tumaini Traders is November 12" (finding 4). */
  if (ev.participle === 'set' && /\b(?:date|day)$/.test(ev.subject)) {
    tries.push({ re: new RegExp(`\\b${subj}\\b${between} (?:is|was|has been|is now) (?:set )?(?:for |on )?(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday) )?(?:\\d{1,2}(?:st|nd|rd|th)? (?:${MONTHS.join('|')})|(?:${MONTHS.join('|')}) \\d{1,2})\\b(.*)$`), subjectFirst: true });
  }
  if (/ed$/.test(ev.participle) || IRREGULAR_PAST.has(ev.participle)) {
    tries.push({ re: new RegExp(`\\b(?:we|they|i|he|she|the court|court|the registry|registry|counsel|[a-z]+) ${part} (?:the |our |their )?${subj}\\b(.*)$`), subjectFirst: false });
  }
  for (const t of tries) {
    const m = line.match(t.re);
    if (!m || m.index === undefined) continue;
    const before = line.slice(Math.max(0, m.index - 40), m.index).split(' ').slice(-4).join(' ');
    const between = t.subjectFirst ? (m[1] ?? '') : '';
    if (NOT_YET.test(before) || NOT_YET.test(between)) continue;
    const rest = m[m.length - 1] ?? '';
    return { happened: true, touches: true, day: theDayAfterTheEvent(rest, saidOn) };
  }
  return { happened: false, touches, day: null };
}

/** Whether a line names a bill's matter (by its whole name) or only its client (by its whole name). */
export function whatALineNames(text: string, bill: { client: string; matter: string | null }): 'matter' | 'client' | null {
  const line = ` ${plainWords(text)} `;
  const has = (name: string | null) => {
    const n = plainWords(name);
    return n.length >= 4 && line.includes(` ${n} `);
  };
  if (bill.matter && has(bill.matter)) return 'matter';
  if (has(bill.client)) return 'client';
  return null;
}

export interface ABillThatWaits {
  id: string;
  groundId: string;
  stage: string | null;
  client: string;
  matter: string | null;
  dueWhen: string;
  /** Lines already answered no to, by the lead. */
  notDueFrom: string[];
}

export type WhatALineDoes = { does: 'makes it due'; day: string } | { does: 'may make it due'; day: string } | { does: 'nothing' };

/**
 * WHAT ONE LINE DOES TO ONE BILL THAT WAITS, among all the bills that wait. Pure: the rules above, and nothing else.
 */
export function whatALineDoesToABill(
  line: { id: string; text: string; saidOn: string },
  bill: ABillThatWaits,
  waiting: readonly ABillThatWaits[],
): WhatALineDoes {
  if (bill.notDueFrom.includes(line.id)) return { does: 'nothing' };
  const ev = theEventWaitedFor(bill.dueWhen);
  const names = whatALineNames(line.text, bill);
  const said = ev ? whatALineSaysOfTheEvent(line.text, ev, line.saidOn) : { happened: false, touches: false, day: null };
  const day = said.day ?? line.saidOn;
  const sameEvent = (b: ABillThatWaits) => plainWords(b.dueWhen) === plainWords(bill.dueWhen);
  if (ev && said.happened && names) {
    if (names === 'matter') return { does: 'makes it due', day };
    /* Only the client is named: clear only where that client has no other matter waiting for the same event. */
    const otherMatters = waiting.filter((b) => b.id !== bill.id && sameEvent(b) && plainWords(b.client) === plainWords(bill.client) && plainWords(b.matter) !== plainWords(bill.matter));
    return otherMatters.length ? { does: 'may make it due', day } : { does: 'makes it due', day };
  }
  /*
   * THE EVENT SAID TO HAVE HAPPENED, WITH NO MATTER NAMED: asked about first (final real-model check, item 9). Brian's "I filed the reply
   * today, with assistance from a colleague, as the e-filing portal was not working for me yesterday." says the filing happened; the "not"
   * is about the portal, and the reading of the event already looks for "not" beside the filing itself.
   */
  if (ev && said.happened && !names) {
    const namesAnother = waiting.some((b) => b.id !== bill.id && whatALineNames(line.text, b));
    return namesAnother ? { does: 'nothing' } : { does: 'may make it due', day };
  }
  /* Close, and not clearly the same: never a change, only a question for the lead. A line that says plainly it has not happened is not asked
     about, and nor is one about what might happen or stop it: Wanjiru's "The most likely thing to stop the Kasarani Foods reply from being
     filed this week is ..." asked "Did fee note FN-005 for Kasarani Foods fall due on 13 October?" (item 9). */
  const saysNotYet = /\b(?:not|never)\b|n't\b|\bnot yet\b/.test(plainWords(line.text));
  const aboutWhatMayHappen = /\b(?:if|will|would|could|might|may|likely|stop|stops|being|going to|expect|expects|plan|plans|hope|before|until|once|need|needs|must)\b|['’]ll\b/i.test(plainWords(line.text));
  if (saysNotYet || aboutWhatMayHappen) return { does: 'nothing' };
  if (names && (said.touches || (!ev && eventWordsMet(line.text, bill.dueWhen)))) return { does: 'may make it due', day };
  if (ev && said.happened && !names) {
    /* The event, with no matter named: asked about only where the line names no other waiting bill's client or matter either. */
    const namesAnother = waiting.some((b) => b.id !== bill.id && whatALineNames(line.text, b));
    return namesAnother ? { does: 'nothing' } : { does: 'may make it due', day };
  }
  return { does: 'nothing' };
}

const LITTLE = new Set(['the', 'and', 'when', 'once', 'after', 'with', 'from', 'that', 'this', 'their', 'have', 'been', 'into', 'for']);
function eventWordsMet(text: string, dueWhen: string): boolean {
  const words = plainWords(dueWhen).split(' ').filter((w) => w.length >= 4 && !LITTLE.has(w));
  const line = ` ${plainWords(text)} `;
  return words.some((w) => line.includes(` ${w} `));
}

const theDayIn = (d: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const field = (fields: any, k: string) => String((fields ?? {})[k] ?? '').trim();

/** A bill's fields after a line made it due: the day, the stage moved on from Invoiced, and the line kept as the source. */
export function theBillMadeDue(bill: { stage: string | null; fields: unknown }, kept: ALineKept): { stage: string | null; fields: Record<string, unknown>; dueAt: Date } {
  let fields: Record<string, unknown> = { ...((bill.fields ?? {}) as Record<string, unknown>) };
  fields[F.fallsDue] = kept.day;
  fields[DUE_ON_AN_EVENT] = kept;
  delete fields[MAY_BE_DUE];
  const stage = bill.stage === 'Invoiced' ? 'Due' : bill.stage;
  if (stage !== bill.stage) fields = withTheStageKept(fields, stage, new Date(kept.at), 'check-in', { stage: bill.stage, since: null });
  return { stage, fields, dueAt: new Date(`${kept.day}T00:00:00.000Z`) };
}

/** The bills of the organisation's fee notes check-ins that wait for an event, with their check-in. */
export async function theBillsThatWait(prisma: any, organizationId: string): Promise<{ id: string; groundId: string; stage: string | null; fields: any; ownerParticipantId: string | null }[]> {
  const grounds = ((await Promise.resolve(prisma?.ground?.findMany?.({ where: { organizationId, scenario: 'COLLECTIONS' }, select: { id: true } })).catch(() => [])) ?? []) as any[];
  const out: any[] = [];
  for (const g of grounds) {
    const it = await theCollectionsTypeFor(prisma, g.id).catch(() => null);
    if (!it || it.type !== 'invoices or fee notes') continue;
    const bills = ((await Promise.resolve(prisma?.workItem?.findMany?.({
      where: { groundId: g.id, kind: BILL },
      select: { id: true, groundId: true, stage: true, fields: true, ownerParticipantId: true },
    })).catch(() => [])) ?? []) as any[];
    for (const b of bills) {
      if (b.stage === 'Paid' || !field(b.fields, F.dueWhen) || aDay(field(b.fields, F.fallsDue))) continue;
      out.push({ ...b, groundId: b.groundId ?? g.id });
    }
  }
  return out;
}

/** Whether a check-in is one the switchboard reads as the matter board (Release 2 on, PULSE_CHECK, type legal matter on record). */
export async function aMatterCheckIn(prisma: any, groundId: string): Promise<any | null> {
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: groundId },
    select: { id: true, organizationId: true, scenario: true, label: true, kindOfWork: true, kindOfWorkSetBy: true, checkInType: true, checkInTypeConfirmedAt: true },
  })).catch(() => null);
  if (!g) return null;
  const served = await whatTheSwitchboardServes(prisma, g).catch(() => null);
  return served?.board === 'the matter board' ? g : null;
}

/**
 * READ ONE COMPLETED CHECK-IN'S LINES FOR THE EVENTS THE FEE NOTES WAIT FOR. Returns how many bills it wrote (made due, or a line
 * kept for the lead to confirm), or null where this is not a matter check-in with Release 2 on, so the listener carries on as before.
 */
export async function fileTheFeeNotesDueOnAnEvent(
  deps: { prisma: any; logger?: { log: (s: string) => void; warn: (s: string) => void } },
  e: { groundId: string; checkInId: string },
): Promise<number | null> {
  const { prisma } = deps;
  const ground = await aMatterCheckIn(prisma, e.groundId);
  if (!ground) return null;
  try {
    const lines = (((await prisma.recordEntry.findMany({
      where: { checkInId: e.checkInId, disputedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, text: true, participantId: true, createdAt: true },
    })) ?? []) as any[]).map((l) => ({ ...l, text: String(l.text ?? '').replace(/\[[^\]]*\]/g, '').trim() })).filter((l) => l.text);
    if (!lines.length) return 0;
    const bills = await theBillsThatWait(prisma, ground.organizationId);
    if (!bills.length) return 0;
    const zone = (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
    const asWaiting = (b: any): ABillThatWaits => ({
      id: b.id, groundId: b.groundId, stage: b.stage ?? null,
      client: field(b.fields, F.client) || '', matter: field(b.fields, F.matter) || null, dueWhen: field(b.fields, F.dueWhen),
      notDueFrom: Array.isArray(b.fields?.[NOT_DUE_FROM]) ? b.fields[NOT_DUE_FROM] : [],
    });
    let written = 0;
    for (const l of lines) {
      const at = l.createdAt ? new Date(l.createdAt) : new Date();
      const saidOn = theDayIn(at, zone);
      const waiting = bills.filter((b) => !aDay(field(b.fields, F.fallsDue))).map(asWaiting);
      for (const w of waiting) {
        const did = whatALineDoesToABill({ id: l.id, text: l.text, saidOn }, w, waiting);
        if (did.does === 'nothing') continue;
        const bill = bills.find((b) => b.id === w.id)!;
        const kept: ALineKept = { lineId: l.id, groundId: ground.id, label: String(ground.label ?? '').trim(), saidBy: l.participantId ?? null, text: l.text, at: at.toISOString(), day: did.day };
        if (did.does === 'makes it due') {
          const after = theBillMadeDue(bill, kept);
          await prisma.workItem.update({ where: { id: bill.id }, data: { stage: after.stage, fields: after.fields, dueAt: after.dueAt } });
          bill.stage = after.stage;
          bill.fields = after.fields;
          /* And the waits for the same event end with it, in the fee note's check-in and wherever they name its client (findings 11, 13). */
          const ev = theEventWaitedFor(w.dueWhen);
          if (ev) {
            const open = ((await Promise.resolve(prisma.groundDependency?.findMany?.({ where: { ground: { organizationId: ground.organizationId }, clearedAt: null, status: { in: ['WAITING', 'BLOCKING'] } }, select: { id: true, groundId: true, what: true, status: true, clearedAt: true, createdAt: true } })).catch(() => [])) ?? []) as any[];
            const theOnlyOneWaitingHere = waiting.filter((x) => x.groundId === bill.groundId && plainWords(x.dueWhen) === plainWords(w.dueWhen)).length === 1;
            const ends = theWaitsThisEventEnds(open, ev, { groundId: bill.groundId, client: w.client, matter: w.matter, theOnlyOneWaitingHere }, at);
            if (ends.length) await prisma.groundDependency.updateMany({ where: { id: { in: ends }, clearedAt: null }, data: { status: 'CLEARED', clearedAt: at } });
          }
        } else {
          const list: ALineKept[] = Array.isArray(bill.fields?.[MAY_BE_DUE]) ? bill.fields[MAY_BE_DUE] : [];
          if (list.some((x) => x.lineId === l.id)) continue;
          const fields = { ...(bill.fields ?? {}), [MAY_BE_DUE]: [...list, kept] };
          await prisma.workItem.update({ where: { id: bill.id }, data: { fields } });
          bill.fields = fields;
        }
        written += 1;
      }
    }
    deps.logger?.log(`Read check-in ${e.checkInId} for the events fee notes wait for: ${written} fee note(s) changed or asked about.`);
    return written;
  } catch (err: any) {
    deps.logger?.warn(`Reading check-in ${e.checkInId} for the events fee notes wait for failed: ${err?.message}`);
    return 0;
  }
}

/**
 * AN EVENT REPORTED IN ONE CHECK-IN ENDS THE WAITS FOR IT IN THE OTHERS (Hafsah, 19 October, point 4: "an event reported in one check-in
 * (the hearing date set) clears the waits in others, on the board and in 'Your week'"; messages test after the fixes, findings 11 and 13).
 *
 * Muchemi & Co. (test). On Monday 12 October, in "Fee notes", Njeri said "I'll raise the next Kasarani Foods fee note when the hearing
 * date is set.", and the record kept her wait for "the hearing date to be set". On Wednesday 14 October, in "Litigation team daily",
 * David said "I was at the registry for Kasarani Foods v. Tumaini Traders. The hearing date is set for 12 November.", and the fee note
 * was made due. Njeri's "Your week" on Thursday still said "You are waiting for "the hearing date to be set"", and the Fee notes board
 * still told Wanjiru "You need to find out who can provide the hearing date to be set that Njeri Wambui is waiting for, because nobody
 * has been named yet."
 *
 * When a line makes a fee note due, the open waits for that same event end with it, on the day the line was said:
 *  - in the fee note's own check-in, a wait for the thing the event is about ("the hearing date"), where that fee note is the only one
 *    there waiting for that event, so the wait cannot be about another;
 *  - anywhere else in the organisation, only a wait that also names the fee note's client or matter.
 * Never a wait said after the line, and never one that is already cleared.
 */
export function theWaitsThisEventEnds(
  waits: readonly { id: string; groundId: string; what: string; status?: string | null; clearedAt?: Date | string | null; createdAt: Date | string }[],
  ev: AnEventWaitedFor,
  bill: { groundId: string; client: string; matter: string | null; theOnlyOneWaitingHere: boolean },
  at: Date,
): string[] {
  const subject = ` ${plainWords(ev.subject)} `;
  return waits.filter((w) => {
    if (String(w.status ?? '').toUpperCase() === 'CLEARED' || w.clearedAt) return false;
    if (new Date(w.createdAt).getTime() > at.getTime()) return false;
    if (!` ${plainWords(w.what)} `.includes(subject)) return false;
    if (w.groundId === bill.groundId && bill.theOnlyOneWaitingHere) return true;
    return !!whatALineNames(w.what, { client: bill.client, matter: bill.matter });
  }).map((w) => w.id);
}

/**
 * THE LEAD'S ANSWER TO A LINE THAT CAME CLOSE. Yes writes the day as a line that matched would; no keeps the line as answered, so it
 * is not asked again. Only the lead of the fee notes check-in may answer (the caller checks who she is).
 */
export function theBillAfterTheLeadsAnswer(bill: { stage: string | null; fields: unknown }, lineId: string, yes: boolean): { stage: string | null; fields: Record<string, unknown>; dueAt?: Date } | null {
  const fields = { ...((bill.fields ?? {}) as Record<string, any>) };
  const list: ALineKept[] = Array.isArray(fields[MAY_BE_DUE]) ? fields[MAY_BE_DUE] : [];
  const kept = list.find((x) => x.lineId === lineId);
  if (!kept) return null;
  if (yes) return theBillMadeDue({ stage: bill.stage, fields }, { ...kept, confirmedBy: 'the lead' });
  const rest = list.filter((x) => x.lineId !== lineId);
  if (rest.length) fields[MAY_BE_DUE] = rest; else delete fields[MAY_BE_DUE];
  fields[NOT_DUE_FROM] = [...(Array.isArray(fields[NOT_DUE_FROM]) ? fields[NOT_DUE_FROM] : []), lineId];
  return { stage: bill.stage, fields };
}

export { NOT_YET_RAISED };
