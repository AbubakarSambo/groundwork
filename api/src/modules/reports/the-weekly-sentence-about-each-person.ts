/**
 * THE WEEKLY REPORT'S SENTENCE ABOUT EACH PERSON (week 12b, decisions 11, 38, 40 and 43; what they said, 1 November 2026).
 *
 * WHAT IT SAYS. What the person said this week, in their own words, from their conversations' assessments (the one reader,
 * conversation/the-facts-on-record.ts). It used to count and name: "Brian Otieno named Kasarani Foods, Baraka Hardware and KES this
 * week, and gave a next step and a date." while Brian had said "I spent most of Monday phoning Baraka Hardware about their unpaid fee
 * note of KES 380,000." The figure, the promise and the deadline had no place in that summary. Now the two most telling things they said
 * are quoted, and how many more are on the record.
 *
 * WHAT IT NEVER DOES. It gives no label, no score and no ranking (decision 11), and never reads the rating of an answer (decision 38).
 * The product writes the sentence around their quoted words; no model words it.
 *
 * STORED WITHOUT NAMES. The subject is the person's report label ("Participant A"), and any name inside their words is put back as a
 * label before it is kept; the names go in when the sentence is served, through withNames, like every other report text. Only the
 * person who said them and the lead who runs the check-in are served it, and what people say in a check-in may be shown to them word
 * for word.
 */

export interface AWeeksLine {
  text: string;
  /** The part of the assessment it was read into ('numbers', 'promises', ...). */
  type: string;
  /** True when proof backs it. */
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

const NOT_THINGS_NAMED = new Set([
  'i', "i'm", "i've", "i'll", "i'd", 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'the', 'a', 'an', 'we', 'he', 'she', 'they', 'it', 'this', 'that', 'there', 'then', 'also', 'but', 'and', 'so', 'if', 'our', 'my',
  'yes', 'no', 'ok', 'okay', 'today', 'tomorrow', 'yesterday', 'next', 'last', 'after', 'before', 'when', 'while', 'on', 'in', 'at', 'for', 'to', 'from', 'with', 'by',
  'participant', 'initiator',
]);

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

/* The parts of an assessment, most telling first: a figure, a promise and what became of one, a wait, the work, a claim. */
const MOST_TELLING_FIRST = [
  'numbers', 'promises', 'compared.promisesDue', 'blockers', 'workUpdates', 'compared.figuresChanged', 'claims', 'decisions', 'dates',
  'corrections', 'documents', 'targets', 'setup.objective', 'setup.success', 'setup.timing', 'setup.rules',
];
const rankOf = (type: string) => { const i = MOST_TELLING_FIRST.indexOf(type); return i === -1 ? MOST_TELLING_FIRST.length : i; };

/** Their words, as a quotation: whole, without the stop at the end, since the sentence puts its own. */
const quoted = (t: string) => `“${t.trim().replace(/^["“”']+|["“”']+$/g, '').replace(/[\s.,;:!]+$/, '')}”`;

/**
 * THE SENTENCE. The label is the subject and is swapped for a name, or for "you", when it is served.
 * Returns null when there is nothing honest to say (the person is not in this week at all).
 */
export function theSentenceAbout(p: AWeeksPerson): string | null {
  const who = p.label;
  const said = p.lines.filter((l) => l.text.trim());
  if (!p.checkedIn && !said.length) {
    /*
     * BEING AWAY IS NOT COUNTED AGAINST ANYBODY (week 23, found live 1 October 2026, item 6). The lead
     * read "Amani has not checked in this week" about a person on approved leave all week, and so did
     * Amani. It now says why there is nothing, and that it is not counted against them.
     */
    if (p.onLeave) return `${who} has been on leave this week, so there is nothing here yet about what ${who} is working on. That is not counted against ${who}.`;
    return `${who} has not checked in this week, so there is nothing here yet about what ${who} is working on.`;
  }
  if (!said.length) return `${who} checked in this week, and nothing ${who} said is on the record yet.`;
  const shown = [...said].sort((a, b) => rankOf(a.type) - rankOf(b.type)).slice(0, 2);
  const more = said.length - shown.length;
  const backed = said.filter((l) => l.documented).length;
  return [
    `This week ${who} said ${shown.map((l) => quoted(l.text)).join(' and ')}.`,
    more > 0 ? `${more === 1 ? 'One more thing' : `${more} more things`} ${who} said ${more === 1 ? 'is' : 'are'} on the record.` : '',
    backed ? `${backed === 1 ? 'One thing' : `${backed} things`} ${who} said ${backed === 1 ? 'has' : 'have'} proof behind ${backed === 1 ? 'it' : 'them'}.` : '',
  ].filter(Boolean).join(' ');
}

/** Words that would turn the sentence into a rating, a label or a ranking. The sentence must hold none. */
export const WORDS_THE_SENTENCE_NEVER_USES = [
  'score', 'scored', 'rating', 'rated', 'rank', 'ranked', 'ranking', 'best', 'worst', 'better than', 'worse than',
  'top performer', 'low performer', 'high performer', 'at risk', 'underperform', 'poor', 'weak', 'strong', 'specificity',
  'checkable', 'verifiab', 'consistently', 'more than anyone', 'less than',
];

export function theSentenceIsSafe(sentence: string, record: { label: string; lines: readonly AWeeksLine[] }): boolean {
  /* Their own quoted words are what they said; only the product's words around them are checked. */
  const ours = sentence.replace(/“[^”]*”/g, ' ').split(record.label).join(' ');
  const low = ours.toLowerCase();
  if (WORDS_THE_SENTENCE_NEVER_USES.some((w) => low.includes(w))) return false;
  /* And no capitalised thing in the product's own words but the subject's label. */
  return thingsNamedIn(ours).every((n) => n.toLowerCase().split(' ').every((w) => NOT_THINGS_NAMED.has(w)));
}

/** The week: Monday 00:00 in Lagos (UTC+1, no daylight saving) up to the moment it is built. */
export function theWeekOf(at: Date): { start: Date; key: string } {
  const lagos = new Date(at.getTime() + 60 * 60 * 1000);
  const day = (lagos.getUTCDay() + 6) % 7; // Monday = 0
  const mondayLagos = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() - day);
  const start = new Date(mondayLagos - 60 * 60 * 1000);
  return { start, key: new Date(mondayLagos).toISOString().slice(0, 10) };
}
