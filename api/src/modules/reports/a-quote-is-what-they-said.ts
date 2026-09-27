/**
 * A QUOTE IN A REPORT IS WHAT THE PERSON SAID, TAKEN FROM THE RECORD, AND NEVER THE MODEL'S COPY.
 *
 * Hafsah, 27 September 2026: "Every quote any person sees must be the person's original words, taken
 * from the record, never the model's copy of them."
 *
 * WHAT WAS THERE. Every model that writes a report copies words out of the record and puts them in
 * quotation marks. It copies them mostly right. Across the 300 most recent reports in the local
 * database there were 2,872 quotations: 184 written by the report models and 2,688 built by the
 * product from commitments, dependencies and roles. Of the 184, 129 are a line of the record as it
 * stands; the rest are a word changed, a clause joined, or something nobody said at all. Of the
 * product's, 565 quote a phrase no one said, because the dependency reader writes "a fix for two
 * minor logged issues" and the sentence puts it in quotation marks as though somebody had.
 *
 * WHAT THIS DOES, ONCE, BEFORE A REPORT IS STORED. Each quotation is looked for in the record: the
 * lines this report was written from, and the lead's own words at set-up (the brief and each role as
 * the lead gave it). Where it is found, the words inside the marks are REPLACED by the words the
 * record holds, exactly: the record's capitals, its apostrophes, its name. Where it is not found, the
 * quotation marks come off and the sentence stays. The sentence was usually right; only the claim
 * that these were somebody's words was wrong. The same rule the conversation already keeps for its
 * own replies, in a-quote-has-to-match-what-they-said.ts.
 *
 * WHAT COUNTS AS "FOUND", AND NOTHING ELSE DOES. The same words in the same order, allowing only:
 *   - capitals, and how much space is between words;
 *   - punctuation at either end of the quote, which the sentence around it owns;
 *   - a straight apostrophe or quotation mark for a curly one;
 *   - a person's label where the record has their name. The models read "the initiator" where
 *     Zainab said "Nadia" (see a-name-in-their-words-is-the-label), so a quote the model writes as
 *     "as requested by the initiator" is found as "as requested by Nadia", and Nadia is what goes
 *     back between the marks.
 * A dropped word, a changed word, a joined clause or an ellipsis is not found, and the marks come off.
 *
 * WHY NOT THE TRANSCRIPT. The shared report is not allowed to read a conversation turn (the privacy
 * guard in board/no-surveillance.spec.ts), so the record is the original the report can reach. It is
 * the same record each person reads as their own rows and can dispute.
 *
 * WHY A RESTORED NAME SHOWS NO ONE A NAME THEY COULD NOT SEE BEFORE. The name that goes back is the
 * name as the person said it, in the record line the model was already quoting. Until the models
 * read labels, the model copied that same name into the quote itself, and no step at the read has
 * ever taken a name out of a quote (withNames only replaces labels). So a quote reads exactly as it
 * did before for every reader. What changes is outside the marks: the paraphrase says "the
 * initiator", which each reader is served as "you", the name, or "your lead", by the usual rules.
 * The one reader who must never see a name inside a quote, a person sent an anonymous copy, is
 * handled at that door: see withoutWhoSaidIt.
 *
 * AND THE QUOTE IS NOT TOUCHED AGAIN ON THE WAY OUT. Everything that rewrites report text at the read
 * - withNames, withoutDashes, notTheWordParty - leaves the inside of a quotation alone
 * (theQuotesKept, below). Otherwise the read would turn the restored "as requested by Nadia" into
 * "as requested by you" in front of Nadia, which is why the first try at this was rejected.
 *
 * Pure, and handed the record by the caller. Nothing here reads the database.
 */

export interface ALabelAndAName {
  label: string;
  name: string | null | undefined;
}

export interface AQuotation {
  /** Where the opening mark is. */
  start: number;
  /** One past the closing mark. */
  end: number;
  open: string;
  close: string;
  /** The words between the marks, as written. */
  inner: string;
}

/*
 * A QUOTATION IS A PAIR OF MARKS. Curly marks pair with each other. A straight mark is a quotation
 * mark only where it does not sit inside a word, so "5'11" and "don't" are never mistaken for one,
 * and it closes on the same line.
 */
export const QUOTATION = /“([^“”]*)”|(?<![\p{L}\p{N}])"([^"\n]*)"(?![\p{L}\p{N}])/gu;

export function quotationsIn(text: string): AQuotation[] {
  if (!text) return [];
  const out: AQuotation[] = [];
  for (const m of text.matchAll(QUOTATION)) {
    const inner = m[1] ?? m[2] ?? '';
    if (!inner.trim()) continue;
    out.push({ start: m.index!, end: m.index! + m[0].length, open: m[0][0], close: m[0][m[0].length - 1], inner });
  }
  return out;
}

/*
 * THE INSIDE OF EVERY QUOTATION, HELD ASIDE WHILE SOMETHING ELSE REWRITES THE SENTENCE.
 *
 * By placeholder, the way notTheWordParty holds its keys, because every rewrite at the read is a set
 * of regular expressions and a cleverer expression that got a quote wrong would fail silently. The
 * placeholder is two private-use characters around a number, which no rule matches: no letter, no
 * dash, no label. The marks themselves stay in the text, so a rule that looks for the start of a
 * sentence still sees them.
 */
const HELD = /(\d+)/g;

export function theQuotesKept(text: string, rewrite: (s: string) => string): string {
  if (!text) return rewrite(text);
  const held: string[] = [];
  const masked = text.replace(QUOTATION, (m: string, a?: string, b?: string) => {
    const inner = a ?? b ?? '';
    if (!inner.trim()) return m;
    held.push(inner);
    return `${m[0]}${held.length - 1}${m[m.length - 1]}`;
  });
  if (!held.length) return rewrite(text);
  return rewrite(masked).replace(HELD, (_m, i) => held[Number(i)] ?? '');
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* What the sentence around a quote owns: space, and the punctuation at either end of it. */
const EDGE = /^[\s.,;:!?…"'“”‘’()[\]\-–—]+|[\s.,;:!?…"'“”‘’()[\]\-–—]+$/gu;
const LETTER = /[\p{L}\p{N}]/u;

/** One character of a quote, as a pattern that finds it in the record. */
function charPattern(c: string): string {
  if (/\s/.test(c)) return '\\s+';
  if ("'’‘".includes(c)) return "['’‘]";
  if ('"“”'.includes(c)) return '["“”]';
  return esc(c);
}

/** The literal part of a quote, whitespace runs collapsed. */
function literalPattern(s: string): string {
  let out = '';
  let inSpace = false;
  for (const c of s) {
    if (/\s/.test(c)) {
      if (!inSpace) out += '\\s+';
      inSpace = true;
      continue;
    }
    inSpace = false;
    out += charPattern(c);
  }
  return out;
}

/**
 * The pattern that finds a quote in the record: the same words in the same order, any capitals,
 * with each person's label standing for their name as it may have been said - full name or first.
 */
function patternFor(core: string, people: ALabelAndAName[]): RegExp {
  const named = people
    .map((p) => ({ label: (p.label ?? '').trim(), name: (p.name ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((p) => p.label && p.name)
    .sort((a, b) => b.label.length - a.label.length);

  let rx = '';
  let rest = core;
  if (named.length) {
    /* "the initiator" and "the Participant A" both stand for the person: the model writes both. */
    const labels = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:the\\s+)?(${named.map((p) => esc(p.label.replace(/[.!?,;:]+$/, ''))).join('|')})(?![\\p{L}\\p{N}])`,
      'giu',
    );
    let at = 0;
    for (const m of core.matchAll(labels)) {
      const who = named.find((p) => p.label.replace(/[.!?,;:]+$/, '').toLowerCase() === m[1].toLowerCase());
      if (!who) continue;
      rx += literalPattern(core.slice(at, m.index!));
      const first = who.name.split(' ')[0];
      const forms = [...new Set([who.name, first].filter((f) => f.length > 1))].sort((a, b) => b.length - a.length);
      /* The label itself too, in case somebody said it. */
      rx += `(?:${[...forms.map(esc), literalPattern(m[0])].join('|')})`;
      at = m.index! + m[0].length;
    }
    rest = core.slice(at);
  }
  rx += literalPattern(rest);
  const before = LETTER.test(core[0]) ? '(?<![\\p{L}\\p{N}])' : '';
  const after = LETTER.test(core[core.length - 1]) ? '(?![\\p{L}\\p{N}])' : '';
  return new RegExp(`${before}${rx}${after}`, 'iu');
}

/**
 * The record's own words for a quote, or null. The words come back exactly as the record holds them,
 * with the quote's own end punctuation where the record has the same punctuation in the same place.
 */
export function theRecordsWordsFor(inner: string, record: string[], people: ALabelAndAName[] = []): string | null {
  const core = inner.normalize('NFC').replace(EDGE, '');
  if (!core || !LETTER.test(core)) return null;
  const pattern = patternFor(core, people);
  for (const line of record) {
    const said = (line ?? '').normalize('NFC');
    const m = pattern.exec(said);
    if (!m) continue;
    let from = m.index;
    let to = m.index + m[0].length;
    /* "...by Friday." stays "...by Friday." when the record ends the same way. */
    const trailing = inner.normalize('NFC').trimEnd().slice(inner.normalize('NFC').trimEnd().replace(/[.,;:!?…]+$/u, '').length);
    if (trailing && said.slice(to, to + trailing.length) === trailing) to += trailing.length;
    const leading = (inner.normalize('NFC').trimStart().match(/^[¿¡]+/u) ?? [''])[0];
    if (leading && said.slice(from - leading.length, from) === leading) from -= leading.length;
    return said.slice(from, to);
  }
  return null;
}

export interface WhatTheQuotesBecame {
  text: string;
  /** Quotes whose words are now the record's, whether or not they differed. */
  restored: number;
  /** Quotes that were not in the record and so are no longer quotes. */
  unquoted: string[];
}

/**
 * Every quotation in one piece of text, made the record's words or made not a quotation.
 *
 * `record` is every line the report may read, plus the lead's own set-up words; `people` is each
 * person's label beside their name, so a label inside a quote can be found as the name.
 */
export function whatTheySaidInQuotes(text: string, record: string[], people: ALabelAndAName[] = []): WhatTheQuotesBecame {
  const found = quotationsIn(text);
  if (!found.length) return { text, restored: 0, unquoted: [] };
  let out = '';
  let at = 0;
  let restored = 0;
  const unquoted: string[] = [];
  for (const q of found) {
    out += text.slice(at, q.start);
    const theirs = theRecordsWordsFor(q.inner, record, people);
    if (theirs !== null) {
      out += `${q.open}${theirs}${q.close}`;
      restored += 1;
    } else {
      out += q.inner;
      unquoted.push(q.inner);
    }
    at = q.end;
  }
  out += text.slice(at);
  return { text: out, restored, unquoted };
}

/*
 * THE KEYS THAT HOLD A PERSON'S LABEL OR AN IDENTIFIER, NEVER PROSE. A label is matched on as it is
 * stored (own-reads-only filters per-person rows on it), so its characters must never change.
 */
const NOT_PROSE = /^(label|participantLabel|who|on|from|fieldId|code|status|type|band|tone)$|Id$|Ids$/;

/**
 * The same over a whole report-shaped value, however deep. Labels and identifiers are left exactly
 * as they are, and so is a label that happens to have quotation marks in it, wherever it appears.
 */
export function everyQuoteFromTheRecord<T>(
  value: T,
  record: string[],
  people: ALabelAndAName[] = [],
): { value: T; restored: number; unquoted: string[] } {
  let restored = 0;
  const unquoted: string[] = [];
  /* A label with a quotation mark in it is held aside in the prose too, so no quote is found inside it. */
  const quotedLabels = people.map((p) => (p.label ?? '').trim()).filter((l) => /["“”]/.test(l)).sort((a, b) => b.length - a.length);
  const one = (s: string): string => {
    const held: string[] = [];
    let masked = s;
    for (const l of quotedLabels) {
      masked = masked.split(l).join(`${held.push(l) - 1}`);
    }
    const r = whatTheySaidInQuotes(masked, record, people);
    restored += r.restored;
    unquoted.push(...r.unquoted);
    return r.text.replace(/(\d+)/g, (_m, i) => held[Number(i)]);
  };
  const walk = (v: any): any => {
    if (typeof v === 'string') return one(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) out[k] = NOT_PROSE.test(k) ? val : walk(val);
      return out;
    }
    return v;
  };
  return { value: walk(value) as T, restored, unquoted };
}

/**
 * THE RECORD A REPORT MAY QUOTE, AS ONE LIST OF LINES.
 *
 * What each person said, as the record holds it, without the bracket the record reader adds when it
 * had to infer what a word referred to ("[INFERRED: 'her' refers to Priti]"), which is the reader's
 * note and not anybody's words. A disputed line is still what its author said, so it can be quoted;
 * the objection beside it is not added here. And the lead's own words at set-up.
 */
export function theLinesAQuoteMayComeFrom(
  entries: { text: string | null | undefined }[],
  setUp: (string | null | undefined)[] = [],
): string[] {
  const lines = entries
    .map((e) => String(e.text ?? '').replace(/\s*\[INFERRED:[^\]]*\]/gi, '').trim())
    .filter(Boolean);
  return [...lines, ...setUp.map((s) => String(s ?? '').trim()).filter(Boolean)];
}

/**
 * For a check: every quotation in a served text whose words are not, exactly, a passage of the
 * record. Exactly means character for character; no capitals or spacing are forgiven here, because
 * after the pass above there is nothing left to forgive.
 */
export function quotesNotWordForWord(text: string, record: string[]): string[] {
  return quotationsIn(text)
    .map((q) => q.inner)
    .filter((inner) => !record.some((line) => (line ?? '').normalize('NFC').includes(inner.normalize('NFC'))));
}
