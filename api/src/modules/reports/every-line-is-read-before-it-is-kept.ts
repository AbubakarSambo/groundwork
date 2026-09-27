/**
 * EVERY LINE IS READ, AS EACH PERSON WILL READ IT, BEFORE THE REPORT IS KEPT.
 *
 * Task 1.6. The run scorer counts what is wrong with what people read: slot names, labels, the
 * machine's words, lower-case starts, cut words. Each of those was fixed where it came from, one at
 * a time, and each came back from somewhere new, because a report is written by a model and a model
 * finds new ways. This is the general catch: one pass, at the point the report is about to be
 * stored, that renders every line the way each reader will be served it and runs the scorer's own
 * tests on it (a-line-a-person-can-read.ts).
 *
 * RENDERED, NOT STORED. A stored report is in labels ("the initiator", "Participant A") on purpose,
 * and names go in only when somebody reads it. So a fault that exists only for one reader - "You say
 * their goal is ..." for the person it is about, "Success for Dr means ..." for somebody whose name
 * starts with a title - is only visible after rendering. The render is the product's own door
 * (`asItWasShared` and the per-reader filters), passed in, so what is checked is what is served.
 *
 * WHAT HAPPENS TO A LINE THAT FAILS:
 *   1. The model is asked, once, to rewrite THAT sentence, in its stored form, with the labels kept,
 *      told what is wrong with it and how one reader reads it.
 *   2. The rewrite is kept only if every quotation in the original is still in it character for
 *      character, and it passes every test for every reader who reads it.
 *   3. Otherwise the sentence is dropped, under the same no-blank rules as a-quote-is-what-they-said:
 *      a sentence that was the whole of an item in a list takes the item with it, and a sentence that
 *      was the whole of a field on its own stays, because a blank where a sentence was is worse. A
 *      doubtful catch (the pronoun check) is never dropped; if its rewrite fails the line stays.
 *
 * NEVER A PERSON'S WORDS. A fault found wholly inside quotation marks is theirs and is not a fault
 * this may fix, and a rewrite that changes a quotation is thrown away.
 *
 * Every rewrite and every drop is returned, so the caller can log each one.
 */
import { whatIsWrongWith, quotedSpansOf, AHit } from './a-line-a-person-can-read';
import { quotationsIn } from './a-quote-is-what-they-said';

export interface AReader {
  participantId: string | null;
  isLead: boolean;
}

export interface WhatWasDone {
  path: string;
  /** The sentence as stored before this ran. */
  was: string;
  /** What is wrong with it, by the scorer's names. */
  problems: string[];
  /** The rewrite that was kept, or null when the sentence was dropped or left. */
  now: string | null;
  outcome: 'rewritten' | 'dropped' | 'left, it could not be fixed and may not be dropped';
}

export interface TheCheck<R extends Record<string, any>> {
  /** The report as it is about to be stored. */
  report: R;
  /** Everybody who reads it. */
  readers: AReader[];
  /** The report with names put in for this reader, same shape as the stored one. */
  named: (report: R, reader: AReader) => Record<string, any>;
  /** What this reader is actually served, for deciding which lines they read at all. */
  served: (report: R, reader: AReader) => Record<string, any>;
  /** One model call: the stored sentence rewritten, or null. */
  rewrite: (ask: { sentence: string; problems: string[]; asRead: string }) => Promise<string | null>;
  /** The top-level fields to read. */
  fields: string[];
  /** At most this many model calls, so one bad report cannot hold the synthesis for minutes. */
  mostRewrites?: number;
}

/* The same keys a-quote-is-what-they-said leaves alone: labels and identifiers, never prose. */
const NOT_PROSE = /^(label|participantLabel|who|on|from|fieldId|code|status|type|band|tone)$|Id$|Ids$/;

type Path = (string | number)[];
const show = (p: Path) => p.map((k) => (typeof k === 'number' ? `[${k}]` : `.${k}`)).join('');

function* leaves(v: any, at: Path): Generator<[Path, string]> {
  if (typeof v === 'string') { yield [at, v]; return; }
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i += 1) yield* leaves(v[i], [...at, i]); return; }
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    for (const [k, x] of Object.entries(v)) {
      if (NOT_PROSE.test(k)) continue;
      yield* leaves(x, [...at, k]);
    }
  }
}

const get = (v: any, p: Path): any => p.reduce((acc, k) => (acc == null ? undefined : acc[k as any]), v);

function allStrings(v: any, into: Set<string> = new Set()): Set<string> {
  if (typeof v === 'string') into.add(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, into));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => allStrings(x, into));
  return into;
}

/**
 * The sentences of a piece of text, each with the space after it, so joining them gives the text
 * back exactly. A full stop inside a quotation never ends a sentence here.
 */
export function sentencesOf(text: string): string[] {
  const held: string[] = [];
  let masked = '';
  let from = 0;
  for (const q of quotationsIn(text)) {
    masked += `${text.slice(from, q.start)}${held.push(text.slice(q.start, q.end)) - 1}`;
    from = q.end;
  }
  masked += text.slice(from);
  const out: string[] = [];
  let at = 0;
  for (const m of masked.matchAll(/[.!?]+["”’)\]]*(?:\s+|$)|\n+/g)) {
    const end = m.index! + m[0].length;
    if (end > at) out.push(masked.slice(at, end));
    at = end;
  }
  if (at < masked.length) out.push(masked.slice(at));
  return out.map((s) => s.replace(/(\d+)/g, (_m, n) => held[Number(n)] ?? ''));
}

/** Which sentence an offset falls in. */
function sentenceAt(pieces: string[], offset: number): number {
  let end = 0;
  for (let i = 0; i < pieces.length; i += 1) {
    end += pieces[i].length;
    if (offset < end) return i;
  }
  return pieces.length - 1;
}

/**
 * The rewrite, if it may stand: one sentence on one line, and every quotation in the original still
 * in it, character for character. Marks the model put round the whole of its answer come off.
 */
function mayStand(original: string, rewrite: string | null): string | null {
  let r = (rewrite ?? '').trim();
  if (/^["“].*["”]$/s.test(r) && !/^["“]/.test(original)) r = r.slice(1, -1).trim();
  if (!r || /\n/.test(r) || sentencesOf(r).length !== 1) return null;
  for (const [a, b] of quotedSpansOf(original)) {
    if (!r.includes(original.slice(a, b))) return null;
  }
  /*
   * AND NO QUOTATION THE ORIGINAL DID NOT HAVE. Openread, check-2: asked to fix a pronoun, the model
   * turned the single marks round "incredibly tight timelines" into double ones, and a phrase nobody
   * said was served as somebody's words. Whatever marks it uses, a passage may be in quotation marks
   * after the rewrite only if it was a quotation, word for word, before it.
   */
  const before = new Set(quotationsIn(original).map((q) => q.inner.trim()));
  if (quotationsIn(r).some((q) => !before.has(q.inner.trim()))) return null;
  return r;
}

const REMOVE = Symbol('remove');

export async function everyLineIsReadBeforeItIsKept<R extends Record<string, any>>(check: TheCheck<R>): Promise<{ report: R; done: WhatWasDone[] }> {
  const done: WhatWasDone[] = [];
  const fields = new Set(check.fields);
  const scope = (r: R) => Object.fromEntries(Object.entries(r).filter(([k]) => fields.has(k)));

  /* 1. Every stored sentence that fails for somebody who reads it. */
  /*
   * A LOWER-CASE START IS TWO SENTENCES THAT ARE REALLY ONE. "Whether the partnerships began. is still
   * true." is a line with a stray full stop in it, so the unit to rewrite is the sentence before and
   * this one together (`span` 2), and a rewrite of the second half alone could never be right.
   */
  type Found = { path: Path; index: number; span: number; problems: Map<string, AHit>; asRead: string };
  const found = new Map<string, Found>();
  const perReader = check.readers.map((reader) => ({
    reader,
    named: check.named(check.report, reader),
    served: allStrings(check.served(check.report, reader)),
  }));
  for (const [path, stored] of leaves(scope(check.report), [])) {
    const storedPieces = sentencesOf(stored);
    for (const { named, served } of perReader) {
      const asNamed = get(named, path);
      if (typeof asNamed !== 'string' || !served.has(asNamed)) continue;
      const hits = whatIsWrongWith(asNamed);
      if (!hits.length) continue;
      const namedPieces = sentencesOf(asNamed);
      /* Names never add or take away a sentence; if they did here, the line cannot be mapped back
         to its stored form safely, so it is left for the run to find rather than guessed at. */
      if (namedPieces.length !== storedPieces.length) continue;
      for (const h of hits) {
        const at = sentenceAt(namedPieces, h.at);
        const joined = h.what === 'sentence starting in lower case' && at > 0;
        const index = joined ? at - 1 : at;
        const span = joined ? 2 : 1;
        const key = `${show(path)}#${index}`;
        const f = found.get(key) ?? { path, index, span, problems: new Map(), asRead: '' };
        f.span = Math.max(f.span, span);
        f.asRead = namedPieces.slice(f.index, f.index + f.span).join('').trim();
        f.problems.set(h.what, h);
        found.set(key, f);
      }
    }
  }
  if (!found.size) return { report: check.report, done };

  /* 2. Each one rewritten once, the same sentence the same way wherever it appears. */
  const rewrites = new Map<string, string | null>();
  let calls = 0;
  const most = check.mostRewrites ?? 20;
  const edits = new Map<string, { path: Path; pieces: string[]; drop: Set<number>; taken: Set<number> }>();
  let report: any = JSON.parse(JSON.stringify(check.report));
  /* In the order the text runs, so a unit already taken into the one before it is not asked twice. */
  const inOrder = [...found.values()].sort((a, b) => (show(a.path) < show(b.path) ? -1 : show(a.path) > show(b.path) ? 1 : a.index - b.index));
  for (const f of inOrder) {
    const key = show(f.path);
    const leaf = edits.get(key) ?? { path: f.path, pieces: sentencesOf(get(report, f.path)), drop: new Set<number>(), taken: new Set<number>() };
    edits.set(key, leaf);
    if (leaf.taken.has(f.index)) continue;
    const unit = leaf.pieces.slice(f.index, f.index + f.span).join('');
    const sentence = unit.trim();
    const trailing = unit.slice(unit.trimEnd().length);
    const leading = unit.slice(0, unit.length - unit.trimStart().length);
    const problems = [...f.problems.keys()];
    const units = Array.from({ length: f.span }, (_x, k) => f.index + k);
    units.forEach((i) => leaf.taken.add(i));

    let candidate: string | null;
    if (rewrites.has(sentence)) candidate = rewrites.get(sentence)!;
    else if (calls >= most) candidate = null;
    else {
      calls += 1;
      candidate = mayStand(sentence, await check.rewrite({ sentence, problems, asRead: f.asRead }).catch(() => null));
      rewrites.set(sentence, candidate);
    }

    /*
     * 3. The rewrite is read again, on its own, as everybody who reads this line. On its own, so the
     * check does not depend on where the sentences around it now fall.
     */
    const clean = !!candidate && /^[^a-z]/.test(candidate) && check.readers.every((reader) => {
      const alone: any = JSON.parse(JSON.stringify(report));
      setAt(alone, f.path, candidate);
      const asNamed = get(check.named(alone, reader), f.path);
      return typeof asNamed !== 'string' || !whatIsWrongWith(asNamed).length;
    });
    if (candidate && clean) {
      leaf.pieces[f.index] = `${leading}${candidate}${trailing}`;
      for (const i of units.slice(1)) leaf.pieces[i] = '';
      done.push({ path: show(f.path), was: sentence, problems, now: candidate, outcome: 'rewritten' });
    } else if ([...f.problems.values()].some((h) => h.dropIfUnfixed)) {
      units.forEach((i) => leaf.drop.add(i));
      done.push({ path: show(f.path), was: sentence, problems, now: null, outcome: 'dropped' });
    } else {
      done.push({ path: show(f.path), was: sentence, problems, now: null, outcome: 'left, it could not be fixed and may not be dropped' });
    }
  }

  /* 4. Written back, with the no-blank rules. An item taken out is marked, and the marks are
     cleared at the end, so no position shifts under a write still to come. */
  for (const leaf of edits.values()) {
    const original = get(report, leaf.path);
    if (typeof original !== 'string') continue;
    const kept = leaf.pieces.filter((_p, i) => !leaf.drop.has(i));
    let text = kept.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) {
      const item = listItemOf(report, leaf.path);
      if (item) { setAt(report, item, REMOVE); continue; }
      /* A field on its own is never left blank: its sentences stay, with any rewrites kept. */
      for (const d of done) if (d.path === show(leaf.path) && d.outcome === 'dropped') d.outcome = 'left, it could not be fixed and may not be dropped';
      text = leaf.pieces.join('').trim();
    }
    const lead = (original.match(/^\s*/) ?? [''])[0];
    const tail = (original.match(/\s*$/) ?? [''])[0];
    setAt(report, leaf.path, `${lead}${text}${tail}`);
  }
  report = withoutRemoved(report);
  return { report: report as R, done };
}

/** The array item a leaf belongs to, when the leaf is the item or one field directly on it. */
function listItemOf(root: any, path: Path): Path | null {
  for (let i = path.length - 1; i >= 0; i -= 1) {
    if (typeof path[i] === 'number' && Array.isArray(get(root, path.slice(0, i)))) {
      return path.length - i <= 2 ? path.slice(0, i + 1) : null;
    }
  }
  return null;
}

function setAt(root: any, path: Path, value: any): void {
  const parent = get(root, path.slice(0, -1));
  if (parent != null) parent[path[path.length - 1] as any] = value;
}

function withoutRemoved(v: any): any {
  if (Array.isArray(v)) return v.filter((x) => x !== REMOVE).map(withoutRemoved);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = withoutRemoved(x);
    return out;
  }
  return v;
}

/**
 * WHAT THE MODEL IS TOLD WHEN IT IS ASKED TO REWRITE ONE LINE.
 *
 * In the code, not in `PromptVersion`: it is not the synthesis prompt and nothing overrides it, so the
 * version that runs is this one. Short on purpose - one sentence in, one sentence out.
 */
export const REWRITE_ONE_LINE = `You fix one sentence from a report before anybody reads it.

The sentence is written the way the report is stored. People in it are labels: "the initiator", "Participant A", "Participant B" and so on. When somebody reads the report, the product puts in each person's name, or "you" for the reader. So:
- Keep every label exactly as it is written. Never replace a label with a name, a role, "you", "the lead" or "the person who set this up". Where the sentence says "the person who set this up" or "the lead", write "the initiator".
- Never write he, she, him, her, they, their or them about a person. Say the label again instead.
- Keep everything inside quotation marks exactly as it is, marks included. Those are a person's own words.

Write ONE plain, full sentence in everyday English that says the same thing. Add no fact, name, number or date that is not in it already. Start with a capital letter. Do not join pieces with a colon. Do not cut a word short.

Reply with the sentence and nothing else.`;

/** The message that goes with it. */
export function theLineToRewrite(ask: { sentence: string; problems: string[]; asRead: string }): string {
  return [
    `The sentence, as stored: ${ask.sentence}`,
    `How one reader reads it: ${ask.asRead}`,
    `What is wrong with it: ${ask.problems.join('; ')}.`,
  ].join('\n');
}
