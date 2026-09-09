import type { Drafted } from './the-engine-drafts-it-the-model-words-it';
import { roleMapFor, MIN_COACHING_CONFIDENCE } from '../board/role-maps';
import { WHO_CAN_MOVE_IT, WHAT_IT_MEANS, type Kind } from '../board/what-kind-of-thing-is-in-the-way';

/**
 * THE PICTURE FROM EVERYBODY IS DRAFTED FROM THE READS. THE MODEL WORDS IT.
 *
 * It used to be the most weighted prose on the page and the least accountable: a model handed the
 * whole corpus and asked for "a plain-language synthesis of the situation". Nothing checked it. The
 * pattern engine reached it as a suggestion the model could decline. Meanwhile `board/reads.ts`,
 * `coverage.ts`, the confidence read, the four tiles and the blocker rows all produce structured
 * claims over the same rows, and the picture used none of them.
 *
 * Now the claims come from the engines and the model may only choose the words. Every line here is
 * built from an engine's own output and travels with the strings the model must keep. Where there
 * is no engine basis at all, the picture is empty - it is not filled by a model over the transcript.
 *
 * ONE CLAIM, ONE LINE. Grouping is done here, so the phrasing pass is never asked to vary a mail
 * merge.
 */
export interface PictureInput {
  answered: number;
  ofPeople: number;
  confidence: { band: 'thin' | 'partial' | 'solid'; saying: string; reasons: string[] };
  tiles: { label: string; value: string; sub: string; tone: string }[];
  patterns: { who: string; signal: string; periodsObserved: number; positive: boolean }[];
  /** Per person, from buildCoverage: what is landing where, in the engine's words. */
  coverage: { name: string; reasonText: string }[];
  /** Per person, from buildContribution: the engine's reason line, where it has one. */
  contribution: { name: string; reason: string }[];
  blockers: { who: string | null; on: string | null; onIsPerson: boolean; what: string; kind: Kind | null; escalated: boolean }[];
  /** The written report's own agreed and open items. Model-authored, and labelled as such. */
  settled: string[];
  open: string[];
}

const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const theThing = (s: string) => s.replace(/[.\s]+$/, '');
/* Lower-case a first letter that is only capitalised because the row began a sentence. A name or
   an acronym keeps its case: two capitals in a row, or a capital followed by a non-letter, is left. */
const lower = (s: string) => (/^[A-Z]([a-z]|\s)/.test(s) && !/^I\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/**
 * WHICH LINE IS THE FINDING. The template on the marketing page leads with one sentence in amber,
 * then the four states, then the rest. The drafted lines are ranked for that slot: something in
 * the way outranks a read on coverage or contribution, which outranks a pattern, which outranks
 * the tile line, which outranks the settled-and-open line. The basis line never leads; it goes
 * underneath the finding, small.
 */
const FINDING_RANK: [RegExp, number][] = [[/^block-/, 0], [/^(cov|con)-/, 1], [/^pattern-/, 2], [/^reads$/, 3], [/^written$/, 4]];
export function pickTheFinding(keys: string[]): string | null {
  const ranked = keys
    .map((k) => ({ k, r: FINDING_RANK.find(([re]) => re.test(k))?.[1] ?? 9 }))
    .filter((x) => x.r < 9)
    .sort((a, b) => a.r - b.r);
  return ranked[0]?.k ?? null;
}

export function hasAnEngineBasis(i: PictureInput): boolean {
  return i.answered > 0 || i.patterns.length > 0 || i.coverage.length > 0 || i.contribution.length > 0 || i.blockers.length > 0;
}

export function draftThePicture(i: PictureInput): Drafted[] {
  if (!hasAnEngineBasis(i)) return [];
  const out: Drafted[] = [];

  /* Who this rests on, and how much there is to go on. Both are counts. */
  out.push({
    key: 'basis',
    text: `${i.answered} of ${i.ofPeople} ${i.ofPeople === 1 ? 'person has' : 'people have'} answered this session. ${i.confidence.saying}`,
    mustKeep: [i.confidence.saying],
  });

  /* The four reads, only where one wants attention. A row of "None" is the tiles' job, not prose. */
  const attention = i.tiles.filter((t) => t.tone === 'warn' || t.tone === 'bad');
  if (attention.length) {
    out.push({
      key: 'reads',
      text: attention.map((t) => `${t.label}: ${t.value}, ${t.sub}.`).join(' '),
      mustKeep: attention.flatMap((t) => [t.value, t.sub]),
    });
  }

  /* What is in the way, grouped by kind so who-can-move-it is said once. */
  if (i.blockers.length) {
    const byKind = new Map<string, typeof i.blockers>();
    for (const b of i.blockers) byKind.set(b.kind ?? '', [...(byKind.get(b.kind ?? '') ?? []), b]);
    for (const [kind, bs] of byKind) {
      /* Five asks read out in one breath ("the rota, a clear list of what is mine, to be paid for
         the nights, a reply and...") is a list wearing a sentence. Past two, count them and name
         the first; the rows themselves sit in What people said. */
      const things = bs.map((b) => theThing(b.what));
      const items = things.length > 2 ? `${things.length} things, starting with ${lower(things[0])}` : andList(things.map(lower));
      const who = [...new Set(bs.map((b) => b.who).filter(Boolean))] as string[];
      /*
       * "ON" IS PEOPLE ONLY. Driven live: "waiting on You, role definition, payment for on-call work
       * and the on-call rota for the rota..." - the row's `onLabel` is whatever the person waiting
       * typed, and half the time it is the THING, not a person. A name resolved from a participant
       * id is a person; a free-text label is not trusted to be one.
       */
      const on = [...new Set(bs.map((b) => b.onIsPerson ? b.on : null).filter(Boolean))] as string[];
      const escalated = bs.filter((b) => b.escalated).length;
      /* The reader is "You" as a name and "you" mid-sentence. Read live as "waiting on You for". */
      const mid = (n: string) => (n === 'You' ? 'you' : n);
      /* "Zainab Bello and You are waiting": the reader's label is only capitalised when it opens the sentence. */
      const whoSaid = who.length ? andList(who.map((n, i) => (i === 0 ? n : mid(n)))) : 'Somebody';
      const head = `${whoSaid} ${who.length > 1 ? 'are' : 'is'} waiting${on.length ? ` on ${andList(on.map(mid))}` : ''} for ${items}${escalated ? `, ${escalated === bs.length ? 'and has escalated it' : `and ${escalated} of ${bs.length} has been escalated`}` : ', with no escalation on record'}.`;
      const tail = kind ? ` ${WHAT_IT_MEANS[kind as Kind]} ${WHO_CAN_MOVE_IT[kind as Kind]}` : '';
      out.push({
        key: `block-${kind || 'unkinded'}`,
        text: head + tail,
        mustKeep: [...(things.length > 2 ? [lower(things[0])] : things.map(lower)), ...(kind ? [WHAT_IT_MEANS[kind as Kind], WHO_CAN_MOVE_IT[kind as Kind]] : [])],
      });
    }
  }

  /* What keeps showing up. The library's sentence, and the count that makes it a pattern. */
  for (const p of i.patterns) {
    out.push({
      key: `pattern-${p.who}-${p.signal.slice(0, 16)}`,
      text: `${p.who}: ${p.signal} Seen across ${p.periodsObserved} sessions${p.positive ? ', which is a good sign' : ''}.`,
      mustKeep: [p.signal],
    });
  }

  /*
   * WHOSE WORK IS LANDING WHERE, AND THE CONTRIBUTION READ, GROUPED BY WHAT THEY SAY.
   *
   * Driven live, three people got the identical coverage reason - "The role was never clearly
   * defined, so there is no boundary to measure work against" - and the picture printed it three
   * times with a name swapped. That is the mail-merge shape, from an engine. One claim that is true
   * of several people is one line naming them all.
   */
  const grouped = (rows: { name: string; text: string }[], prefix: string) => {
    const byText = new Map<string, string[]>();
    for (const r of rows) byText.set(r.text, [...(byText.get(r.text) ?? []), r.name]);
    for (const [text, names] of byText) {
      const all = names.length === i.ofPeople && i.ofPeople > 1;
      out.push({
        key: `${prefix}-${text.slice(0, 24)}`,
        text: all ? `For everybody here: ${lower(text)}` : `${andList(names)}: ${lower(text)}`,
        mustKeep: [lower(text)],
      });
    }
  };
  grouped(i.coverage.map((c) => ({ name: c.name, text: c.reasonText })), 'cov');
  grouped(i.contribution.map((c) => ({ name: c.name, text: c.reason })), 'con');

  /*
   * THE WRITTEN REPORT'S OWN ITEMS, LABELLED AS ITS. No engine produces "agreed" and "open", so they
   * stay the model's - but the picture says so, rather than presenting them as measurement.
   */
  if (i.settled.length || i.open.length) {
    const parts: string[] = [];
    /* "settled on A clear, written rota": a row that was a sentence of its own starts lower-case
       once it sits inside one. */
    const settled = i.settled.map((t) => lower(theThing(t)));
    const open = i.open.map((t) => lower(theThing(t)));
    if (settled.length) parts.push(`settled on ${andList(settled)}`);
    if (open.length) parts.push(`still open on ${andList(open)}`);
    out.push({
      key: 'written',
      text: `As the written report reads it, this is ${parts.join(' and ')}.`,
      mustKeep: [...settled, ...open],
    });
  }
  return out;
}

/**
 * THE CONVERSATION WORTH HAVING, FROM THE ROLE MAP AND THE BLOCKER KIND.
 *
 * It was a model's question over the transcript. Two engines already hold questions: every role map
 * carries `neutralProbes` - normal questions about the work whose answer's shape is the signal - and
 * every blocker kind carries who can move it. The blocker one leads, because it is the actionable
 * one. With no confident function in the round and no kinded blocker there is no question, and the
 * section says so rather than asking the model for one.
 */
export interface QuestionInput {
  functions: { fn: string | null; confidence: number | null }[];
  blockers: { what: string; kind: Kind | null }[];
}

export function draftTheQuestion(i: QuestionInput): Drafted | null {
  const kinded = i.blockers.find((b) => b.kind);
  if (kinded) {
    const k = kinded.kind as Kind;
    return {
      key: 'question',
      text: `${WHO_CAN_MOVE_IT[k]} For ${theThing(kinded.what)}: who is that, and have they been asked?`,
      mustKeep: [WHO_CAN_MOVE_IT[k], theThing(kinded.what)],
    };
  }
  const counts = new Map<string, number>();
  for (const f of i.functions) {
    if (!f.fn || (f.confidence ?? 0) < MIN_COACHING_CONFIDENCE) continue;
    counts.set(f.fn, (counts.get(f.fn) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const map = top ? roleMapFor(top[0]) : null;
  const probe = map?.neutralProbes?.[0];
  if (!probe) return null;
  return { key: 'question', text: probe, mustKeep: [probe] };
}

export const WHY_NO_QUESTION =
  'No question yet. One comes from what kind of thing is in the way, or from the kind of work this is once the record has shown it clearly. Neither is on record here.';
