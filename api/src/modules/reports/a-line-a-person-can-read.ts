/**
 * A LINE A PERSON CAN READ: THE CHECK, AS CODE.
 *
 * The run scorer (tools/score_run.py) counts what is wrong with what people read across the
 * twenty-four scenarios, with one regular expression per fault, in its PROBLEMS table. Those counts
 * are the bar for task 1.6: every one of them at zero. This is the same list, in the same
 * expressions, so the product can run the scorer's test on a line before the line is saved, instead
 * of a run finding it three weeks later.
 *
 * KEEP THEM THE SAME. When the scorer changes a pattern, this file changes with it; the spec beside
 * this file reads the scorer and fails when the two drift. `plain-words.ts` holds the rulebook the
 * model is told; this is the part that can be tested.
 *
 * Two are added that the scorer does not count yet, both named in the task:
 *   - doubled quotation marks ("" or “” or a mark twice around one word), and
 *   - a pronoun that disagrees with the reader: "You say their goal is ..." is what the person
 *     reads when the stored line was "Participant A says their goal is ...". Only knowable once the
 *     line is rendered for the reader, which is why it is here and not in the prompt.
 */

import { quotationsIn } from './a-quote-is-what-they-said';

export interface AProblem {
  /** The scorer's own name for it, word for word, where it has one. */
  what: string;
  pattern: RegExp;
  /** When a rewrite cannot fix it, whether the sentence goes. A doubtful catch is only rewritten. */
  dropIfUnfixed: boolean;
}

/*
 * The scorer's "sentence starting in lower case". Exported on its own because the conversation
 * repairs this one without a model call (see a-sentence-starts-with-a-capital).
 */
export const LOWER_CASE_START = /(?<=[a-z])(?<!\bvs)(?<!\betc)(?<!e\.g)(?<!i\.e)\. (?!e\.g|i\.e)[a-z]{2,}\b/g;

/** The scorer's PROBLEMS, one for one, in the order it lists them. */
export const WHAT_THE_SCORER_COUNTS: AProblem[] = [
  { what: 'slot names glued to answers', pattern: /(said this was for:|What they report:|Where they say they stand now:|What they say is in the way:|reported this:|named this as being in the way:)/g, dropIfUnfixed: true },
  { what: 'internal labels shown (initiator, Participant A, the person who set this up)', pattern: /\b(the initiator|The initiator|Participants? [A-Z](?:, [A-Z])*(?:,? and [A-Z])?\b|the person who set this up)/g, dropIfUnfixed: true },
  { what: 'machine table words shown (FIELD:, standing:, by kind -, answered ·)', pattern: /(FIELD:|standing: |by kind - | · answered )/g, dropIfUnfixed: true },
  { what: 'sentence starting in lower case', pattern: LOWER_CASE_START, dropIfUnfixed: true },
  { what: '"nothing contradicts" then differences', pattern: /nothing in any single account contradicts/g, dropIfUnfixed: true },
  /* The scorer reads this one off a JSON key, so on a sentence it never matches; kept for the count. */
  { what: 'name with a stray full stop', pattern: /"participantLabel": "[A-Z][a-z]+ [A-Z][a-z]+\."/g, dropIfUnfixed: false },
  { what: '"1 people"', pattern: /\b1 people\b|\b1 of 1 people\b/g, dropIfUnfixed: true },
  { what: 'role description used as a name', pattern: /\. Target \d+ [a-z ]+this quarter\.|(?<=[a-z])\. Target \d+/g, dropIfUnfixed: true },
  { what: 'text cut mid-word', pattern: /[A-Za-z]\.\.\.\.|[a-z]{1,3}\.\.\.$|\b[a-z]\.\.\.\./g, dropIfUnfixed: true },
];

/** Named in task 1.6 and not (yet) counted by the scorer. */
export const WHAT_THE_TASK_ADDS: AProblem[] = [
  { what: 'doubled quote marks', pattern: /""|“”|””|““|"“|”"|"”|“"/g, dropIfUnfixed: true },
  {
    what: 'a pronoun that disagrees with the reader',
    /* "You say their goal", "You say they expect": the reader is "you" and the rest of the clause
       still talks about them in the third person. A client or a team can be "they" too, so this is
       only ever rewritten, never dropped. */
    pattern: /\bYou (?:say|said|believe|expect|think|report|describe|want|feel|told|mention(?:ed)?)\b[^.?!;]*?\b(?:they|their|them|theirs|themselves)\b/g,
    dropIfUnfixed: false,
  },
  {
    what: 'a verb that disagrees with the reader',
    /*
     * Two shapes, both read by a lead on check-1 and check-2:
     *   "You also believes the credit committee is the only delay" - one or two adverbs between "you"
     *     and a verb still in the third person (the serve step now fixes the common ones; this is the
     *     catch for any it does not know);
     *   "You expect Tobi Adewale to take on the renewals, but has not communicated this" - a second
     *     verb after "but" or "and" with no subject, in the third person, where the only subject in
     *     the sentence is the reader.
     * NOT FIXED AT THE SERVE STEP, because it cannot be done safely there: in "You say the office move
     * is going well, and is on schedule" the second verb belongs to the office move. A rewrite that
     * knows the sentence can tell; a regular expression cannot. So these go to the one batched
     * rewrite, and are never dropped.
     */
    pattern: /(?<!\b(?:for|to|with|on|at|from|of|about|by|than|like)\s)\b[Yy]ou (?:(?:also|still|only|now|already|never|just|really|even|often|always|usually|actually|then) ){0,2}(?:is|was|has|does|says|believes|thinks|expects|wants|feels|needs|knows|agrees|plans|sees|reports|describes)\b|\bYou\b[^.?!]*?,? (?:but|and) (?:(?:also|still|only|now|already|never|just) )?(?:has|is|was|does|says|believes|thinks|expects|reports|wants|feels|needs|plans|knows|agrees|sees)\b/g,
    dropIfUnfixed: false,
  },
  {
    what: 'a pattern used as a label on a person, rather than saying what happened',
    /*
     * DECISION 11: NO LABEL. "You have a pattern of replacing a decision with a conversation about
     * the decision" and "The record shows a pattern of you holding on to..." both put a pattern on
     * the reader as a description of them, rather than saying what happened and how often - the
     * exact thing patterns/who-reads-a-pattern's own rule 2 (never a label beside a name) already
     * refuses at the serve step. This is the same rule, for a sentence the judgement wrote that
     * never went near that step. Never dropped: what happened is still worth saying.
     */
    pattern: /\ba pattern of\b|\bpattern of you\b|\byour pattern\b|\bthe pattern of\b/g,
    dropIfUnfixed: false,
  },
];

export const EVERY_PROBLEM: AProblem[] = [...WHAT_THE_SCORER_COUNTS, ...WHAT_THE_TASK_ADDS];

/*
 * The quoted spans in a line: somebody's own words, which no check may change. The quote pass's own
 * reading of what a quotation is (a-quote-is-what-they-said), single marks included, so the two can
 * never disagree about where somebody's words start and stop.
 */
export interface AHit {
  what: string;
  /** The words that matched. */
  found: string;
  /** Where the fault is in the line: for a lower-case start, the first letter of the new sentence. */
  at: number;
  dropIfUnfixed: boolean;
}

const global = (re: RegExp) => new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);

/** The quoted spans of a line, as [start, end) offsets. */
export function quotedSpansOf(line: string): [number, number][] {
  return quotationsIn(line ?? '').map((q) => [q.start, q.end]);
}

/**
 * Every problem in one line, except a match that sits wholly inside somebody's quoted words - those
 * are theirs, and a check that rewrote them would put words in their mouth.
 */
export function whatIsWrongWith(line: string, problems: AProblem[] = EVERY_PROBLEM): AHit[] {
  if (!line) return [];
  const quotes = quotedSpansOf(line);
  const insideAQuote = (a: number, b: number) => quotes.some(([s, e]) => a >= s && b <= e);
  const hits: AHit[] = [];
  for (const p of problems) {
    for (const m of line.matchAll(global(p.pattern))) {
      if (insideAQuote(m.index!, m.index! + m[0].length)) continue;
      const at = p.pattern === LOWER_CASE_START ? m.index! + 2 : m.index!;
      hits.push({ what: p.what, found: m[0], at, dropIfUnfixed: p.dropIfUnfixed });
    }
  }
  return hits;
}
