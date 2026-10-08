/**
 * THE WEEKLY REPORT'S ONE SENTENCE ABOUT EACH PERSON (week 12b, decisions 11, 38, 40 and 43).
 *
 * The prototype's weekly report says, in plain words, how people's accounts read: "Aisha and Miriam
 * consistently get to specific customer needs and next steps."  This writes that sentence.
 *
 * WHAT IT READS. Only what people actually named in the week: who or what they named (a customer,
 * a company), a date, a next step, and whether a document is behind any of it. It never reads the
 * specificity rating of an answer, so the rating can never reach a lead through this sentence
 * (decision 38). The product writes the sentence from those facts. No model is asked, so nothing
 * can be invented and nothing needs a check against a model's wording.
 *
 * WHAT IT NEVER DOES. It gives no label, no score and no ranking (decision 11). Each person's
 * sentence stands alone and says what the record shows, good news and gaps alike. It does not say
 * "consistently", because one week cannot show that.
 *
 * STORED WITHOUT NAMES. The subject of each sentence is the person's report label ("Participant A").
 * The names go in when the sentence is served, through withNames, like every other report text.
 * The customers and companies the person named are in the sentence, because they are what the
 * person said; only the person who said them and the lead who runs the check-in are served it.
 */

export interface AWeeksLine {
  text: string;
  /** The type of record row, as a string. Setting out what good looks like is not something somebody did. */
  type: string;
  /** True when a document backs the line. */
  documented: boolean;
}

export interface AWeeksPerson {
  /** The person's label in the report, never a name. */
  label: string;
  /** Whether they finished a check-in this week. */
  checkedIn: boolean;
  /** Whether approved leave covered any day of this week so far (week 23). Dates only, never the kind of leave. */
  onLeave?: boolean;
  lines: AWeeksLine[];
}

export interface WhatTheyNamed {
  names: string[];
  dates: number;
  nextSteps: number;
  documents: number;
}

const NOT_THINGS_NAMED = new Set([
  'i', "i'm", "i've", "i'll", "i'd", 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'the', 'a', 'an', 'we', 'he', 'she', 'they', 'it', 'this', 'that', 'there', 'then', 'also', 'but', 'and', 'so', 'if', 'our', 'my',
  'yes', 'no', 'ok', 'okay', 'today', 'tomorrow', 'yesterday', 'next', 'last', 'after', 'before', 'when', 'while', 'on', 'in', 'at', 'for', 'to', 'from', 'with', 'by',
  'participant', 'initiator',
]);

const A_DATE = /\b(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b|\b(?:today|tomorrow|tonight|next week|end of (?:the )?(?:week|month)|by (?:the )?end of)\b/i;

const A_NEXT_STEP = /\b(?:will|i'll|we'll|going to|plan(?:s|ning)? to|next step|follow(?:ing)? up|call(?:ing)? (?:them|him|her|back)|send(?:ing)?|book(?:ing)?|meet(?:ing)? (?:on|with)|confirm(?:ing)?|to do)\b/i;

/** Capitalised words that are not the start of a sentence, in runs ("Green Mart", "Nyama Choma Palace"). */
export function thingsNamedIn(raw: string): string[] {
  /* The reader's own notes on a line ("[INFERRED: from context]", "[VERIFIABILITY:LOW]") are not words anybody said: "INFERRED" was read as a name (anchor walk, 8 October). */
  const text = (raw ?? '').replace(/\s*\[(?:INFERRED|VERIFIABILITY)[^\]]*\]/gi, '');
  const out: string[] = [];
  const re = /(?<![A-Za-z'’])([A-Z][A-Za-z0-9&'’-]+(?:\s+[A-Z][A-Za-z0-9&'’-]+)*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index;
    const before = text.slice(0, start);
    const startsASentence = !before.trim() || /[.!?:]["')\]]?\s*$/.test(before) || /\n\s*$/.test(before);
    let words = m[1].split(/\s+/);
    while (words.length && NOT_THINGS_NAMED.has(words[0].toLowerCase().replace(/[’]/g, "'"))) words = words.slice(1);
    while (words.length && NOT_THINGS_NAMED.has(words[words.length - 1].toLowerCase())) words = words.slice(0, -1);
    /* A single capitalised word that only starts a sentence is just a capital letter. */
    if (!words.length || (startsASentence && words.length === 1 && m[1].split(/\s+/).length === 1)) continue;
    const name = words.join(' ');
    if (name.length > 1 && !out.some((x) => x.toLowerCase() === name.toLowerCase())) out.push(name);
  }
  return out;
}

export function whatWasNamedIn(lines: readonly AWeeksLine[]): WhatTheyNamed {
  const said = lines.filter((l) => l.type !== 'SUCCESS_DEFINITION');
  const names: string[] = [];
  for (const l of said) for (const n of thingsNamedIn(l.text)) if (!names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n);
  return {
    names,
    dates: said.filter((l) => l.type === 'TIMEFRAME' || A_DATE.test(l.text)).length,
    nextSteps: said.filter((l) => l.type === 'COMMITMENT' || A_NEXT_STEP.test(l.text)).length,
    documents: said.filter((l) => l.documented).length,
  };
}

const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "customer" where the words are about customers, and plain "person or company" where they are not. */
function theThingNamed(lines: readonly AWeeksLine[]): string {
  return lines.some((l) => /\b(customers?|clients?|shops?|buyers?|deals?|leads?|prospects?|accounts?)\b/i.test(l.text)) ? 'customer' : 'person or company';
}

/**
 * THE SENTENCE. The label is the subject and is swapped for a name, or for "you", when it is served.
 * Returns null when there is nothing honest to say (the person is not in this week at all).
 */
export function theSentenceAbout(p: AWeeksPerson): string | null {
  const who = p.label;
  const said = p.lines.filter((l) => l.type !== 'SUCCESS_DEFINITION');
  if (!p.checkedIn && !said.length) {
    /*
     * BEING AWAY IS NOT COUNTED AGAINST ANYBODY (week 23, found live 1 October 2026, item 6). The lead
     * read "Amani has not checked in this week" about a person on approved leave all week, and so did
     * Amani. It now says why there is nothing, and that it is not counted against them.
     */
    if (p.onLeave) return `${who} has been on leave this week, so there is nothing here yet about what ${who} is working on. That is not counted against ${who}.`;
    return `${who} has not checked in this week, so there is nothing here yet about what ${who} is working on.`;
  }
  const got = whatWasNamedIn(p.lines);
  const noun = theThingNamed(said);
  const shown = got.names.slice(0, 3);
  const more = got.names.length - shown.length;
  const names = andList(shown) + (more > 0 ? ` and ${more} more` : '');
  const hasAStep = got.nextSteps > 0;
  const hasADate = got.dates > 0;
  const step = hasAStep && hasADate ? 'a next step and a date' : hasAStep ? 'a next step' : 'a date';
  const backed = got.documents > 0 ? ` ${got.documents === 1 ? 'One of them has a document behind it' : 'Some of them have a document behind them'}.` : '';

  if (got.names.length && (hasAStep || hasADate)) {
    return `${who} named ${names} this week, and gave ${step}.${backed}`;
  }
  if (got.names.length) {
    return `${who} named ${names} this week, but gave no next step or date, so it is not yet clear what happens next.${backed}`;
  }
  if (hasAStep || hasADate) {
    return `${who} gave ${step} this week, but named no ${noun}, so it is not yet clear who it is for.`;
  }
  return `${who}'s account named no ${noun}, date or next step this week, so there is nothing yet to follow up on.`;
}

/** Words that would turn the sentence into a rating, a label or a ranking. The sentence must hold none. */
export const WORDS_THE_SENTENCE_NEVER_USES = [
  'score', 'scored', 'rating', 'rated', 'rank', 'ranked', 'ranking', 'best', 'worst', 'better than', 'worse than',
  'top performer', 'low performer', 'high performer', 'at risk', 'underperform', 'poor', 'weak', 'strong', 'specificity',
  'checkable', 'verifiab', 'consistently', 'more than anyone', 'less than',
];

export function theSentenceIsSafe(sentence: string, record: { label: string; lines: readonly AWeeksLine[] }): boolean {
  /* A customer called "Best Foods" is something the person said, not a ranking word. */
  let low = sentence.toLowerCase();
  for (const l of record.lines) for (const n of thingsNamedIn(l.text)) low = low.split(n.toLowerCase()).join(' ');
  if (WORDS_THE_SENTENCE_NEVER_USES.some((w) => low.includes(w))) return false;
  /* Every capitalised thing in it must be the subject's label or something the person said. */
  const allowed = new Set<string>([record.label.toLowerCase()]);
  for (const l of record.lines) for (const n of thingsNamedIn(l.text)) allowed.add(n.toLowerCase());
  const inIt = thingsNamedIn(sentence.replace(record.label, '').replace(/^[A-Z]/, (c) => c));
  return inIt.every((n) => allowed.has(n.toLowerCase()) || n.toLowerCase().split(' ').every((w) => allowed.has(w) || NOT_THINGS_NAMED.has(w)));
}

/** The week: Monday 00:00 in Lagos (UTC+1, no daylight saving) up to the moment it is built. */
export function theWeekOf(at: Date): { start: Date; key: string } {
  const lagos = new Date(at.getTime() + 60 * 60 * 1000);
  const day = (lagos.getUTCDay() + 6) % 7; // Monday = 0
  const mondayLagos = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() - day);
  const start = new Date(mondayLagos - 60 * 60 * 1000);
  return { start, key: new Date(mondayLagos).toISOString().slice(0, 10) };
}
