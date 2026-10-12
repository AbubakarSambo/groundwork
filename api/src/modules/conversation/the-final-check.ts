/**
 * THE FINAL CHECK: NOTHING GROUNDWORK WRITES STATES WHAT THE RECORD DOES NOT HOLD (Hafsah, 12 October, after night quality runs 1 and 2).
 *
 *   "A final check compares every reply, report, board line and email against the record and removes any number, status, date, name or
 *    credit the record doesn't hold."
 *
 * What the quality runs found reaching people, with nothing under it:
 *
 *   a number   "Monthly restocking caps you at twelve refills a year across forty shops."   (nobody said twelve or forty; run 1)
 *   a status   "with weekly sales confirmed by M-Pesa messages"                             (no message was shown; run 2)
 *              "eleven ... Won"                                                             (nothing was shown; runs 1 and 2)
 *              "You have finished four check-ins."                                          (Jared had answered two; run 2)
 *              "All 3 check-ins due this week were made."                                   (Amina was still due; run 2)
 *   credit     "2 colleagues said you helped them."                                         (no transcript holds it; runs 1 and 2)
 *
 * ONE ENTRY POINT, RUN LAST, over Groundwork's own words only. It reuses the family and runs it in this order:
 *
 *   1. a colleague's fault stated as fact becomes the speaker's account (a-colleagues-fault-is-the-speakers-account). It runs first, so
 *      blame somebody actually gave stays, as their account with the note, and is never read below as a claim of Groundwork's.
 *   2. a reminder, an escalation, a target, a promise counted as done, a status or count stated as fact (a-claim-the-record-does-not-hold).
 *   3. here, sentence by sentence: a number, a status, a date, a person's name or a credit the record does not hold.
 *
 * A sentence that fails is removed. Where the code knows the record's value (how many check-ins this person answered), the count is put
 * right instead. A question asserts nothing and stays. Anything in quotation marks is what somebody said and is never read or changed.
 * What is removed is logged, where it was removed.
 *
 * WHAT THE RECORD HOLDS IS PASSED IN, as everywhere in the family: a kind of evidence the caller did not give is not checked (`undefined`),
 * so a caller can never cut something it could not look up.
 */

import { setsOneStatementAgainstAnother } from '../reports/a-difference-is-within-one-week';
import { intoSentences } from './nothing-invented-reaches-them';
import {
  withoutAClaimTheRecordDoesNotHold, theRecordHoldsTheTarget, type AClaim, type WhatTheRecordHoldsForClaims,
} from './a-claim-the-record-does-not-hold';
import { withAColleaguesFaultAsTheirAccount, type WhatTheRecordHoldsForBlame } from './a-colleagues-fault-is-the-speakers-account';
import { aQuestionNotYetAsked } from './nobody-is-left-looking-at-a-paragraph';
import { WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT } from './a-record-claim-nobody-holds';
import { PLAIN_PATTERN_NAMES, NEVER_NAMED_TO_A_PERSON } from '../patterns/plain-pattern-names';

export type WhatWasRemoved =
  | AClaim
  | 'blame nobody gave'
  | 'a number the record does not hold'
  | 'a status the record does not hold'
  | 'a date the record does not hold'
  | 'a name not in the check-in'
  | 'credit no transcript holds'
  | 'a label on a person';

export interface WhatTheRecordHolds extends WhatTheRecordHoldsForClaims {
  /** For the colleague's-fault check, which runs first. */
  blame?: WhatTheRecordHoldsForBlame | null;
  /** Every text the record holds for this check-in: its lines, everybody's own words, targets, the lead's setup, documents, and the
   *  engine's own line where a model only reworded it. A number, a date or a name found in one of these stands. */
  texts?: readonly string[];
  /** Numbers the code itself knows for this check-in (how many people, sessions, answers). */
  numbers?: readonly number[];
  /** Each person's own words, by the name they are served under. A credit, or a status said in their own words, stands only on these. */
  theirOwnWords?: readonly { name: string; text: string }[];
  /** The people of this check-in and its organisation, as they are served. */
  people?: readonly string[];
  /** Who is reading, so "you" in a credit is somebody. */
  reader?: string | null;
  /** How many check-ins the reader really answered: a different count of finished check-ins is put right to this. */
  checkInsAnswered?: number | null;
}

export type FinalCheck = { text: string; removed: { sentence: string; why: WhatWasRemoved; to?: string }[] };

/* ---------- Reading a sentence ---------- */

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
const IN_WORDS = ['zero', 'one', ...Object.keys(NUMBER_WORDS).slice(0, 19)];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH = `(?:${MONTHS.map((m) => m[0].toUpperCase() + m.slice(1)).join('|')})`;

/** What somebody said is theirs: blanked before reading, so it is never read and never changed. */
const withoutTheirWords = (s: string) => s.replace(/[“"][^”"]*(?:[”"]|$)/g, (m) => ' '.repeat(m.length));
const asks = (s: string) => /\?\s*$/.test(s.trim());
const valueOf = (t: string): number | null => {
  const w = t.toLowerCase().replace(/[,%]/g, '');
  if (w in NUMBER_WORDS) return NUMBER_WORDS[w];
  const n = Number(w);
  return Number.isFinite(n) ? n : null;
};

/* ---------- A number ---------- */

/** A number in running text: digits (not part of a code like DN-1258), or a number word from two up. "One" is a word, not a count. */
const A_NUMBER = new RegExp(`(?<![\\w-])(\\d[\\d,]*(?:\\.\\d+)?%?|${Object.keys(NUMBER_WORDS).join('|')})(?![\\w-])`, 'gi');
/** A span of time ("in two weeks", "the last 7 days") or a date's day ("12 October") is not a count of anything. */
const A_SPAN_AFTER = /^\s*(?:more\s+|whole\s+|full\s+|working\s+)?(?:minutes?|hours?|days?|weeks?|months?|years?|o'?clock|am|pm)\b/i;
const A_MONTH_AFTER = new RegExp(`^\\s*(?:st|nd|rd|th)?\\s*${MONTH}\\b`);
const A_MONTH_BEFORE = new RegExp(`${MONTH}\\s*$`);
/** "the two of you", "two things": the shape of what is being said, not a count from the record. */
const NOT_A_COUNT_AFTER = /^\s*(?:of\s+(?:you|them|us|these|those)|things?|questions?|points?|parts?|ways?|steps?|options?|sides?|sentences?|words?)\b/i;

function theNumbersStated(sentence: string): number[] {
  const s = withoutTheirWords(sentence);
  const out: number[] = [];
  A_NUMBER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = A_NUMBER.exec(s))) {
    const after = s.slice(m.index + m[0].length);
    const before = s.slice(0, m.index);
    if (/^(?:19|20)\d\d$/.test(m[1])) continue;
    if (A_SPAN_AFTER.test(after) || A_MONTH_AFTER.test(after) || A_MONTH_BEFORE.test(before)) continue;
    const n = valueOf(m[1]);
    if (n === null) continue;
    if (n <= 3 && /^[a-z]/i.test(m[1]) && NOT_A_COUNT_AFTER.test(after)) continue;
    out.push(n);
  }
  return out;
}
function theRecordHoldsTheNumber(n: number, held: WhatTheRecordHolds): boolean {
  if ((held.numbers ?? []).includes(n)) return true;
  /* "1,200" said as "1200" is the same number. */
  const texts = (held.texts ?? []).map((t) => String(t ?? '').replace(/(\d),(\d)/g, '$1$2').replace(/%/g, ' '));
  return theRecordHoldsTheTarget({ n, thing: null }, texts);
}

/* ---------- A status ---------- */

const STATUS = '(?:won|kept|done|confirmed|made|finished|completed)';
/** "the ten kits are done", "the deal has been won", "Promises were kept." Not "is made once people have answered": that says
    when something will be, not that it is (B-009's own sentence was cut by this). */
const STATES_A_STATUS = new RegExp(`\\b(?:is|are|was|were|has\\s+been|have\\s+been)\\s+(?:now\\s+|all\\s+|already\\s+|fully\\s+)?(${STATUS})\\b(?!\\s+(?:up|of|to|from|sure|clear|easier|harder|by\\s+(?:you|them|him|her)\\b|(?:only\\s+)?(?:once|when|after|as\\s+soon\\s+as)\\b))`, 'i');
/** A status set down as a label, the way a deal grid reads: "eleven, Won." */
const A_STATUS_LABEL = /(?:^|[,:;–—-]\s*)(Won|Kept|Done|Confirmed|Made|Finished|Completed)\s*[.!]?\s*$/;
/** "You have finished four check-ins", "Collins has completed 3 sessions". */
const A_COUNT_DONE = new RegExp(`\\b(?:have|has|'ve)\\s+(?:now\\s+|already\\s+)?(?:${STATUS}|sold|signed|closed|delivered)\\s+(?:all\\s+)?(?:the\\s+|your\\s+|their\\s+|his\\s+|her\\s+)?(\\d+|${IN_WORDS.join('|')})\\s+([\\w-]+)`, 'i');
const A_CHECK_IN = /^(?:check-?ins?|sessions?)$/i;

const stem = (w: string) => w.toLowerCase().replace(/[^a-z]/g, '').replace(/ies$/, 'y').replace(/(?:es|s)$/, '');
const LITTLE = new Set(['that', 'this', 'with', 'were', 'have', 'been', 'your', 'their', 'they', 'from', 'what', 'week', 'about', 'there', 'which', 'when', 'will', 'into']);
const contentWords = (s: string) => s.split(/[\s/]+/).map(stem).filter((w) => w.length > 3 && !LITTLE.has(w));

/** A status stands where a backed line holds what it is about, or the person's own words say it with the same word about the same thing. */
function theRecordHoldsTheStatus(sentence: string, status: string, held: WhatTheRecordHolds): boolean {
  const named = contentWords(withoutTheirWords(sentence)).filter((w) => w !== stem(status));
  const holds = (texts: readonly string[], needTheWord: boolean) => texts.some((t) => {
    const words = new Set(contentWords(String(t ?? '')));
    if (needTheWord && !new RegExp(`\\b${status}\\b`, 'i').test(String(t ?? ''))) return false;
    return !named.length || named.some((w) => words.has(w));
  });
  if (held.shownOrConfirmed && holds(held.shownOrConfirmed, false)) return true;
  if (held.theirOwnWords && holds(held.theirOwnWords.map((t) => t.text), true)) return true;
  return false;
}
const statusIsChecked = (held: WhatTheRecordHolds) => held.shownOrConfirmed !== undefined || held.theirOwnWords !== undefined;

/* ---------- A date ---------- */

const A_DATE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH})\\b|\\b(${MONTH})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'g');
function theDatesStated(sentence: string): string[] {
  const s = withoutTheirWords(sentence);
  const out: string[] = [];
  A_DATE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = A_DATE.exec(s))) out.push(`${Number(m[1] ?? m[4])} ${(m[2] ?? m[3]).toLowerCase()}`);
  return out;
}
function theRecordHoldsTheDate(d: string, held: WhatTheRecordHolds): boolean {
  const all = new Set<string>();
  for (const t of held.texts ?? []) for (const x of theDatesStated(String(t ?? ''))) all.add(x);
  return all.has(d);
}

/* ---------- A name ---------- */

/** Words English capitalises that are not people. */
const NOT_A_NAME = new Set([
  'the', 'you', 'your', 'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'they', 'we', 'i', 'a', 'an', 'and', 'but', 'so', 'if',
  'what', 'when', 'where', 'who', 'why', 'how', 'which', 'there', 'here', 'then', 'also', 'nobody', 'somebody', 'someone', 'everyone',
  'everybody', 'groundwork', 'today', 'tomorrow', 'yesterday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  ...MONTHS, 'one', 'each', 'every', 'all', 'both', 'last', 'next', 'some', 'no', 'not', 'please', 'thanks', 'thank', 'good', 'great',
]);
/** A word in a person's place: before what people do ("Peter said"), or after "with", "to", "from", "by", "thanks to". */
const A_PERSON_BEFORE = /\b([A-Z][a-z]{2,})(?:\s+[A-Z][a-z]{2,})?\s+(?:said|says|told|tells|helped|agreed|promised|asked|confirmed|wrote|called|will|has\s+(?:said|agreed|promised|sent|helped|confirmed))\b/g;
const A_PERSON_AFTER = /\b(?:with|to|from|by|thanks\s+to|asked|told|helped)\s+([A-Z][a-z]{2,})\b/g;

function theNamesStated(sentence: string): string[] {
  const s = withoutTheirWords(sentence);
  const out: string[] = [];
  for (const re of [A_PERSON_BEFORE, A_PERSON_AFTER]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) if (!NOT_A_NAME.has(m[1].toLowerCase())) out.push(m[1]);
  }
  return out;
}
function theRecordHoldsTheName(name: string, held: WhatTheRecordHolds): boolean {
  const n = name.toLowerCase();
  const inside = (t: string) => new RegExp(`\\b${n}\\b`, 'i').test(t);
  return [...(held.people ?? []), held.reader ?? '', ...(held.texts ?? []), ...(held.blame?.people ?? [])].some((t) => !!t && inside(String(t)));
}
const namesAreChecked = (held: WhatTheRecordHolds) => held.people !== undefined || held.texts !== undefined;

/* ---------- Credit ---------- */

const HELP = '(?:helped|supported|covered\\s+for|stepped\\s+in\\s+for|backed)';
/** "colleagues said you helped them", "A colleague said Hassan Mwenda helped them", "Amina helped Hassan", "thanks to Amina". */
const GIVES_CREDIT = new RegExp(`\\b(you|[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${HELP}\\s+(?:them|him|her|me|us|you|[A-Z][a-z]+)\\b|\\bthanks\\s+to\\s+(you|[A-Z][a-z]+)\\b`);
const A_HELP_WORD = /\b(?:help|helped|helping|thanks|thank|supported|support|covered|showed|stepped\s+in|sorted|backed)\b/i;

/** Credit stands only where somebody other than the helper said, in their own words, that the helper helped. */
function theTranscriptHoldsTheCredit(helper: string, held: WhatTheRecordHolds): boolean {
  const who = /^you$/i.test(helper) ? (held.reader ?? '') : helper;
  const first = who.trim().split(/\s+/)[0] ?? '';
  if (!first) return false;
  const sameOne = (a: string) => a.trim().split(/\s+/)[0]?.toLowerCase() === first.toLowerCase();
  return (held.theirOwnWords ?? []).some((t) => !sameOne(t.name) && new RegExp(`\\b${first}\\b`, 'i').test(t.text) && A_HELP_WORD.test(t.text));
}

/* ---------- A label on a person ---------- */

/*
 * NO LABELS ON PEOPLE (Hafsah, 12 October, after night quality runs 1 and 2: "Patterns describe what happened, not who someone is").
 * "Stuck and not chasing" stood beside Collins and Amina, and "Presents well, delivers late, more than once" over Collins's name. A
 * sentence of Groundwork's that puts a pattern's name, or a label, on a named person (or on "you") is removed: what happened is said
 * instead, by whoever wrote it. The pattern itself, and its detection, are untouched.
 */
const A_PATTERN_TITLE = [...Object.values(PLAIN_PATTERN_NAMES).map((n) => n.name), ...Object.values(NEVER_NAMED_TO_A_PERSON)]
  .map((t) => t.toLowerCase().replace(/[.!?]+$/, ''));
const A_LABEL = ['stuck and not chasing', 'blame shifter', 'blame-shifter', 'underperformer', 'under-performer', 'low performer', 'poor performer', 'exit candidate', 'on a pip', 'flight risk', 'a slacker'];
const A_LABEL_AFTER_IS = /\b(?:is|are|was|were|seems|looks|has\s+become)\s+(?:now\s+|really\s+|clearly\s+)?(?:a|an|the)?\s*(?:blame[-\s]shifter|underperformer|low[-\s]performer|poor[-\s]performer|on\s+a\s+pip|exit\s+candidate)\b/i;

function namesAPerson(sentence: string, held: WhatTheRecordHolds): boolean {
  if (/\byou(?:r|rs)?\b/i.test(sentence)) return true;
  const people = [...(held.people ?? []), ...(held.theirOwnWords ?? []).map((t) => t.name), held.reader ?? '']
    .flatMap((n) => { const full = String(n ?? '').trim(); return full ? [full, full.split(/\s+/)[0]] : []; })
    .filter((n) => n.length > 2);
  return people.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(sentence));
}

/** Whether a sentence of Groundwork's own puts a pattern's name or a label on a named person. Their own words are never read. */
export function putsALabelOnAPerson(sentence: string, held: WhatTheRecordHolds = {}, theTextNamesAPerson = false): boolean {
  const s = withoutTheirWords(sentence);
  const lower = s.toLowerCase().replace(/[’']/g, "'");
  const titled = A_PATTERN_TITLE.some((t) => lower.includes(t.replace(/[’']/g, "'"))) || A_LABEL.some((l) => lower.includes(l));
  /* A title on a line of its own, over a sentence that names the person, is the same label: the board's heading over Collins. */
  if (titled && (theTextNamesAPerson || namesAPerson(s, held))) return true;
  return A_LABEL_AFTER_IS.test(s) && namesAPerson(s, held);
}

/* ---------- The check ---------- */

function inWords(n: number): string {
  return n >= 0 && n < IN_WORDS.length ? IN_WORDS[n] : String(n);
}

/** One sentence of Groundwork's: kept, put right (a string), or removed (why). */
function readOne(sentence: string, held: WhatTheRecordHolds, theTextNamesAPerson = false): { keep: true; text: string } | { keep: false; why: WhatWasRemoved } {
  const s = withoutTheirWords(sentence);
  if (!s.trim() || asks(s)) return { keep: true, text: sentence };

  /* A count of check-ins finished, which the code knows. */
  const done = s.match(A_COUNT_DONE);
  if (done && A_CHECK_IN.test(done[2]) && typeof held.checkInsAnswered === 'number') {
    const said = /^\d+$/.test(done[1]) ? Number(done[1]) : IN_WORDS.indexOf(done[1].toLowerCase());
    if (said !== held.checkInsAnswered) {
      if (held.checkInsAnswered < 1) return { keep: false, why: 'a status the record does not hold' };
      const thing = held.checkInsAnswered === 1 ? done[2].replace(/s$/, '') : done[2].replace(/([^s])$/, '$1s');
      const at = s.indexOf(done[0]);
      const right = done[0].replace(new RegExp(`\\b${done[1]}\\s+${done[2]}`), `${inWords(held.checkInsAnswered)} ${thing}`);
      return { keep: true, text: sentence.slice(0, at) + right + sentence.slice(at + done[0].length) };
    }
  } else if (done && statusIsChecked(held) && !theRecordHoldsTheStatus(s, 'done', held)) {
    const n = valueOf(done[1]);
    if (n === null || !theRecordHoldsTheNumber(n, held)) return { keep: false, why: 'a status the record does not hold' };
  }

  if (statusIsChecked(held)) {
    const stated = s.match(STATES_A_STATUS) ?? s.match(A_STATUS_LABEL);
    if (stated && !theRecordHoldsTheStatus(sentence, stated[1].toLowerCase(), held)) return { keep: false, why: 'a status the record does not hold' };
  }
  if (held.texts !== undefined || held.numbers !== undefined) {
    if (theNumbersStated(sentence).some((n) => !theRecordHoldsTheNumber(n, held))) return { keep: false, why: 'a number the record does not hold' };
  }
  if (held.texts !== undefined) {
    if (theDatesStated(sentence).some((d) => !theRecordHoldsTheDate(d, held))) return { keep: false, why: 'a date the record does not hold' };
  }
  if (namesAreChecked(held)) {
    if (theNamesStated(sentence).some((n) => !theRecordHoldsTheName(n, held))) return { keep: false, why: 'a name not in the check-in' };
  }
  if (putsALabelOnAPerson(sentence, held, theTextNamesAPerson)) return { keep: false, why: 'a label on a person' };
  if (held.theirOwnWords !== undefined) {
    const credit = s.match(GIVES_CREDIT);
    if (credit && !theTranscriptHoldsTheCredit(credit[1] ?? credit[2], held)) return { keep: false, why: 'credit no transcript holds' };
  }
  return { keep: true, text: sentence };
}

/**
 * THE ONE ENTRY POINT. The text with every sentence of Groundwork's own that states what the record does not hold removed (or its count
 * put right), after a colleague's fault is made the speaker's account and the family's claims are cut. `where` names the place in the log.
 * `whenNothingIsLeft`: null leaves a field empty (a report's, a board line's caller decides); a turn gets a plain question instead.
 */
export function theFinalCheck(
  text: string,
  held: WhatTheRecordHolds,
  opts: { where?: string; log?: { warn: (m: string) => void }; earlierAiTurns?: string[]; whenNothingIsLeft?: string | null } = {},
): FinalCheck {
  const src = String(text ?? '');
  if (!src.trim()) return { text, removed: [] };
  const removed: FinalCheck['removed'] = [];
  let out = src;

  /* 1. Blame somebody gave stays, as their account. Only blame nobody gave goes. */
  if (held.blame) {
    const theirs = withAColleaguesFaultAsTheirAccount(out, held.blame);
    for (const r of theirs.rewritten) if (r.to === null) removed.push({ sentence: r.from, why: 'blame nobody gave' });
    out = theirs.text;
  }
  /* 2. The family's claims. */
  const claims = withoutAClaimTheRecordDoesNotHold(out, held, { earlierAiTurns: opts.earlierAiTurns, whenNothingIsLeft: null });
  for (const c of claims.cut) removed.push({ sentence: c.sentence, why: c.claim });
  out = claims.cut.length ? claims.text : out;

  /* 3. Number, status, date, name, credit. */
  const kept: string[] = [];
  let changed = false;
  const theTextNamesAPerson = namesAPerson(withoutTheirWords(out), held);
  for (const sentence of intoSentences(out)) {
    const r = readOne(sentence, held, theTextNamesAPerson);
    if (r.keep) {
      if (r.text !== sentence) { removed.push({ sentence: sentence.trim(), why: 'a status the record does not hold', to: r.text.trim() }); changed = true; }
      kept.push(r.text);
    } else {
      removed.push({ sentence: sentence.trim(), why: r.why });
      changed = true;
    }
  }
  if (changed) out = kept.join('').trim();

  if (!removed.length) return { text: out === src ? text : out, removed };
  for (const r of removed) {
    (opts.log ?? console).warn(`The final check ${r.to ? 'put right' : 'removed'} a sentence${opts.where ? ` (${opts.where})` : ''}: ${r.why}.`);
  }
  if (!out.trim() && src.trim() && opts.whenNothingIsLeft !== null) {
    const fallback = opts.whenNothingIsLeft ?? WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT;
    return { text: aQuestionNotYetAsked(fallback, opts.earlierAiTurns ?? []) ?? fallback, removed };
  }
  return { text: out, removed };
}

/** Whether a reworded line holds nothing its engine line did not: the guard for a line the model only rewords. */
export function theRewordingHoldsNothingNew(engineLine: string, reworded: string, alsoHeld: readonly string[] = []): boolean {
  /*
   * AND NO DIFFERENCE THE ENGINE'S LINE DOES NOT DRAW, AND EVERY WEEK IT NAMES (Hafsah, 12 October: a difference is only within one
   * week, naming the week). A rewording may not set one statement against another where the engine's line does not ("first reported
   * nine or ten, but later said four or five"), and may not drop a week the engine's line names. The engine's line ships instead.
   */
  if (setsOneStatementAgainstAnother(reworded) && !setsOneStatementAgainstAnother(engineLine)) return false;
  const weeks = engineLine.match(/\bweek of \d{1,2} [A-Z][a-z]+/g) ?? [];
  if (weeks.some((w) => !reworded.includes(w))) return false;
  /* A status stands only where the engine's line says it in the same word; nothing else backs it here. */
  const held: WhatTheRecordHolds = { texts: [engineLine, ...alsoHeld], shownOrConfirmed: [], theirOwnWords: [{ name: '', text: engineLine }] };
  return theFinalCheck(reworded, held, { whenNothingIsLeft: null, log: { warn: () => undefined } }).removed.length === 0;
}

/** The same over every string in a stored or served value. A list item left empty goes; a field on its own stays, empty. */
const NOT_PROSE = /^(?:id|.*Id|.*Ids|code|codes|key|kind|type|status|direction|when|at|createdAt|updatedAt|session\w*|period\w*|count|n|score|level|tone|route|path|href|url|label|participantLabel|who|on|from|fieldId|band|quote|quotes|theirWords|saidWordForWord|verbatim)$/;
export function everyLineTheFinalCheckPasses<T>(value: T, held: WhatTheRecordHolds, opts: { where?: string; log?: { warn: (m: string) => void } } = {}): { value: T; removed: FinalCheck['removed'] } {
  const removed: FinalCheck['removed'] = [];
  const REMOVE = Symbol('remove');
  const walk = (v: any, inAList: boolean): any => {
    if (typeof v === 'string') {
      const r = theFinalCheck(v, held, { ...opts, whenNothingIsLeft: null });
      removed.push(...r.removed);
      return v.trim() && !String(r.text).trim() && inAList ? REMOVE : r.text;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, true)).filter((y) => y !== REMOVE);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) {
        if (NOT_PROSE.test(k)) { out[k] = val; continue; }
        const w = walk(val, false);
        out[k] = w === REMOVE ? '' : w;
      }
      return out;
    }
    return v;
  };
  const walked = walk(value, false);
  return { value: (walked === REMOVE ? value : walked) as T, removed };
}
