import { theWordsNameTheDeal } from './a-deals-proof-is-about-that-deal';
import { aLineNamesTheCustomer } from './one-deal-per-customer';
import { theUnitsTheyGave } from '../conversation/their-own-deals-and-what-is-on-file';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { dedupeDependencies } from './reads';
import { aWaitSomebodyElseChases } from './a-wait-somebody-else-chases';
import { notABlockerTheyRaised } from './not-a-blocker-they-raised';
import { whatTheyTriedFirst } from './what-they-tried-first';
import { intoSentences } from '../conversation/nothing-invented-reaches-them';
import { saidWhatTheyTried } from '../grounds/a-wait-is-the-speakers-account';

/**
 * A RECORD FOR EACH PERSON, KEPT FROM THE RECORD (Groundwork does the managing, part 1; Hafsah, 21 October 2026: "The lead relies on
 * Groundwork to manage his team. Groundwork does the managing inside the existing check-ins and reports.").
 *
 * For one person in one check-in, from what the record already holds, and nothing else:
 *  - SAID AND PROVED. Each time they said something was sold, paid or signed, and whether anything on file shows it: the line's own
 *    document or typed reference (how-a-line-is-known), a payment record or signed order on the deal (theDealsOnRecord, the board's
 *    rows), proof filed on the item (ItemEvidence), or an M-Pesa code they typed for it (#388: a code in words counts). A claim they
 *    took back later in their own words is kept, with the words that took it back, and is not counted as only said.
 *  - PROMISES. Each promise they made, read by the day it was due (a day said is read on the day it was said), as kept on time, kept
 *    late, not done, past its day with nothing said, or still open. A promise the record says is done is kept (a-promise-said-done-is-kept).
 *    A promise with no day is never late.
 *  - CLAIMS THAT CHANGED. A figure they gave for one customer that changed from one day to another (#389's figures per customer), and a
 *    payment or sale they said and then took back. A figure they put right themselves is kept as put right, never as a change.
 *  - FOCUS, on a sales check-in. Which of their open deals the record shows can buy (the deal's own need, decision maker or a quote
 *    accepted) and which cannot buy now (the deal's own facts: no budget, waiting until later, or the customer said no), and the
 *    check-ins they talked about each in, after that fact was on record.
 *  - OWNERSHIP. Each blocker they raised, and whether they said what they had tried first (the same reading as My work).
 *  - CHECK-IN QUALITY. Each check-in that was due: answered, on time, and specific (the same reading as My work).
 * Every entry carries its evidence: their own words, the day, the session and the ids behind it. Nothing is a score and nothing is a
 * label on the person: the words say what happened, and the coaching says what would change it.
 *
 * PURE. The caller reads the rows (the-persons-record-store.ts); this only reads what it is given, so the same input always gives the
 * same record.
 */

export type AMark = 'proven' | 'confirmed' | 'said' | 'memory';

export interface ALineOfTheirs {
  id: string;
  checkInId: string | null;
  sessionNumber: number | null;
  type: string;
  /** As kept, with any bracketed insertion, for telling which customer a line names. */
  text: string;
  createdAt: Date | string;
  mark: AMark;
  anchoredDocumentId?: string | null;
}

export interface AnItemOfTheirs {
  id: string;
  name: string;
  /** Whose it is. A claim may name anybody's item (Aisha follows up Njeri's fee notes); figures and focus read only their own. */
  ownerParticipantId?: string | null;
  stage: string | null;
  dropped?: boolean;
  paid?: boolean;
  signed?: boolean;
  proven?: boolean;
  /** The M-Pesa code that is its payment record, where it is one (theMPesaCodeFor). */
  mpesaCode?: string | null;
  fields?: Record<string, string> | null;
  /** Proof filed on the item, each with what it was read as. */
  evidence?: { id: string; readAs: string; countsAsProof: boolean }[];
  /** Other names the item answers to: a fee note's client ("Baraka Hardware" for FN-006). */
  alsoCalled?: string[];
}

export interface ACommitmentOfTheirs {
  id: string;
  text: string;
  whenSaid?: string | null;
  status?: string | null;
  explicit?: boolean | null;
  createdAt: Date | string;
  settledAt?: Date | string | null;
}

export interface ABlockerOfTheirs {
  id: string;
  what: string;
  triedSaid?: string | null;
  status?: string | null;
  createdAt: Date | string;
  onParticipantId?: string | null;
  fromParticipantId?: string;
}

export interface ACheckInOfTheirs {
  id: string;
  sessionNumber: number;
  status: string;
  availableFrom?: Date | string | null;
  createdAt?: Date | string | null;
  completedAt?: Date | string | null;
  specificityLevel?: string | null;
  specificityDimensions?: unknown;
  /** How many answers they gave in it, where it was read. A session closed with none from them was not a check-in they did. */
  _count?: { turns?: number } | null;
}

export interface AnMPesaCodeOfTheirs { code: string; sale: string; at: Date | string }
export interface OneOfOurTurns { content: string; at: Date | string; checkInId?: string | null }

export interface ThePersonsInputs {
  participantId: string;
  now: Date;
  zone: string;
  /** A sales check-in: the deals' figures and focus are read. */
  sales: boolean;
  checkIns: ACheckInOfTheirs[];
  lines: ALineOfTheirs[];
  items: AnItemOfTheirs[];
  commitments: ACommitmentOfTheirs[];
  /** The open promises the record says are done, with the moment it was said (a-promise-said-done-is-kept). */
  saidDone: Record<string, Date | string>;
  blockers: ABlockerOfTheirs[];
  /** What colleagues here chase or promise themselves, to tell which of this person's waits are somebody else's to chase. */
  othersChase?: string[];
  codes: AnMPesaCodeOfTheirs[];
  /** Groundwork's own turns in this person's check-ins, to tell what was asked for already. */
  ourTurns: OneOfOurTurns[];
  /** Their own turns, to tell when in the check-in they said a thing: a line is kept after the check-in ends. */
  theirTurns?: OneOfOurTurns[];
  /** The check-in opens a session each working day (cadence DAILY), on these days: a session left open is missed on each of them. */
  daily?: { workingDays?: number[] | null } | null;
  /** Everybody's names in this check-in, first and last, to tell a wait on people here ("Kevin, Mercy, Joseph, and Peter"). */
  namesHere?: string[][];
  /** This person runs the check-in. */
  runsIt?: boolean;
}

/* ------------------------------------------------------------------------------------------------ the entries */

export type AProofKind = 'a document they added' | 'a reference they typed' | 'a colleague confirmed it' | 'a payment record' | 'a signed order' | 'proof filed on it' | 'an M-Pesa code' | 'nothing';

export interface AClaim {
  lineId: string;
  sessionNumber: number | null;
  at: string;
  on: string;
  /** Their own words, as people read them. */
  said: string;
  /** The customer or item it is about, where one is named. */
  about: string | null;
  /** The other names that item answers to ("Baraka Hardware" for FN-006). */
  aboutAlso?: string[];
  kind: 'payment' | 'sale';
  proven: boolean;
  proof: AProofKind;
  /** What shows it, in the words a person reads: "The M-Pesa code RCD8M1LS4W", "A payment record". Null where nothing does. */
  proofSays: string | null;
  proofIds: string[];
  /** Their own later words that took it back, with the day. */
  takenBack: { said: string; on: string; at: string; lineId: string } | null;
  /** Whether Groundwork asked them for what would show it, after they said it. */
  askedForProof: boolean;
}

export type APromiseOutcome = 'kept on time' | 'kept late' | 'not done' | 'late' | 'open';

export interface APromise {
  commitmentId: string;
  /** The session it was made in. */
  sessionNumber: number | null;
  said: string;
  madeOn: string;
  madeAt: string;
  /** The day it was due, where a day was said, and null where none was. */
  dueOn: string | null;
  dueAt: string | null;
  outcome: APromiseOutcome;
  keptOn: string | null;
}

export interface AChange {
  about: string;
  /** "units" for a figure, "taken back" for a payment or sale they said and then took back. */
  what: 'units' | 'taken back';
  from: string;
  to: string;
  fromOn: string;
  toOn: string;
  toAt: string;
  putRight: boolean;
  /** Their own sentence saying why the figure changed ("she's expanding"), where they said why: a change they said themselves (item 8). */
  reason?: string | null;
  lineIds: string[];
  askedAbout: boolean;
}

export interface AFocus {
  deal: string;
  canBuy: 'yes' | 'not now' | 'not known';
  /** The fact on record that says so. */
  because: string | null;
  becauseOn: string | null;
  /** The sessions they talked about it in, after the fact was on record where there is one. */
  sessions: number[];
}

export interface ABlocker {
  dependencyId: string;
  sessionNumber: number | null;
  what: string;
  on: string;
  triedFirst: boolean;
  tried: string | null;
  /** The day they said what they tried, from the line it is in, where that is another day than the blocker (final check, item 18). */
  triedOn?: string | null;
  cleared: boolean;
}

export interface ACheckInRead {
  checkInId: string;
  sessionNumber: number;
  on: string | null;
  done: boolean;
  onTime: boolean;
  specific: boolean;
}

export interface ThePersonsRecord {
  claims: AClaim[];
  promises: APromise[];
  changes: AChange[];
  focus: AFocus[];
  blockers: ABlocker[];
  checkIns: ACheckInRead[];
  summary: TheSummary;
}

export interface TheSummary {
  claims: number;
  proven: number;
  takenBack: number;
  /** Claims only said, not taken back. */
  onlySaid: number;
  promisesDue: number;
  keptOnTime: number;
  keptLate: number;
  notDone: number;
  late: number;
  changed: number;
  putRight: number;
  dealsThatCanBuy: number;
  dealsThatCannotBuyNow: number;
  blockersRaised: number;
  blockersTriedFirst: number;
  checkInsDue: number;
  checkInsDone: number;
  checkInsOnTime: number;
  checkInsSpecific: number;
}

/* ------------------------------------------------------------------------------------------------ reading words */

const DAY = 86_400_000;
const t = (d: Date | string) => new Date(d).getTime();
const iso = (d: Date | string) => new Date(d).toISOString();
const dayIn = (d: Date | string, zone: string) => whenItWas(d, 'weekdayAndDay', zone);
const stop = (s: string) => { const x = String(s ?? '').trim(); return /[.!?”"]$/.test(x) ? x : `${x}.`; };
/** Their words as people read them: no bracketed insertion, no [INFERRED: ...]. */
export const asTheySaidIt = (raw: string) => stop(cleanText(String(raw ?? '').replace(/\[INFERRED:[^\]]*\]/g, '')).replace(/\s+([.,!?])/g, '$1'));

/* Something said to be sold, paid or signed, in the past or now, and not a plan, a hope or a "not yet". */
/* A payment, also as a fee notes team says it: "I have recorded KES 250,000 for FN-004" (Njeri, who keeps the bank record) and "Jamii said
   they've cleared our fee note" (Aisha, in the litigation check-in) (final real-model check, items 4 and 7). */
/* "went through" is a payment only where it is the money that went through: "how quickly everything went through" is not (item 10). */
const A_PAYMENT = /\b(?:paid|(?:payment|money|transfer|it|m-?pesa|the funds|funds|deposit)\s+(?:has\s+|have\s+)?(?:went|came|gone|come) through|is sorted|it['’]s sorted|deposit|(?:is|are|was|were) in the bank|cleared (?:our|the|their|its|his|her|that|this) (?:fee notes?|invoices?|bills?|balance|loan)|recorded (?:a payment|the payment|(?:KES|KSh|Ksh|USD|NGN|₦|\$)\s?[\d,]+))/i;
const A_SALE = /\b(?:sold|bought|signed|closed|won)\b/i;
const NOT_A_CLAIM = /\b(?:will|won['’]t|wont|going to|to be|expect|expects|expecting|if|once|hasn['’]t|haven['’]t|has not|have not|did not|didn['’]t|not|no|never|yet|nothing|nobody|no one|none|neither|nor|need|needs|waiting|until|hope|plan|planning|might|could|should|would|soon)\b|['’]ll\b|n['’]t\b/i;
/* Their own later words that it did not happen: "hasn't actually come through yet", "I was mistaken", "hasn't actually paid yet". */
const TAKEN_BACK = /\b(?:was mistaken|i was wrong|not actually|hasn['’]t actually|haven['’]t actually|has not actually|didn['’]t actually|did not actually|hasn['’]t (?:come through|paid|signed)|has not (?:come through|paid|signed)|not (?:paid|signed) yet|still choosing|fell through|pulled out|backed out|cancelled)\b/i;

/** Whether one sentence of theirs says something was sold, paid or signed, and which. */
export function aClaimIn(sentence: string): 'payment' | 'sale' | null {
  const s = String(sentence ?? '');
  if (NOT_A_CLAIM.test(s.replace(/\[[^\]]*\]/g, ' '))) return null;
  if (A_PAYMENT.test(s)) return 'payment';
  if (A_SALE.test(s)) return 'sale';
  return null;
}

/**
 * Whether a sentence names this customer or item: a fee note's number as written ("FN-006"), the name in full with or without a
 * possessive ("Baraka Hardware's payment"), or the name as the board reads a customer named short (aLineNamesTheCustomer).
 */
export function aSentenceNames(sentence: string, name: string): boolean {
  const n = String(name ?? '').trim();
  if (n.length < 2) return false;
  if (new RegExp(`(?:^|[^A-Za-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:['’]s)?(?![A-Za-z0-9])`, 'i').test(String(sentence ?? ''))) return true;
  return !/^[A-Z]{1,4}-\d+$/.test(n) && aLineNamesTheCustomer(sentence, n);
}

const theNamesOf = (i: AnItemOfTheirs) => [i.name, ...(i.alsoCalled ?? [])].filter((n) => String(n ?? '').trim().length >= 2);
/** The item a sentence names, where it names one of theirs. A fee note's number ("FN-006") is matched as written. */
export function theItemNamed(sentence: string, items: readonly AnItemOfTheirs[]): AnItemOfTheirs | null {
  for (const i of items) {
    for (const n of theNamesOf(i)) {
      if (aSentenceNames(sentence, n)) return i;
    }
  }
  return null;
}

/* Our sentence that asks for what would show something: a slip, a statement, a screenshot, the signed order, or "what shows it". */
const ASKS_FOR_PROOF = /\b(?:slip|receipt|statement|screenshot|screen shot|proof|signed order|signed purchase order|document|photo|m-?pesa (?:message|code|confirmation)|confirmation|what (?:would )?shows? it|show it|shows that|evidence)\b/i;
/* Our sentence that puts a changed figure to them. */
const ASKS_ABOUT_A_CHANGE = /\b(?:which is it|is it (?:now )?\d+|earlier you said|last (?:time|week) you said|you said .* and (?:today|now)|from \d+ to \d+|\d+ (?:units )?or \d+)\b/i;

function weAskedAfter(at: Date | string, about: string[], ours: readonly OneOfOurTurns[], test: RegExp): boolean {
  const after = t(at);
  return ours.some((o) => t(o.at) > after && intoSentences(String(o.content ?? '')).some((s) => {
    if (!/\?/.test(s) && !/\b(?:send|add|share|forward|upload|attach)\b/i.test(s)) return false;
    if (!test.test(s)) return false;
    return about.length === 0 || about.some((n) => aSentenceNames(s, n));
  }));
}

/* ------------------------------------------------------------------------------------------------ check-ins, as My work reads them */

/** A check-in that was due by now: finished, or open for more than a day. */
export function aCheckInWasDue(c: ACheckInOfTheirs, now: Date): boolean {
  if (c.status === 'COMPLETED') return true;
  const opened = c.availableFrom ?? c.createdAt ?? null;
  return !!opened && t(opened) + DAY <= now.getTime();
}
/**
 * THE WORKING DAYS A DAILY SESSION STAYED OPEN AND UNANSWERED, after the day it opened and before today (final real-model check, item 5).
 * A daily check-in opens no new session until the open one is answered, so Peter, who answered on Monday and never again, had one open
 * session on record and read "did one of two check-ins" on Friday. Each of those days is a check-in he did not do. Empty for any session
 * answered, and for any check-in that does not open each working day.
 */
export function theDaysAnOpenDailySessionWasMissed(c: ACheckInOfTheirs, now: Date, zone: string, daily: { workingDays?: number[] | null } | null | undefined, throughToday = false): string[] {
  if (!daily || c.status === 'COMPLETED') return [];
  const opened = c.availableFrom ?? c.createdAt ?? null;
  if (!opened) return [];
  const key = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const works = (daily.workingDays ?? []).length ? new Set(daily.workingDays) : new Set([1, 2, 3, 4, 5]);
  const today = key(now);
  const out: string[] = [];
  let k = key(new Date(opened));
  for (let n = 0; n < 400; n++) {
    k = new Date(new Date(`${k}T12:00:00Z`).getTime() + DAY).toISOString().slice(0, 10);
    if (throughToday ? k > today : k >= today) break;
    if (works.has(new Date(`${k}T12:00:00Z`).getUTCDay())) out.push(k);
  }
  return out;
}

/*
 * A PROMISE THEY SAID IS STILL NOT DONE (final real-model check, item 18). Mercy promised on Monday "I need to call Mrs. Achola today", and
 * on Wednesday said "Still haven't called Greenfield, I know, I know." Her record said the promise was "past its day, with nothing said
 * about it yet". A sentence of theirs, said after the promise was made, that says they have not done it, about the same thing (a word of
 * the promise's own, such as "call", or the same customer), is them saying it was not done.
 */
const NOT_DONE_YET = /\b(?:still\s+)?(?:haven['’]?t|hasn['’]?t|have not|has not|didn['’]?t|did not|never)\b|\bnot yet\b/i;
const PROMISE_ORDINARY = new Set(['need', 'needs', 'will', 'shall', 'today', 'tomorrow', 'this', 'that', 'with', 'them', 'they', 'their', 'there', 'about', 'from', 'week', 'morning', 'afternoon', 'evening', 'first', 'thing', 'follow', 'units', 'unit', 'also', 'still', 'know', 'just', 'going', 'make', 'sure', 'again', 'back', 'next']);
const promiseWords = (x: string) => new Set(String(x ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]+/g, ' ').split(/\s+/)
  .map((w) => w.replace(/'s$/, '').replace(/(?:ed|ing|s)$/, '')).filter((w) => w.length >= 4 && !PROMISE_ORDINARY.has(w)));
export function theySaidItIsNotDone(c: { text: string; createdAt: Date | string }, due: Date, theirTurns: readonly OneOfOurTurns[], items: readonly AnItemOfTheirs[]): boolean {
  const mine = promiseWords(c.text);
  const itsItem = theItemNamed(c.text, items);
  for (const turn of theirTurns) {
    if (t(turn.at) <= t(c.createdAt)) continue;
    for (const sentence of intoSentences(String(turn.content ?? ''))) {
      if (!NOT_DONE_YET.test(sentence)) continue;
      const sameItem = !!itsItem && theItemNamed(sentence, items)?.id === itsItem.id;
      if (sameItem || [...promiseWords(sentence)].some((w) => mine.has(w))) return true;
    }
  }
  return false;
}

/** Done within a day of opening. */
export function aCheckInWasOnTime(c: ACheckInOfTheirs): boolean {
  if (c.status !== 'COMPLETED' || !c.completedAt) return false;
  const opened = c.availableFrom ?? c.createdAt ?? null;
  if (!opened) return true;
  return t(c.completedAt) - t(opened) <= DAY;
}
/** Specific by the board's own rule: its own read says so, or at least one thing in it could be checked. */
export function aCheckInWasSpecific(c: ACheckInOfTheirs): boolean {
  return c.specificityLevel === 'specific' || (c.specificityDimensions as any)?.checkable === 'specific';
}

/* ------------------------------------------------------------------------------------------------ focus */

const NOT_NOW = /\b(?:no budget|can['’]?t afford|cannot afford|not affordable|wants? to wait|wait(?:s|ing)? until|not until|until (?:january|february|march|april|may|june|july|august|september|october|november|december|next (?:year|month|quarter))|said no|is a no-go|no-go|not interested|already buy from)\b/i;

function whatSaysItCannotBuyNow(d: AnItemOfTheirs, lines: readonly ALineOfTheirs[]): { because: string; at: string } | null {
  const budget = String(d.fields?.['Budget stated'] ?? '').trim();
  if (budget && NOT_NOW.test(budget)) {
    const said = lines.find((l) => aLineNamesTheCustomer(l.text, d.name) && NOT_NOW.test(l.text));
    return { because: asTheySaidIt(said?.text ?? `${d.name} has ${budget}`), at: iso(said?.createdAt ?? new Date(0)) };
  }
  const said = [...lines].sort((a, b) => t(a.createdAt) - t(b.createdAt)).find((l) => aLineNamesTheCustomer(l.text, d.name) && NOT_NOW.test(l.text));
  return said ? { because: asTheySaidIt(said.text), at: iso(said.createdAt) } : null;
}
function itCanBuy(d: AnItemOfTheirs): boolean {
  const f = d.fields ?? {};
  const need = String(f['Need'] ?? f['Units'] ?? '').trim();
  const decides = String(f['Decision maker'] ?? '').trim();
  return !!need && (!!decides || !!String(f['Quote accepted'] ?? '').trim() || !!String(f['Budget stated'] ?? '').trim());
}

/* ------------------------------------------------------------------------------------------------ the record */

export function thePersonsRecord(input: ThePersonsInputs): ThePersonsRecord {
  const { zone, now } = input;
  const lines = [...input.lines].sort((a, b) => t(a.createdAt) - t(b.createdAt));
  const items = input.items;
  const sessionOf = new Map(input.checkIns.map((c) => [c.id, c.sessionNumber]));
  /* The session a moment falls in: the last of their check-ins opened by then. */
  const opened = input.checkIns
    .map((c) => ({ n: c.sessionNumber, at: t((c.availableFrom ?? c.createdAt ?? c.completedAt ?? 0) as any) }))
    .sort((a, b) => a.at - b.at);
  const sessionAt = (d: Date | string): number | null => {
    const x = t(d);
    let n: number | null = null;
    for (const o of opened) if (o.at <= x) n = o.n;
    return n;
  };

  /*
   * WHEN THEY SAID IT, IN THE CHECK-IN. A line is kept when the check-in ends, after anything asked about it in that check-in, so what was
   * asked is read from the first of their own turns in that check-in that names the same thing (Kevin said "Roysambu Gym signed the order
   * for 3 units today!" at 11:01:30, was asked for the signed order at 11:01:31, and the line was kept at 11:02:43).
   */
  const words = (x: string) => String(x ?? '').toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3);
  const whenTheySaidIt = (l: ALineOfTheirs, names: string[]): Date | string => {
    const inIt = (input.theirTurns ?? []).filter((x) => x.checkInId && x.checkInId === l.checkInId).sort((a, b) => t(a.at) - t(b.at));
    const hit = inIt.find((x) => (names.length
      ? names.some((n) => aSentenceNames(x.content, n))
      : (() => { const w = words(l.text); const said = new Set(words(x.content)); return w.length > 0 && w.filter((y) => said.has(y)).length >= Math.min(3, w.length); })()));
    return hit ? hit.at : l.createdAt;
  };

  /* SAID AND PROVED */
  const claims: AClaim[] = [];
  for (const l of lines) {
    if (String(l.type).toUpperCase() !== 'PROGRESS') continue;
    const sentences = intoSentences(String(l.text ?? '').replace(/\b(Mr|Mrs|Ms|Dr|Prof|St)\./g, '$1\u2024')).map((s) => s.replace(/\u2024/g, '.').trim()).filter(Boolean);
    const kind = sentences.map(aClaimIn).find(Boolean) ?? null;
    if (!kind) continue;
    /* A sale is a sales team's: "the client sent the signed affidavit" is not something Brian sold or signed (final check, item 6). */
    if (kind === 'sale' && !input.sales) continue;
    const item = theItemNamed(l.text, items);
    const code = input.codes.find((c) => (l.text.includes(c.code)) || (item && theNamesOf(item).some((n) => aSentenceNames(c.sale, n))));
    let proof: AProofKind = 'nothing';
    let proofSays: string | null = null;
    const proofIds: string[] = [];
    const typedCode = /\b(?=[A-Z0-9]{10}\b)(?=[A-Z0-9]*\d)(?=(?:[0-9]*[A-Z]){2})[A-Z0-9]{10}\b/.exec(l.text)?.[0] ?? null;
    if (l.mark === 'proven') {
      if (l.anchoredDocumentId) { proof = 'a document they added'; proofSays = 'A document you added'; proofIds.push(l.anchoredDocumentId); }
      else if (typedCode) { proof = 'an M-Pesa code'; proofSays = `The M-Pesa code ${typedCode}`; }
      else { proof = 'a reference they typed'; proofSays = 'A reference you typed'; }
    } else if (l.mark === 'confirmed') {
      proof = 'a colleague confirmed it'; proofSays = 'A colleague confirmed it';
    } else if (item && (item.paid || (kind === 'sale' && item.signed))) {
      /*
       * A code given in words is said as the M-Pesa code (Hafsah, 19 October), on the sale it pays for as well (polish round 15, U14): the
       * code they gave for this deal nearest the day they said it, so Savannah Cafe's balance reads SGL9W4MN7T and its deposit RBT7Y3KQ2P.
       */
      const near = item.paid && item.mpesaCode
        ? input.codes.filter((c) => theWordsNameTheDeal(c.sale, { name: item.name, fields: item.fields ?? null })).sort((a, b) => Math.abs(t(a.at) - t(l.createdAt)) - Math.abs(t(b.at) - t(l.createdAt)))[0]?.code ?? item.mpesaCode
        : null;
      proof = item.paid ? (near ? 'an M-Pesa code' : 'a payment record') : 'a signed order';
      proofSays = item.paid ? (near ? `The M-Pesa code ${near}` : 'A payment record') : 'A signed order';
      proofIds.push(item.id);
    } else if (item && (item.evidence ?? []).some((e) => e.countsAsProof && (kind === 'sale' || /payment/i.test(e.readAs)))) {
      const e = (item.evidence ?? []).find((x) => x.countsAsProof && (kind === 'sale' || /payment/i.test(x.readAs)))!;
      proof = 'proof filed on it'; proofSays = e.readAs; proofIds.push(e.id);
    } else if (typedCode && kind === 'sale' || typedCode && kind === 'payment') {
      /* The code typed in the same line as the sale is what shows it (polish round 2: Joseph's Juja Hardware line carried TGH5K2M9QX, and read "Nothing on file shows it"). */
      proof = 'an M-Pesa code'; proofSays = `The M-Pesa code ${typedCode}`;
    } else if (code && t(code.at) <= t(l.createdAt) + 2 * DAY) {
      proof = 'an M-Pesa code'; proofSays = `The M-Pesa code ${code.code}`;
    } else if (kind === 'sale' || kind === 'payment') {
      /*
       * THE CODE THAT ANSWERED THE QUESTION ABOUT THIS SALE (polish round 15, U14). Joseph said "Mr. Mutua bought 2 units yesterday at KES
       * 5,000 each.", was asked "What shows the sale of those two units?", and answered "M-Pesa code TGH5K2M9QX." A code typed later in the
       * same check-in, in answer to a question asking what shows it, shows the last sale they said before it.
       */
      const saidAt = t(whenTheySaidIt(l, []));
      const answered = input.codes.find((c) => {
        const at = t(c.at);
        const turn = (input.theirTurns ?? []).find((x) => x.checkInId === l.checkInId && t(x.at) === at);
        if (!l.checkInId || !turn || at <= saidAt) return false;
        const asked = (input.ourTurns ?? []).filter((x) => x.checkInId === l.checkInId && t(x.at) < at).sort((a, b) => t(b.at) - t(a.at))[0];
        if (!asked || !(ASKS_FOR_PROOF.test(String(asked.content ?? '')) || /\bwhat (?:would )?shows?\b/i.test(String(asked.content ?? '')))) return false;
        /* No other sale of theirs was said between this one and the code. */
        return !lines.some((x) => x !== l && x.checkInId === l.checkInId && String(x.type).toUpperCase() === 'PROGRESS'
          && intoSentences(String(x.text ?? '')).some((s) => !!aClaimIn(s))
          && (() => { const w = t(whenTheySaidIt(x, [])); return w > saidAt && w < at; })());
      });
      if (answered) { proof = 'an M-Pesa code'; proofSays = `The M-Pesa code ${answered.code}`; }
    }
    const proven = proof !== 'nothing';
    const names = item ? theNamesOf(item) : [];
    const back = proven ? null : lines.find((x) => t(x.createdAt) > t(l.createdAt) && TAKEN_BACK.test(x.text) && (item ? names.some((n) => aSentenceNames(x.text, n)) : false));
    claims.push({
      lineId: l.id,
      sessionNumber: l.sessionNumber ?? (l.checkInId ? sessionOf.get(l.checkInId) ?? null : null),
      at: iso(l.createdAt),
      on: dayIn(l.createdAt, zone),
      said: asTheySaidIt(l.text),
      about: item?.name ?? null,
      aboutAlso: item ? theNamesOf(item).filter((n) => n !== item.name) : [],
      kind,
      proven,
      proof,
      proofSays,
      proofIds,
      takenBack: back ? { said: asTheySaidIt(back.text), on: dayIn(back.createdAt, zone), at: iso(back.createdAt), lineId: back.id } : null,
      askedForProof: !proven && weAskedAfter(whenTheySaidIt(l, names), names, input.ourTurns, ASKS_FOR_PROOF),
    });
  }

  /* PROMISES */
  const promises: APromise[] = [];
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  /* The same promise said twice on one day ("I'll follow up with the Kawangware kiosks." beside "I'll follow up with the remaining
     Kawangware kiosks this week") is one promise: the first kept. */
  const wordsOf = (x: string) => new Set(String(x ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(' ').filter((w) => w.length > 3 && !['will', "i'll", 'need', 'also', 'this', 'that', 'with', 'them', 'they', 'today', 'tomorrow', 'week'].includes(w)));
  const seen: { words: Set<string>; day: string }[] = [];
  const saidTwice = (c: ACommitmentOfTheirs) => {
    const w = wordsOf(c.text);
    const day = dayIn(c.createdAt, zone);
    const twice = w.size >= 2 && seen.some((x) => x.day === day && ([...w].every((y) => x.words.has(y)) || [...x.words].every((y) => w.has(y))));
    seen.push({ words: w, day });
    return twice;
  };
  for (const c of input.commitments) {
    if (c.explicit === false || !String(c.text ?? '').trim()) continue;
    if (saidTwice(c)) continue;
    const words = String(c.whenSaid ?? '').trim();
    /* "This afternoon" is the day it was said. */
    const sameDay = /\bthis (?:morning|afternoon|evening)\b/i.test(words) ? new Date(Date.UTC(new Date(c.createdAt).getUTCFullYear(), new Date(c.createdAt).getUTCMonth(), new Date(c.createdAt).getUTCDate())) : null;
    const due = sameDay ?? (words && /\b(?:today|tonight|tomorrow|end of (?:the )?day|eod|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,}|[a-z]{3,}\s+\d{1,2})\b/i.test(words)
      ? theDayTheyMeant(words, new Date(c.createdAt)) : null);
    const dueEnd = due ? due.getTime() + DAY : null;
    const saidDoneAt = input.saidDone[c.id] ? new Date(input.saidDone[c.id]) : null;
    let outcome: APromiseOutcome = 'open';
    let keptAt: Date | null = null;
    if (c.status === 'DONE' || (c.status !== 'NOT_DONE' && saidDoneAt)) {
      keptAt = c.status === 'DONE' && c.settledAt ? new Date(c.settledAt) : saidDoneAt;
      outcome = dueEnd && keptAt && keptAt.getTime() > dueEnd ? 'kept late' : 'kept on time';
    } else if (c.status === 'NOT_DONE') outcome = 'not done';
    /* They said themselves, after it was due, that it is still not done: that is said, not "nothing said about it" (item 18). */
    else if (due && due.getTime() < today && theySaidItIsNotDone(c, due, input.theirTurns ?? [], items)) outcome = 'not done';
    else if (due && due.getTime() < today) outcome = 'late';
    promises.push({
      commitmentId: c.id,
      sessionNumber: sessionAt(c.createdAt),
      said: asTheySaidIt(c.text),
      madeOn: dayIn(c.createdAt, zone),
      madeAt: iso(c.createdAt),
      dueOn: due ? whenItWas(due, 'weekdayAndDay', 'UTC') : null,
      dueAt: due ? due.toISOString() : null,
      outcome,
      keptOn: keptAt ? dayIn(keptAt, zone) : null,
    });
  }

  /* CLAIMS THAT CHANGED */
  const changes: AChange[] = [];
  const theirOwn = items.filter((i) => !i.ownerParticipantId || i.ownerParticipantId === input.participantId);
  if (input.sales) {
    const mine = theirOwn.filter((i) => !i.dropped);
    const names = mine.map((i) => i.name);
    const asLines = lines.map((l) => ({ text: l.text, createdAt: l.createdAt, participantId: input.participantId }));
    for (const d of mine) {
      const said = theUnitsTheyGave(d, asLines, zone, names);
      for (let k = 1; k < said.length; k++) {
        const from = said[k - 1];
        const to = said[k];
        const toLine = lines.find((l) => dayIn(l.createdAt, zone) === to.on && aLineNamesTheCustomer(l.text, d.name));
        const fromLine = lines.find((l) => dayIn(l.createdAt, zone) === from.on && aLineNamesTheCustomer(l.text, d.name));
        /* Where they said why it changed, in the sentence that gives the new figure, the change is theirs and said (item 8). */
        const sentence = toLine ? intoSentences(String(toLine.text ?? '')).find((x) => aLineNamesTheCustomer(x, d.name) && new RegExp(`\\b${to.units}\\b`).test(x)) ?? null : null;
        const reason = !to.putRight && sentence && /\b(?:now|expand\w*|increas\w*|grow\w*|more|went up|upped|bigger|added|because|since)\b/i.test(sentence) ? asTheySaidIt(sentence) : null;
        changes.push({
          about: d.name, what: 'units', from: String(from.units), to: String(to.units), fromOn: from.on, toOn: to.on,
          toAt: iso(toLine?.createdAt ?? now), putRight: to.putRight, reason,
          lineIds: [fromLine?.id, toLine?.id].filter(Boolean) as string[],
          askedAbout: !to.putRight && !!toLine && weAskedAfter(whenTheySaidIt(toLine, [d.name]), [d.name], input.ourTurns, ASKS_ABOUT_A_CHANGE),
        });
      }
    }
  }
  for (const c of claims) {
    if (!c.takenBack || !c.about) continue;
    if (changes.some((x) => x.what === 'taken back' && x.about === c.about && x.toOn === c.takenBack!.on)) continue;
    changes.push({
      about: c.about, what: 'taken back', from: c.said, to: c.takenBack.said, fromOn: c.on, toOn: c.takenBack.on, toAt: c.takenBack.at,
      /* Taken back in their own words is them putting it right. */
      putRight: true, lineIds: [c.lineId, c.takenBack.lineId], askedAbout: true,
    });
  }

  /* FOCUS, on a sales check-in */
  const focus: AFocus[] = [];
  if (input.sales) {
    for (const d of theirOwn.filter((i) => !i.dropped && !/^(?:won|lost)$/i.test(String(i.stage ?? '')))) {
      const notNow = whatSaysItCannotBuyNow(d, lines);
      const after = notNow ? t(notNow.at) : 0;
      const sessions = [...new Set(lines
        .filter((l) => t(l.createdAt) > after && aLineNamesTheCustomer(l.text, d.name))
        .map((l) => l.sessionNumber ?? (l.checkInId ? sessionOf.get(l.checkInId) ?? null : null))
        .filter((n): n is number => typeof n === 'number'))].sort((a, b) => a - b);
      focus.push({
        deal: d.name,
        canBuy: notNow ? 'not now' : itCanBuy(d) ? 'yes' : 'not known',
        because: notNow?.because ?? null,
        becauseOn: notNow ? dayIn(notNow.at, zone) : null,
        sessions,
      });
    }
  }

  /* OWNERSHIP */
  const raised = dedupeDependencies(input.blockers
    .filter((d) => d.onParticipantId !== input.participantId && !aWaitSomebodyElseChases(String(d.what ?? ''), input.othersChase ?? []))
    /* A customer's own budget or approval, asking for a view, or waiting for a check-in is not a blocker they raised (final check, item 2). */
    .filter((d) => !notABlockerTheyRaised(d as any, { sales: input.sales, namesHere: input.namesHere, theLeadOnHerTeam: input.runsIt })) as any[]) as ABlockerOfTheirs[];
  /*
   * DATES AND QUOTES FROM THE SAME LINE (final real-model check, item 18). Two waits said as one keep the fuller words, and those words are
   * dated by the row that holds them, not by the first row ("On Monday 12 October Mercy raised a blocker, waiting for ideas ..." was said
   * on Tuesday). What they said they tried is dated by the turn of theirs that holds those words: Brian's "I did follow up yesterday" was
   * said on Wednesday about a blocker raised on Monday.
   */
  const theRowOfTheWords = (d: ABlockerOfTheirs) => input.blockers
    .filter((x) => x.fromParticipantId === d.fromParticipantId && String(x.what ?? '').trim() === String(d.what ?? '').trim())
    .sort((a, b) => t(a.createdAt) - t(b.createdAt))[0] ?? d;
  const blockers: ABlocker[] = raised.map((d) => {
    const at = theRowOfTheWords(d).createdAt;
    /* What they tried on it, or on their own wait for the same thing, and whether by the day they raised it (what-they-tried-first.ts). */
    const how = whatTheyTriedFirst({ ...d, createdAt: at }, input.blockers as any, (input.theirTurns ?? []).map((x) => ({ content: x.content, at: x.at })), zone);
    const triedOn = how.triedAt ? dayIn(how.triedAt, zone) : null;
    return {
      dependencyId: d.id,
      sessionNumber: sessionAt(at),
      what: asTheySaidIt(d.what),
      on: dayIn(at, zone),
      /* "I haven't done anything about that yet" is not something tried; and something tried after it was raised was not tried first. */
      triedFirst: how.first,
      tried: how.tried,
      triedOn: triedOn && triedOn !== dayIn(at, zone) ? triedOn : null,
      cleared: String(d.status ?? '').toUpperCase() === 'CLEARED',
    };
  });

  /* CHECK-IN QUALITY */
  const checkIns: ACheckInRead[] = input.checkIns
    .filter((c) => aCheckInWasDue(c, now))
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
    .map((c) => ({
      checkInId: c.id,
      sessionNumber: c.sessionNumber,
      on: (c.completedAt ?? c.availableFrom ?? c.createdAt) ? dayIn((c.completedAt ?? c.availableFrom ?? c.createdAt)!, zone) : null,
      /* Closed with no answer from them is not done (polish round 2: Peter read "four of five check-ins, all on time" after answering two). */
      done: c.status === 'COMPLETED' && (c._count?.turns == null || c._count.turns > 0),
      onTime: (c._count?.turns == null || c._count.turns > 0) && aCheckInWasOnTime(c),
      specific: c.status === 'COMPLETED' && aCheckInWasSpecific(c),
    }))
    /* A daily session left open stands for each working day since: each is a check-in not done (item 5). */
    .flatMap((read) => {
      const c = input.checkIns.find((x) => x.id === read.checkInId)!;
      return [read, ...theDaysAnOpenDailySessionWasMissed(c, now, zone, input.daily).map((k) => ({
        ...read, on: whenItWas(new Date(`${k}T12:00:00Z`), 'weekdayAndDay', 'UTC'), done: false, onTime: false, specific: false,
      }))];
    });

  return { claims, promises, changes, focus, blockers, checkIns, summary: theSummaryOf({ claims, promises, changes, focus, blockers, checkIns }) };
}

/** The counts, from the entries. */
export function theSummaryOf(r: Omit<ThePersonsRecord, 'summary'>): TheSummary {
  const { claims, promises, changes, focus, blockers, checkIns } = r;
  /* Every claim counts as said when it was said: one taken back later was still said without anything to show it. */
  const summary: TheSummary = {
    claims: claims.length,
    proven: claims.filter((c) => c.proven).length,
    takenBack: claims.filter((c) => !!c.takenBack).length,
    onlySaid: claims.filter((c) => !c.proven && !c.takenBack).length,
    promisesDue: promises.filter((p) => p.outcome !== 'open').length,
    keptOnTime: promises.filter((p) => p.outcome === 'kept on time').length,
    keptLate: promises.filter((p) => p.outcome === 'kept late').length,
    notDone: promises.filter((p) => p.outcome === 'not done').length,
    late: promises.filter((p) => p.outcome === 'late').length,
    /* A change they said themselves, with why, is not one "with nothing said about why". */
    changed: changes.filter((c) => !c.putRight && !c.reason).length,
    putRight: changes.filter((c) => c.putRight).length,
    dealsThatCanBuy: focus.filter((f) => f.canBuy === 'yes').length,
    dealsThatCannotBuyNow: focus.filter((f) => f.canBuy === 'not now').length,
    blockersRaised: blockers.length,
    blockersTriedFirst: blockers.filter((b) => b.triedFirst).length,
    checkInsDue: checkIns.length,
    checkInsDone: checkIns.filter((c) => c.done).length,
    checkInsOnTime: checkIns.filter((c) => c.onTime).length,
    checkInsSpecific: checkIns.filter((c) => c.specific).length,
  };
  return summary;
}

/**
 * THE PART OF THE RECORD ONE SESSION'S OWN REPORT SHOWS: what they said in it was sold, paid or signed and what shows it, the figures that
 * changed in it, the blockers they raised in it, and their promises that are late now.
 */
export function theRecordForOneSession(r: ThePersonsRecord, sessionNumber: number): ThePersonsRecord {
  const day = r.checkIns.find((c) => c.sessionNumber === sessionNumber)?.on ?? null;
  const part = {
    claims: r.claims.filter((c) => c.sessionNumber === sessionNumber),
    promises: r.promises.filter((p) => p.outcome === 'late'),
    changes: r.changes.filter((c) => !!day && c.toOn === day),
    focus: [] as AFocus[],
    blockers: r.blockers.filter((b) => b.sessionNumber === sessionNumber),
    checkIns: [] as ACheckInRead[],
  };
  return { ...part, summary: theSummaryOf(part) };
}

/* ------------------------------------------------------------------------------------------------ coaching, and whether it worked */

export type AThingToCoach = 'proof' | 'changes' | 'promises' | 'blockers' | 'focus' | 'check-ins';

export interface ACoaching {
  about: AThingToCoach;
  /** The line Groundwork coached them with, in the second person. */
  said: string;
  /** The check-in it was given after, and the day. */
  afterSession: number;
  givenOn: string;
  givenAt: string;
  /** Where that thing stood when it was given: the share that went well, from 0 to 1, and how many it was read from. */
  before: { good: number; of: number };
  /** Read again on each rebuild from the check-ins after it was given. Null until one shows it. */
  since: { good: number; of: number; sessions: number[] } | null;
  outcome: 'better' | 'the same' | 'worse' | null;
  /** True once it got better: the next coaching may then be about something else. */
  done: boolean;
}

/** How that one thing went in the sessions in `which`: the share that went well, and how many it was read from. */
export function howItWent(r: ThePersonsRecord, about: AThingToCoach, which: (session: number | null) => boolean): { good: number; of: number } {
  const share = (good: number, of: number) => ({ good: of ? good / of : 0, of });
  switch (about) {
    case 'proof': {
      const cs = r.claims.filter((c) => which(c.sessionNumber));
      return share(cs.filter((c) => c.proven).length, cs.length);
    }
    case 'changes': {
      const sessions = r.checkIns.filter((c) => c.done && which(c.sessionNumber));
      const bad = new Set(r.changes.filter((c) => !c.putRight).map((c) => c.toOn));
      return share(sessions.filter((s) => !bad.has(s.on ?? '')).length, sessions.length);
    }
    case 'promises': {
      const ps = r.promises.filter((p) => p.outcome !== 'open' && which(p.sessionNumber));
      return share(ps.filter((p) => p.outcome === 'kept on time').length, ps.length);
    }
    case 'blockers': {
      const bs = r.blockers.filter((b) => which(b.sessionNumber));
      return share(bs.filter((b) => b.triedFirst).length, bs.length);
    }
    case 'focus': {
      const sessions = r.checkIns.filter((c) => c.done && which(c.sessionNumber));
      const onNotNow = new Set(r.focus.filter((f) => f.canBuy === 'not now').flatMap((f) => f.sessions));
      return share(sessions.filter((s) => !onNotNow.has(s.sessionNumber)).length, sessions.length);
    }
    case 'check-ins': {
      const cs = r.checkIns.filter((c) => which(c.sessionNumber));
      return share(cs.filter((c) => c.done && c.onTime && c.specific).length, cs.length);
    }
  }
}

/**
 * WHAT NEEDS WORK, the one thing to coach, most important first: what they said and nothing shows, a figure that changed, promises
 * that slipped, blockers raised with nothing tried, time on deals that cannot buy now, and check-ins late or vague. Only where the
 * record holds enough to say so; otherwise nothing. Never more than one at a time.
 */
export function theOneThingToCoach(r: ThePersonsRecord): AThingToCoach | null {
  const s = r.summary;
  if (s.claims >= 2 && s.proven / s.claims < 0.5) return 'proof';
  if (s.changed >= 1) return 'changes';
  /* More of their promises slipped than were kept, over enough of them to say so. */
  const settled = s.keptOnTime + s.keptLate + s.notDone + s.late;
  if (settled >= 4 && s.late + s.notDone > s.keptOnTime + s.keptLate) return 'promises';
  if (s.blockersRaised >= 2 && s.blockersTriedFirst / s.blockersRaised < 0.5) return 'blockers';
  const done = r.checkIns.filter((c) => c.done).length;
  const onNotNow = new Set(r.focus.filter((f) => f.canBuy === 'not now').flatMap((f) => f.sessions)).size;
  if (done >= 3 && onNotNow >= 3 && onNotNow > done / 2) return 'focus';
  /* At least two check-ins that fell short (not done, late or vague), and too few that did not. */
  const short = r.checkIns.filter((c) => !c.done || !c.onTime || !c.specific).length;
  if (s.checkInsDue >= 3 && short >= 2 && (s.checkInsDone / s.checkInsDue < 0.8 || s.checkInsOnTime / s.checkInsDue < 0.7 || (s.checkInsDone ? s.checkInsSpecific / s.checkInsDone : 0) < 0.7)) return 'check-ins';
  return null;
}

/** The coaching line for that one thing, from the behaviour and pattern library's own words, with their own example where there is one. */
export function theCoachingLine(r: ThePersonsRecord, about: AThingToCoach, sales = true): string {
  switch (about) {
    case 'proof': {
      const one = r.claims.filter((c) => !c.proven && !c.takenBack && c.about).pop();
      /* The proof named fits the check-in's kind of work: "the signed order or the payment" is a sale's, never a court filing's (item 6). */
      const proof = one?.kind === 'payment' ? 'the payment slip, the bank statement or the M-Pesa message'
        : sales ? 'the signed order or the payment' : 'the document, the filing receipt or the email that shows it';
      return `Add the photo, slip or link when you say something is done.${one ? ` For ${one.about}, that would be ${proof}.` : ''}`;
    }
    case 'changes': {
      const one = r.changes.filter((c) => !c.putRight).pop();
      return `When a figure changes, say so yourself, with what shows the new one.${one ? ` For ${one.about}, that is ${one.to} units now, not ${one.from}.` : ''}`;
    }
    case 'promises':
      return 'Promise less, and say early when a date will move.';
    case 'blockers':
      return 'Try one thing before you raise a blocker, and say what you tried.';
    case 'focus': {
      const one = r.focus.filter((f) => f.canBuy === 'not now').sort((a, b) => b.sessions.length - a.sessions.length)[0];
      return `Check each piece of work fits the plan before you spend time on it, and let go of what isn’t moving.${one ? ` ${one.deal} cannot buy now, so put that time into a deal that can.` : ''}`;
    }
    case 'check-ins':
      return 'Name the item, what changed and the day, every time.';
  }
}

/**
 * THE COACHING, FOLLOWED UP. Given what was coached before and the record now: each coaching is read again from the check-ins after
 * the one it was given after, as better, the same, or worse than where it stood when it was given. A coaching that got better is done,
 * and the next one may be about something else; one that did not stays the one thing, and nothing new is added beside it.
 */
/**
 * A COACHING THE RECORD NO LONGER HOLDS IS NOT KEPT (final real-model check, item 2). Mercy was coached on "trying something before raising
 * a blocker" from waits that were a school's budget, a school board's approval and her own asks for ideas. Once the record reads those as
 * what they are, nothing in it is left for that coaching to be about, so a coaching not yet done is kept only while the record, up to the
 * check-in it was given after, still holds what it was given for.
 */
export function theCoachingTheRecordStillHolds(before: readonly ACoaching[], r: ThePersonsRecord): ACoaching[] {
  return before.filter((c) => c.done || itNeededWorkThen(r, c.about, c.afterSession));
}

/**
 * Whether the record, read up to that check-in, still holds something of this one thing that went badly: some of it, and fewer than half of
 * it that went well. Aisha was coached on blockers after one wait whose earlier mentions said she had chased it; read again, the one blocker
 * she raised was tried first, so nothing is left for that coaching to be about. One that still went badly is kept, however few.
 */
function itNeededWorkThen(r: ThePersonsRecord, about: AThingToCoach, afterSession: number): boolean {
  const h = howItWent(r, about, (n) => typeof n === 'number' && n <= afterSession);
  return h.of > 0 && h.good < 0.5;
}

export function theCoachingFollowedUp(beforeAsStored: readonly ACoaching[], r: ThePersonsRecord, lastSession: number | null, at: Date, zone: string, sales = true): ACoaching[] {
  const before = theCoachingTheRecordStillHolds(beforeAsStored, r);
  const out: ACoaching[] = before.map((c) => {
    const since = howItWent(r, c.about, (n) => typeof n === 'number' && n > c.afterSession);
    if (!since.of) return { ...c, since: null, outcome: null };
    const sessions = r.checkIns.filter((x) => x.sessionNumber > c.afterSession).map((x) => x.sessionNumber);
    const d = since.good - c.before.good;
    const outcome: ACoaching['outcome'] = d > 0.1 ? 'better' : d < -0.1 ? 'worse' : 'the same';
    return { ...c, since: { ...since, sessions }, outcome, done: c.done || outcome === 'better' };
  });
  const open = out.find((c) => !c.done);
  if (open || lastSession === null) return out;
  const about = theOneThingToCoach(r);
  if (!about) return out;
  /* The same thing coached again only after something else, never twice in a row. */
  if (out.length && out[out.length - 1].about === about && out[out.length - 1].done) return out;
  out.push({
    about,
    said: theCoachingLine(r, about, sales),
    afterSession: lastSession,
    /* The day of the check-in it was given after, not the day the record was built (browser test, 21 October: a record built on
       Wednesday for people who last checked in on Monday read "After Peter's check-in on Wednesday 21 October"). */
    givenOn: [...r.checkIns].reverse().find((x) => x.sessionNumber <= lastSession && x.done && x.on)?.on ?? dayIn(at, zone),
    givenAt: at.toISOString(),
    before: howItWent(r, about, (n) => typeof n === 'number' && n <= lastSession),
    since: null,
    outcome: null,
    done: false,
  });
  return out;
}
