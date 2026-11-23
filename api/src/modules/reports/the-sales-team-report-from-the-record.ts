import type { ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { aDayKey, aDayInWords, aDayWithItsWeekday } from './a-sales-report-read-from-the-deals';
import { aPromiseSomebodyElseMade } from '../conversation/a-promise-somebody-else-made';
import { aNumberPeopleCanRead } from '../board/an-aim-is-a-sentence-about-somebody';
import { theOwedThingAskedPlainly } from '../conversation/each-owed-thing-asked-plainly';
import { whatIDontKnowYet, type AGapOnRecord } from './what-i-dont-know-yet';

/**
 * THE SALES TEAM'S REPORT, EACH PART READ FROM THE RECORD (Hafsah's quality pass of 18 October, section 4, T-1 to T-12; behind
 * Release 1's switch, on a sales check-in, to whoever runs it; the kit's B4-reports-every-check-in/sales-team-report.txt).
 *
 * Grace's report for Wednesday 14 October said "How much this report can rely on: high" over "3 of 26 lines are backed by a
 * document", named no commitment it called loose, missed Savannah Cafe's yes, pasted Mercy's own words where the kit says what
 * happened in the third person, set Kevin's 120 against fragments, counted two quiet waits without naming them, listed questions
 * people had answered, and had no closing line. Each part here is read from the deals, the lines, the waits and the check-ins
 * as they stood, in full sentences, with first names, and "you" for the reader. Nothing is written by a model, and nothing is
 * said that the record cannot show.
 */

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const Cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const small = (n: number) => (n <= 10 ? NUMBER_WORDS[n] : aNumberPeopleCanRead(n));
const listed = (xs: string[], and = 'and') => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}` : xs[0] ?? '');
const stop = (s: string) => String(s ?? '').trim().replace(/[.\s]+$/, '');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const field = (d: { fields?: Record<string, string> | null }, k: string) => String(d.fields?.[k] ?? '').trim();
const UNIT_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, twenty: 20, thirty: 30, forty: 40, fifty: 50 };

/** The units a deal holds, as a number: "two" is 2, "25" is 25. */
export function theUnitsOf(d: { fields?: Record<string, string> | null }): number | null {
  const u = field(d, 'Units').toLowerCase();
  if (!u) return null;
  const n = u.replace(/,/g, '').match(/\d+/);
  return n ? Number(n[0]) : UNIT_WORDS[u.split(/\s+/)[0]] ?? null;
}
const units = (n: number | null) => (n === null ? '' : `${n} ${n === 1 ? 'unit' : 'units'}`);

export interface ALineOnTheDay {
  id?: string;
  text: string;
  raw?: string;
  type: string | null;
  participantId: string | null;
  checkInId: string | null;
  createdAt: Date;
  anchoredDocumentId?: string | null;
}
export interface AWaitOnTheDay {
  id: string;
  fromParticipantId: string | null;
  onParticipantId: string | null;
  onLabel?: string | null;
  what: string | null;
  then?: string | null;
  status: string;
  dueOn?: Date | string | null;
  clearedAt?: Date | string | null;
  sourceCheckInId?: string | null;
  createdAt: Date | string;
}

/* ------------------------------------------------------------------------------------------- T-1, T-2: how much it can rely on */

/** A day or a time is named: "on Monday", "tomorrow", "Thursday morning", "next week", "the 15th of October". */
const A_DAY_SAID = /\b(?:today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|end of (?:the )?(?:day|week|month)|by (?:noon|the \d)|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2})\b/i;

/** Their own promise, not a customer's ("Delivery is set for Friday, and they'll pay then." is Greenfield's). */
export function isTheirOwnPromise(text: string): boolean {
  return !aPromiseSomebodyElseMade(text);
}

export interface WhatItCanRelyOn { band: 'thin' | 'partial' | 'solid'; saying: string; reasons: string[] }

/**
 * "How much this report can rely on: medium. All 3 people checked in, and 3 of the 26 things said have a document behind them."
 * High only when everybody checked in, a third or more of what was said has a document behind it, and every promise of their
 * own has a day; low when fewer than half checked in; medium otherwise. The reason names each promise with no day, in their
 * own words: "Joseph’s “I’ll ask Grace first about the price, then I’ll call Mr Kariuki back” has no date."
 */
export function howMuchItCanRelyOn(input: { checkedIn: number; of: number; said: number; documented: number; withNoDay: { who: string; words: string }[] }): WhatItCanRelyOn {
  const { checkedIn, of, said, documented, withNoDay } = input;
  const who = checkedIn === of
    ? (of === 1 ? 'The one person in it checked in' : `All ${of} people checked in`)
    : `${checkedIn} of ${of} people checked in`;
  const proof = said === 0
    ? 'nothing was said yet'
    : documented === 0
      ? `none of the ${said} things said has a document behind it`
      : `${documented} of the ${said} things said ${documented === 1 ? 'has a document behind it' : 'have a document behind them'}`;
  const band: WhatItCanRelyOn['band'] = of > 0 && checkedIn * 2 < of
    ? 'thin'
    : checkedIn === of && said > 0 && documented * 3 >= said && !withNoDay.length ? 'solid' : 'partial';
  const named = withNoDay.slice(0, 2).map((c) => `${c.who}’s “${stop(c.words)}”`);
  const more = withNoDay.length - named.length;
  const reasons = withNoDay.length
    ? [`${listed(named)}${more > 0 ? `, and ${small(more)} more,` : ''} ${withNoDay.length === 1 ? 'has' : 'have'} no date.`]
    : [];
  return { band, saying: `${who}, and ${proof}.`, reasons };
}

/** Their own promises in this session with no day named, in their words with who "him" is (the caller names him). */
export function thePromisesWithNoDay(lines: readonly ALineOnTheDay[], words: (l: ALineOnTheDay) => string): ALineOnTheDay[] {
  return lines.filter((l) => String(l.type ?? '').toUpperCase() === 'COMMITMENT' && isTheirOwnPromise(l.text) && !A_DAY_SAID.test(words(l)));
}

/* ------------------------------------------------------------------------------------------------- T-4, T-5: what moved */

export interface ADayMove {
  dealId: string;
  name: string;
  ownerParticipantId: string | null;
  from: string;
  to: string;
  proven: boolean;
  /** The customer said yes to the quote that day, and the stage stays where it was. */
  accepted?: boolean;
}

/** A deal whose customer said yes to its quote on one of the days, where it did not also move a stage. */
export function theQuotesSaidYesTo(deals: readonly ADealOnRecord[], days: ReadonlySet<string>, alreadyMoved: ReadonlySet<string>, lastStage: string): ADayMove[] {
  return deals
    .filter((d) => !alreadyMoved.has(d.id) && !d.dropped && String(d.stage ?? '').toLowerCase() !== lastStage.toLowerCase())
    .filter((d) => days.has(field(d, 'Quote accepted').slice(0, 10)))
    .map((d) => ({ dealId: d.id, name: d.name, ownerParticipantId: d.ownerParticipantId, from: String(d.stage ?? ''), to: String(d.stage ?? ''), proven: !!d.proven, accepted: true }));
}

/** What the customer pays, and when: "a KES 15,000 deposit on Friday 16 October", from the wait on them and the day the deal keeps. */
export function whatTheyPay(d: ADealOnRecord, waits: readonly AWaitOnTheDay[]): string | null {
  const contact = field(d, 'Contact').toLowerCase();
  const w = waits.find((x) => x.fromParticipantId === d.ownerParticipantId && !x.onParticipantId && !x.clearedAt
    && String(x.onLabel ?? '').trim().toLowerCase() === contact && /\b(?:deposit|payment|pay)\b/i.test(String(x.what ?? '')));
  const day = w?.dueOn ? aDayKey(new Date(w.dueOn), 'UTC') : field(d, 'Buying date').slice(0, 10) || null;
  if (!w || !day) return null;
  return `${stop(String(w.what))} on ${aDayWithItsWeekday(day)}`;
}

/** "Ali decides next week.", where the owner said so that day ("Ali said he'll decide next week."). */
function whenTheyDecide(d: ADealOnRecord, theirLines: readonly ALineOnTheDay[]): string | null {
  const contact = field(d, 'Contact');
  if (!contact) return null;
  const re = new RegExp(`\\b${escape(contact)} said (?:he|she|they)(?:['’]ll| will) decide ([^.,;]+)`, 'i');
  for (const l of theirLines) {
    const m = re.exec(l.text);
    if (m) return `${contact} decides ${stop(m[1])}.`;
  }
  return null;
}

/**
 * What a move says beside the deal, in the third person as the kit does ("Now qualified. There is proof of the owner’s budget."):
 *  - a yes to the quote: "Jane said yes to 6 units at KES 30,000. Jane pays a KES 15,000 deposit on Friday 16 October.";
 *  - quoted: "Now quoted. Mercy quoted Rose KES 10,000 for 2 units.", and when the customer decides where the owner said it;
 *  - the need: "It is now at Need established. Mr Kariuki wants 5 units if they are KES 4,500 each."
 * Null where the deal does not hold what the sentence needs; the caller keeps its own line.
 */
export function aMoveInTheThirdPerson(m: ADayMove, d: ADealOnRecord, theirLines: readonly ALineOnTheDay[], waits: readonly AWaitOnTheDay[], who: string): string | null {
  const contact = field(d, 'Contact');
  const n = theUnitsOf(d);
  const quoted = field(d, 'Quoted');
  if (m.accepted) {
    if (!contact || n === null) return null;
    const pays = whatTheyPay(d, waits);
    return `${contact} said yes to ${units(n)}${quoted ? ` at ${quoted}` : ''}.${pays ? ` ${contact} pays ${pays}.` : ''}`;
  }
  if (/quot/i.test(m.to)) {
    if (!contact || !quoted || n === null) return null;
    const decides = whenTheyDecide(d, theirLines);
    return `Now quoted. ${who} quoted ${contact} ${quoted} for ${units(n)}.${decides ? ` ${decides}` : ''}`;
  }
  if (/need/i.test(m.to)) {
    if (!contact || n === null) return null;
    const each = field(d, 'Price each');
    return `It is now at ${m.to}. ${contact} wants ${units(n)}${each ? ` if they are ${each} each` : ''}.`;
  }
  return null;
}

/* --------------------------------------------------------------------------------------- T-6: what each person did, in short */

/** One sentence about one of their deals on the day, the person left out as the kit does ("Sent Green Mart’s quote."). */
function whatTheyDidOnADeal(m: ADayMove, d: ADealOnRecord): string | null {
  const contact = field(d, 'Contact');
  const n = theUnitsOf(d);
  if (m.accepted) return n === null ? null : `${d.name} said yes to ${units(n)}.`;
  if (/quot/i.test(m.to)) return contact && field(d, 'Quoted') && n !== null ? `Quoted ${contact} at ${d.name} ${field(d, 'Quoted')} for ${units(n)}.` : null;
  if (/need/i.test(m.to)) {
    const each = field(d, 'Price each');
    return contact && n !== null ? `${contact} at ${d.name} wants ${units(n)}${each ? ` if they are ${each} each` : ''}.` : null;
  }
  return null;
}

export interface APersonsDay {
  /** Up to two sentences, about the work. */
  inShort: string | null;
  /** "proven" where every deal the line names has a document behind it; "said" otherwise. */
  mark: 'proven' | 'said';
  /** What they said they will do, as the kit's "Will do": "Follow up with Ali at Ngong Road Minimart on Monday." */
  willDo: string | null;
}

/**
 * Each person's day in short, from their own deals: what moved (a yes, a quote, a need), a won deal's payment day, calls the
 * customer did not answer, and a promise of theirs carried over three check-ins running. At most two sentences.
 */
export function aPersonsDayInShort(input: {
  moves: readonly ADayMove[];
  deals: readonly ADealOnRecord[];
  /** Their won deals spoken of that day, with when the customer pays. */
  wonSpokenOf: readonly ADealOnRecord[];
  /** "Called Paul at Upper Hill Offices twice more, with no answer." */
  calls: string | null;
  /** "The samples for Tuskys Westgate, promised three check-ins running, still not done." */
  carriedOver: string | null;
  willDo: string | null;
  fallback: string | null;
}): APersonsDay {
  const out: { says: string; proven: boolean }[] = [];
  const order = (m: ADayMove) => (m.accepted ? 0 : /quot/i.test(m.to) ? 1 : 2);
  for (const m of [...input.moves].sort((a, b) => order(a) - order(b))) {
    const d = input.deals.find((x) => x.id === m.dealId);
    const s = d ? whatTheyDidOnADeal(m, d) : null;
    if (s) out.push({ says: s, proven: !!d?.proven });
  }
  for (const d of input.wonSpokenOf) {
    const pays = String((d as any).paysWhen ?? '').trim();
    const value = field(d, 'Value');
    if (pays && value) out.push({ says: `${d.name} ${pays.replace(/^pays\b/, `pays the ${value}`)}.`, proven: !!d.proven });
  }
  if (input.calls) out.push({ says: input.calls, proven: false });
  if (input.carriedOver) out.push({ says: input.carriedOver, proven: false });
  const two = out.slice(0, 2);
  const inShort = two.length ? two.map((x) => x.says).join(' ') : input.fallback;
  return { inShort, mark: two.length && two.every((x) => x.proven) ? 'proven' : 'said', willDo: input.willDo };
}

/**
 * Their promise as the kit's "Will do", from their own words with who "him" is: "I'll follow up with Ali on Monday." reads
 * "Follow up with Ali at Ngong Road Minimart on Monday."; "I'll ask Grace first about the price, then I'll call Mr Kariuki back."
 * reads, to Grace, "Get your answer on the price first, then call Mr Kariuki at Juja Hardware back."
 */
export function asAWillDo(words: string, opts: { lead: string | null; readerIsTheLead: boolean; contacts: readonly { contact: string; deal: string }[] }): string {
  let s = stop(words).replace(/\[INFERRED:[^\]]*\]/g, '').trim();
  s = s.replace(/^(?:And|So|Then)\s+/i, '');
  s = s.replace(/\b(?:I['’]ll|I will|I am going to|I['’]m going to|I need to|I have to)\s+/gi, '');
  if (opts.lead) {
    const lead = escape(opts.lead);
    if (opts.readerIsTheLead) {
      s = s.replace(new RegExp(`\\bask ${lead}(?: first)? about ([^,.;]+?)(?=,|$)`, 'i'), (_m, what) => `get your answer on ${what} first`)
        .replace(new RegExp(`\\b${lead}\\b`, 'g'), 'you');
    }
  }
  for (const c of opts.contacts) {
    if (!c.contact || new RegExp(`\\b${escape(c.contact)}\\s+at\\b`).test(s)) continue;
    s = s.replace(new RegExp(`\\b${escape(c.contact)}\\b(?!\\s+at\\b)`), `${c.contact} at ${c.deal}`);
  }
  s = s.replace(/\s+/g, ' ').trim();
  return `${Cap(s)}.`;
}

/* ----------------------------------------------------------------------------------- T-8: where people see it differently */

/**
 * The lead's target for each person against a number a person says is their own, in full sentences: "You expect Kevin, Mercy and
 * Joseph to sell 40 units each. Kevin said on 13 October that his own aim is all 120 units, not 40. Kevin has not told you."
 * Only where a person said a different number as their own target; otherwise nothing.
 */
export function whereTheySeeItDifferently(input: {
  targets: readonly { participantId: string; target: number; unit: string }[];
  firstName: (pid: string | null) => string | null;
  lines: readonly ALineOnTheDay[];
  lead: string | null;
  zone: string;
}): string[] {
  if (!input.targets.length) return [];
  const OWN = /\b(?:my (?:personal |own )?target is|I['’]m working towards (?:selling|hitting)|I am working towards (?:selling|hitting)|personally aiming (?:to sell|at))\D{0,30}?(\d[\d,]*)\s*units?\b/i;
  const out: string[] = [];
  const differs: string[] = [];
  for (const t of input.targets) {
    const said = input.lines
      .filter((l) => l.participantId === t.participantId)
      .map((l) => ({ l, m: OWN.exec(l.text) }))
      .filter((x) => x.m && Number(x.m[1].replace(/,/g, '')) !== t.target)
      .sort((a, b) => b.l.createdAt.getTime() - a.l.createdAt.getTime())[0];
    if (!said) continue;
    const first = input.firstName(t.participantId) ?? 'Somebody';
    const n = Number(said.m![1].replace(/,/g, ''));
    const untold = input.lead && input.lines.some((l) => l.participantId === t.participantId
      && new RegExp(`\\b(?:haven['’]?t|have not|didn['’]?t|did not|not)\\b[^.]{0,30}\\btold\\s+${escape(input.lead as string)}\\b`, 'i').test(l.text));
    differs.push(`${first} said on ${aDayInWords(aDayKey(said.l.createdAt, input.zone))} that ${first}’s own aim is ${n > t.target ? `all ${n}` : n} ${t.unit}, not ${t.target}.${untold ? ` ${first} has not told you.` : ''}`);
  }
  if (!differs.length) return [];
  const same = input.targets.every((t) => t.target === input.targets[0].target && t.unit === input.targets[0].unit);
  out.push(same
    ? `You expect ${listed(input.targets.map((t) => input.firstName(t.participantId) ?? '').filter(Boolean))} to sell ${input.targets[0].target} ${input.targets[0].unit} each.`
    : `You expect ${listed(input.targets.map((t) => `${input.firstName(t.participantId)} to sell ${t.target} ${t.unit}`))}.`);
  return [...out, ...differs];
}

/* --------------------------------------------------------------------------------------- T-9: waits that have gone quiet */

/**
 * The waits on a customer said that day that nobody has raised since, named: "Kevin is waiting on Ali at Ngong Road Minimart and
 * on Jane’s deposit at Savannah Cafe. Neither came up after 14 October." A customer who is not answering is not here: that is under
 * What I don't know yet.
 */
export function whatWentQuietSince(input: {
  day: string;
  waits: readonly AWaitOnTheDay[];
  dayCheckIns: ReadonlySet<string>;
  deals: readonly ADealOnRecord[];
  notAnswering: ReadonlySet<string>;
  laterLines: readonly ALineOnTheDay[];
  firstName: (pid: string | null) => string | null;
}): string | null {
  const byWho = new Map<string, string[]>();
  let n = 0;
  for (const w of input.waits) {
    if (w.onParticipantId || w.clearedAt || !w.sourceCheckInId || !input.dayCheckIns.has(w.sourceCheckInId)) continue;
    const contact = String(w.onLabel ?? '').trim();
    if (!contact) continue;
    const d = input.deals.find((x) => x.ownerParticipantId === w.fromParticipantId && field(x, 'Contact').toLowerCase() === contact.toLowerCase());
    if (!d || input.notAnswering.has(d.id)) continue;
    const raisedSince = input.laterLines.some((l) => l.participantId === w.fromParticipantId && (l.text.includes(contact) || l.text.includes(d.name)));
    if (raisedSince) continue;
    const money = /\b(deposit|payment)\b/i.exec(String(w.what ?? ''));
    const who = input.firstName(w.fromParticipantId) ?? 'Somebody';
    byWho.set(who, [...(byWho.get(who) ?? []), money ? `${contact}’s ${money[1].toLowerCase()} at ${d.name}` : `${contact} at ${d.name}`]);
    n += 1;
  }
  if (!n) return null;
  const sentences = [...byWho.entries()].map(([who, xs]) => `${who} is waiting on ${xs.join(' and on ')}.`);
  const after = `after ${aDayInWords(input.day)}`;
  return `${sentences.join(' ')} ${n === 1 ? `It did not come up ${after}.` : n === 2 ? `Neither came up ${after}.` : `None of them came up ${after}.`}`;
}

/* ------------------------------------------------------------------------------------------- T-10, T-11: what is not known */

export interface SomethingNotKnownYet { title: string; says: string }

/**
 * What nobody can tell yet, from the record: a colleague's promise whose day has passed with nothing said since; open deals with
 * no buying date; a customer who has not answered and whose need is not known. In the kit's form: a title, then what is known and
 * what happens next.
 */
export function whatIsNotKnownYet(input: {
  now: Date;
  zone: string;
  waits: readonly AWaitOnTheDay[];
  deals: readonly (ADealOnRecord & { buyingDate?: string | null; notAnsweringSince?: Date | null; heardLastOn?: Date | null })[];
  linesSince: (after: Date) => readonly ALineOnTheDay[];
  firstName: (pid: string | null) => string | null;
  readerPid: string | null;
  lastStage: string;
}): SomethingNotKnownYet[] {
  const out: SomethingNotKnownYet[] = [];
  const name = (pid: string | null) => (pid && pid === input.readerPid ? 'you' : input.firstName(pid) ?? 'somebody');
  /* A colleague's promise, its day passed, and nothing said since. One per person and thing. */
  const seen = new Set<string>();
  for (const w of input.waits) {
    if (!w.onParticipantId || w.onParticipantId === w.fromParticipantId || w.clearedAt || !w.dueOn) continue;
    const due = new Date(w.dueOn);
    if (aDayKey(due, 'UTC') >= aDayKey(input.now, input.zone)) continue;
    const thing = stop(String(w.what ?? '')).replace(/^(?:the|a|an|some)\s+/i, '');
    const key = `${w.onParticipantId}|${w.fromParticipantId}`;
    if (!thing || seen.has(key)) continue;
    const since = input.linesSince(new Date(due.getTime() + 86_400_000));
    if (since.some((l) => l.participantId === w.fromParticipantId || l.participantId === w.onParticipantId)) continue;
    seen.add(key);
    const verb = /\bsample|unit|stock|document|order\b/i.test(thing) ? 'brought' : 'did';
    out.push({
      title: `Whether ${name(w.onParticipantId)} ${verb} the ${thing} on ${aDayWithItsWeekday(aDayKey(due, 'UTC'))}`,
      says: `Nobody has said since. Next: ${Cap(name(w.fromParticipantId))} will be asked.`,
    });
  }
  const open = input.deals.filter((d) => !d.dropped && String(d.stage ?? '').toLowerCase() !== input.lastStage.toLowerCase() && String(d.stage ?? '').trim());
  const waitingOnAColleague = (d: ADealOnRecord) => input.waits.some((w) => w.fromParticipantId === d.ownerParticipantId && w.onParticipantId && w.onParticipantId !== d.ownerParticipantId && !w.clearedAt
    && String(w.what ?? '').toLowerCase().includes(d.name.toLowerCase()));
  /* Open deals the customer is talking about, with no buying date on record. */
  const noDate = open.filter((d) => !d.buyingDate && !d.notAnsweringSince && field(d, 'Contact') && !waitingOnAColleague(d));
  if (noDate.length) {
    const owners = [...new Set(noDate.map((d) => name(d.ownerParticipantId)))];
    out.push({
      title: `When ${listed(noDate.map((d) => field(d, 'Contact')))} will buy`,
      says: `No buying date is on record for ${noDate.length === 1 ? 'that deal' : noDate.length === 2 ? 'either of them' : 'any of them'}. Next: ${Cap(listed(owners))} will be asked.`,
    });
  }
  /* A customer who has not answered, whose need nobody knows. */
  for (const d of open.filter((x) => x.notAnsweringSince && !field(x, 'Need') && theUnitsOf(x) === null)) {
    const contact = field(d, 'Contact');
    out.push({
      title: `What ${d.name} needs`,
      says: `${Cap(name(d.ownerParticipantId))} ${name(d.ownerParticipantId) === 'you' ? 'have' : 'has'} not reached ${contact || 'them'} since ${aDayInWords(aDayKey((d.heardLastOn ?? d.notAnsweringSince) as Date, input.zone))}. Next: ${Cap(name(d.ownerParticipantId))} will be asked.`,
    });
  }
  return out;
}

/**
 * A question Groundwork asked and is still waiting on, only where it was asked in those very words and the answer did not
 * answer it ("I don't know", or no reply). "How are you making your number?" that Mercy answered on 13 October is not one.
 */
export function wasAskedAndNotAnswered(question: string, turns: readonly { role: string; content: string }[]): boolean {
  const q = question.toLowerCase().replace(/[“”"?.]/g, '').trim();
  if (q.length < 8) return false;
  for (let i = 0; i < turns.length; i += 1) {
    if (String(turns[i].role).toUpperCase() === 'PERSON') continue;
    if (!String(turns[i].content ?? '').toLowerCase().replace(/[“”"?]/g, '').includes(q)) continue;
    const reply = turns.slice(i + 1).find((t) => String(t.role).toUpperCase() === 'PERSON');
    if (!reply || /^\s*(?:i\s+)?(?:don['’]?t|do not) know\b|^\s*(?:not sure|no idea|skip|pass)\b/i.test(String(reply.content ?? ''))) return true;
  }
  return false;
}

/* ------------------------------------------------------------------------------------------------ T-12: how sure it is */

/**
 * How sure Groundwork is, said in sentences with no colon, beside how much the report can rely on (page audit, 24 November, rows 6 and
 * 9: the report said it twice, "How much this report can rely on:" and "How sure Groundwork is about this report:"). "Groundwork is sure
 * about Kilele Hotel, which is backed by M-Pesa, and Greenfield Supermarket, which has a signed order. It is not sure about the deals
 * still open, which are each person’s word so far."
 */
export function howSureGroundworkIs(won: readonly { name: string; paid: boolean; signed: boolean; byMPesa: boolean; mpesaCode?: string | null }[], openDeals: number): string {
  const sure = [...won.filter((d) => d.paid), ...won.filter((d) => !d.paid && d.signed)].map((d) => `${d.name}, which ${d.paid ? (d.byMPesa ? 'is backed by M-Pesa' : d.mpesaCode ? `M-Pesa code ${d.mpesaCode} backs` : 'is backed by a payment record') : 'has a signed order'}`);
  const notSure = openDeals ? 'It is not sure about the deals still open, which are each person’s word so far.' : '';
  if (!sure.length) return `Groundwork is not sure yet, because no sale has a payment or a signed order behind it.${openDeals ? ' The deals still open are each person’s word so far.' : ''}`;
  return `Groundwork is sure about ${sure.length > 1 ? `${sure.slice(0, -1).join(', ')}, and ${sure[sure.length - 1]}` : sure[0]}.${notSure ? ` ${notSure}` : ''}`;
}

/**
 * WHAT I DON'T KNOW YET, ON RELEASE 1'S SALES CHECK-IN (T-10, T-11): the questions Groundwork asked in those words and that were not
 * answered, the reader's own said to them as "you", then what the deals cannot tell yet; the same title listed once.
 */
export function theOpenQuestionsThenTheDeals(
  gaps: readonly AGapOnRecord[],
  turns: readonly { role: string; content: string; checkIn?: { participantId?: string | null } | null }[],
  readerPid: string | null,
  nameOf: (pid: string) => string | null,
  fromTheDeals: readonly SomethingNotKnownYet[],
  sessionNumber: number,
): SomethingNotKnownYet[] {
  const asked = gaps.filter((g) => {
    const q = theOwedThingAskedPlainly(String(g.what ?? ''));
    return !!q && wasAskedAndNotAnswered(q, turns.filter((t) => t.checkIn?.participantId === g.participantId));
  });
  const once = new Map<string, SomethingNotKnownYet>();
  for (const x of [...whatIDontKnowYet([...asked], sessionNumber, (pid) => (readerPid && pid === readerPid ? 'you' : nameOf(pid))), ...fromTheDeals]) {
    if (once.has(x.title)) continue;
    once.set(x.title, { ...x, says: x.says.replace(/ You could ask you yourself\./, '').replace(/\byou has\b/g, 'you have').replace(/\byou is\b/g, 'you are') });
  }
  return [...once.values()];
}
