import { aCommitmentKey } from './what-happened-to-what-they-said';

/**
 * THE SAME PROMISE, SAID SHORT AND THEN SAID WHOLE, IS ONE ROW (screens request 96, the cause).
 *
 * "I will deliver the Tuskys cookers" and "I will deliver the Tuskys cookers on 9 October and ask for
 * the signed order form that day." were written as two rows, because the writer only skipped a new
 * promise with the same key or the same measure. Two promises by one person in one check-in are the
 * same promise said again more fully when the words of one (three or more of them) sit whole inside
 * the other and they do not name two different dates. The row keeps the fuller words, in the
 * person's own words, and the date of either.
 *
 * Two different promises are never merged: no shared run of three words, or two different dates,
 * and they stay two.
 */
type APromise = { text: string; when?: string | null };

const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const WEEKDAYS = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday';
const A_DATE = new RegExp(`\\b(?:\\d{1,2}(?:st|nd|rd|th)? (?:${MONTHS})\\b|(?:${MONTHS}) \\d{1,2}(?:st|nd|rd|th)?\\b|${WEEKDAYS}|tomorrow|today|next week|this week|next month|end of (?:the )?(?:week|month|quarter|year))`, 'g');

/** The dates a promise names, in one form: the same date is the same however it is written. */
export function datesIn(p: APromise): Set<string> {
  const text = `${p.text ?? ''} ${p.when ?? ''}`.toLowerCase().replace(/[’']/g, "'");
  const found = new Set<string>();
  for (const m of text.matchAll(A_DATE)) {
    const d = m[0].replace(/(\d)(?:st|nd|rd|th)/, '$1');
    const dayFirst = /^(\d{1,2}) ([a-z]+)$/.exec(d);
    const monthFirst = /^([a-z]+) (\d{1,2})$/.exec(d);
    if (dayFirst) found.add(`${dayFirst[1]} ${dayFirst[2].slice(0, 3)}`);
    else if (monthFirst) found.add(`${monthFirst[2]} ${monthFirst[1].slice(0, 3)}`);
    else found.add(d);
  }
  return found;
}

const oneIsInTheOther = (a: Set<string>, b: Set<string>) => [...a].every((d) => b.has(d)) || [...b].every((d) => a.has(d));

/**
 * THE SAME WORDS WITH A DATE PUSHED INTO THE MIDDLE (screens request 154, item 6).
 *
 * The test below asks for the short promise to sit WHOLE inside the long one, and a date added in
 * the middle breaks that however alike the two are. The You board showed both of these as separate
 * promises:
 *
 *   Ask the warehouse to load my van by 7am
 *   Ask the warehouse on Tuesday 29 September to load my van by 7am.
 *
 * So the containment is tested with the dates taken out of both, along with the little word that
 * introduces one, which would otherwise be left stranded ("ask the warehouse on to load..."). The
 * dates themselves are not ignored: `oneIsInTheOther` below still refuses to merge two promises
 * that name two DIFFERENT dates, and the merged row still keeps whichever date was given.
 */
const A_DATE_AND_ITS_WORD = new RegExp(`\\b(?:on|by|before|after|from|until|due)\\s+(?:${A_DATE.source})|${A_DATE.source}`, 'g');
const withoutItsDates = (key: string) => key.replace(A_DATE_AND_ITS_WORD, ' ').replace(/\s+/g, ' ').trim();

/**
 * 'incoming' when the new one is the fuller, 'existing' when the stored one already is, null when
 * these are not the same promise said at two lengths (equal words are left to the writer's own rules).
 */
export function theFullerPromise(existing: APromise, incoming: APromise): 'incoming' | 'existing' | null {
  const x = aCommitmentKey(existing.text, existing.when);
  const y = aCommitmentKey(incoming.text, incoming.when);
  if (!x || !y || x === y) return null;
  const [short, long, fuller] = x.length < y.length ? [x, y, 'incoming' as const] : [y, x, 'existing' as const];
  const [s2, l2] = [withoutItsDates(short), withoutItsDates(long)];
  const oneInsideTheOther = ` ${long} `.includes(` ${short} `) || (!!s2 && ` ${l2} `.includes(` ${s2} `));
  if (short.split(' ').length < 3 || !oneInsideTheOther) return null;
  if (!oneIsInTheOther(datesIn(existing), datesIn(incoming))) return null;
  return fuller;
}

/** Two promises that name two different dates are two promises, however alike their words. */
export function nameTwoDifferentDates(a: APromise, b: APromise): boolean {
  const x = datesIn(a);
  const y = datesIn(b);
  return x.size > 0 && y.size > 0 && !oneIsInTheOther(x, y);
}
