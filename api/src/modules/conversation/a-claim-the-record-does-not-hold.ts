/**
 * NOTHING IS SAID THAT GROUNDWORK DID NOT DO OR THE RECORD DOES NOT HOLD (decision 138, part 1 "Truth"; decision 139, must-fix 3).
 *
 * The same idea as a-record-claim-nobody-holds ("the record shows ..." when no record was given), for the four things the final evaluation
 * found Groundwork stating with nothing under them (docs/final-evaluation/summary.md, problems 4 and 5):
 *
 *   A REMINDER   "I have already sent reminders to Brian this week."                      (none was sent; profile 1)
 *   ESCALATION   "What happened to the four items you escalated 15 days ago?"             (nothing was escalated; profile 2)
 *   A TARGET     "If the plan for 24 shops holds, the work could meet the 10-shop objective" (nobody set ten shops; profile 5)
 *   A PROMISE    "Donholm Distributors placing a 100-bag order this week counts as a new account." (it never came; profile 3)
 *
 * THE CHECK IS CODE, NOT A MODEL. Each sentence is read for one of those four claims. A claim stands only where the record holds what it
 * says: a reminder to check in in the record of messages, somebody's own words saying they took it higher, a target's number (with the
 * thing it counts) in a target row, the lead's setup or somebody's own words. Otherwise the sentence is cut, and so is the sentence straight
 * after it that only leans on it ("That's one of the six new wholesale accounts."). Where the cut leaves nothing, a plain question that
 * asserts nothing is said instead, as next door.
 *
 * WHAT THE RECORD HOLDS IS PASSED IN, so the same check runs on a check-in's turn, on a report before it is stored, and anywhere else a
 * sentence is served. A kind of evidence the caller did not give is not checked (`undefined`), so a caller can never cut something it
 * could not look up; `false` or an empty list means it looked and found nothing.
 *
 * IT CUTS, IT DOES NOT ASK AGAIN, for the reason a-promise-they-never-made gives: a model that has just invented something is not the thing
 * to ask for a better version of it.
 */

import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked } from './nobody-is-left-looking-at-a-paragraph';
import { WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT } from './a-record-claim-nobody-holds';

export type AClaim = 'a reminder sent' | 'an escalation' | 'a target' | 'a promise counted as done';

export interface WhatTheRecordHoldsForClaims {
  /** A reminder to check in really went (the record of messages; email/a-reminder-really-sent.ts). */
  remindersSent?: boolean;
  /** Somebody's own words in this check-in say they took something above the person it was with (reports/what-they-said-they-did-about-it). */
  somebodySaidTheyTookItHigher?: boolean;
  /** Every text a target may be read from: target rows, the lead's setup, and what people said. */
  targetsMayComeFrom?: readonly string[];
}

/* ---------- A reminder Groundwork sent ---------- */

/** Groundwork, "I" or "we" saying a reminder went: "I have already sent reminders to Brian", "Groundwork has reminded them". */
const SAYS_A_REMINDER_WENT = new RegExp(
  [
    /\b(?:i|we|groundwork)\s+(?:have\s+|has\s+|had\s+|'ve\s+)?(?:already\s+|just\s+|also\s+)?(?:sent|emailed|messaged)\s+(?:\w+\s+){0,3}reminders?\b/.source,
    /\b(?:i|we|groundwork)\s+(?:have\s+|has\s+|had\s+|'ve\s+)?(?:already\s+|just\s+|also\s+)?(?:reminded|nudged|chased)\b/.source,
    /\breminders?\s+(?:has|have|had|was|were)\s+(?:already\s+)?(?:been\s+)?sent\b/.source,
  ].join('|'),
  'i',
);

/* ---------- Somebody escalated ---------- */

/*
 * A statement, or a question that takes it as given ("the four items you escalated 15 days ago"), that somebody took something higher.
 * A plain question about it ("Have you escalated it?") asserts nothing and stays, and so does advice ("Take it above finance.").
 */
/** The word straight before the subject that turns "you escalated" into the plain question "have you escalated". */
const AN_ASKING_WORD = /\b(?:have|has|had|did|do|does|will|would|could|should|can|if|whether)\s+$/i;
const SAYS_SOMEBODY_ESCALATED = [
  /\b(?:you|they|he|she|i|we|[A-Z][a-z]+)\s+(?:have\s+|has\s+|had\s+|'ve\s+)?(?:already\s+)?escalated\b/g,
  /* "and has raised it higher", "You have already taken ... to somebody above them". An inverted question ("Have you taken it higher?") has its subject in between, so it never matches. */
  /\b(?:have|has|had)\s+(?:already\s+)?(?:raised|taken)\b[^.?!]*?\b(?:higher|above\s+(?:them|him|her|the\s+person))\b/gi,
  /\b(?:has|have|had|was|were)\s+(?:already\s+)?been\s+escalated\b/g,
  /\b(?:were|was)\s+(?:all\s+)?escalated\b/g,
  /\bescalated\s+\d+\s+days?\s+ago\b/g,
  /\b(?:were|was)\s+taken\s+above\s+the\s+person\b/g,
];

function saysSomebodyEscalated(sentence: string): boolean {
  const asks = /\?\s*$/.test(sentence);
  for (const re of SAYS_SOMEBODY_ESCALATED) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sentence))) {
      /* "Have you escalated it?" asks; "the four items you escalated 15 days ago?" tells. Only the asking form is let through. */
      if (asks && AN_ASKING_WORD.test(sentence.slice(0, m.index))) continue;
      return true;
    }
  }
  return false;
}

/* ---------- A target ---------- */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
const A_NUMBER = `(?:\\d[\\d,]*(?:\\.\\d+)?|${Object.keys(NUMBER_WORDS).join('|')})`;
const TARGET_WORD = '(?:target|objective|goal|quota)';
/** Words between a number and the thing it counts that are not the thing: "ten NEW accounts", "five MORE shops". */
const NOT_THE_THING = new Set(['new', 'more', 'extra', 'additional', 'a', 'an', 'the', 'of', 'per', 'every', 'each', 'solid', 'whole', 'full', 'total', 'in', 'by', 'for', 'this', 'that', 'than', 'or', 'and', 'to']);

const valueOf = (n: string): number | null => {
  const t = n.toLowerCase().replace(/,/g, '');
  if (t in NUMBER_WORDS) return NUMBER_WORDS[t];
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};
/** "the 2026 sales target" names a year, not a number of anything. */
const aYear = (n: string) => /^(?:19|20)\d\d$/.test(n);
/** "shops" and "shop" are the same thing; so are "calls" and "call". */
const stem = (w: string) => w.toLowerCase().replace(/[^a-z]/g, '').replace(/(?:ies)$/, 'y').replace(/(?:es|s)$/, '');

/** The thing a number counts, read from the words after it: "10 calls a day" is calls, "six new wholesale accounts" is wholesale. */
function theThingAfter(words: string[]): string | null {
  for (const w of words.slice(0, 3)) {
    const s = stem(w);
    if (!s || NOT_THE_THING.has(w.toLowerCase())) continue;
    return s;
  }
  return null;
}

/** Every target a sentence states: the number, and the thing it counts where it says. */
export function theTargetsStated(sentence: string): { n: number; thing: string | null }[] {
  const out: { n: number; thing: string | null }[] = [];
  /* "a 60-shop target", "the 10-shop objective", "a ten-account goal". */
  const hyphened = new RegExp(`\\b(${A_NUMBER})[-\\s](\\w+?)(?:s)?\\s+${TARGET_WORD}s?\\b`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = hyphened.exec(sentence))) {
    const n = valueOf(m[1]);
    if (n !== null && !aYear(m[1]) && !/^(?:day|week|month|year|percent)$/i.test(m[2])) out.push({ n, thing: stem(m[2]) || null });
  }
  /* "the target is 10 calls a day", "the objective for the pilot is 10 shops", "a target of six new accounts", "target: 12". */
  const after = new RegExp(`\\b${TARGET_WORD}s?\\b(?:\\s+(?:for|of)\\s+(?:the\\s+|this\\s+|your\\s+|their\\s+)?[\\w-]+(?:\\s+[\\w-]+)?)?\\s*(?:is|was|are|were|of|at|:|stands at|sits at)\\s+(?:about\\s+|around\\s+|roughly\\s+)?(${A_NUMBER})\\b((?:\\s+[\\w-]+){0,3})`, 'gi');
  while ((m = after.exec(sentence))) {
    const n = valueOf(m[1]);
    if (n !== null && !aYear(m[1])) out.push({ n, thing: theThingAfter(m[2].trim().split(/\s+/).filter(Boolean)) });
  }
  return out;
}

/**
 * Whether the record holds that number for that thing: the number, said within three words before the thing, with no other number between
 * ("10 calls a day" holds ten calls; "10 test orders from 5 shops" does not hold ten shops), or with no thing to check, the number at all.
 */
export function theRecordHoldsTheTarget(t: { n: number; thing: string | null }, texts: readonly string[]): boolean {
  const numberRe = new RegExp(`\\b${A_NUMBER}\\b`, 'gi');
  for (const text of texts) {
    const words = String(text ?? '').split(/[\s/]+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const bare = words[i].replace(/^[^\w]+|[^\w]+$/g, '');
      const pieces = bare.split('-');
      numberRe.lastIndex = 0;
      if (!numberRe.test(pieces[0])) continue;
      if (valueOf(pieces[0]) !== t.n) continue;
      if (!t.thing) return true;
      /* "60-shop" in the record itself. */
      if (pieces.length > 1 && stem(pieces.slice(1).join('')) === t.thing) return true;
      for (let j = i + 1; j < Math.min(words.length, i + 4); j++) {
        const w = words[j].replace(/^[^\w]+|[^\w]+$/g, '');
        numberRe.lastIndex = 0;
        if (numberRe.test(w)) break;
        if (stem(w) === t.thing) return true;
        if (/[.;!?]$/.test(words[j])) break;
      }
    }
  }
  return false;
}

/* ---------- A promise counted as done ---------- */

/** Something credited as achieved: "counts as a new account", "That's one of the six", "meets the target", "you have hit the target". */
const CREDITS_IT = /\b(?:counts?\s+(?:as|towards?)|(?:that|this)(?:'s|\s+is|\s+makes)\s+(?:one|two|three|\d+)\s+of\b|meets?\s+(?:the|your|their)\s+(?:target|minimum|goal|objective)|(?:you|they|he|she)\s+(?:have|has)\s+(?:now\s+)?(?:hit|met|reached|achieved)\s+(?:the|your|their)\b)/i;
/** Said as still to come: "is placing ... this week", "will sign by Wednesday", "is going to order". */
const STILL_TO_COME = /\b(?:will|going\s+to|about\s+to|plans?\s+to|expects?\s+to|intends?\s+to|(?:is|are)\s+\w+ing|\w+ing\s+(?:a|an|the|their|its)?\s*(?:[\w-]+\s+){0,3}(?:this|next)\s+(?:week|month)|tomorrow|next\s+week|later\s+(?:this|today)|by\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|the\s+end))\b/i;
/** Said as having happened: "placed", "signed", "has ordered". */
const HAS_HAPPENED = /\b(?:placed|signed|paid|delivered|ordered|closed|completed|finished|received|confirmed|done|sent|made|got|won)\b/i;

function countsAPromiseAsDone(sentence: string): boolean {
  if (!CREDITS_IT.test(sentence)) return false;
  const before = sentence.split(CREDITS_IT)[0] ?? '';
  return STILL_TO_COME.test(before) && !HAS_HAPPENED.test(before);
}
/** "That's one of the six new wholesale accounts." straight after a cut claim: it only leans on it. */
const LEANS_ON_IT = /^\s*(?:that|this|which)(?:'s|\s+is|\s+makes|\s+means|\s+counts)\b/i;

/* ---------- The check ---------- */

/** The claim a sentence makes that the record does not hold, or null. */
export function aClaimTheRecordDoesNotHold(sentence: string, held: WhatTheRecordHoldsForClaims): AClaim | null {
  const s = String(sentence ?? '');
  if (!s.trim()) return null;
  if (held.remindersSent !== undefined && !held.remindersSent && SAYS_A_REMINDER_WENT.test(s)) return 'a reminder sent';
  if (held.somebodySaidTheyTookItHigher !== undefined && !held.somebodySaidTheyTookItHigher && saysSomebodyEscalated(s)) return 'an escalation';
  if (held.targetsMayComeFrom !== undefined) {
    const stated = theTargetsStated(s);
    if (stated.some((t) => !theRecordHoldsTheTarget(t, held.targetsMayComeFrom!))) return 'a target';
  }
  if (countsAPromiseAsDone(s)) return 'a promise counted as done';
  return null;
}

/** Which kinds of claim a text makes at all, so a caller looks up only the evidence it needs. Nothing is looked up for ordinary text. */
export function theKindsOfClaimIn(text: string): Set<AClaim> {
  const out = new Set<AClaim>();
  for (const s of intoSentences(String(text ?? ''))) {
    if (SAYS_A_REMINDER_WENT.test(s)) out.add('a reminder sent');
    if (saysSomebodyEscalated(s)) out.add('an escalation');
    if (theTargetsStated(s).length) out.add('a target');
    if (countsAPromiseAsDone(s)) out.add('a promise counted as done');
  }
  return out;
}

/** The same, over every string in a stored value at any depth. */
export function theKindsOfClaimInAnything(value: unknown): Set<AClaim> {
  const out = new Set<AClaim>();
  const walk = (v: unknown) => {
    if (typeof v === 'string') { for (const k of theKindsOfClaimIn(v)) out.add(k); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(value);
  return out;
}

export type ClaimsCut = { text: string; cut: { sentence: string; claim: AClaim }[] };

/** The text with every sentence that makes a claim the record does not hold taken out, and the sentence that only leans on it. */
export function withoutAClaimTheRecordDoesNotHold(
  text: string,
  held: WhatTheRecordHoldsForClaims,
  opts: { earlierAiTurns?: string[]; whenNothingIsLeft?: string | null } = {},
): ClaimsCut {
  const sentences = intoSentences(String(text ?? ''));
  const out: string[] = [];
  const cut: ClaimsCut['cut'] = [];
  let justCut: AClaim | null = null;
  for (const s of sentences) {
    const claim = aClaimTheRecordDoesNotHold(s, held);
    if (claim) {
      cut.push({ sentence: s.trim(), claim });
      justCut = claim;
      continue;
    }
    if (justCut && LEANS_ON_IT.test(s) && !/\?\s*$/.test(s)) {
      cut.push({ sentence: s.trim(), claim: justCut });
      continue;
    }
    justCut = null;
    out.push(s);
  }
  if (!cut.length) return { text, cut };
  const kept = out.join('').trim();
  if (kept) return { text: kept, cut };
  /* A field on its own (a report's) may come back empty, and its caller decides what an empty field means; a turn never does. */
  if (opts.whenNothingIsLeft === null) return { text: '', cut };
  const fallback = opts.whenNothingIsLeft ?? WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT;
  return { text: aQuestionNotYetAsked(fallback, opts.earlierAiTurns ?? []) ?? fallback, cut };
}

/**
 * The same check over everything a report stores: every string in it, at any depth. A sentence cut from an item of a list that leaves the
 * item empty takes the item out of the list; a field on its own that would be left empty keeps nothing but stays a field, so nothing is
 * left blank where a sentence was and nothing false is kept. Keys that are not prose (ids, codes, dates) are left alone.
 */
const NOT_PROSE = /^(?:id|.*Id|.*Ids|code|codes|key|kind|type|status|direction|when|at|createdAt|updatedAt|session\w*|period\w*|count|n|score|level|tone|route|path|href|url)$/;
export function everyClaimTheRecordHolds<T>(value: T, held: WhatTheRecordHoldsForClaims): { value: T; cut: ClaimsCut['cut'] } {
  const cut: ClaimsCut['cut'] = [];
  const REMOVE = Symbol('remove');
  const one = (s: string): string => {
    const r = withoutAClaimTheRecordDoesNotHold(s, held, { whenNothingIsLeft: null });
    cut.push(...r.cut);
    return r.text;
  };
  const walk = (v: any, inAList: boolean): any => {
    if (typeof v === 'string') {
      const t = one(v);
      return v.trim() && !t.trim() && inAList ? REMOVE : t;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, true)).filter((y) => y !== REMOVE);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: Record<string, any> = {};
      let emptied = false;
      for (const [k, val] of Object.entries(v)) {
        if (NOT_PROSE.test(k)) { out[k] = val; continue; }
        if (typeof val === 'string') {
          const t = one(val);
          if (val.trim() && !t.trim() && inAList) { emptied = true; continue; }
          out[k] = t;
          continue;
        }
        out[k] = walk(val, false);
      }
      return emptied ? REMOVE : out;
    }
    return v;
  };
  const walked = walk(value, false);
  return { value: (walked === REMOVE ? (Array.isArray(value) ? [] : value) : walked) as T, cut };
}
