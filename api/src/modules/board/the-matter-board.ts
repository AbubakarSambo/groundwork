import { F, aDay } from './the-collections-record';
import { anAmount, money, aDayInWords, theDueDay, theOpenPromise, type ABillOnTheBoard } from './the-collections-board';
import { DUE_ON_AN_EVENT, plainWords, asHappened } from './a-fee-note-due-on-an-event';

/**
 * THE MATTER BOARD, BUILT FROM THE RECORD ONLY (release plan, Release 2: "Muchemi & Co's litigation check-in moves to PULSE_CHECK,
 * type legal matter, with the kit's matter board. Each matter shows one line for its fees"; the kit's matter board,
 * docs/prototype/screens/B5-boards-every-check-in/matter-board.txt and .jpg; Release 2, pull request 3 of 3).
 *
 * The kit draws one matter. A litigation daily covers several, so each matter on record is drawn as the kit draws its matter: where
 * it stands, and one line for its fees. Then, as the kit does: what you need to decide, and what changed this week and what it
 * changed, each line marked by how it is known. Nothing is invented: an empty section says so, in a sentence.
 *
 * WHAT A MATTER IS. A matter the firm bills on (a fee note's matter, or its client where no matter is said) that this check-in's own
 * lines or deadlines name. Groundwork keeps no other list of matters, so a matter nobody in the check-in has named is not drawn.
 *
 * PURE. The caller (the-matter-board.service) has already walled everything for this reader: the lines, deadlines and waits are
 * the ones this reader may read (whoever runs it every one; a person their own), and the bills are the ones this reader may read
 * (part 2's rule: each person their own; whoever runs the fee notes check-in every one). A matter a person has not spoken of is
 * not drawn for them.
 */

export interface AMatterLine {
  id: string;
  participantId: string | null;
  text: string;
  at: Date | string;
  /** "proven" where a document they added backs it; anything else is what was said. */
  mark: 'proven' | 'said';
}

export interface AMatterDeadline { id: string; name: string; dueAt: Date | string | null; ownerParticipantId: string | null }
export interface AMatterWait { id: string; fromParticipantId: string | null; on: string | null; what: string }

export interface AMatterOnRecord {
  key: string;
  client: string;
  /** The matter's name, where a fee note says one. */
  matter: string | null;
  /** The bills on it this reader may read. */
  bills: ABillOnTheBoard[];
  /** Whether this reader reads every bill of the fee notes check-in these come from. */
  readsEveryBill: boolean;
}

export interface TheMatterInput {
  checkInName: string;
  billWord: string;
  zone: string;
  now: Date;
  reader: { runsIt: boolean; participantId: string | null };
  people: { id: string; firstName: string }[];
  lines: AMatterLine[];
  deadlines: AMatterDeadline[];
  waits: AMatterWait[];
  matters: AMatterOnRecord[];
  /** What waits for a decision, as the board already serves it to whoever runs the check-in. Null for anybody else. */
  decisions: { question: string; why: string | null }[] | null;
}

export interface AMatterAsDrawn {
  key: string;
  name: string;
  stands: string;
  fees: string;
  /** Each fee note's own line, filled where a payment document shows it, ringed where it is only said. */
  feeMark: 'proven' | 'said' | 'none';
}

export interface TheMatterBoard {
  intro: string;
  question: string;
  matters: AMatterAsDrawn[];
  mattersEmpty: string | null;
  decide: null | { heading: string; rows: { question: string; why: string | null }[]; empty: string | null };
  changed: {
    heading: string;
    rows: { id: string; who: string; matter: string | null; said: string; mark: 'proven' | 'said'; markSays: string; itChanged: string | null }[];
    empty: string | null;
    legend: { mark: 'proven' | 'said'; says: string }[];
    note: string;
  };
  feesNote: string;
}

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const count = (n: number) => (n <= 10 ? NUMBER_WORDS[n] : String(n));
const lower = (n: number) => count(n).toLowerCase();
const Cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const stop = (s: string) => String(s ?? '').trim().replace(/[.\s]+$/, '');
const field = (r: { fields?: Record<string, unknown> | null }, k: string) => String((r.fields ?? {})[k] ?? '').trim();
const theDayOf = (d: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export const MARK_SAYS: Record<'proven' | 'said', string> = {
  proven: 'A document shows it',
  said: 'Said in a check-in, with no document yet',
};

/** Whether some words name a matter: its whole name, or its client's. */
export function theWordsNameTheMatter(words: string, m: { client: string; matter: string | null }): boolean {
  const said = ` ${plainWords(words)} `;
  const has = (n: string | null) => { const p = plainWords(n); return p.length >= 4 && said.includes(` ${p} `); };
  return has(m.matter) || has(m.client);
}

/** Whether a deadline's name is about more than one thing: "The witness statements for ..." is; "The hearing in ..." is not. */
export function aPluralName(name: string): boolean {
  const head = String(name ?? '').trim().toLowerCase().replace(/^(?:the|our|their|a|an)\s+/, '').split(/\s+(?:for|in|of|on|to|with|from|by)\s+/)[0];
  const last = head.split(/\s+/).slice(-1)[0] ?? '';
  return /s$/.test(last) && !/(?:ss|us|is|ys)$/.test(last);
}

/** Lists in a sentence: "a, b and c". */
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);


/** One fee note, in the words of a fee line. */
function oneFeeNote(r: ABillOnTheBoard, billWord: string, today: string, zone: string): { says: string; mark: 'proven' | 'said' | 'none' } {
  const n = field(r, F.number);
  const name = n || `the ${billWord} not raised yet`;
  const due = theDueDay(r);
  const when = field(r, F.dueWhen);
  const promise = theOpenPromise(r, today);
  if (r.stage === 'Paid') return r.proof.length ? { says: `${name} is paid, with proof`, mark: 'proven' } : { says: `${name} is said to be paid, with no proof yet`, mark: 'said' };
  if (field(r, F.disputed)) return { says: `${name} is disputed`, mark: 'none' };
  if (promise) return { says: promise.missed ? `${name} was promised for ${aDayInWords(promise.by, zone)}, and the date passed` : `${name} is promised for ${aDayInWords(promise.by, zone)}`, mark: 'none' };
  const event = (r.fields ?? {})[DUE_ON_AN_EVENT] as any;
  if (due && event && when) return { says: `${name} fell due on ${aDayInWords(due, zone)}, when ${asHappened(when)}`, mark: 'none' };
  if (due) return { says: due <= today ? `${name} fell due on ${aDayInWords(due, zone)}${n ? ', and it is not paid yet' : ''}` : `${name} falls due on ${aDayInWords(due, zone)}`, mark: 'none' };
  if (when) return { says: `${name} falls due when ${stop(when.replace(/^when\s+/i, '')).replace(/^./, (c) => c.toLowerCase())}`, mark: 'none' };
  return { says: `${name} has no day it falls due yet`, mark: 'none' };
}

/** THE ONE LINE FOR A MATTER'S FEES, for this reader, from the bills they may read. */
export function theFeesLine(m: AMatterOnRecord, input: Pick<TheMatterInput, 'billWord' | 'zone' | 'now' | 'reader'>): { says: string; mark: 'proven' | 'said' | 'none' } {
  const bill = input.billWord;
  const bills = bill.endsWith('s') ? bill : `${bill}s`;
  const today = theDayOf(input.now, input.zone);
  if (!m.bills.length) {
    return m.readsEveryBill
      ? { says: `No ${bill} is on record for this matter yet.`, mark: 'none' }
      : { says: `You do not follow up a ${bill} on this matter, so its fees are not shown to you.`, mark: 'none' };
  }
  const total = m.bills.reduce((a, r) => a + (anAmount(field(r, F.amount))?.value ?? 0), 0);
  const currency = m.bills.map((r) => anAmount(field(r, F.amount))?.currency).find(Boolean) ?? 'KES';
  const each = m.bills.map((r) => oneFeeNote(r, bill, today, input.zone));
  const head = m.readsEveryBill
    ? `${m.bills.length === 1 ? `There is one ${bill}` : `There are ${lower(m.bills.length)} ${bills}`} on this matter${total ? `, for ${money(total, currency)}${m.bills.length > 1 ? ' in all' : ''}` : ''}.`
    : `You follow up ${m.bills.length === 1 ? `one ${bill}` : `${lower(m.bills.length)} ${bills}`} on this matter${total ? `, for ${money(total, currency)}${m.bills.length > 1 ? ' in all' : ''}` : ''}.`;
  const mark: 'proven' | 'said' | 'none' = each.every((e) => e.mark === 'proven') ? 'proven' : each.some((e) => e.mark === 'said') ? 'said' : 'none';
  /* Each fee note in a sentence of its own, so the line reads as plain sentences. */
  return { says: [head, ...each.map((e) => `${Cap(e.says)}.`)].join(' '), mark };
}

export function buildTheMatterBoard(input: TheMatterInput): TheMatterBoard {
  const { reader, zone, now } = input;
  const today = theDayOf(now, zone);
  const nameOf = (pid: string | null) => {
    if (!pid) return 'Somebody';
    if (reader.participantId && pid === reader.participantId) return 'You';
    return input.people.find((p) => p.id === pid)?.firstName || 'A colleague';
  };
  const mine = (pid: string | null) => reader.runsIt || (!!reader.participantId && pid === reader.participantId);

  /* The matters this reader reads: whoever runs it, every matter the check-in names; a person, the ones their own lines or deadlines name. */
  const namedBy = (m: AMatterOnRecord) => [
    ...input.lines.filter((l) => mine(l.participantId) && theWordsNameTheMatter(l.text, m)).map((l) => l.text),
    ...input.deadlines.filter((d) => mine(d.ownerParticipantId) && theWordsNameTheMatter(d.name, m)).map((d) => d.name),
  ];
  const drawn = input.matters.filter((m) => namedBy(m).length);
  /* A matter's name as this reader may read it: the matter's whole name where something they read says it, else its client's. */
  const nameOfTheMatter = (m: AMatterOnRecord) => (m.matter && namedBy(m).some((w) => ` ${plainWords(w)} `.includes(` ${plainWords(m.matter)} `)) ? m.matter : m.client);

  const matters: AMatterAsDrawn[] = drawn.map((m) => {
    const says: string[] = [];
    const deadlines = input.deadlines
      .filter((d) => mine(d.ownerParticipantId) && d.dueAt && theWordsNameTheMatter(d.name, m))
      .sort((a, b) => new Date(a.dueAt as any).getTime() - new Date(b.dueAt as any).getTime());
    for (const d of deadlines) {
      const day = theDayOf(new Date(d.dueAt as any), 'UTC');
      const many = aPluralName(d.name);
      says.push(`${Cap(stop(d.name))} ${day < today ? (many ? 'were' : 'was') : (many ? 'are' : 'is')} due on ${aDayInWords(day, zone, true)}.`);
    }
    /* A person reads only their own deadlines and waits, so what they are told is about theirs. */
    if (!deadlines.length) says.push(reader.runsIt ? 'No deadline is on record for this matter yet.' : 'No deadline of yours is on record for this matter yet.');
    const waits = input.waits.filter((w) => mine(w.fromParticipantId) && theWordsNameTheMatter(`${w.on ?? ''} ${w.what}`, m));
    for (const w of waits) {
      const who = nameOf(w.fromParticipantId);
      says.push(`${who} ${who === 'You' ? 'are' : 'is'} waiting on ${w.on ?? 'somebody'} for ${stop(w.what)}.`);
    }
    if (!waits.length) says.push(reader.runsIt ? 'Nothing is in the way that has not been cleared.' : 'Nothing is in your way on this matter that has not been cleared.');
    const fees = theFeesLine(m, input);
    return { key: m.key, name: nameOfTheMatter(m), stands: says.join(' '), fees: fees.says, feeMark: fees.mark };
  });

  /* What changed this week: the lines this reader may read, since Monday, newest first, each with the matter it names. */
  const monday = (() => {
    const d = new Date(`${today}T12:00:00Z`);
    const back = (d.getUTCDay() + 6) % 7;
    return new Date(d.getTime() - back * 86_400_000).toISOString().slice(0, 10);
  })();
  const thisWeek = input.lines
    .filter((l) => mine(l.participantId) && theDayOf(new Date(l.at), zone) >= monday)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const madeDue = new Map<string, string>();
  for (const m of input.matters) for (const r of m.bills) {
    const ev = (r.fields ?? {})[DUE_ON_AN_EVENT] as any;
    if (ev?.lineId && aDay(ev.day)) {
      const n = field(r, F.number);
      madeDue.set(ev.lineId, `${madeDue.has(ev.lineId) ? `${madeDue.get(ev.lineId)} ` : ''}It made ${n ? `${input.billWord} ${n}` : `the ${input.billWord} for ${field(r, F.client) || r.name} that is not raised yet`} due on ${aDayInWords(ev.day, zone)}.`);
    }
  }
  const changedRows = thisWeek.map((l) => {
    const m = drawn.find((x) => theWordsNameTheMatter(l.text, x)) ?? null;
    return {
      id: l.id,
      who: nameOf(l.participantId),
      matter: m ? nameOfTheMatter(m) : null,
      said: `“${stop(l.text)}.”`,
      mark: l.mark,
      markSays: MARK_SAYS[l.mark],
      itChanged: madeDue.get(l.id) ?? null,
    };
  });

  const decide = reader.runsIt
    ? {
      heading: 'What you need to decide',
      rows: (input.decisions ?? []).map((d) => ({ question: d.question, why: d.why })),
      empty: (input.decisions ?? []).length ? null : 'Nothing is waiting for a decision yet.',
    }
    : null;

  const n = matters.length;
  const intro = n
    ? `${reader.runsIt ? `${count(n)} ${n === 1 ? 'matter is' : 'matters are'} on record in this check-in` : `You have spoken about ${lower(n)} ${n === 1 ? 'matter' : 'matters'} in this check-in`}, ${andList(matters.map((m) => m.name))}.`
    : reader.runsIt
      ? 'No matter is on record in this check-in yet. A matter shows here once somebody names it in a check-in and the firm has a fee note on it.'
      : 'You have not spoken about a matter in this check-in yet. Each one you name shows here.';
  const bills = input.billWord.endsWith('s') ? input.billWord : `${input.billWord}s`;
  return {
    intro,
    question: n === 1 ? 'Where the matter stands' : 'Where the matters stand',
    matters,
    mattersEmpty: n ? null : intro,
    decide,
    changed: {
      heading: 'What changed this week, and what it changed',
      rows: changedRows,
      empty: changedRows.length ? null : (reader.runsIt ? 'Nothing has been said about the matters this week yet.' : 'You have not said anything about the matters this week yet.'),
      legend: [{ mark: 'proven', says: MARK_SAYS.proven }, { mark: 'said', says: MARK_SAYS.said }],
      note: 'What each line changed is shown where the record holds it, such as a fee note that fell due when the event it waited for was reported.',
    },
    feesNote: reader.runsIt
      ? `Each matter’s fees are read from the ${bills} check-in.`
      : `Each matter’s fees are read from the ${bills} check-in, and you read only the ${bills} you follow up.`,
  };
}
