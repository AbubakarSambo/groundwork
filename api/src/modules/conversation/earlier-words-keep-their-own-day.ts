/**
 * EARLIER WORDS ARE PUT BACK WITH THEIR OWN DAY (Hafsah, 19 October, point 3: "Earlier words are put back with the right day ('in the
 * last checkin', not 'this morning')."; messages test after the fixes, finding 2).
 *
 * Drop Access (test). On Tuesday 13 October Kevin Omondi said "After I sent Savannah Cafe the price list this morning, Jane got back to
 * me." His check-in on Wednesday 14 October opened:
 *
 *   "Last time you said you sent Savannah Cafe the price list this morning. What has happened with Savannah Cafe since then?"
 *
 * "this morning" was Tuesday's. The opener is told to put back last session's words as "Last time you said ..." (the-first-thing-it-says-
 * is-its-own-job), and it put them back as they were said. Every turn is saved through one step, and that step now reads a sentence that
 * puts back the person's earlier words: where those words were said on an earlier day and carry a day of their own ("this morning",
 * "today", "tomorrow", "yesterday", "tonight"), the day is said as it was: "In the last check-in, on Tuesday 13 October, you said you sent
 * Savannah Cafe the price list that morning." Only from the person's own earlier words on record, matched by what the sentence says.
 */
import { intoSentences } from './nothing-invented-reaches-them';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

export interface AnEarlierWord { content: string; at: Date | string }

const PUTS_BACK = /\b(?:last time|in (?:your|the) last check-?in|last (?:session|check-?in)|earlier|you (?:said|mentioned|told me|wrote))\b/i;
const A_DAY_OF_ITS_OWN: [RegExp, string][] = [
  [/\bthis morning\b/i, 'that morning'],
  [/\bthis afternoon\b/i, 'that afternoon'],
  [/\bthis evening\b/i, 'that evening'],
  [/\btonight\b/i, 'that night'],
  [/\btoday\b/i, 'that day'],
  [/\btomorrow\b/i, 'the next day'],
  [/\byesterday\b/i, 'the day before'],
];
const SMALL = new Set(['the', 'and', 'you', 'your', 'that', 'this', 'with', 'said', 'last', 'time', 'mentioned', 'told', 'what', 'has', 'have', 'had', 'was', 'were', 'since', 'then', 'morning', 'afternoon', 'evening', 'today', 'tonight', 'tomorrow', 'yesterday', 'for', 'about', 'after', 'before']);
const wordsOf = (t: string) => (String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").match(/[a-z0-9']+/g) ?? []).map((w) => w.replace(/'s$/, '')).filter((w) => w.length >= 3 && !SMALL.has(w));
const dayOf = (at: Date | string) => whenItWas(at, 'weekdayAndDay');

export function withEarlierWordsOnTheirOwnDay(reply: string, earlier: readonly AnEarlierWord[], now: Date = new Date()): string {
  if (!reply || !earlier.length) return reply;
  const today = dayOf(now);
  const sentences = intoSentences(reply);
  let changed = false;
  const out = sentences.map((s) => {
    if (!PUTS_BACK.test(s)) return s;
    const days = A_DAY_OF_ITS_OWN.filter(([re]) => re.test(s));
    if (!days.length) return s;
    const said = new Set(wordsOf(s));
    /* Their own earlier words that say this, with the same day word, on a day before today. */
    const theirs = earlier
      .filter((e) => dayOf(e.at) !== today && days.some(([re]) => re.test(String(e.content ?? ''))))
      .map((e) => ({ e, shared: wordsOf(e.content).filter((w) => said.has(w)).length }))
      .filter((x) => x.shared >= 2)
      .sort((a, b) => b.shared - a.shared || new Date(b.e.at).getTime() - new Date(a.e.at).getTime())[0];
    if (!theirs) return s;
    const day = dayOf(theirs.e.at);
    let t = s;
    /* Never inside a quotation: those are their words as they wrote them (polish round 2). */
    for (const [re, instead] of days) t = t.split(/(“[^”]*(?:”|$))/).map((part) => (part.startsWith('“') ? part : part.replace(re, instead))).join('');
    /* The day is already said in the sentence: it is not said twice (polish round 2: "On Wednesday 14 October you wrote on Wednesday 14 October"). */
    if (t.includes(day)) { changed = true; return t; }
    if (/^(\W*)last time,?\s+you\b/i.test(t)) t = t.replace(/^(\W*)last time,?\s+you\b/i, (_m, lead: string) => `${lead}In the last check-in, on ${day}, you`);
    else if (/\byou (?:said|mentioned|told me|wrote)\b/i.test(t)) t = t.replace(/\b([Yy])ou (said|mentioned|told me|wrote)\b/, (_m, y: string, verb: string) => `${y}ou ${verb} on ${day}`);
    changed = true;
    return t;
  });
  return changed ? out.join('') : reply;
}
