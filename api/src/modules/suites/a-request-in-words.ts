import { saidAsADay } from './who-is-away';
import { aReasonInASentence } from './spend-said-in-chat';

/**
 * A LEAVE, HOURS OR SPENDING REQUEST, IN THE WORDS EVERY READER READS (decision 82, item 1).
 *
 * One wording for what a request is, used when the approver is told it is waiting, when Groundwork
 * says back what an approver is deciding, and when the person is told what was decided. Leave is said
 * as dates only, never a reason or a kind (decision 31). Hours are said as what was sent and for which
 * day, never as how much somebody works (decision 10).
 */

/** "leave from Tuesday 6 October to Saturday 10 October", or "leave on Tuesday 20 October". */
export function leaveInWords(startsOn: string, endsOn: string): string {
  return startsOn === endsOn ? `leave on ${saidAsADay(startsOn)}` : `leave from ${saidAsADay(startsOn)} to ${saidAsADay(endsOn)}`;
}

/** "6 hours", "1 hour", "1.5 hours". */
export function hoursInWords(minutes: number): string {
  const h = Math.round((minutes / 60) * 10) / 10;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? 'hour' : 'hours'}`;
}

const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/**
 * WHAT THE MONEY IS FOR, AS IT READS INSIDE A SENTENCE (request 162, item 3). People write it as its own line, with a capital
 * ("Two tablets for the field team"); after "for" or "on" it is a lower-case word. It is the rule Ask's spending say-back already uses
 * (aReasonInASentence, spend-said-in-chat.ts): the capital stays on an "I", an acronym, a word with a capital inside it, a name the
 * organisation knows (a person, a team, a customer: `knownNames`), and a word the person wrote with a capital again later in the text.
 * A first word with a digit in it ("Q4 fuel", "A4 paper") keeps its capital too.
 */
export function whatTheMoneyIsFor(what: string, knownNames: string[] = []): string {
  const w = (what ?? '').trim();
  if (/^\S*\d/.test(w)) return w;
  return aReasonInASentence(w, knownNames);
}

/** "KES 12,000 for fuel". */
export function spendInWords(amount: number, currency: string | null, what: string, knownNames: string[] = []): string {
  return `${currency ? `${currency} ` : ''}${amount.toLocaleString('en-US')} for ${whatTheMoneyIsFor(what, knownNames)}`;
}

/** "Amina's", "James'". */
export function whose(firstName: string): string {
  const n = firstName.trim();
  return /s$/i.test(n) ? `${n}'` : `${n}'s`;
}

export type ARequestKind = 'leave' | 'hours' | 'spend';

/** One request waiting for this reader to decide, as the boards serve it. */
export interface AWaitingRequest {
  kind: ARequestKind;
  /** The leave or spending request's id; for hours, the person's sign-in and the week, joined by "|". */
  ref: string;
  personUserId: string | null;
  firstName: string;
  /** For the templates' "has asked for {{3}}" and "your request for {{2}}". */
  what: string;
  /** The thing itself, owned: "Amina's leave from ...", "the 6 hours Amina sent on Atlas for ...", "Amina's request to spend KES 12,000 for fuel". */
  thing: string;
}

/** What waits for a decision in Ask: a suite's request, or somebody waiting for an admin to let them in ('seat', Ask and People only, never a suite's message). */
export type AWaitingDecision = AWaitingRequest | (Omit<AWaitingRequest, 'kind'> & { kind: 'seat' | 'check_in' });

export function aLeaveRequest(ref: string, personUserId: string | null, firstName: string, startsOn: string, endsOn: string): AWaitingRequest {
  const what = leaveInWords(startsOn, endsOn);
  return { kind: 'leave', ref, personUserId, firstName, what, thing: `${whose(firstName)} ${what}` };
}

export function anHoursRequest(personUserId: string, weekOf: string, firstName: string, minutes: Record<string, number>, total: number, days: string[]): AWaitingRequest {
  const clients = Object.entries(minutes).filter(([, m]) => m > 0).map(([c]) => c);
  const when = days.length === 1 ? saidAsADay(days[0]) : `the week of ${saidAsADay(weekOf)}`;
  const on = clients.length ? ` on ${listed(clients)}` : '';
  return {
    kind: 'hours', ref: `${personUserId}|${weekOf}`, personUserId, firstName,
    what: `approval of ${hoursInWords(total)}${on} for ${when}`,
    thing: `the ${hoursInWords(total)} ${firstName} sent${on} for ${when}`,
  };
}

/** Somebody a lead added, waiting for an admin to let them in, which gives them a seat (Hafsah, 26 November 2026: "approve them in People or Ask"). */
export function aSeatRequest(ref: string, personUserId: string | null, firstName: string, organisationName: string): AWaitingDecision {
  return { kind: 'seat', ref, personUserId, firstName, what: `a seat at ${organisationName}`, thing: `${whose(firstName)} seat at ${organisationName}` };
}

/** A check-in a lead set up that waits for an admin to approve it ("approve it", Rhea call, 25 November 2026: chat is king). `firstName` is who set it up. */
export function aCheckInToApprove(ref: string, firstName: string, label: string): AWaitingDecision {
  return { kind: 'check_in', ref, personUserId: null, firstName, what: `the check-in "${label}"`, thing: `the check-in "${label}"` };
}

export function aSpendRequest(ref: string, personUserId: string | null, firstName: string, amount: number, currency: string | null, what: string): AWaitingRequest {
  const said = spendInWords(amount, currency, what);
  return { kind: 'spend', ref, personUserId, firstName, what: said, thing: `${whose(firstName)} request to spend ${said}` };
}

/**
 * What the approver is deciding, said back before anything happens: "You are approving Amina's leave
 * from Tuesday 6 October to Saturday 10 October. Is that right?"
 */
export function aDecisionSaidBack(r: AWaitingDecision, outcome: 'approved' | 'declined'): string {
  return `You are ${outcome === 'approved' ? 'approving' : 'declining'} ${r.thing}. Is that right?`;
}

/**
 * After the yes: "Amina's leave from ... is approved now. I have let Amina know." When the approval
 * was only one step and the request goes on to somebody else (build step 4): "You approved Amina's
 * leave from .... It now waits for Omar in finance."
 */
export function aDecisionDone(r: AWaitingDecision, outcome: 'approved' | 'declined', nowWaitsFor?: string | null): string {
  if (outcome === 'approved' && nowWaitsFor) return `You approved ${r.thing}. ${r.kind === 'hours' ? 'They now wait' : 'It now waits'} for ${nowWaitsFor}.`;
  const thing = `${r.thing.charAt(0).toUpperCase()}${r.thing.slice(1)}`;
  return `${thing} ${r.kind === 'hours' ? 'are' : 'is'} ${outcome} now. I have let ${r.firstName} know.`;
}

// ---------------------------------- where a request is (build step 4) ----------------------------------

/** Where a request is, as names: who approved it so far, who it waits for now, or who declined it. */
export interface WhereItStands {
  status: 'waiting' | 'approved' | 'declined';
  /** First names, in order; "you" for the reader. */
  approvedBy: string[];
  /** Who it waits for now, in words ("Omar in finance", "an admin", "you"), while it waits. */
  waitingFor?: string | null;
  /** Who declined it, as a first name or "you". */
  declinedBy?: string | null;
}

const capital = (x: string) => `${x.charAt(0).toUpperCase()}${x.slice(1)}`;
const lower = (x: string) => `${x.charAt(0).toLowerCase()}${x.slice(1)}`;

/**
 * The person who asked, reading their own request: "Your leave from Monday 5 October to Friday 9
 * October is approved by Wairimu and is now waiting for Omar in finance." `thing` begins with "Your";
 * `plural` is for hours ("Your hours ... are").
 */
export function whereYourRequestIs(thing: string, s: WhereItStands, plural = false): string {
  const is = plural ? 'are' : 'is';
  const by = s.approvedBy.length ? ` approved by ${listed(s.approvedBy)}` : '';
  if (s.status === 'declined') return s.declinedBy ? `${capital(s.declinedBy)} declined ${lower(thing)}.` : `${thing} ${is} declined.`;
  if (s.status === 'approved') return `${thing} ${is}${by || ' approved'}.`;
  const waits = `waiting for ${s.waitingFor || 'the person who approves it'}`;
  return by ? `${thing} ${is}${by} and ${is} now ${waits}.` : `${thing} ${is} ${waits}.`;
}

/**
 * Somebody who may already read a waiting request on a board: "Wairimu has approved it, and it is now
 * waiting for you." or "It is waiting for Omar in finance." For hours, "these hours" and "they".
 */
export function whereItIsOnTheBoard(s: WhereItStands, plural = false): string {
  const it = plural ? 'they' : 'it';
  const is = plural ? 'are' : 'is';
  if (s.status === 'declined') return s.declinedBy ? `${capital(s.declinedBy)} declined ${plural ? 'these hours' : 'it'}.` : `${capital(it)} ${is} declined.`;
  if (s.status === 'approved') return s.approvedBy.length ? `${capital(listed(s.approvedBy))} approved ${plural ? 'these hours' : 'it'}.` : `${capital(it)} ${is} approved.`;
  const waits = `waiting for ${s.waitingFor || 'the person who approves it'}`;
  if (!s.approvedBy.length) return `${capital(it)} ${is} ${waits}.`;
  const have = s.approvedBy.length > 1 || s.approvedBy[0] === 'you' ? 'have' : 'has';
  return `${capital(listed(s.approvedBy))} ${have} approved ${plural ? 'these hours' : 'it'}, and ${it} ${is} now ${waits}.`;
}

/** After a no: nothing changed. */
export function aDecisionNotMade(r: AWaitingDecision): string {
  const thing = `${r.thing.charAt(0).toUpperCase()}${r.thing.slice(1)}`;
  return `I have not changed anything. ${thing} ${r.kind === 'hours' ? 'are' : 'is'} still waiting for you.`;
}

/**
 * AN APPROVER'S REPLY: "approve", "decline", "I approve Amina's leave", "yes, approve it", "reject
 * the fuel". Matched at the start of a short message only, so a sentence that merely contains the
 * word is not taken for a decision.
 */
export const A_DECISION = /^\s*(?:(?:yes|ok|okay)[,.!]?\s+)?(?:i\s+)?(approve|accept|decline|reject|refuse)\b/i;
export function aDecisionIn(message: string): 'approved' | 'declined' | null {
  if ((message ?? '').length > 160) return null;
  const m = A_DECISION.exec(message ?? '');
  if (!m) return null;
  return /^(approve|accept)$/i.test(m[1]) ? 'approved' : 'declined';
}

/** Nothing more than the decision itself ("approve", "decline it", "approve that one"). */
export function onlyTheDecision(message: string): boolean {
  return /^\s*(?:(?:yes|ok|okay)[,.!]?\s+)?(?:i\s+)?(approve|accept|decline|reject|refuse)(?:\s+(?:it|that|this|that one|this one|them))?\s*[.!]?\s*$/i.test(message ?? '');
}

const NUMBERS = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** The most requests named in one message. WhatsApp refuses a text over 4,096 characters, and 229 names never fit (B-144). */
export const MOST_NAMED_AT_ONCE = 5;

/** More than one waiting, and the reply did not say which. */
export function whichDecision(rs: AWaitingDecision[]): string {
  const count = rs.length <= 10 ? NUMBERS[rs.length] : String(rs.length);
  const example = rs[0].kind === 'check_in' ? rs[0].thing : `${whose(rs[0].firstName)} ${rs[0].kind === 'spend' ? 'spending' : rs[0].kind}`;
  if (rs.length > MOST_NAMED_AT_ONCE) {
    const first = rs.slice(0, MOST_NAMED_AT_ONCE).map((r) => r.thing);
    const more = rs.length - MOST_NAMED_AT_ONCE;
    return `${count} requests are waiting for you. The first ${NUMBERS[MOST_NAMED_AT_ONCE].toLowerCase()} are ${first.slice(0, -1).join(', ')} and ${first[first.length - 1]}, and ${more} more ${more === 1 ? 'is' : 'are'} waiting in Groundwork. Which one do you mean? You can write, for example, "approve ${example}", or open Groundwork to see them all.`;
  }
  const things = rs.map((r) => r.thing);
  const them = rs.length === 2
    ? `One is ${things[0]}, and the other is ${things[1]}.`
    : `They are ${things.slice(0, -1).join(', ')} and ${things[things.length - 1]}.`;
  return `${count} requests are waiting for you. ${them} Which one do you mean? You can write, for example, "approve ${example}".`;
}

export const NOTHING_TO_DECIDE = 'Nothing is waiting for you to approve or decline right now.';
export const HOURS_ARE_NOT_DECLINED = (firstName: string) =>
  `Groundwork cannot decline hours. If something in ${whose(firstName)} hours is wrong, please tell ${firstName}, and they can send them again.`;
