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
 * AND ONLY A LINE THAT IS THEIR OWN WORDS. A record line is stamped `saidWordForWord` when it is
 * written, true only where it is a passage of what the person typed (see saidWordForWord below).
 * A tidied line is never quoted from.
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
/*
 * AND SINGLE MARKS, WHEN THEY ARE BEING USED AS QUOTATION MARKS. Openread, check-2: the model wrote
 * "The initiator says they are 'dealing with a lot of pressure' from 'incredibly tight timelines'",
 * this pass did not see single marks as quotation marks, and "incredibly tight timelines" was said by
 * nobody. A single mark is an apostrophe far more often than a quotation mark - don't, it's, Kwame's,
 * the officers' - so a pair counts only when the opening mark does not follow a letter, the closing
 * one is not followed by one, an apostrophe inside a word is passed over, and there are two words or
 * more between them (see HAS_TWO_WORDS).
 */
export const QUOTATION = /“([^“”]*)”|(?<![\p{L}\p{N}])"([^"\n]*)"(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])‘(?=\S)((?:[^‘’\n]|’(?=\p{L}))+?)’(?![\p{L}\p{N}])|(?<![\p{L}\p{N}'])'(?=\S)((?:[^'\n]|(?<=\p{L})'(?=\p{L}))+?)'(?![\p{L}\p{N}])/gu;

/** The inside of a match of QUOTATION, whichever pair of marks it was. */
const innerOf = (groups: (string | undefined)[]): string => groups.find((g) => g !== undefined) ?? '';
/** A pair of single marks round one word is an apostrophe or a scare quote, never somebody's words. */
const HAS_TWO_WORDS = /\S\s+\S/;
const isAQuotation = (whole: string, inner: string): boolean =>
  !!inner.trim() && (whole[0] === '“' || whole[0] === '"' || HAS_TWO_WORDS.test(inner));

export function quotationsIn(text: string): AQuotation[] {
  if (!text) return [];
  const out: AQuotation[] = [];
  for (const m of text.matchAll(QUOTATION)) {
    const inner = innerOf([m[1], m[2], m[3], m[4]]);
    if (!isAQuotation(m[0], inner)) continue;
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
  const masked = text.replace(QUOTATION, (m: string, a?: string, b?: string, c?: string, d?: string) => {
    const inner = innerOf([a, b, c, d]);
    if (!isAQuotation(m, inner)) return m;
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
  /** Quotes that were not in the record and read correctly without their marks, so they stay unquoted. */
  unquoted: string[];
  /** Sentences taken out, because they carried a quote that was not theirs and could not stand without it. */
  dropped: string[];
}

/*
 * WORDS THAT ONLY MAKE SENSE IN THE SPEAKER'S MOUTH. Without its marks, "I have mostly been doing
 * sales support" becomes the report saying "I", and "at your request" becomes the report talking to
 * whoever reads it. "I" and "us" are matched with their capitals, so "US" the country is not one.
 */
const I_OR_US = /\bI\b|\bus\b/;
const THE_REST = /\b(?:me|my|mine|myself|we|our|ours|ourselves|you|your|yours|yourself|yourselves)\b/i;

/*
 * A SENTENCE THAT ANNOUNCES SOMEBODY'S WORDS. "In Zainab's words, ..." or "she put it this way: ..."
 * is a promise about what follows, and the words that follow without their marks break it.
 */
const ANNOUNCES_THEIR_WORDS = /(?:\bin\s+(?:[\p{L}'’.-]+\s+){0,3}words\b|\bput it\b|\bin (?:his|her|their|your|my) own words\b)[^.!?]*$|:\s*$/iu;

/** Where the sentence holding position `at` begins. */
function sentenceStart(text: string, at: number): number {
  const before = text.slice(0, at);
  let from = 0;
  for (const m of before.matchAll(/[.!?]["”’)\]]*\s+|\n+/g)) from = m.index! + m[0].length;
  return from;
}

/**
 * Whether the words of a quote that was not theirs still read correctly with the marks off: as a
 * plain statement the report can make about the person. Not when they are in the speaker's mouth
 * (I, my, we, you), and not when the sentence has just announced that these are somebody's words.
 */
export function readsAsAPlainStatement(text: string, q: AQuotation, words: string = q.inner): boolean {
  if (I_OR_US.test(words) || THE_REST.test(words)) return false;
  const lead = text.slice(sentenceStart(text, q.start), q.start);
  return !ANNOUNCES_THEIR_WORDS.test(lead);
}

const DROP = '\uE010';

/*
 * WORDS SUGGESTED TO THE READER ARE NOBODY'S QUOTE. "Change the regular check-in to ask "What are
 * you waiting for?"" is the report offering a question, not saying anybody asked it. It keeps its
 * words, as the writer's own, and loses only the marks. Recognised by the verb just before it -
 * asking, saying, telling, writing, trying, calling or putting it - in the present or as an
 * instruction, never "said" or "asked", which attribute the words to somebody.
 */
const A_VERB_OF_SUGGESTING =
  /\b(?:ask|asking|say|saying|tell (?:them|him|her|the team|everyone)|write|writing|try|trying|try saying|call it|put it as|phrase it as|use the words|start with|open with|lead with)\s*[:,]?\s*$/i;

export function isSuggestedWording(text: string, q: AQuotation): boolean {
  const lead = text.slice(sentenceStart(text, q.start), q.start);
  return A_VERB_OF_SUGGESTING.test(lead);
}

/** Every sentence holding the marker, taken out; what is left joined up as it was. */
function withoutTheSentencesMarked(text: string, dropped: string[]): string {
  const pieces: string[] = [];
  let at = 0;
  for (const m of text.matchAll(/[.!?]["”’)\]]*(?:\s+|$)|\n+/g)) {
    pieces.push(text.slice(at, m.index! + m[0].length));
    at = m.index! + m[0].length;
  }
  if (at < text.length) pieces.push(text.slice(at));
  const kept = pieces.filter((p) => {
    if (!p.includes(DROP)) return true;
    dropped.push(p.trim());
    return false;
  });
  /* A paragraph break that belonged to a dropped sentence is not left doubled, and the text does not
     gain a space at either end that it did not have. */
  let out = kept.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (!/^\s/.test(text)) out = out.replace(/^\s+/, '');
  if (!/\s$/.test(text)) out = out.replace(/\s+$/, '');
  return out;
}

/**
 * EACH QUOTE DECIDED: KEPT (IN WHATEVER WORDS ARE GIVEN), UNQUOTED, OR ITS SENTENCE DROPPED.
 *
 * One place for the three outcomes so the report pass and the anonymous copy cannot come to
 * different answers about the same sentence. A dropped sentence goes whole; everything else in the
 * text is exactly as it was.
 */
export function eachQuoteDecided(
  text: string,
  decide: (q: AQuotation) => { keep: string } | 'unquote' | 'drop' | 'suggested',
): { text: string; kept: number; unquoted: string[]; dropped: string[] } {
  const found = quotationsIn(text);
  if (!found.length) return { text, kept: 0, unquoted: [], dropped: [] };
  let out = '';
  let at = 0;
  let kept = 0;
  const droppedQuotes: AQuotation[] = [];
  const unquoted: string[] = [];
  for (const q of found) {
    out += text.slice(at, q.start);
    const d = decide(q);
    if (d === 'drop') {
      /* The marker stays inside the marks, so the sentence around it is still found whole. */
      /* With the quote's own full stop or question mark, which may be what ends its sentence. */
      out += `${q.open}${DROP}${(q.inner.trimEnd().match(/[.!?]+$/) ?? [''])[0]}${q.close}`;
      droppedQuotes.push(q);
    } else if (d === 'unquote') {
      out += q.inner;
      unquoted.push(q.inner);
    } else if (d === 'suggested') {
      /* Suggested wording, told to the reader, as the writer's own words: "to ask: What are you
         waiting for?". A colon only where the words open with a capital and none is there yet. */
      const needsAColon = /^\p{Lu}/u.test(q.inner.trimStart()) && !/:\s*$/.test(out);
      out = needsAColon ? `${out.replace(/\s+$/, '')}: ${q.inner.trimStart()}` : `${out}${q.inner}`;
      unquoted.push(q.inner);
    } else {
      out += `${q.open}${d.keep}${q.close}`;
      kept += 1;
    }
    at = q.end;
  }
  out += text.slice(at);
  let dropped: string[] = [];
  if (droppedQuotes.length) {
    /* Periods inside the quotes that stay must not end a sentence, so they are held aside first. */
    const raw: string[] = [];
    const held: string[] = [];
    out = theQuotesKeptExcept(out, (outside) => withoutTheSentencesMarked(outside, raw), held);
    /* For the log: each dropped sentence as it was written, with its quotes back in it. */
    let n = 0;
    dropped = raw.map((sentence) => sentence
      .replace(HELD, (_m, i) => held[Number(i)] ?? '')
      .split(DROP)
      .reduce((acc, rest, k) => {
        if (k === 0) return rest;
        const q = droppedQuotes[n++];
        /* The quote's own end mark was kept beside the marker; it goes back inside the marks. */
        const own = q ? (q.inner.trimEnd().match(/[.!?]+$/) ?? [''])[0] : '';
        return `${acc}${q ? `${q.open}${q.inner}${q.close}` : ''}${rest.startsWith(own) ? rest.slice(own.length) : rest}`;
      }, ''));
  }
  return { text: out, kept, unquoted, dropped };
}

/* Like theQuotesKept, but a quote holding the drop marker is left in place so its sentence can be found. */
function theQuotesKeptExcept(text: string, rewrite: (s: string) => string, held: string[] = []): string {
  const masked = text.replace(QUOTATION, (m: string, a?: string, b?: string, c?: string, d?: string) => {
    const inner = innerOf([a, b, c, d]);
    if (inner.startsWith(DROP)) return inner;
    if (!isAQuotation(m, inner)) return m;
    held.push(inner);
    return `${m[0]}\uE000${held.length - 1}\uE001${m[m.length - 1]}`;
  });
  return rewrite(masked).replace(HELD, (_m, i) => held[Number(i)] ?? '');
}

/**
 * Every quotation in one piece of text, made the record's words, made not a quotation, or - where
 * the words could not stand as the report's own - taken out with the sentence that carried it.
 *
 * `record` is every line the report may quote, plus the lead's own set-up words; `people` is each
 * person's label beside their name, so a label inside a quote can be found as the name.
 */
export function whatTheySaidInQuotes(
  text: string,
  record: string[],
  people: ALabelAndAName[] = [],
  /** False where the text must not come out empty: a quote that cannot stand is unquoted instead. */
  mayDropASentence = true,
): WhatTheQuotesBecame {
  const r = eachQuoteDecided(text, (q) => {
    const theirs = theRecordsWordsFor(q.inner, record, people);
    if (theirs !== null) return { keep: theirs };
    if (isSuggestedWording(text, q)) return 'suggested';
    if (readsAsAPlainStatement(text, q)) return 'unquote';
    return mayDropASentence ? 'drop' : 'unquote';
  });
  return { text: r.text, restored: r.kept, unquoted: r.unquoted, dropped: r.dropped };
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
): { value: T; restored: number; unquoted: string[]; dropped: string[] } {
  let restored = 0;
  const unquoted: string[] = [];
  const dropped: string[] = [];
  /* A label with a quotation mark in it is held aside in the prose too, so no quote is found inside it. */
  const quotedLabels = people.map((p) => (p.label ?? '').trim()).filter((l) => /["“”]/.test(l)).sort((a, b) => b.length - a.length);
  const one = (s: string, mayDropASentence: boolean) => {
    const held: string[] = [];
    let masked = s;
    for (const l of quotedLabels) {
      masked = masked.split(l).join(`\uE002${held.push(l) - 1}\uE003`);
    }
    const r = whatTheySaidInQuotes(masked, record, people, mayDropASentence);
    return { ...r, text: r.text.replace(/\uE002(\d+)\uE003/g, (_m, i) => held[Number(i)]) };
  };
  const count = (r: WhatTheQuotesBecame) => {
    restored += r.restored;
    unquoted.push(...r.unquoted);
    dropped.push(...r.dropped);
    return r.text;
  };
  /*
   * NOTHING IS LEFT BLANK. A sentence dropped from a line of a list takes the line with it, and a
   * dropped sentence that was the whole of a field takes the item it belongs to out of its list (a
   * move, a side of a difference). Where there is no list to take it out of - the picture itself, a
   * field on its own - the sentence stays, unquoted, because a blank where a sentence was is worse.
   */
  const REMOVE = Symbol('remove');
  const walk = (v: any, inAList: boolean): any => {
    if (typeof v === 'string') {
      const r = one(v, true);
      if (v.trim() && !r.text.trim()) {
        if (inAList) { count(r); return REMOVE; }
        return count(one(v, false));
      }
      return count(r);
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, true)).filter((y) => y !== REMOVE);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: Record<string, any> = {};
      let emptied = false;
      for (const [k, val] of Object.entries(v)) {
        if (NOT_PROSE.test(k)) { out[k] = val; continue; }
        if (typeof val === 'string') {
          const r = one(val, true);
          if (val.trim() && !r.text.trim()) {
            if (inAList) { emptied = true; count(r); continue; }
            out[k] = count(one(val, false));
            continue;
          }
          out[k] = count(r);
          continue;
        }
        out[k] = walk(val, false);
      }
      return emptied ? REMOVE : out;
    }
    return v;
  };
  const walked = walk(value, false);
  return { value: walked as T, restored, unquoted, dropped };
}

/* The record reader's note of what a word referred to. It is the reader's, never the person's. */
const THE_READERS_NOTE = /\s*\[INFERRED:[^\]]*\]/gi;

/**
 * WHETHER A RECORD LINE IS THE PERSON'S OWN WORDS, decided once, when the line is written, where
 * what they typed can be read.
 *
 * About one record line in ten is the record reader's tidied version of what somebody said: two
 * sentences joined, a name put in square brackets, a clause trimmed. It is right about what they
 * meant and it is not their words, so a quote of it would be the model's copy. True only when the
 * whole line, without the reader's note, appears as one unbroken passage in what this person typed
 * in this check-in, forgiving exactly what a quote is forgiven: capitals, spacing, end punctuation,
 * and curly or straight marks.
 */
export function saidWordForWord(line: string | null | undefined, whatTheyTyped: string[]): boolean {
  const text = String(line ?? '').replace(THE_READERS_NOTE, '').trim();
  if (!text) return false;
  return theRecordsWordsFor(text, whatTheyTyped) !== null;
}

/**
 * THE RECORD A REPORT MAY QUOTE, AS ONE LIST OF LINES.
 *
 * Only the lines that are the person's own words (`saidWordForWord`), because a quote of a tidied
 * line is a model's copy. Without the reader's note ("[INFERRED: 'her' refers to Priti]"). A disputed
 * line is still what its author said, so it can be quoted; the objection beside it is not added here.
 * And the lead's own words at set-up - the brief and each role as they gave it - which they typed.
 */
export function theLinesAQuoteMayComeFrom(
  entries: { text: string | null | undefined; saidWordForWord?: boolean | null }[],
  setUp: (string | null | undefined)[] = [],
): string[] {
  const lines = entries
    .filter((e) => e.saidWordForWord === true)
    .map((e) => String(e.text ?? '').replace(THE_READERS_NOTE, '').trim())
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
