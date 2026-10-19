/**
 * A DAY THAT HAS NOT COME IS NEVER ASKED ABOUT AS IF IT HAD (messages test, fourth run).
 *
 * The model is told today's day and the day each earlier thing was for (each-earlier-thing-has-its-day), and still, putting back last
 * time's words in its opening, it asked:
 *  - Amos, Wednesday 14 October: "You also said you needed to go back to Westlands Pharmacy on Friday. What happened when you went back
 *    on Friday?" He had said on Tuesday "For Westlands Pharmacy, I need to go back on Friday." He answered "Today is Wednesday."
 *  - Mercy, Wednesday 14 October: "... and that Joseph would have them for you on Thursday. What happened with that?" She had said that
 *    morning "Joseph said he'd have them for me on Thursday."
 *
 * So this is the check on what is sent. A question that asks what happened, in the past, about a weekday (named in it, or in the
 * sentence just before it) is read against the person's own earlier words that name that weekday: the day they meant is counted from
 * the day they said it. Where that day is after today, the question is not sent; "What has happened since then?" goes in its place,
 * or the plain question this check-in has not asked yet. And where the turn puts back that weekday, it is said with its date ("on
 * Friday 16 October"), so nobody reads it as a day gone by. Only from their own words on record; a weekday nobody said is left alone.
 */
import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import type { AnEarlierWord } from './earlier-words-keep-their-own-day';

const DAY = 86_400_000;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const A_WEEKDAY = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi;
/* Asked as something that has happened. */
const ASKED_AS_PAST = /\b(?:what happened|what has happened with|how did|how was|how were|did you|did (?:he|she|they|it|joseph|\w+) |when you went|when (?:he|she|they) (?:came|brought|went|did)|what came of|what was the outcome|what did (?:you|he|she|they) (?:find|learn|hear|get))\b/i;
const A_FUTURE = /\b(?:will|shall|going to|gonna|need to|needs to|have to|has to|plan(?:ning)? to|would|until|by|next)\b|'ll\b|'d\b/i;
export const SINCE_THEN = 'What has happened since then?';

/** Midnight of the day `d` falls on, in the zone, as a UTC timestamp. */
const dayIn = (d: Date, zone?: string): number => {
  const [y, m, dd] = new Intl.DateTimeFormat('en-CA', { timeZone: zone || 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-').map(Number);
  return Date.UTC(y, m - 1, dd);
};

/** The day a weekday named on `saidOn` meant: that weekday on or after the day it was said, never before. */
function theDayMeant(weekday: number, saidOn: number): number {
  const ahead = (weekday - new Date(saidOn).getUTCDay() + 7) % 7;
  return saidOn + ahead * DAY;
}

/** For each weekday their earlier words name, the latest day it meant. */
function theWeekdaysTheySaid(earlier: readonly AnEarlierWord[], zone?: string): Map<number, number> {
  const out = new Map<number, number>();
  for (const e of earlier) {
    const at = new Date(e.at);
    if (Number.isNaN(at.getTime())) continue;
    const saidOn = dayIn(at, zone);
    /* Only a weekday said of what is to come ("I need to go back on Friday", "he'd have them for me on Thursday"); "I called him on
       Tuesday" is a day gone by, and a question about it is right. */
    for (const sentence of intoSentences(String(e.content ?? ''))) {
      if (!A_FUTURE.test(sentence.replace(/[‘’]/g, "'"))) continue;
      for (const m of sentence.matchAll(A_WEEKDAY)) {
        const i = WEEKDAYS.indexOf(m[1].toLowerCase());
        out.set(i, Math.max(out.get(i) ?? 0, theDayMeant(i, saidOn)));
      }
    }
  }
  return out;
}

export function withNoPastQuestionAboutADayToCome(reply: string, earlier: readonly AnEarlierWord[], now: Date, opts: { zone?: string; alreadyAsked?: string[] } = {}): { text: string; cut: string[] } {
  if (!reply || !earlier.length || !A_WEEKDAY.test(reply)) return { text: reply, cut: [] };
  A_WEEKDAY.lastIndex = 0;
  const today = dayIn(now, opts.zone);
  const said = theWeekdaysTheySaid(earlier, opts.zone);
  /* The weekdays in this reply that, as they said them, are still to come. */
  const toCome = (s: string): number[] => [...s.matchAll(A_WEEKDAY)].map((m) => WEEKDAYS.indexOf(m[1].toLowerCase())).filter((i) => (said.get(i) ?? 0) > today);
  const sentences = intoSentences(reply);
  const cut: string[] = [];
  const out: string[] = [];
  let changed = false;
  sentences.forEach((s, i) => {
    const q = /\?\s*$/.test(s) && ASKED_AS_PAST.test(s.replace(/"[^"\n]*"|“[^”]*”/g, ' '));
    const named = toCome(s);
    const before = i > 0 ? toCome(sentences[i - 1]) : [];
    if (q && (named.length || (!A_WEEKDAY.test(s) && before.length))) {
      A_WEEKDAY.lastIndex = 0;
      cut.push(s.trim());
      changed = true;
      return;
    }
    A_WEEKDAY.lastIndex = 0;
    /* Put back with its date: "on Friday" is "on Friday 16 October", where that Friday is still to come. */
    if (named.length) {
      const dated = s.replace(A_WEEKDAY, (w: string) => {
        const at = said.get(WEEKDAYS.indexOf(w.toLowerCase()));
        if (!at || at <= today) return w;
        const after = s.slice(s.indexOf(w) + w.length);
        if (/^\s*,?\s*\d{1,2}\b/.test(after)) return w;
        return `${w} ${whenItWas(new Date(at), 'dayAndMonthLong', 'UTC')}`;
      });
      if (dated !== s) changed = true;
      out.push(dated);
      return;
    }
    out.push(s);
  });
  if (!changed) return { text: reply, cut: [] };
  let text = out.join('').replace(/[ \t]{2,}/g, ' ').trim();
  if (cut.length && !/\?/.test(text)) {
    const asked = (opts.alreadyAsked ?? []).some((t) => t.includes(SINCE_THEN));
    text = `${text ? `${text} ` : ''}${asked ? (aQuestionNotYetAsked(WHAT_ELSE, opts.alreadyAsked ?? []) ?? WHAT_ELSE) : SINCE_THEN}`;
  }
  return { text, cut };
}
