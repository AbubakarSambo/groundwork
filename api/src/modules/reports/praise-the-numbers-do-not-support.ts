/**
 * A JUDGEMENT NEVER PRAISES A CLAIM THE RECORD'S OWN NUMBERS CONTRADICT.
 *
 * Run 8, the sales scenario. Kwame's target is 14 approved facilities. His record says, in his words:
 *
 *   "All 22 facilities were pretty smooth, most of them just needed a little nudge."
 *   "I have three approved facilities already."
 *
 * Twenty-two applications, three approvals. The judgement the lead read told him to do this:
 *
 *   "Recognise Kwame Mensah for exceeding their target of 14 approved facilities."
 *   because "Kwame Mensah's record shows that 22 facilities were processed smoothly."
 *
 * and, stored the same day, "Participant C reports 22 approved facilities against a target of 14"
 * and "Participant C is exceeding their target". The record says the opposite, and the lead would
 * have praised a man who is eleven short.
 *
 * Hafsah: "a judgement must never praise a claim the material shows is wrong. Fix that, or hold back
 * the praise when the numbers don't support it." A prompt line has already lost on this scenario,
 * so this is the check behind it, run where the judgement is stored, while the text still holds
 * labels.
 *
 * WHAT IT DOES. It finds a sentence that praises what a person has reached - "Recognise / Praise /
 * Thank / Congratulate X for ..." with a figure, or "X has exceeded / is ahead of / has met / is on
 * track for / beat the target" - and looks at that person's facts: their target, with its unit words, the figures they gave, and any count the record
 * holds against the target. Where no figure in the record, in the target's own unit, reaches the
 * target, the praise is held back. A figure in a different unit never meets a target in another:
 * twenty-two applications are not fourteen approvals.
 *
 * AND A FIGURE CALLED A SUCCESS THE RECORD DOES NOT CALL ONE. "Participant C's 22 successful
 * applications", "22 approved facilities": his record holds 22 applications and three approvals.
 * Where the product's own sentence gives a figure a success word the record's own figures contradict,
 * it is held back too, in every section of the judgement, and in the findings, the opening and the
 * picture, which the board reads. Words in quotation marks are theirs and are never judged, and a
 * plain report of what somebody said stays.
 *
 * WHAT IT NEVER DOES. It writes nothing. Praise the numbers support stays exactly as it is, a person
 * with no target in their record is left alone, and nothing is put where the praise was: no new
 * charge against the person and no label. Held back means removed, by the same no-blank rules as
 * a-quote-is-what-they-said: a move or a line of what the numbers say goes whole, and a sentence of
 * the gap goes on its own. A gap left with nothing in it is removed rather than stored blank, and the
 * screen shows no heading over nothing.
 */
import { WORD_VALUES } from './a-number-written-as-a-word-is-a-number';
import type { PersonFacts } from './the-facts-about-a-person';

/** One person the judgement could be talking about, as it names them, and what the record holds. */
export interface APersonThePraiseCouldBeAbout {
  /** The label the judgement is written about, e.g. "Participant C". */
  who: string;
  /** What the lead wrote when they added them, which is where "Target 14 approved facilities" lives. */
  role?: string | null;
  facts?: Pick<PersonFacts,
    'whatTheySaidItWasFor' | 'whereTheySayTheyAre' | 'anEarlierFigureTheyGave' | 'numbers'
    | 'aNumberSetForThemTheyHaveNeverSaid' | 'twoNumbersForOneTarget'> | null;
}

/** A figure in a sentence, with the words either side of it. */
interface AFigure { value: number; unit: string[]; before: string[] }

/** A target with the words that say what it counts, e.g. 14 and ["approved", "facilities"]. */
interface ATarget { value: number; unit: string[]; soFar: number | null }

const SCALE: Record<string, number> = { k: 1e3, m: 1e6, mn: 1e6, bn: 1e9, thousand: 1e3, million: 1e6, billion: 1e9 };
const A_FIGURE = new RegExp(
  `(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?|\\b(?:${Object.keys(WORD_VALUES).join('|')})\\b)(?:\\s*(k|m|mn|bn|thousand|million|billion)\\b)?`,
  'gi',
);

/* Words that end what a figure counts: "14 approved facilities THIS quarter", "22 IN the pipeline". */
const NOT_A_UNIT = new Set(['this', 'that', 'the', 'a', 'an', 'of', 'by', 'per', 'in', 'on', 'for', 'so', 'far',
  'already', 'now', 'total', 'quarter', 'month', 'week', 'year', 'today', 'each', 'every', 'and', 'to', 'are',
  'is', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'i', 'we', 'my', 'our', 'their', 'his', 'her', 'your',
  'they', 'he', 'she', 'it', 'at', 'with', 'from', 'or', 'but', 'when', 'target', 'targets', 'goal', 'more',
  'than', 'out', 'which', 'who', 'all', 'just', 'only', 'right', 'there', 'team', 'targeting', 'tracking', 'aiming',
  'wants', 'want', 'set', 'across', 'about', 'around', 'nearly', 'almost', 'over', 'under', 'against']);

/* The words just before a figure that make it the target rather than something reached. */
const A_TARGET_WORD = /^(?:target|targets|targeting|targeted|goal|goals|aim|aiming|aims|quota|plan|planned|expected|expects|expect|want|wants|hoping|hope|of)$/;

const stem = (w: string): string => (w.length >= 5 ? w.slice(0, 5) : w);
const wordsOf = (t: string): string[] => (t.toLowerCase().match(/[a-z]+/g) ?? []);

function figuresIn(text: string): AFigure[] {
  const out: AFigure[] = [];
  for (const m of (text ?? '').matchAll(A_FIGURE)) {
    const raw = m[1].toLowerCase();
    const base = /\d/.test(raw) ? Number(raw.replace(/,/g, '')) : WORD_VALUES[raw];
    /* A scale word read on its own ("a million") is its own figure; after a figure it is the scale. */
    const value = base * (m[2] ? SCALE[m[2].toLowerCase()] ?? 1 : 1);
    if (!Number.isFinite(value)) continue;
    const at = m.index ?? 0;
    const after = wordsOf(text.slice(at + m[0].length)).slice(0, 4);
    const unit: string[] = [];
    for (const w of after) {
      if (NOT_A_UNIT.has(w) || unit.length >= 3) break;
      unit.push(w);
    }
    out.push({ value, unit, before: wordsOf(text.slice(0, at)).slice(-6) });
  }
  return out;
}

/*
 * A GOAL IS NOT A CLAIM. "Participant B is working to get 14 approved facilities", "Participant A is
 * to bring in 12 approved facilities this quarter", "The initiator's goal is 40 approved facilities":
 * all three were held back on the first live runs, because the figure was read as something reached.
 * The figure in a sentence about what somebody is aiming for, working to, is to bring in, is tracking
 * or agrees is the goal IS the target, and is never a claim that it has been reached.
 */
const A_GOAL = /\b(?:goal|goals|target|targets|targeting|targeted|aim|aims|aiming|aimed|objective|objectives|quota|tracking|working (?:to|towards?|on getting)|(?:is|are|was|were) to|(?:has|have|had|needs?) to|plans? to|planning to|hop(?:e|es|ing) (?:to|for)|wants? (?:to|for)|expect(?:s|ed|ing)? to|trying to|push(?:es|ing)? (?:for|to)|responsible for)\b/;
const isATargetFigure = (f: AFigure): boolean =>
  f.before.slice(-3).some((w) => A_TARGET_WORD.test(w)) || A_GOAL.test(f.before.join(' '));
/** Does a figure count the thing the target counts? Every unit word of the target, among its own. */
const sameUnit = (target: string[], figure: string[]): boolean =>
  target.length > 0 && target.every((w) => figure.some((u) => stem(u) === stem(w)));

/**
 * THE TARGETS THE RECORD HOLDS FOR THEM, each with what it counts. A target whose unit cannot be
 * read is not a target this can judge, and is left out, so the praise about it is left alone.
 */
function theirTargets(p: APersonThePraiseCouldBeAbout): ATarget[] {
  const out: ATarget[] = [];
  const add = (value: number, unit: string[], soFar: number | null = null) => {
    if (!Number.isFinite(value) || value <= 0 || !unit.length) return;
    out.push({ value, unit, soFar });
  };
  /* A figure the words name as the target: "Target 14 approved facilities this quarter". */
  for (const f of figuresIn(p.role ?? '')) if (isATargetFigure(f)) add(f.value, f.unit);
  /* Their own definition of success, where it is a figure: "14 approved facilities". */
  for (const f of figuresIn(p.facts?.whatTheySaidItWasFor ?? '')) add(f.value, f.unit);
  /* The numbers on the board, with the count the record holds against each. */
  const unitOf = (what: string, value: number): string[] => {
    const f = figuresIn(what).find((x) => Math.abs(x.value - value) < Math.max(1, value * 0.005) && x.unit.length);
    return f ? f.unit : wordsOf(what).filter((w) => w.length >= 3 && !NOT_A_UNIT.has(w)).slice(-3);
  };
  for (const n of p.facts?.numbers ?? []) add(n.target, unitOf(n.what, n.target), n.soFar);
  const never = p.facts?.aNumberSetForThemTheyHaveNeverSaid;
  if (never) add(never.target, unitOf(never.what, never.target));
  const two = p.facts?.twoNumbersForOneTarget;
  if (two) {
    add(two.theLeads, unitOf(two.what, two.theLeads));
    add(two.theirs, unitOf(two.what, two.theirs));
  }
  return out;
}

/** The figures they gave for where they are: never a figure they named as a target. */
function whatTheyReached(p: APersonThePraiseCouldBeAbout): AFigure[] {
  return [p.facts?.whereTheySayTheyAre, p.facts?.anEarlierFigureTheyGave]
    .flatMap((t) => figuresIn(t ?? ''))
    .filter((f) => !isATargetFigure(f));
}

/* Praise of what somebody reached, in the words a judgement writes it. */
const PRAISE_VERB = /^\s*(?:recogni[sz]e|praise|thank|congratulate|reward|celebrate|commend|acknowledge|highlight)\b/i;
const ATTAINMENT = /\b(?:exceed(?:s|ed|ing)?|surpass(?:es|ed|ing)?|outperform(?:s|ed|ing)?|overachiev\w*|ahead of|on track|on course|beat(?:s|en|ing)?|achieved|(?:has|have|had)\s+(?:already\s+)?(?:met|hit|reached|passed)|(?:above|past|over|met|hit|reached)\s+(?:their|his|her|the|your)\s+target)\b/i;
/* Words that make it the opposite, a question, or the correction itself: "says he is ahead, but ...". */
const NOT_PRAISE = /\b(?:not|never|no longer|isn't|hasn't|haven't|aren't|won't|whether|if|but|however|although|though|whereas|yet|only|believes?|thinks?|claims?|feels?)\b|n't\b/i;

const sentencesOf = (t: string): string[] => (t ?? '').split(/(?<=[.!?])\s+(?=["“A-Z])/).filter((s) => s.trim());
/* Their own words, in quotation marks, are theirs: only the product's own sentence is judged. */
const withoutTheirWords = (t: string): string => (t ?? '').replace(/["“][^"”]*["”]/g, ' ');

/*
 * A FIGURE CALLED A SUCCESS. "The details of Participant C's 22 successful applications": the record
 * holds 22 applications and three approvals, so nothing in it calls the 22 a success. A stage word
 * ("approved", "disbursed", "completed") must be the record's own for that figure; a general one
 * ("successful") must be matched by a figure the record itself gives a success word.
 */
const A_STAGE = /^(?:approved|approval|approvals|disbursed|signed|closed|won|delivered|converted|completed|complete|funded|paid)$/;
const A_SUCCESS = /^(?:successful|successfully|succeeded|success)$/;
const isASuccessWord = (w: string): boolean => A_STAGE.test(w) || A_SUCCESS.test(w);
const sameFigure = (a: number, b: number): boolean => Math.abs(a - b) < Math.max(1e-9, b * 0.005);

function aSuccessTheRecordDoesNotGive(f: AFigure, reached: AFigure[]): boolean {
  /*
   * ONLY WHERE THE RECORD SAYS OTHERWISE. "Participant C has three approvals" is true - his record
   * says three approved - and was held back on a live run. A figure equal to one the record gives in
   * the same unit is supported. It is held back only where the record's own figure in that unit is
   * lower, or where the record gives the same number in a different unit ("22 facilities").
   */
  const theSame = (r: AFigure) => sameFigure(r.value, f.value);
  const inAnotherUnit = reached.some((r) => theSame(r) && r.unit.length > 0 && !r.unit.some(isASuccessWord));
  const stage = f.unit.find((w) => A_STAGE.test(w));
  const counted = stage
    ? reached.filter((r) => r.unit.some((u) => stem(u) === stem(stage)))
    : f.unit.some((w) => A_SUCCESS.test(w)) ? reached.filter((r) => r.unit.some(isASuccessWord)) : null;
  if (!counted) return false;
  if (counted.some(theSame)) return false;
  if (counted.length && f.value > Math.max(...counted.map((r) => r.value))) return true;
  return inAnotherUnit;
}

/** Is this sentence a claim about what this person reached, and do their numbers fail to support it? */
function praiseTheirNumbersDoNotSupport(sentence: string, p: APersonThePraiseCouldBeAbout): boolean {
  const theProducts = withoutTheirWords(sentence);
  if (NOT_PRAISE.test(theProducts)) return false;
  const inTheSentence = figuresIn(theProducts).filter((f) => !isATargetFigure(f));
  const reached = whatTheyReached(p);
  if (inTheSentence.some((f) => aSuccessTheRecordDoesNotGive(f, reached))) return true;
  const targets = theirTargets(p);
  if (!targets.length) return false;
  const praises = ATTAINMENT.test(theProducts) || (PRAISE_VERB.test(theProducts) && inTheSentence.length > 0);
  if (!praises) return false;
  /* The target the sentence is about, where it names one's unit; otherwise any of theirs. */
  const words = wordsOf(theProducts);
  const named = targets.filter((t) => sameUnit(t.unit, words));
  const relevant = named.length ? named : targets;
  const supported = relevant.some((t) => (t.soFar != null && t.soFar >= t.value)
    || reached.some((f) => sameUnit(t.unit, f.unit) && f.value >= t.value));
  return !supported;
}

/* Handles as the judgement writes a person: the label in full, or a word of it nobody else's has. */
const GENERIC = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'their', 'they', 'target',
  'quarter', 'month', 'year', 'week', 'total', 'team', 'initiator', 'party', 'participant', 'borrower',
  'officer', 'relationship', 'manager', 'lead', 'director', 'approved', 'facilities', 'loan', 'machine']);
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function whoIsNamed(people: APersonThePraiseCouldBeAbout[]): (text: string) => APersonThePraiseCouldBeAbout[] {
  const handlesOf = (who: string): string[] => (who ?? '').toLowerCase().match(/[a-z]{4,}/g)?.filter((w) => !GENERIC.has(w)) ?? [];
  const tests = people.map((p) => {
    const others = people.filter((x) => x.who !== p.who).flatMap((x) => handlesOf(x.who));
    const own = handlesOf(p.who).filter((w) => !others.includes(w));
    const all = [(p.who ?? '').trim(), ...own].filter(Boolean).map((h) => new RegExp(`(?<![A-Za-z])${escape(h)}(?![A-Za-z])`, 'i'));
    return { p, all };
  });
  return (text) => tests.filter((x) => x.all.some((r) => r.test(text ?? ''))).map((x) => x.p);
}

/* The keys that say who an item is about, or are identifiers, never the product's prose. */
const NOT_PROSE = /^(label|participantLabel|who|on|from|fieldId|startWith|code|status|type|band|tone)$|Id$|Ids$/;
const WHO_KEYS = ['startWith', 'fieldId', 'participantLabel', 'who', 'label', 'on'];
const REMOVE = Symbol('remove');

function aCheck(people: APersonThePraiseCouldBeAbout[]) {
  const named = whoIsNamed(people);
  /* A sentence about nobody by name is about the person the item or paragraph is about, where known. */
  return (sentence: string, fallback: string | null | undefined): boolean => {
    let about = named(withoutTheirWords(sentence));
    if (!about.length && fallback) about = named(fallback);
    return about.some((p) => praiseTheirNumbersDoNotSupport(sentence, p));
  };
}

/**
 * THE JUDGEMENT WITH THE PRAISE ITS NUMBERS DO NOT SUPPORT HELD BACK, IN EVERY SECTION, and each
 * sentence held back, as it was written, for the log. Everything else is returned exactly as it came.
 *
 * Every section, not a list of them: whatThisCannotTellYou carried "The details of Participant C's
 * 22 successful applications" after the move and the line of numbers had gone. The rules are the
 * same as a-quote-is-what-they-said's. An item of a list that holds such a sentence goes whole; a
 * field on its own loses the sentence; a field left with nothing is removed rather than stored blank.
 */
export function praiseTheNumbersDoNotSupport<J extends Record<string, any>>(
  judgement: J,
  people: APersonThePraiseCouldBeAbout[],
): { judgement: J; heldBack: string[] } {
  if (!judgement || !people?.length) return { judgement, heldBack: [] };
  const offends = aCheck(people);
  const heldBack: string[] = [];

  const walk = (v: any, fallback: string | null, inAList: boolean): any => {
    if (typeof v === 'string') {
      const sentences = sentencesOf(v);
      const bad = sentences.filter((s) => offends(s, fallback));
      if (!bad.length) return v;
      heldBack.push(...bad);
      if (inAList) return REMOVE;
      const kept = sentences.filter((s) => !bad.includes(s));
      return kept.length ? kept.join(' ') : REMOVE;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, fallback, true)).filter((x) => x !== REMOVE);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const who = WHO_KEYS.map((k) => v[k]).find((x) => typeof x === 'string' && x.trim()) ?? fallback;
      if (inAList) {
        for (const [k, val] of Object.entries(v)) {
          if (NOT_PROSE.test(k) || typeof val !== 'string') continue;
          const bad = sentencesOf(val).find((s) => offends(s, who));
          if (bad) { heldBack.push(bad); return REMOVE; }
        }
      }
      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) {
        if (NOT_PROSE.test(k)) { out[k] = val; continue; }
        const r = walk(val, who, false);
        if (r !== REMOVE) out[k] = r;
      }
      return out;
    }
    return v;
  };
  const walked = walk(judgement, null, false);
  return { judgement: (walked === REMOVE ? {} : walked) as J, heldBack };
}

/**
 * THE SAME CHECK OVER ONE PARAGRAPH OF THE PRODUCT'S OWN: a person's finding, the opening, the
 * picture. `about` is whose paragraph it is, so "He has exceeded his target" is read as theirs.
 * Only the offending sentences go, and what they quoted in their own words is never judged.
 */
export function sentencesTheNumbersDoNotSupport(
  text: string,
  people: APersonThePraiseCouldBeAbout[],
  about: string | null = null,
): { text: string; heldBack: string[] } {
  if (!text?.trim() || !people?.length) return { text, heldBack: [] };
  const offends = aCheck(people);
  const paragraphs = text.split(/(\n\s*\n)/);
  const heldBack: string[] = [];
  const out = paragraphs.map((para) => {
    if (/^\n\s*\n$/.test(para)) return para;
    const sentences = sentencesOf(para);
    const bad = sentences.filter((s) => offends(s, about));
    if (!bad.length) return para;
    heldBack.push(...bad);
    return sentences.filter((s) => !bad.includes(s)).join(' ');
  }).join('').replace(/\n{3,}/g, '\n\n').trim();
  return { text: heldBack.length ? out : text, heldBack };
}
