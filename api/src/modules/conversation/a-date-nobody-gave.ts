/**
 * "BY THE END OF THE QUARTER, SO BY DECEMBER 31ST." NOBODY GAVE A DATE, AND IT WAS THE WRONG ONE.
 *
 * Read in the 1 October review, the sales scenario, to Ngozi, who had said "by the end of the quarter".
 * Groundwork turned the period into a day and stated it as fact. The quarter in that check-in ended on
 * 30 September, which Kwame, in the same check-in, said. A date on somebody's record that they never
 * said, and that is wrong, is how a person gets asked next time why they missed something they never agreed.
 *
 * THE PRODUCT ALREADY HAS A WAY TO PUT A DATE TO SOMEBODY: it works the day out in code, says it as a
 * QUESTION ("When you say end of the year, do you mean 31 December 2026?") and takes their answer
 * (a-period-is-not-a-day). What is not allowed is the model stating one.
 *
 * SO A STATEMENT THAT NAMES A CALENDAR DAY is cut unless that day is one somebody said, one on a
 * document they can see, or the one the product itself put to them this turn. A QUESTION naming a day
 * is left alone: it asks, and the person can say no.
 */

import { intoSentences } from './nothing-invented-reaches-them';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_RX = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

const monthNumber = (word: string): number => MONTHS.findIndex((m) => m.startsWith(word.toLowerCase().slice(0, 3)));

/** Every "31 December", "December 31st", "31st of December" in a text, as "month-day". */
export function calendarDaysIn(text: string): string[] {
  const out: string[] = [];
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RX}\\b`, 'gi');
  const monthFirst = new RegExp(`\\b${MONTH_RX}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = dayFirst.exec(text ?? ''))) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 31) out.push(`${monthNumber(m[2])}-${d}`);
  }
  while ((m = monthFirst.exec(text ?? ''))) {
    const d = Number(m[2]);
    if (d >= 1 && d <= 31) out.push(`${monthNumber(m[1])}-${d}`);
  }
  return out;
}

export type DateCut = { text: string; cut: string[] };

/**
 * `gave` is everything a date may legitimately come from: what the person said (this session and
 * before), what is on documents and targets they can see, and the date the product put to them.
 */
export function withoutADateNobodyGave(reply: string, gave: string[]): DateCut {
  const allowed = new Set(gave.flatMap(calendarDaysIn));
  const out: string[] = [];
  const cut: string[] = [];
  for (const s of intoSentences(reply)) {
    const days = calendarDaysIn(s);
    const asks = /\?\s*$/.test(s.trim());
    if (!asks && days.length && days.some((d) => !allowed.has(d))) {
      cut.push(s.trim());
      continue;
    }
    out.push(s);
  }
  const kept = out.join('').trim();
  /* Never cut a turn to nothing: the date was the only invention, and the rest was not. */
  return kept ? { text: kept, cut } : { text: reply, cut: [] };
}
