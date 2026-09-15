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
  /** Where two people describe the same thing differently, from the written report's own read. */
  differences?: { topic: string; sides: { who: string; says: string }[] }[];
  answered: number;
  ofPeople: number;
  confidence: { band: 'thin' | 'partial' | 'solid'; saying: string; reasons: string[] };
  tiles: { label: string; value: string; sub: string; tone: string }[];
  patterns: { who: string; signal: string; periodsObserved: number; positive: boolean; carrying?: boolean }[];
  /** Per person, from buildCoverage: what is landing where, in the engine's words. */
  coverage: { name: string; reasonText: string }[];
  /** Per person, from buildContribution: the engine's reason line, where it has one. */
  contribution: { name: string; reason: string }[];
  blockers: { who: string | null; on: string | null; onIsPerson: boolean; what: string; kind: Kind | null; escalated: boolean; named?: boolean }[];
  /** The written report's own agreed and open items. Model-authored, and labelled as such. */
  settled: string[];
  open: string[];
  /*
   * THE ARITHMETIC, WHICH OUTRANKS EVERYTHING ELSE WHEN IT HAS SOMETHING TO SAY.
   *
   * Read off a live three-person report: the objective was 10,000 units of tea, the three people in
   * it had described 2,000 units, 150 bags and 50 bags each, and the finding read "the role was
   * never clearly defined, so there is no boundary to measure work against" - true of almost every
   * check-in ever run, and no use to anybody.
   *
   * Her words: "doesnt tell us to go work out individual targets and also the fact that all of us
   * are listing goals too low to meet the objective." One sentence of arithmetic beats any read on
   * coverage, because a number that does not reach another number is not a matter of opinion.
   */
  numbers?: string | null;
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
const FINDING_RANK: [RegExp, number][] = [[/^numbers$/, -1], [/^differs-/, 0], [/^block-/, 1], [/^(cov|con)-/, 2], [/^pattern-/, 3]];
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

  /*
   * THE NUMBERS FIRST, where there are any. It leads the picture and it takes the finding slot,
   * because arithmetic about the objective outranks every read in this file. See PictureInput.
   */
  if (i.numbers?.trim()) {
    /* The line arrives written for the model with an instruction on the end of it; the picture
       wants only the fact. Everything up to the first instruction sentence is the fact. */
    const fact = i.numbers.replace(/^THE NUMBERS:\s*/, '').split(/\s(?:Lead with this|Say so|That is worth saying)\b/)[0].trim();
    out.push({ key: 'numbers', text: fact.endsWith('.') ? fact : `${fact}.`, mustKeep: [] });
  }

  /* Who this rests on, and how much there is to go on. Both are counts. */
  out.push({
    key: 'basis',
    text: `${i.answered} of ${i.ofPeople} ${i.ofPeople === 1 ? 'person has' : 'people have'} answered this session. ${i.confidence.saying}`,
    mustKeep: [i.confidence.saying],
  });

  /* The four reads, only where one wants attention. A row of "None" is the tiles' job, not prose. */
  /* The tiles say what the tiles say. A line restating them ("Differences: 1, still open. How much was
     said: All from memory") was the mail merge in paragraph form, and it went. Same for the
     settled-and-open line: those rows have their own place. */
  /* THE DIFFERENCE IS THE FINDING. "Abubak says success is usage; Hafsah says it is five contracts"
     is the sharpest fact a shared report can carry, and the board already had it while the picture
     led with coverage boilerplate. One line per difference, both sides in it. */
  for (const d of i.differences ?? []) {
    const sides = d.sides.filter((x) => x.who && x.says.trim());
    if (sides.length < 2) continue;
    const said = sides.map((x) => `${x.who} says ${lower(theThing(x.says))}`);
    out.push({
      key: `differs-${d.topic.slice(0, 24)}`,
      text: `On ${lower(theThing(d.topic))}: ${andList(said)}.`,
      mustKeep: sides.map((x) => lower(theThing(x.says))),
    });
  }
  if (i.blockers.length) {
    const byKind = new Map<string, typeof i.blockers>();
    for (const b of i.blockers) byKind.set(b.kind ?? '', [...(byKind.get(b.kind ?? '') ?? []), b]);
    for (const [kind, bs] of byKind) {
      /* Five asks read out in one breath ("the rota, a clear list of what is mine, to be paid for
         the nights, a reply and...") is a list wearing a sentence. Past two, count them and name
         the first; the rows themselves sit in What people said. */
      /*
       * "MARKETING ANALYST IS WAITING FOR WAITING ON SOMEONE ELSE" - read off a live run, and not a
       * sentence anybody would write.
       *
       * `what` is the person's own words, and where they never said what they were waiting ON it is
       * a clause rather than a noun: "waiting on someone else", "something". The template put it
       * after "for" and produced that. The row is RIGHT - they are blocked and did not say on what -
       * so the fix is the sentence, not the row.
       *
       * The named ones fill the list. The rest are counted and said as what they are, which is the
       * more useful thing for somebody reading it anyway: a manager who knows that two people are
       * stuck on something they have not named knows exactly what to ask.
       */
      const named = bs.filter((b) => b.named !== false);
      const unnamed = bs.length - named.length;
      const things = named.map((b) => theThing(b.what));
      const namedItems = things.length > 2 ? `${things.length} things, starting with ${lower(things[0])}` : andList(things.map(lower));
      const notSaid = unnamed === 1 ? 'something they have not named' : `${unnamed} things they have not named`;
      const items = things.length && unnamed ? `${namedItems}, and ${notSaid}` : things.length ? namedItems : notSaid;
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
      /*
       * "YOU IS WAITING ON RUNA" - read off a live report, 11 September.
       *
       * The verb agreed with how many people were waiting, which is right for every name and wrong
       * for the one subject that is a pronoun. "You" takes a plural verb however many of you there
       * are, so the subject decides it and the count only decides the rest.
       */
      const subjectIsYou = who.length === 1 && who[0] === 'You';
      const head = `${whoSaid} ${who.length > 1 || subjectIsYou ? 'are' : 'is'} waiting${on.length ? ` on ${andList(on.map(mid))}` : ''} for ${items}${escalated ? `, ${escalated === bs.length ? (who.length > 1 || subjectIsYou ? 'and have escalated it' : 'and has escalated it') : `and ${escalated} of ${bs.length} has been escalated`}` : ', with no escalation on record'}.`;
      const tail = kind ? ` ${WHAT_IT_MEANS[kind as Kind]} ${WHO_CAN_MOVE_IT[kind as Kind]}` : '';
      out.push({
        key: `block-${kind || 'unkinded'}`,
        text: head + tail,
        /* Only the things somebody actually named are held through the rewrite. "something they
           have not named" is the product's own phrasing and does not need protecting. */
        mustKeep: [...(things.length > 2 ? [lower(things[0])] : things.map(lower)), ...(kind ? [WHAT_IT_MEANS[kind as Kind], WHO_CAN_MOVE_IT[kind as Kind]] : [])],
      });
    }
  }

  /* What keeps showing up. The library's sentence, and the count that makes it a pattern. */
  for (const p of i.patterns) {
    out.push({
      key: `pattern-${p.who}-${p.signal.slice(0, 16)}`,
      /* Three endings, because there are three kinds of pattern and the middle one is neither
         praise nor a problem with the person. See CARRYING_CODES. */
      text: `${p.who}: ${p.signal} Seen across ${p.periodsObserved} sessions${
        p.positive ? ', which is a good sign' : p.carrying ? ', and that is worth somebody looking at' : ''
      }.`,
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
