/**
 * A SENTENCE THE PRODUCT WRITES IS PLAIN: THE WORDING CHECK FOR CODE-COMPOSED TEXT (week 26, task 1.6).
 *
 * `a-line-a-person-can-read.ts` holds the scorer's own tests for text the model wrote. This file holds
 * the rules for the sentences the product composes itself in code, from templates and from parts,
 * on the board and in the reports. The spec `the-product-writes-plain-sentences.spec.ts` builds
 * each section from fixtures and runs every served string through `whatIsNotPlainIn`.
 *
 * Somebody's own words are never checked: a quoted span is theirs, and a field that carries their
 * words (said, theirWords, quote, quotes) is skipped by the walker, not by the rules here.
 */
import { whatIsWrongWith } from './a-line-a-person-can-read';
import { quotedSpansOf } from './a-line-a-person-can-read';

export interface ANotPlain { rule: string; found: string }

/* The scorer's own JARGON list (tools/score_run.py). */
const JARGON = /\b(bottlenecks?|pipeline|stakeholders?|alignment|leverage|deliverables?|escalat\w*|cadence|KPIs?|synergy|bandwidth|actionable|vs)\b/gi;

const NUMBER_WORDS = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve';
/* A count said as a word: "two people", "three of them", "once" is not one. */
const COUNT_AS_A_WORD = new RegExp(`\\b(?:${NUMBER_WORDS})(?= (?:of\\b|people\\b|times\\b|check-ins?\\b|sessions?\\b|commitments?\\b|things\\b|days\\b|weeks\\b|months\\b|blockers?\\b|targets?\\b|lines\\b|answers\\b|reports?\\b|more\\b))`, 'gi');
const COUNT_AS_A_FIGURE = /(?<![\w.#:-])\d+(?= (?:of\b|people\b|times\b|check-ins?\b|sessions?\b|commitments?\b|things\b|days\b|weeks\b|months\b|blockers?\b|targets?\b|lines\b|answers\b|reports?\b|more\b))/g;

const A_VERB = /\b(?:is|are|was|were|be|been|has|have|had|does|do|did|can|cannot|could|will|would|should|may|might|must|said|says|say|came|come|went|gave|made|asked|wants|want|needs|need|checked|answered|agree[sd]?|waiting)\b|n't\b/i;

const RULES: { rule: string; pattern: RegExp }[] = [
  { rule: 'pieces joined with a colon', pattern: /[A-Za-z)]: [A-Za-z0-9]/g },
  { rule: 'pieces joined with an arrow', pattern: /→|->|=>|←|›|»/g },
  { rule: 'a date written as numbers', pattern: /\b\d{4}-\d{2}-\d{2}\b/g },
  { rule: 'pieces joined with a dot, a slash or a dash', pattern: / · | \| | \/ | - /g },
  { rule: 'work jargon', pattern: JARGON },
  { rule: 'a label where a sentence should be', pattern: /^(?:Unassigned|Unknown|N\/A|None|TBD|Done|Open|Pending)\b[^.?!]*$/ },
  { rule: 'the reader called "the lead"', pattern: /\bthe lead\b/gi },
  { rule: 'a machine word', pattern: /^(?:null|undefined|NaN)$|\[object Object\]/g },
  { rule: 'a leftover template slot', pattern: /\{\{?\w+\}?\}|\$\{|%s\b/g },
  { rule: 'two spaces or a space before a full stop', pattern: /\S {2,}\S| [.,;?!](?!\.)/g },
  { rule: 'a gendered pronoun for a person whose pronouns are not on record', pattern: /\b(?:he|she|him|his|hers|her|himself|herself)\b/gi },
  { rule: 'text cut short', pattern: /\.\.\.|…/g },
];

/** The text with somebody's quoted words taken out, so no rule ever reads what is theirs. */
export function withoutTheirWords(line: string): string {
  const spans = quotedSpansOf(line).sort((a, b) => b[0] - a[0]);
  let out = line;
  for (const [s, e] of spans) out = out.slice(0, s) + 'QUOTE' + out.slice(e);
  return out;
}

export function whatIsNotPlainIn(line: string, opts: { readerIsLead?: boolean; whole?: boolean } = {}): ANotPlain[] {
  if (!line || typeof line !== 'string') return [];
  /*
   * The note beside a claim about a colleague, "Not backed: no attempt to unblock mentioned." or "Tried: ...", is Hafsah's own
   * wording (change 4, 11 October 2026), so its colon is let through. Only those two openings of a sentence are; any other colon is still caught.
   */
  const mine = withoutTheirWords(line).replace(/\s+/g, ' ').trim().replace(/(^|[.?!] )(Not backed|Tried): /g, '$1$2 ');
  const found: ANotPlain[] = [];
  for (const { rule, pattern } of RULES) {
    const p = new RegExp(pattern.source, pattern.flags.includes('g') || pattern.source.startsWith('^') ? pattern.flags : `${pattern.flags}g`);
    for (const m of mine.matchAll(new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g'))) {
      if (rule === 'the reader called "the lead"' && opts.readerIsLead === false) continue;
      found.push({ rule, found: m[0] });
    }
  }
  /* One form of number in a sentence: a count said as a word beside a count said as a figure. */
  for (const sentence of mine.split(/(?<=[.?!]) /)) {
    const words = sentence.match(COUNT_AS_A_WORD);
    const figures = sentence.match(COUNT_AS_A_FIGURE);
    if (words && figures) found.push({ rule: 'a word and a figure for counts in one sentence', found: sentence });
  }
  /* A sentence of three words or fewer with no verb in it is a fragment ("Nothing checkable.", "A hard blocker."). */
  if (opts.whole) {
    for (const sentence of mine.split(/(?<=[.?!]) /)) {
      const n = sentence.replace(/[.?!]+$/, '').trim().split(/\s+/).length;
      if (n <= 3 && !A_VERB.test(sentence)) found.push({ rule: 'a fragment where a full sentence should be', found: sentence });
    }
  }
  /* A whole sentence starts with a capital and ends its thought. */
  if (opts.whole) {
    if (/^[a-z]/.test(mine)) found.push({ rule: 'a sentence that starts in lower case', found: mine.slice(0, 40) });
    if (!/[.?!"”')]$/.test(mine)) found.push({ rule: 'a sentence with no end', found: mine.slice(-40) });
  }
  for (const h of whatIsWrongWith(line)) if (!/ (?:and|but) reports$/.test(h.found)) found.push({ rule: h.what, found: h.found });
  return found;
}

/* Which served fields are sentences, and which carry somebody's own words or only name something. */
/* Somebody's own words, and the fields that only name or identify: never checked. */
const THEIRS = /^(said|theirWords|quote|quotes|text|triedSaid|expected|leadLabel|onLabel|whenSaid|when|dueSaid|topic|view|position|positions|name|who|from|on|label|title|role|remit|section|holds|kind|value|scope|state|status|source|mode|family|scenario|tone|trend|coverageVariant|partyType|cells|sections)$|Id$|Ids$|At$|^on$/;
/* Fields that are whole sentences, where a fragment or a clipped line is wrong. */
const SENTENCE = /^(say|says|ask|why|reason|reasonText|guard|sub|note|question|line|because|story|summary|latestSummary|prompt|objectivesPrompt|whatTheRoomIsAboutNote|detail|explains|cannotTell|caveat|basis|what)$/;

/* Words the person chose (what they named the work as waiting on) and short tags a screen turns into its own wording. */
const TAGS_AND_THEIR_NOUNS = /(?:dependencies|commitments|^board)\[\d+\]\.(?:what|leadLabel)$|\.eachPerson\[\d+\]\.reason$|\.workRecords\[\d+\]\.holds$/;

export function everyProductSentence(board: any) {
  const out: { path: string; text: string; whole: boolean }[] = [];
  const walk = (v: any, path: string, key: string) => {
    if (typeof v === 'string') {
      if (/^[A-Z_]+$/.test(v) || TAGS_AND_THEIR_NOUNS.test(path)) return;
      const whole = SENTENCE.test(key);
      if (whole || !THEIRS.test(key)) out.push({ path, text: v, whole });
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, key));
    else if (v && typeof v === 'object' && !(v instanceof Date)) for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, k);
  };
  walk(board, 'board', '');
  return out;
}

