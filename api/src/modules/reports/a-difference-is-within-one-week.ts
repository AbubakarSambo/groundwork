/**
 * A DIFFERENCE IS RAISED ONLY BETWEEN STATEMENTS ABOUT THE SAME ITEM IN THE SAME WEEK, NAMING THE
 * WEEK. NEVER MERGE WEEKS (Hafsah, 12 October 2026).
 *
 * Night quality run 2, the lead's board, "The team today":
 *
 *   "Collins Odhiambo has given different numbers for last week's sales, first reporting nine or ten
 *    and later saying it was four or five."
 *      Four or five was week 3, nine or ten week 4: two weeks, and the wrong way round.
 *   "Hassan reports sending an order for 15 kits on Monday at lunchtime, but also says the order was
 *    sent on Tuesday afternoon."
 *      Two different weeks' orders.
 *   "Amina reports sending twenty kits to Hassan Mwenda on Tuesday, not the 15 kits Hassan mentioned."
 *      Week 1 set against week 3.
 *
 * The prompt now gives every statement its week and says the rule, but a prompt is a request. This is
 * the code that holds it. A sentence that sets one statement against another is placed on the record:
 * each side is found in what the people it names said, by its numbers and its days. Where both sides
 * were said in the same week, the sentence stands and says the week ("In the week of 19 October, ...").
 * Where they were said in different weeks, it is not a difference: it is a change over time, and it
 * is said as one, each week named, in order, in the person's own words. Where that cannot be said in
 * their own words, the sentence is not kept. A sentence the record cannot place is left as it is.
 */
import { theNumbersIn } from './a-number-written-as-a-word-is-a-number';

/** One thing somebody said, and the week they said it in. */
export interface AStatementInItsWeek {
  /** The label the report stores for whoever said it (resolved to a name or "you" at the read). */
  who: string;
  text: string;
  /** When the session it was said in finished. */
  saidOn: Date;
  /** True only where `text` is their own words, so it may be quoted. */
  wordForWord: boolean;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The Monday a day falls in, as a whole day. */
export function theMondayOf(d: Date): Date {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const back = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - back);
  return day;
}

/** "19 October": the Monday of the week a day falls in. */
export function theWeekOf(d: Date): string {
  const m = theMondayOf(d);
  return `${m.getUTCDate()} ${MONTHS[m.getUTCMonth()]}`;
}

/* What makes a sentence set one statement against another, and where its two sides divide. */
const THE_TURN = /(?:,?\s+(?:but\s+(?:[A-Z][\w']*\s+){0,3}(?:also\s+|later\s+|then\s+|now\s+)?(?:says?|said|saying|reports?|reported|reporting)\b|and\s+(?:later|then)\s+(?:says?|said|saying|reports?|reported|reporting)\b|(?:while|whereas)\s+(?:[A-Z][\w']*\s+){1,3}(?:says?|said|reports?)\b)|,\s*not\s+(?:the\s+)?(?=\d|[A-Z]|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\b))/;
const A_DIFFERENCE_WORD = /\b(?:different (?:numbers|figures|accounts|dates|days|counts)|contradict\w*|does not match|do not match)\b/i;
const DAYS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;

interface Anchors { numbers: number[]; days: string[] }

function anchorsIn(text: string): Anchors {
  return {
    numbers: [...new Set(theNumbersIn(text))],
    days: [...new Set([...text.matchAll(DAYS)].map((m) => m[1].toLowerCase()))],
  };
}

function howManyHeld(a: Anchors, text: string): number {
  const nums = new Set(theNumbersIn(text));
  const days = new Set([...text.matchAll(DAYS)].map((m) => m[1].toLowerCase()));
  return a.numbers.filter((n) => nums.has(n)).length + a.days.filter((d) => days.has(d)).length;
}

const size = (a: Anchors) => a.numbers.length + a.days.length;

/** The statements that hold a side best: every anchor where any statement holds every anchor, else the most. */
function whereASideWasSaid(a: Anchors, said: AStatementInItsWeek[]): AStatementInItsWeek[] {
  if (!size(a)) return [];
  const scored = said.map((s) => ({ s, n: howManyHeld(a, s.text) })).filter((x) => x.n > 0);
  if (!scored.length) return [];
  const best = Math.max(...scored.map((x) => x.n));
  /* A side with two or more anchors needs at least two of them held, so one shared "Monday" is not a match. */
  if (size(a) >= 2 && best < 2) return [];
  return scored.filter((x) => x.n === best).map((x) => x.s);
}

/** Does this sentence set one statement against another? */
export function setsOneStatementAgainstAnother(sentence: string): boolean {
  return THE_TURN.test(sentence) || A_DIFFERENCE_WORD.test(sentence);
}

/* The full stop goes after the closing mark, so every later pass that splits sentences on a full stop
   keeps the closing mark with its quote. */
const quoteOf = (t: string) => `“${t.trim().replace(/^["“]|["”]$/g, '').replace(/[.!?]+$/, '')}”`;
const LOWER_FIRST = /^(The|A|An|This|That|These|Those|Their|His|Her|Its|Both|One|Each)\b/;

/**
 * One sentence, held to the week rule. Returns the sentence as it was, the sentence with its week
 * named, the change over time with each week named, or '' where a difference across weeks cannot be
 * said in the person's own words.
 */
export function aDifferenceHeldToOneWeek(sentence: string, said: AStatementInItsWeek[]): string {
  if (!sentence.trim() || !setsOneStatementAgainstAnother(sentence)) return sentence;
  if (/\bin the week of \d{1,2} [A-Z][a-z]+\b/i.test(sentence)) return sentence;

  /* Whose statements these are: the people the sentence names, or everybody where it names nobody. */
  const named = [...new Set(said.map((s) => s.who))].filter((w) => {
    if (!w) return false;
    if (sentence.includes(w)) return true;
    const first = w.split(/\s+/)[0];
    return /^[A-Z][a-z]{2,}$/.test(first) && new RegExp(`\\b${first}\\b`).test(sentence);
  });
  const theirs = named.length ? said.filter((s) => named.includes(s.who)) : said;

  const turn = sentence.match(THE_TURN);
  let sideA: string;
  let sideB: string;
  if (turn && turn.index != null) {
    sideA = sentence.slice(0, turn.index);
    sideB = sentence.slice(turn.index + turn[0].length);
  } else {
    /* "different numbers ... first X and later Y" with no turn word: nothing to divide on. */
    return sentence;
  }
  const a = anchorsIn(sideA);
  const b = anchorsIn(sideB);
  const forA = whereASideWasSaid(a, theirs);
  const forB = whereASideWasSaid(b, theirs);
  if (!forA.length || !forB.length) return sentence;

  const weeksA = new Set(forA.map((s) => theMondayOf(s.saidOn).getTime()));
  const weeksB = new Set(forB.map((s) => theMondayOf(s.saidOn).getTime()));
  const shared = [...weeksA].filter((w) => weeksB.has(w)).sort((x, y) => y - x);
  if (shared.length) {
    const week = theWeekOf(new Date(shared[0]));
    const rest = LOWER_FIRST.test(sentence) ? sentence.charAt(0).toLowerCase() + sentence.slice(1) : sentence;
    return `In the week of ${week}, ${rest}`;
  }

  /* Different weeks: a change over time, in order, in their own words, or nothing. */
  const latest = (xs: AStatementInItsWeek[]) => [...xs].sort((x, y) => y.saidOn.getTime() - x.saidOn.getTime()).find((s) => s.wordForWord);
  const one = latest(forA);
  const two = latest(forB);
  if (!one || !two || one === two) return '';
  const inOrder = [one, two].sort((x, y) => x.saidOn.getTime() - y.saidOn.getTime());
  return inOrder.map((s) => `In the week of ${theWeekOf(s.saidOn)}, ${s.who} said, ${quoteOf(s.text)}.`).join(' ');
}

/** Every sentence of a passage held to the week rule. Paragraph breaks are kept. */
export function differencesHeldToOneWeek(text: string, said: AStatementInItsWeek[]): string {
  if (!text || !said.length) return text;
  return text
    .split(/(\n+)/)
    .map((para) => {
      if (/^\n+$/.test(para)) return para;
      const sentences = para.match(/[^.!?]+(?:[.!?]+["”]?|$)/g) ?? [para];
      return sentences
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => aDifferenceHeldToOneWeek(s, said))
        .filter(Boolean)
        .join(' ');
    })
    .join('');
}

/**
 * A REPORT'S DIFFERENCE ("divergences") STANDS ONLY WITHIN ONE WEEK. Its topic, with the week named,
 * where both sides were said in one week; as it was, where the record cannot place it; null where its
 * two sides were said in different weeks, because that is a change over time and not a difference.
 */
export function aDifferenceThatStands(topic: string, said: AStatementInItsWeek[]): string | null {
  const held = aDifferenceHeldToOneWeek(topic, said);
  if (held === topic) return topic;
  if (held.startsWith('In the week of ') && held.endsWith(topic.slice(1))) return held;
  return null;
}
