import type { ACollectionsType } from '../grounds/collect-whats-owed';
import { theBillsPlural } from '../grounds/collect-whats-owed';
import { F, FOLLOWS_UP_ID, NOT_YET_RAISED, LOAN_OWED, aDay, thePromisesKept, theStagesKept } from './the-collections-record';
import { asHappened, theEventAsSaid } from './a-fee-note-due-on-an-event';
import { whenItShouldBeRaised, whenItWasDue } from './raising-invoices-on-time';

/**
 * THE COLLECTIONS BOARD, BUILT FROM THE RECORD ONLY (release plan, Release 2, "The collections board (loans shape)"; the kit's
 * loans board, docs/prototype/screens/B5-boards-every-check-in/loans-board.txt and .jpg; Release 2, pull request 2 of 3).
 *
 * The loans type is drawn as the kit draws its lending cohort; the fee notes and invoices type takes the same shape, in the
 * organisation's own word for the bill. Every section is read from the rows the record writer kept (the-collections-record), the
 * payment documents filed on them, and the check-ins people made. Nothing is invented: an empty section says so, in a sentence.
 *
 * PURE. The caller (the-collections-board.service) has already walled the rows: the person who runs the check-in reads every bill;
 * anybody else, only the bills they follow up (or, on a loans check-in, their own loan). Counts are counted from the rows this
 * reader was given, so a person never reads the team's totals. "Where this is heading", which lays out the outcomes for the person
 * who decides, is built for whoever runs the check-in only.
 */

export type AGroup = 'paid' | 'on-track' | 'behind-in-touch' | 'blocked' | 'not-heard' | 'on-event' | 'not-raised';

export const GROUP_ORDER: readonly AGroup[] = ['paid', 'on-track', 'behind-in-touch', 'blocked', 'not-heard', 'on-event', 'not-raised'];

/** The headings of "Where they stand", as the release plan lists them, and the kit's words for a lending cohort. */
export const GROUP_LABEL: Record<ACollectionsType, Record<AGroup, string>> = {
  'invoices or fee notes': {
    paid: 'Paid', 'on-track': 'Due and on track', 'behind-in-touch': 'Behind, but in touch', blocked: 'Genuinely blocked',
    'not-heard': 'Not heard from', 'on-event': 'Due when something happens', 'not-raised': 'Not yet raised',
  },
  loans: {
    paid: 'Repaid', 'on-track': 'Repaying on time', 'behind-in-touch': 'Behind, but in touch', blocked: 'Genuinely blocked',
    'not-heard': 'Not heard from', 'on-event': 'Due when something happens', 'not-raised': 'Not yet raised',
  },
};

/** The order "Every one" lists rows in: what needs following up first, what is paid last. */
const ROW_ORDER: readonly AGroup[] = ['behind-in-touch', 'not-heard', 'blocked', 'on-event', 'not-raised', 'on-track', 'paid'];

/** The groups a loans board draws: the kit's four, and those repaid. */
const LOAN_GROUPS: readonly AGroup[] = ['paid', 'on-track', 'behind-in-touch', 'blocked', 'not-heard'];

/** Days without a word from the client, or without a check-in from a borrower, before they are "not heard from". */
export const NOT_HEARD_DAYS = 21;

export interface APayment { readAs: string; shows: string | null; on: Date | string; addedBy?: string | null }

export interface ABillOnTheBoard {
  id: string;
  kind: string;
  name: string;
  stage: string | null;
  ownerParticipantId: string | null;
  dueAt: Date | string | null;
  fields: Record<string, unknown> | null;
  createdAt: Date | string;
  /** Payment documents filed on this bill that count as proof (ItemEvidence, read as a payment). */
  proof: APayment[];
  /** The check-ins whose lines named this bill. */
  saidIn: string[];
  /** Who said, in their own line, that it is paid (the first to say so), where somebody did. */
  paidSaidBy?: string | null;
  /** Lines of another check-in of the organisation that say it is paid, as kept (theBillsOnRecord), and as this reader may read them. */
  paidSaidElsewhere?: ALineKeptHere[];
  paidElsewhere?: AnEventSaid[];
  /**
   * WHERE IT FELL DUE ON AN EVENT (a-fee-note-due-on-an-event): the day, the event it waited for, and the line that said it happened,
   * in its own words only where this reader may read that check-in's words, else null. Set by the board's service, for this reader.
   */
  event?: AnEventSaid | null;
  /** Lines that came close and wait for the lead's answer: to the lead of this check-in only. */
  toConfirm?: (AnEventSaid & { lineId: string })[];
}

/** A line from a matter check-in about the event a bill waits for, as this reader may read it. */
/** A line kept from another check-in (a-fee-note-due-on-an-event's ALineKept, said here without importing it). */
export interface ALineKeptHere { lineId: string; groundId: string; label: string; saidBy: string | null; text: string; at: string; day: string }

export interface AnEventSaid {
  /** The day it fell due (or would), as YYYY-MM-DD. */
  day: string;
  /** What the bill waits for, as said: "the reply is filed". */
  event: string;
  /** The check-in it was said in, by its name. */
  from: string;
  /** The day it was said, as YYYY-MM-DD. */
  saidOn: string;
  /** Who said it: a first name, or "You". Null where this reader may not read who said what there. */
  by: string | null;
  /** Their words, only where this reader may read that check-in's words. */
  said: string | null;
}

export interface ACollectionsPerson { id: string; firstName: string; isTheLead: boolean }

export interface TheCollectionsInput {
  type: ACollectionsType;
  billWord: string;
  rows: ABillOnTheBoard[];
  people: ACollectionsPerson[];
  /** The latest check-in each person completed. */
  lastCheckIn: Record<string, Date | string | null>;
  now: Date;
  zone: string;
  /** Whoever runs the check-in reads every bill; a person, their own. */
  reader: { runsIt: boolean; participantId: string | null };
  /** The lead confirmed the stall rule for promised payments (collect-whats-owed, theCollectionsStallRuleIn). */
  stallRuleSet: boolean;
  /** The check-in's id, for the routes the lead answers with. */
  groundId?: string;
  /** Release 3, raising invoices on time (raising-invoices-on-time), where it is on: who raises the invoices, and the pattern when they raise late. */
  raising?: { raiser: string | null; pattern: { says: string; instances: string[] } | null; /** The lead's sentences for each one late to raise, the same as the morning's and Today's (raising-invoices-on-time), each with its bill. */ lateLines?: { billId: string; says: string }[] };
}

export interface ACollectionsRow {
  id: string;
  group: AGroup;
  /** Fee notes: the client, and the matter where one is said. Loans: the borrower's name. */
  who: string;
  matter: string | null;
  number: string | null;
  amount: string | null;
  followsUp: string | null;
  fallsDue: string;
  /** "proven" where a payment document is filed on it, "said" where somebody said it, "none" where nothing is paid. */
  payment: { says: string; mark: 'proven' | 'said' | 'none' };
  /** The kit's Repayment tag, on a loans board: "On time", "2 weeks behind". */
  repayment?: { says: string; tone: 'proven' | 'attention' | 'concern' };
  business?: string;
  sales?: string;
  inTheWay: string;
  next: string;
  /** The payment documents filed on it, each in a sentence. */
  proof: string[];
}

export interface TheCollectionsBoard {
  type: ACollectionsType;
  billWord: string;
  question: string;
  answer: string;
  answerFrom: string;
  /** The bar under the answer: the share paid with proof, and the share paid on somebody's word, of what is due. */
  bar: { proven: number; said: number } | null;
  needsYou: {
    heading: string;
    rows: { title: string; says: string }[];
    /** To whoever runs it: the bill each row is about, in the rows' order, so her morning line about the same bill is not drawn beside it. */
    refs?: string[];
    empty: string | null;
    /** Lines that came close to the event a bill waits for, for the lead to confirm (a-fee-note-due-on-an-event). Lead only. */
    toConfirm?: { id: string; title: string; says: string; choices: { label: string; route: { method: 'POST'; path: string; body: Record<string, unknown> } }[] }[];
    /** Release 3: each one late to raise, in a sentence or two, for the lead's morning (engagement/the-direct-morning). Lead only. */
    /** Each with the board row it is (`ref`), so the lead's morning does not say it again beside that row. */
    lateToRaise?: { ref: string; says: string }[];
  };
  stand: { heading: string; total: string; groups: { group: AGroup; label: string; count: number; says: string }[] };
  every: { heading: string; note: string; columns: string[]; rows: ACollectionsRow[]; empty: string | null; foot: string | null };
  patterns: { heading: string; note: string; rows: { title: string; says: string; tag: string }[]; empty: string | null; foot: string | null };
  /** Release 3 is on for this board (raising-invoices-on-time): a bill not raised yet is not owed, and the morning leaves it out of who to chase. */
  raisingInvoices?: true;
  /** The lead's two sections. Null on a borrower's own board: they are about the cohort and the lead's follow-up (21 October). */
  followUp: { heading: string; rows: { what: string; howMany: string; whatFollowed: string }[]; empty: string | null } | null;
  systems: { heading: string; says: string } | null;
  heading: null | {
    heading: string;
    outcomes: { says: string; more: string }[];
    outcomesSays: string | null;
    signals: { says: string; from: string; tone: 'watch' | 'concern' }[];
    signalsSays: string | null;
    whatWouldSettleIt: string;
    whoDecides: string;
  };
}

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const count = (n: number) => (n <= 10 ? NUMBER_WORDS[n] : String(n));
const countLower = (n: number) => count(n).toLowerCase();
const Cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const stop = (s: string) => String(s ?? '').trim().replace(/[.\s]+$/, '');
const field = (r: { fields?: Record<string, unknown> | null }, k: string) => String((r.fields ?? {})[k] ?? '').trim();
const DAY = 86_400_000;

/** "KES 250,000" from "KES 250,000", "250000", "Ksh 250k"; with the currency said, or KES where none was. */
export function anAmount(v: unknown): { value: number; currency: string } | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const cur = (s.match(/\b(KES|KSH|KSHS|USD|NGN|UGX|TZS|GBP|EUR|ZAR|GHS|RWF)\b/i)?.[1] ?? 'KES').toUpperCase().replace(/^KSHS?$/, 'KES');
  const m = s.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|m|thousand|million)?\b/i);
  if (!m) return null;
  const mult = /^(k|thousand)$/i.test(m[2] ?? '') ? 1e3 : /^(m|million)$/i.test(m[2] ?? '') ? 1e6 : 1;
  return { value: Math.round(Number(m[1]) * mult), currency: cur };
}
export const money = (n: number, currency = 'KES') => `${currency} ${Math.round(n).toLocaleString('en-US')}`;

export function aDayInWords(day: string | Date, zone: string, withWeekday = false): string {
  const d = typeof day === 'string' ? new Date(`${day.slice(0, 10)}T12:00:00Z`) : day;
  return new Intl.DateTimeFormat('en-GB', { ...(withWeekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', timeZone: typeof day === 'string' ? 'UTC' : zone }).format(d).replace(',', '');
}
export const theDayOf = (d: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** When the row last moved to Paid, as YYYY-MM-DD, or null. */
export function thePaidDay(r: ABillOnTheBoard, zone: string): string | null {
  if (r.stage !== 'Paid') return null;
  const kept = theStagesKept(r.fields).filter((s) => s.stage === 'Paid');
  const last = kept[kept.length - 1];
  return last ? theDayOf(new Date(last.on), zone) : null;
}

/** The promise the client made last, where it is still open: its day, and whether it has passed. */
export function theOpenPromise(r: ABillOnTheBoard, today: string): { by: string; missed: boolean } | null {
  if (r.stage === 'Paid') return null;
  const by = aDay(field(r, F.promisedBy)) ?? thePromisesKept(r.fields).slice(-1)[0]?.by ?? null;
  return by ? { by, missed: by < today } : null;
}

/** The day it falls due, as YYYY-MM-DD, from the record. */
export const theDueDay = (r: ABillOnTheBoard): string | null => aDay(field(r, F.fallsDue)) ?? (r.dueAt ? new Date(r.dueAt).toISOString().slice(0, 10) : null);

/** The day somebody last heard from the client, or the borrower last checked in. */
function lastHeard(r: ABillOnTheBoard, input: TheCollectionsInput): string | null {
  if (r.kind === LOAN_OWED) {
    const at = r.ownerParticipantId ? input.lastCheckIn[r.ownerParticipantId] : null;
    return at ? theDayOf(new Date(at), input.zone) : null;
  }
  const days = [aDay(field(r, F.lastContact)), ...thePromisesKept(r.fields).map((p) => theDayOf(new Date(p.said), input.zone))].filter((d): d is string => !!d);
  return days.sort().slice(-1)[0] ?? null;
}

const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / DAY);

/** Which group a row stands in, by the first that fits: paid, not yet raised, blocked, due on an event, not heard, behind, on track. */
export function theGroupOf(r: ABillOnTheBoard, input: TheCollectionsInput): AGroup {
  const today = theDayOf(input.now, input.zone);
  if (r.stage === 'Paid') return 'paid';
  if (r.kind !== LOAN_OWED && r.stage === NOT_YET_RAISED) return 'not-raised';
  if (field(r, F.disputed)) return 'blocked';
  const due = theDueDay(r);
  if (r.kind !== LOAN_OWED && !due && field(r, F.dueWhen)) return 'on-event';
  const heard = lastHeard(r, input);
  const promise = theOpenPromise(r, today);
  const late = (due && due < today) || (promise?.missed ?? false);
  if (r.kind === LOAN_OWED) {
    if (!heard || daysBetween(heard, today) > NOT_HEARD_DAYS) return 'not-heard';
  } else if (r.event && due && !promise && daysBetween(due, today) <= NOT_HEARD_DAYS) {
    /* It fell due on an event in the matter in the last three weeks (a-fee-note-due-on-an-event): due, and not yet late to follow up. */
    return 'on-track';
  } else if (late && !promise && (!heard || daysBetween(heard, today) > NOT_HEARD_DAYS)) {
    return 'not-heard';
  }
  if (field(r, F.inTheWay) && /\b(?:cannot|can't|can’t|no power|power cuts?|closed|stopped|blocked)\b/i.test(field(r, F.inTheWay)) && late) return 'blocked';
  return late ? 'behind-in-touch' : 'on-track';
}

export function buildTheCollectionsBoard(input: TheCollectionsInput): TheCollectionsBoard {
  const { type, now, zone, reader } = input;
  const loans = type === 'loans';
  const bill = input.billWord;
  const bills = theBillsPlural(bill);
  const today = theDayOf(now, zone);
  const nameOf = (pid: string | null | undefined) => {
    if (!pid) return 'Nobody';
    if (reader.participantId && pid === reader.participantId) return 'You';
    return input.people.find((p) => p.id === pid)?.firstName || 'A colleague';
  };
  const midName = (pid: string | null | undefined) => { const n = nameOf(pid); return n === 'You' ? 'you' : n === 'A colleague' ? 'a colleague' : n; };
  const rows = input.rows.map((r) => ({ r, group: theGroupOf(r, input) }));
  const followerOf = (r: ABillOnTheBoard) => String((r.fields ?? {})[FOLLOWS_UP_ID] ?? '') || r.ownerParticipantId;
  const whoOf = (r: ABillOnTheBoard) => (loans ? nameOf(r.ownerParticipantId) : field(r, F.client) || r.name);
  const aBill = (r: ABillOnTheBoard) => {
    const n = field(r, F.number);
    const client = field(r, F.client) || r.name;
    if (loans) return reader.participantId && r.ownerParticipantId === reader.participantId ? 'your loan' : `${nameOf(r.ownerParticipantId)}’s loan`;
    return n ? `${bill} ${n} for ${client}` : `the ${bill} for ${client} that is not numbered yet`;
  };
  const amountOf = (r: ABillOnTheBoard) => anAmount(field(r, F.amount));

  /* ------------------------------------------------------------ the headline: what is due, and how much of it is paid */
  const dueRows = rows.filter(({ r, group }) => group === 'paid' || (group !== 'not-raised' && group !== 'on-event' && (() => { const d = theDueDay(r); return !!d && d <= today; })()));
  const currency = rows.map(({ r }) => amountOf(r)?.currency).find(Boolean) ?? 'KES';
  const sum = (xs: { r: ABillOnTheBoard }[]) => xs.reduce((a, { r }) => a + (amountOf(r)?.value ?? 0), 0);
  const paidRows = rows.filter((x) => x.group === 'paid');
  const proven = paidRows.filter(({ r }) => r.proof.length > 0);
  const saidOnly = paidRows.filter(({ r }) => r.proof.length === 0);
  const dueAmount = sum(dueRows);
  const behind = rows.filter((x) => x.group === 'behind-in-touch');
  const unit = loans ? 'borrowers' : bills;
  const unitOne = loans ? 'borrower' : bill;
  const nOf = (n: number) => `${count(n)} ${n === 1 ? unitOne : unit}`;
  const question = loans
    ? (reader.runsIt ? 'Is the cohort repaying, and why not where it isn’t?' : 'Is your loan being repaid, and why not if it isn’t?')
    : (reader.runsIt ? `Are the ${bills} being paid, and why not where they aren’t?` : `Are your ${bills} being paid, and why not where they aren’t?`);
  let answer = '';
  let bar: TheCollectionsBoard['bar'] = null;
  if (!rows.length) {
    answer = reader.runsIt
      ? (loans ? 'No loan is on record yet.' : `No ${bill} is on record yet.`)
      : (loans ? 'Your loan is not on record yet.' : `No ${bill} that you follow up is on record yet.`);
  } else if (!dueRows.length) {
    answer = loans ? 'No repayment has fallen due yet.' : `No ${bill} has fallen due yet.`;
  } else {
    const provenAmount = sum(proven);
    const saidAmount = sum(saidOnly);
    const share = dueAmount > 0 ? Math.round((provenAmount / dueAmount) * 100) : Math.round((proven.length / dueRows.length) * 100);
    const saidShare = dueAmount > 0 ? Math.round((saidAmount / dueAmount) * 100) : Math.round((saidOnly.length / dueRows.length) * 100);
    bar = { proven: share, said: saidShare };
    const first = `${share}% of what’s due ${loans ? 'is repaid' : 'is paid'}, on proof.`;
    if (!reader.runsIt) {
      /* A person reads their own, as "you". */
      const mineOpen = rows.filter(({ group }) => group !== 'paid' && group !== 'on-event' && group !== 'not-raised');
      const promise = mineOpen.map(({ r }) => theOpenPromise(r, today)).find(Boolean) ?? null;
      if (loans) {
        const r = dueRows[0].r;
        const amt = amountOf(r);
        const due = theDueDay(r);
        answer = paidRows.length
          ? `Your repayment${amt ? ` of ${money(amt.value, amt.currency)}` : ''} is paid${proven.length ? ', and a repayment record shows it' : ', as you said. No repayment record shows it yet'}.`
          : `Your repayment${amt ? ` of ${money(amt.value, amt.currency)}` : ''} fell due${due ? ` on ${aDayInWords(due, zone)}` : ''}, and it is not paid yet.${promise ? ` You promised to pay by ${aDayInWords(promise.by, zone, true)}.` : ''}`;
      } else {
        answer = `Of ${money(dueAmount, currency)} due on your ${bills}, ${sum(proven) ? `${money(sum(proven), currency)} is paid with proof` : 'none is paid with proof yet'}${saidOnly.length ? `, and ${money(sum(saidOnly), currency)} on your word only` : ''}.${behind.length ? ` ${nOf(behind.length)} ${behind.length === 1 ? 'is' : 'are'} behind, but the ${behind.length === 1 ? 'client is' : 'clients are'} in touch.` : ''}`;
      }
    }
    const second = saidOnly.length
      ? ` A further ${dueAmount > 0 ? money(saidAmount, currency) : nOf(saidOnly.length)} is paid on somebody’s word, with no proof yet.`
      : '';
    const third = behind.length
      ? ` ${nOf(behind.length)} ${behind.length === 1 ? 'is' : 'are'} behind, but ${loans ? 'still in touch' : `the ${behind.length === 1 ? 'client is' : 'clients are'} in touch`}.`
      : '';
    if (reader.runsIt) answer = `${first}${second}${third}`;
  }
  const answerFrom = loans
    ? 'Repayments count as proven where a repayment record, a bank slip or an M-Pesa message is filed on the loan; everything else is from what borrowers said in their check-ins.'
    : `Payments count as proven where a bank slip, an M-Pesa message or the accounting system’s record is filed on the ${bill}; everything else is from what people said in their check-ins.`;

  /* ------------------------------------------------------------ what needs you */
  /* Each with the bill it is about (`ref`), so the lead's morning line about the same bill is not drawn beside it. */
  const need: { rank: number; title: string; says: string; ref?: string }[] = [];
  for (const { r, group } of rows) {
    const amt = amountOf(r);
    /* RELEASE 3: ONE TO RAISE WHOSE DAY HAS COME says that day, why, how late it is, and who raises it; most overdue first. */
    const toRaise = input.raising && !loans && r.stage === NOT_YET_RAISED ? whenItShouldBeRaised(r as any, today) : null;
    if (toRaise) {
      const late = Math.max(0, daysBetween(toRaise.day, today));
      const raiser = input.raising?.raiser ?? null;
      need.push({ ref: `bill-${r.id}`,
        /* Late to raise before anything else, the most overdue first. */
        rank: late > 0 ? -late : 2,
        title: late > 0 ? `A ${bill} for ${whoOf(r)} is ${late === 1 ? 'one day' : `${late} days`} late to raise` : `A ${bill} for ${whoOf(r)} is due to be raised today`,
        says: `${whenItWasDue(toRaise)}${amt ? ` It is for ${money(amt.value, amt.currency)}.` : ''}${raiser ? ` ${raiser === 'You' ? 'You raise it, and have' : `${raiser} raises it, and has`} not said it is raised.` : ''}`,
      });
      continue;
    }
    const amountWords = amt ? `, ${money(amt.value, amt.currency)}` : '';
    const follower = followerOf(r);
    const who = whoOf(r);
    const promise = theOpenPromise(r, today);
    const followsUp = loans ? '' : ` ${Cap(midName(follower))} ${nameOf(follower) === 'You' ? 'follow' : 'follows'} it up.`;
    if (promise?.missed) {
      need.push({ ref: `bill-${r.id}`,
        rank: 1,
        title: loans ? `${who === 'You' ? 'You' : who} missed the day ${who === 'You' ? 'you' : 'they'} promised to pay by` : `${who} missed the date they promised to pay by`,
        says: `${Cap(aBill(r))}${amountWords}. ${loans ? (who === 'You' ? 'You' : 'They') : 'The client'} promised to pay by ${aDayInWords(promise.by, zone)}, and nothing has come in.${input.stallRuleSet ? ` It is stalled by your rule.` : ''}${followsUp}`,
      });
    } else if (r.event && group !== 'paid' && !promise) {
      /* IT FELL DUE ON AN EVENT IN THE MATTER (a-fee-note-due-on-an-event), with the line that said it, as this reader may read it. */
      const ev = r.event;
      const whenItFallsDue = `It falls due when ${theEventAsSaid(ev.event)}.`;
      const said = ev.said && ev.by
        ? `${ev.by} said in ${ev.from} on ${aDayInWords(ev.saidOn, zone)}, “${stop(ev.said)}.”`
        : `${ev.from} reported it on ${aDayInWords(ev.saidOn, zone)}.`;
      const raised = !!field(r, F.number) && r.stage !== NOT_YET_RAISED;
      need.push({ ref: `bill-${r.id}`,
        rank: 2,
        title: raised ? `${Cap(aBill(r))} fell due on ${aDayInWords(ev.day, zone)}` : `A ${bill} for ${who} fell due on ${aDayInWords(ev.day, zone)}, and it is not raised yet`,
        says: `${whenItFallsDue} ${said}${amt ? ` It is for ${money(amt.value, amt.currency)}${raised ? ', and nothing is paid yet' : ''}.` : raised ? ' Nothing is paid yet.' : ''}${followsUp}`,
      });
    } else if (group === 'not-heard') {
      const due = theDueDay(r);
      need.push({ ref: `bill-${r.id}`,
        rank: 2,
        title: loans
          ? (() => { const at = r.ownerParticipantId ? input.lastCheckIn[r.ownerParticipantId] : null; const since = at ? ` since ${aDayInWords(new Date(at), zone)}` : ' yet'; return `${who === 'You' ? 'You have' : `${who} has`} not checked in${since}`; })()
          : `${who} has not been heard from`,
        says: loans
          ? `${Cap(aBill(r))}${amountWords}${due ? `, fell due on ${aDayInWords(due, zone)}` : ''}. No check-in and no repayment are on record since.`
          : `${Cap(aBill(r))}${amountWords}${due ? `, fell due on ${aDayInWords(due, zone)}` : ''}. Nobody has heard from the client since.${followsUp}`,
      });
    } else if (group === 'blocked') {
      const words = field(r, F.disputed) || field(r, F.inTheWay);
      need.push({ ref: `bill-${r.id}`,
        rank: 3,
        title: loans ? `${who === 'You' ? 'Your loan is' : `${who}’s loan is`} blocked` : `${who} disputes ${field(r, F.number) ? `${bill} ${field(r, F.number)}` : `a ${bill}`}`,
        says: `${Cap(aBill(r))}${amountWords}. ${Cap(midName(r.ownerParticipantId))} said, “${stop(words)}.”${followsUp}`,
      });
    } else if (group === 'paid' && !r.proof.length) {
      need.push({ ref: `bill-${r.id}`,
        rank: 4,
        title: loans ? `${who === 'You' ? 'Your' : `${who}’s`} repayment has no proof yet` : `${who}’s payment has no proof yet`,
        says: `${Cap(midName(r.ownerParticipantId))} ${nameOf(r.ownerParticipantId) === 'You' ? 'say' : 'says'} ${aBill(r)} is paid. ${loans ? 'A repayment record, a bank slip or an M-Pesa message' : 'A bank slip, an M-Pesa message or the accounting system’s record'} would show it.`,
      });
    } else if (group === 'not-raised') {
      const when = field(r, F.dueWhen);
      need.push({ ref: `bill-${r.id}`,
        rank: 5,
        title: `A ${bill} for ${who} is not raised yet`,
        says: `${when ? `It falls due when ${stop(when.replace(/^when\s+/i, '')).replace(/^./, (c) => c.toLowerCase())}.` : 'Nobody has said when it falls due.'}${amountWords ? ` It is for ${amt ? money(amt.value, amt.currency) : ''}.` : ''}${followsUp}`,
      });
    }
  }
  need.sort((a, b) => a.rank - b.rank);
  /* A line that came close to the event a bill waits for, for the lead to confirm: nothing has changed until she says. */
  const toConfirm = loans || !input.groundId ? [] : rows.flatMap(({ r }) => (r.toConfirm ?? []).map((c) => {
    const n = field(r, F.number);
    const client = field(r, F.client) || r.name;
    const said = c.said && c.by
      ? `${c.by} said in ${c.from} on ${aDayInWords(c.saidOn, zone)}, “${stop(c.said)}.”`
      : `Something said in ${c.from} on ${aDayInWords(c.saidOn, zone)} may be it.`;
    const route = (yes: boolean) => ({ method: 'POST' as const, path: `/grounds/${input.groundId}/board/due-on-an-event/answer`, body: { itemId: r.id, lineId: c.lineId, yes } });
    return {
      id: `${r.id}:${c.lineId}`,
      title: n ? `Did ${bill} ${n} for ${client} fall due on ${aDayInWords(c.day, zone)}?` : `Did the ${bill} for ${client} that is not raised yet fall due on ${aDayInWords(c.day, zone)}?`,
      says: `It falls due when ${theEventAsSaid(c.event)}. ${said} Groundwork cannot tell whether this is the same event, so nothing has changed.`,
      choices: [{ label: 'Yes, it is due', route: route(true) }, { label: 'No, it is not', route: route(false) }],
    };
  }));
  const needsYou = {
    heading: 'What needs you',
    /* Every one: a cap hid missed promises and disputes behind fee notes late to raise (boards audit, C2 and R3-1). */
    rows: need.map(({ title, says }) => ({ title, says })),
    ...(reader.runsIt && need.length ? { refs: need.map((n) => n.ref ?? '') } : {}),
    empty: need.length || toConfirm.length ? null : (loans ? 'Nothing needs you on the loans right now.' : `Nothing needs you on the ${bills} right now.`),
    ...(toConfirm.length ? { toConfirm } : {}),
    ...(reader.runsIt && input.raising?.lateLines?.length ? { lateToRaise: input.raising.lateLines.map((l) => ({ ref: `bill-${l.billId}`, says: l.says })) } : {}),
  };

  /* ------------------------------------------------------------ where they stand */
  const groupsShown = loans ? LOAN_GROUPS : GROUP_ORDER;
  const groupSays = (g: AGroup, n: number): string => {
    if (!n) return loans ? 'None at the moment.' : 'None at the moment.';
    switch (g) {
      case 'paid': {
        const p = rows.filter((x) => x.group === 'paid' && x.r.proof.length).length;
        if (!p) return n === 1 ? 'On somebody’s word only, with no proof yet.' : 'All on somebody’s word only, with no proof yet.';
        return p === n ? (n === 1 ? 'With proof.' : 'All with proof.') : `${count(p)} with proof, and ${countLower(n - p)} on somebody’s word only.`;
      }
      case 'on-track': {
        if (loans) return 'Repaying on time.';
        /* One that fell due on an event in the matter in the last three weeks is due, and not yet late to follow up. */
        const onEvent = rows.filter((x) => x.group === 'on-track' && x.r.event).length;
        if (!onEvent) return 'Due, and the day it falls due has not passed.';
        if (onEvent === n) return n === 1 ? 'It fell due on an event in the matter in the last three weeks.' : 'They fell due on events in the matters in the last three weeks.';
        return `${count(n - onEvent)} ${n - onEvent === 1 ? 'is' : 'are'} not due yet, and ${countLower(onEvent)} fell due on an event in the matter in the last three weeks.`;
      }
      case 'behind-in-touch': return loans ? 'Behind on a repayment, and still checking in.' : 'Past the day it fell due or the day the client promised, and the client is in touch.';
      case 'blocked': return loans ? 'Something stops the repayment, in the borrower’s own words.' : 'The client disputes it, or something stops it being paid.';
      case 'not-heard': return loans ? `No check-in and no repayment for ${NOT_HEARD_DAYS / 7} weeks.` : `Past due, and nobody has heard from the client for ${NOT_HEARD_DAYS / 7} weeks.`;
      case 'on-event': return 'It falls due when something happens in the matter, which has not happened yet.';
      case 'not-raised': return `It should go out, and nobody has raised it yet.`;
    }
  };
  const stand = {
    heading: loans ? (reader.runsIt ? 'Where the cohort stands' : 'Where your loan stands') : (reader.runsIt ? `Where the ${bills} stand` : `Where your ${bills} stand`),
    total: loans ? `${rows.length} ${rows.length === 1 ? 'loan' : 'loans'}` : `${rows.length} ${rows.length === 1 ? bill : bills}`,
    groups: groupsShown.map((g) => {
      const n = rows.filter((x) => x.group === g).length;
      return { group: g, label: GROUP_LABEL[type][g], count: n, says: groupSays(g, n) };
    }),
  };

  /* ------------------------------------------------------------ every one, and what shows it */
  const eachRow: ACollectionsRow[] = rows.map(({ r, group }) => {
    const amt = amountOf(r);
    const due = theDueDay(r);
    const when = field(r, F.dueWhen);
    const promise = theOpenPromise(r, today);
    const paidDay = thePaidDay(r, zone);
    const fallsDue = due
      ? (due < today && group !== 'paid'
        ? `${aDayInWords(due, zone)}, ${daysBetween(due, today) === 1 ? 'yesterday' : `${daysBetween(due, today)} days ago`}${r.event ? `, when ${asHappened(r.event.event)}` : ''}`
        : `${aDayInWords(due, zone)}${r.event ? `, when ${asHappened(r.event.event)}` : ''}`)
      : when ? `When ${stop(when.replace(/^when\s+/i, '')).replace(/^./, (c) => c.toLowerCase())}` : 'Not said yet';
    /* What a document says is read by whoever runs the check-in and by the person who added it (Release 1B's rule for evidence); anybody else reads only that proof is there. */
    const proofWords = r.proof.filter((p) => reader.runsIt || (!!reader.participantId && p.addedBy === reader.participantId)).map((p) => `${p.readAs === 'A payment' ? 'A payment record' : p.readAs} was added on ${aDayInWords(new Date(p.on), zone)}.${p.shows ? ` It reads, “${stop(p.shows)}.”` : ''}`);
    const payment: ACollectionsRow['payment'] = group === 'paid'
      ? (r.proof.length
        ? { says: `Paid${paidDay ? ` on ${aDayInWords(paidDay, zone)}` : ''}, with proof`, mark: 'proven' }
        : { says: `Paid, as ${midName(r.paidSaidBy ?? r.ownerParticipantId)} said`, mark: 'said' })
      : promise
        ? { says: promise.missed ? `Promised for ${aDayInWords(promise.by, zone)}, and missed` : `Promised for ${aDayInWords(promise.by, zone)}`, mark: 'none' }
        : { says: field(r, F.paid) ? `${stop(field(r, F.paid))} paid, as ${midName(r.ownerParticipantId)} said` : 'Not paid', mark: field(r, F.paid) ? 'said' : 'none' };
    /* Said in another check-in to be paid, and not paid with proof here: said beside it, as this reader may read it (item 7). */
    const saidElsewhere = !r.proof.length ? (r.paidElsewhere ?? [])[0] : undefined;
    if (saidElsewhere) {
      const where = `in ${saidElsewhere.from} on ${aDayInWords(saidElsewhere.saidOn, zone)}`;
      const by = saidElsewhere.by ? (saidElsewhere.by === 'You' ? 'you' : saidElsewhere.by) : null;
      payment.says = payment.mark === 'said' && by && new RegExp(`as ${by} said$`).test(payment.says)
        ? `${payment.says} here and ${where}`
        : payment.mark === 'none'
          ? `Not paid with proof, but ${by ?? 'somebody'} said ${where} that it is paid`
          : `${payment.says}, and ${by ?? 'somebody'} said ${where} that it is paid`;
      if (payment.mark === 'none') payment.mark = 'said';
    }
    const nextStep = field(r, F.nextStep);
    const nextBy = aDay(field(r, F.nextStepBy));
    const next = nextStep ? `${Cap(stop(nextStep))}${nextBy ? `, by ${aDayInWords(nextBy, zone, true)}` : ''}.` : group === 'paid' ? 'Nothing more.' : 'Nothing booked yet.';
    const inTheWay = field(r, F.disputed) || field(r, F.inTheWay);
    const out: ACollectionsRow = {
      id: r.id, group,
      who: whoOf(r),
      matter: loans ? null : field(r, F.matter) || null,
      number: loans ? null : field(r, F.number) || null,
      amount: amt ? money(amt.value, amt.currency) : null,
      followsUp: loans ? null : nameOf(followerOf(r)),
      fallsDue,
      payment,
      inTheWay: inTheWay ? `“${stop(inTheWay)}.”` : 'Nothing said.',
      next,
      proof: proofWords,
    };
    if (loans) {
      const weeks = due && due < today ? Math.max(1, Math.floor(daysBetween(due, today) / 7)) : 0;
      out.repayment = group === 'paid' || (!weeks && group !== 'not-heard')
        ? { says: 'On time', tone: 'proven' }
        : { says: `${weeks || 1} ${weeks === 1 || !weeks ? 'week' : 'weeks'} behind`, tone: group === 'not-heard' ? 'concern' : 'attention' };
      out.business = field(r, F.business) ? Cap(field(r, F.business)) : group === 'not-heard' ? 'Not heard' : 'Not said yet';
      out.sales = field(r, F.sales) || 'Not said yet';
    }
    return out;
  }).sort((a, b) => ROW_ORDER.indexOf(a.group) - ROW_ORDER.indexOf(b.group) || a.who.localeCompare(b.who));
  const every = {
    heading: loans ? (reader.runsIt ? 'Every borrower, and what shows it' : 'Your loan, and what shows it') : (reader.runsIt ? `Every ${bill}, and what shows it` : `Your ${bills}, and what shows them`),
    note: 'Filled is proven; ringed is their word',
    columns: loans
      ? ['Borrower', 'Business', 'Sales, 4 weeks', 'Repayment', 'What’s in the way, in their words', 'Next']
      : ['Client and matter', 'Number', 'Amount', 'Who follows up', 'Falls due', 'Payment', 'What’s in the way, in their words', 'Next'],
    rows: eachRow,
    empty: eachRow.length ? null : answer,
    /* Browser test, 20 October: a borrower with one loan read "It is shown. Each one’s proof is filed on it". One row is said as one. */
    foot: !eachRow.length ? null
      : eachRow.length === 1 ? ((eachRow[0].proof ?? []).length || eachRow[0].payment?.mark === 'proven' ? 'Its proof is filed on it, from the slips and messages people added.' : 'Nothing is filed on it yet. A slip or a message added to it shows here.')
      : `All ${countLower(eachRow.length)} are shown. Each one’s proof is filed on it, from the slips and messages people added.`,
  };

  /* ------------------------------------------------------------ one client, one kind of work, or how we bill? */
  const patternRows: { title: string; says: string; tag: string }[] = [];
  const unpaid = rows.filter(({ group }) => group !== 'paid');
  const byClient = new Map<string, typeof rows>();
  if (!loans) for (const x of unpaid.filter(({ group }) => ['behind-in-touch', 'blocked', 'not-heard'].includes(group))) {
    const c = field(x.r, F.client) || x.r.name;
    byClient.set(c, [...(byClient.get(c) ?? []), x]);
  }
  for (const [client, xs] of byClient) {
    const checkIns = new Set(xs.flatMap(({ r }) => r.saidIn));
    if (xs.length >= 2 && checkIns.size >= 3) patternRows.push({ title: `${client} is behind on ${countLower(xs.length)} ${bills}`, says: `Said in ${checkIns.size} check-ins. ${xs.map(({ r }) => Cap(aBill(r))).join(', ')}.`, tag: 'One client' });
  }
  const waiting = unpaid.filter(({ group }) => group === 'on-event' || group === 'not-raised');
  const waitingIn = new Set(waiting.flatMap(({ r }) => r.saidIn));
  if (!loans && waiting.length && waitingIn.size >= 3) {
    patternRows.push({
      title: `${Cap(bills)} wait for events in the matter`,
      says: `${count(waiting.length)} ${waiting.length === 1 ? bill : bills} ${waiting.length === 1 ? 'waits' : 'wait'} for something to happen before ${waiting.length === 1 ? 'it falls' : 'they fall'} due or ${waiting.length === 1 ? 'is' : 'are'} raised, said in ${waitingIn.size} check-ins.`,
      tag: 'How we bill',
    });
  }
  const inTheWayRows = unpaid.filter(({ r }) => field(r, F.inTheWay));
  const byWords = new Map<string, typeof rows>();
  for (const x of inTheWayRows) {
    const k = field(x.r, F.inTheWay).toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
    byWords.set(k, [...(byWords.get(k) ?? []), x]);
  }
  for (const [, xs] of byWords) {
    const checkIns = new Set(xs.flatMap(({ r }) => r.saidIn));
    if (xs.length >= 2 && checkIns.size >= 3) patternRows.push({ title: Cap(stop(field(xs[0].r, F.inTheWay))), says: `${count(xs.length)} ${loans ? 'borrowers say' : `${bills} have`} it, said in ${checkIns.size} check-ins.`, tag: loans ? 'The model' : 'One kind of work' });
  }
  /* RELEASE 3: the raising pattern, named after it has happened more than once, with its instances. */
  if (input.raising?.pattern && reader.runsIt) patternRows.unshift({ title: input.raising.pattern.says, says: input.raising.pattern.instances.join(' '), tag: 'Raised late' } as any);
  const patterns = {
    heading: loans ? 'One person, a place, or the model?' : 'One client, one kind of work, or how we bill?',
    note: 'Patterns named after three check-ins in a row',
    rows: patternRows,
    empty: patternRows.length ? null : 'Nothing has come up in three check-ins in a row yet.',
    /* "Yours to judge" is said to whoever runs it; a borrower or a colleague judges none of it (browser test, 20 October). */
    foot: !reader.runsIt ? null
      : loans
      ? 'Whether each is about one person, a place or the way the loans are set up is yours to judge.'
      : `Whether each is about one client, one kind of work or how you bill is yours to judge.`,
  };

  /* ------------------------------------------------------------ follow-up given, and whether it helped */
  const reached = (stage: string) => rows.filter(({ r }) => theStagesKept(r.fields).some((s) => s.stage === stage) || r.stage === stage);
  const paidAfter = (xs: typeof rows, stage: string) => xs.filter(({ r }) => {
    const kept = theStagesKept(r.fields);
    const at = kept.find((s) => s.stage === stage)?.on;
    const paid = kept.filter((s) => s.stage === 'Paid').slice(-1)[0]?.on;
    return r.stage === 'Paid' && (!at || !paid || paid >= at);
  }).length;
  const followRows: NonNullable<TheCollectionsBoard['followUp']>['rows'] = [];
  const aFollow = (n: number) => (n ? `${count(n)} paid after it.` : 'None paid after it yet.');
  const reminded = reached('Reminded');
  if (reminded.length) followRows.push({ what: loans ? 'A reminder sent' : 'A written reminder sent', howMany: `${count(reminded.length)} ${reminded.length === 1 ? (loans ? 'loan' : bill) : (loans ? 'loans' : bills)}`, whatFollowed: aFollow(paidAfter(reminded, 'Reminded')) });
  const chased = reached('Chased');
  if (chased.length) followRows.push({ what: loans ? 'A call to the borrower' : 'A call to a named person at the client', howMany: `${count(chased.length)} ${chased.length === 1 ? (loans ? 'loan' : bill) : (loans ? 'loans' : bills)}`, whatFollowed: aFollow(paidAfter(chased, 'Chased')) });
  const promises = rows.flatMap(({ r }) => thePromisesKept(r.fields).map((p) => ({ r, ...p })));
  if (promises.length) {
    const kept = promises.filter(({ r, by }) => { const d = thePaidDay(r, zone); return !!d && d <= by; }).length;
    const missed = promises.filter(({ r, by }) => { const d = thePaidDay(r, zone); return by < today && (!d || d > by); }).length;
    followRows.push({ what: loans ? 'A day promised to pay by' : 'A date the client promised to pay by', howMany: `${count(promises.length)} ${promises.length === 1 ? 'promise' : 'promises'}`, whatFollowed: !kept && !missed ? 'None has fallen due yet.' : !missed ? (kept === 1 ? 'It was kept.' : `All ${countLower(kept)} were kept.`) : !kept ? (missed === 1 ? 'It was missed.' : `All ${countLower(missed)} were missed.`) : `${count(kept)} kept, and ${countLower(missed)} missed.` });
  }
  const followUp = {
    heading: loans ? 'Support given, and whether it helped' : 'Follow-up given, and whether it helped',
    rows: followRows,
    empty: followRows.length ? null : 'No follow-up is on record yet.',
  };

  /* ------------------------------------------------------------ what the systems show */
  const systems = {
    heading: 'What the systems show',
    says: loans
      ? 'Nothing is connected yet. When the repayment system is connected, what it shows will be here, beside what borrowers said.'
      : 'Nothing is connected yet. When your accounting system or your bank is connected, what it shows will be here, beside what people said.',
  };

  /* ------------------------------------------------------------ where this is heading, for whoever runs it */
  let heading: TheCollectionsBoard['heading'] = null;
  if (reader.runsIt) {
    const late = rows.filter(({ group }) => group === 'behind-in-touch' || group === 'not-heard');
    const disputed = rows.filter(({ group }) => group === 'blocked');
    const raise = rows.filter(({ group }) => group === 'not-raised');
    const outcomes: { says: string; more: string }[] = [];
    if (late.length) outcomes.push({ says: loans ? 'Follow up the borrowers behind' : `Follow up the ${bills} behind`, more: `${nOf(late.length)}${sum(late) ? `, ${money(sum(late), currency)}` : ''}.` });
    if (disputed.length) outcomes.push({ says: loans ? 'Sort out what stops the repayments' : `Settle the disputed ${disputed.length === 1 ? bill : bills}`, more: `${nOf(disputed.length)}${sum(disputed) ? `, ${money(sum(disputed), currency)}` : ''}.` });
    if (raise.length) outcomes.push({ says: `Raise the ${raise.length === 1 ? bill : bills} not yet raised`, more: `${nOf(raise.length)}, in your own system. Groundwork never raises one.` });
    if (saidOnly.length) outcomes.push({ says: 'Ask for proof of what is said to be paid', more: `${nOf(saidOnly.length)}${sum(saidOnly) ? `, ${money(sum(saidOnly), currency)}` : ''}.` });
    const signals: NonNullable<TheCollectionsBoard['heading']>['signals'] = [];
    if (dueRows.length) signals.push({ says: `${bar?.proven ?? 0}% of what’s due is paid with proof`, from: 'From the slips and messages filed on each one', tone: 'watch' });
    const missed = rows.filter(({ r }) => theOpenPromise(r, today)?.missed).length;
    if (missed) signals.push({ says: `${count(missed)} ${missed === 1 ? 'promise' : 'promises'} to pay missed`, from: 'From what people said in their check-ins', tone: 'concern' });
    const silent = rows.filter(({ group }) => group === 'not-heard').length;
    if (silent) signals.push({ says: loans ? `${nOf(silent)} not heard from for ${NOT_HEARD_DAYS / 7} weeks` : `${count(silent)} ${silent === 1 ? 'client' : 'clients'} not heard from for ${NOT_HEARD_DAYS / 7} weeks`, from: loans ? 'No check-ins, no repayments' : 'From what people said in their check-ins', tone: 'concern' });
    heading = {
      heading: 'Where this is heading',
      outcomes,
      outcomesSays: outcomes.length ? null : 'Nothing is behind, disputed or waiting to be raised, so there is nothing to decide yet.',
      signals,
      signalsSays: signals.length ? null : 'No signal is on record yet.',
      whatWouldSettleIt: loans
        ? 'A check-in from each borrower behind or not heard from, and a repayment record for each repayment said.'
        : `A date from each client behind, and a slip, a message or the accounting system’s record for each payment said.`,
      whoDecides: 'You decide.',
    };
  }

  /*
   * A BORROWER IS NOT SERVED THE LEAD'S TWO SECTIONS (browser test, 21 October, finding 10; Hafsah's answer of 21 October). "Support
   * given, and whether it helped" counts the reminders and calls made to the cohort, and "What the systems show" is the repayment system
   * beside what borrowers said: both are about the whole cohort and the lead's own follow-up, and the prototype pictures them on the
   * lead's loans board only. They are left off what is served to a borrower, not hidden on the screen; whoever runs it still reads both.
   */
  const aBorrower = loans && !reader.runsIt;
  return { type, billWord: bill, question, answer, answerFrom, bar, needsYou, stand, every, patterns, followUp: aBorrower ? null : followUp, systems: aBorrower ? null : systems, heading, ...(input.raising ? { raisingInvoices: true as const } : {}) };
}
