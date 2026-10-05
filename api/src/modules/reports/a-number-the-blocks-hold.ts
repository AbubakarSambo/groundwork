/**
 * A NUMBER IN THE JUDGEMENT IS ONE THE BLOCKS HOLD (request 135 item 3; the run of 5 October).
 *
 * The room judgement read "Amani Wekesa has named four different activities in two locations" about two crops in two
 * places: the model multiplied what one block listed and gave it a new name. In a room nothing checked a number at all,
 * because the room's grounding rule only asks that a line names a person.
 *
 * So, when the judgement is written, each line's numbers are checked against the material the model was given (the
 * blocks, and the table where there is one). A line holding a number the material does not hold is left out, the way
 * a line naming nobody already is. Narrow on purpose:
 *  - digits are checked, and the number words from four upward. "One", "two" and "three" are left alone, because they
 *    are how a sentence counts the things it names ("two crops in two places").
 *  - a date or a year is not a count ("by 30 September", "in 2026"), and is left alone.
 *  - words inside quotation marks are somebody's own, and are left alone.
 *
 * WHAT THIS CANNOT CATCH: a number the material does hold, put next to the wrong thing. On the crisis check-in "the 7
 * AM alerts" is in the lead's own account (she saw alerts at 7 AM), while the alert nobody answered fired at 02:14.
 * That is a number on the wrong thing, and only the writer can keep it right; the prompt says so.
 */

const UNITS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const TEENS: Record<string, number> = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
/* The words checked on a line: four upward. One, two and three are how a sentence counts what it names. */
const WORDS: Record<string, number> = { ...Object.fromEntries(Object.entries(UNITS).filter(([, n]) => n >= 4)), ...TEENS, ...TENS, hundred: 100 };
const MONTHS = '(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)';
const A_DATE = new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTHS}\\b|\\b${MONTHS}\\s+\\d{1,2}(?:st|nd|rd|th)?\\b|\\b(?:19|20)\\d{2}\\b`, 'gi');
const IN_QUOTES = /["“][^"”]*["”]|(?:^|\s)['‘][^'’]*['’](?=[\s.,;!?]|$)/g;
const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, bn: 1e9, b: 1e9, billion: 1e9 };

/**
 * THE SAME NUMBER WRITTEN TWO WAYS IS ONE NUMBER (review of 8b02c307). Both the line and the material are put into one
 * form before they are compared, so a line is never left out for saying in words or short form what a block says in
 * digits: "twenty-five" is 25, "1.2m" and "1.2 million" are 1200000, "450k" is 450000, "7 AM" is 7:00 and "7 pm" is
 * 19:00, the same as "07:00" and "19:00".
 */
export function oneWayOfWritingNumbers(text: string): string {
  let t = String(text ?? '');
  /* A time with am or pm, in the twenty-four hour form. */
  t = t.replace(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=[\s,;!?)]|\.?$|\.\s)/gi, (_m, h: string, mm: string | undefined, ap: string) => {
    let hour = Number(h) % 12;
    if (/^p/i.test(ap)) hour += 12;
    return `${hour}:${mm ?? '00'}`;
  });
  /* A leading zero on an hour is not a different time. */
  t = t.replace(/\b0(\d):(\d{2})\b/g, '$1:$2');
  /* A short or worded scale: 1.2m, 1.2 million, 450k, 2 billion. */
  t = t.replace(/\b(\d[\d,]*(?:\.\d+)?)\s?(k|thousand|m|mn|million|bn|b|billion)\b/gi, (_m, n: string, sc: string) =>
    String(Math.round(Number(n.replace(/,/g, '')) * SCALE[sc.toLowerCase()])));
  /* Tens and a unit in words, joined by a hyphen or a space: twenty-five, thirty two. */
  t = t.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-](one|two|three|four|five|six|seven|eight|nine)\b/gi, (_m, tens: string, unit: string) =>
    String(TENS[tens.toLowerCase()] + UNITS[unit.toLowerCase()]));
  return t;
}

/** Every number a text holds, as plain digits: "1,200" is "1200", "02:14" is "2:14", "four" is "4". */
export function theNumbersIn(text: string, opts: { words?: boolean } = { words: true }): string[] {
  const t = oneWayOfWritingNumbers(String(text ?? '').replace(IN_QUOTES, ' ').replace(A_DATE, ' '));
  const out: string[] = [];
  for (const m of t.matchAll(/\b\d{1,2}:\d{2}\b/g)) out.push(m[0].replace(/^0(\d)/, '$1'));
  for (const m of t.replace(/\b\d{1,2}:\d{2}\b/g, ' ').matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.push(m[0].replace(/,/g, '').replace(/\.0+$/, ''));
  if (opts.words !== false) {
    for (const m of t.toLowerCase().matchAll(/\b[a-z]+\b/g)) if (WORDS[m[0]] != null) out.push(String(WORDS[m[0]]));
  }
  return out;
}

/** The numbers the material holds, words of any size included, so "four" in a block supports "4" and the other way round. */
export function theNumbersTheMaterialHolds(material: string): Set<string> {
  const held = new Set<string>(theNumbersIn(material));
  for (const m of String(material ?? '').toLowerCase().matchAll(/\b(one|two|three)\b/g)) held.add(String({ one: 1, two: 2, three: 3 }[m[1] as 'one' | 'two' | 'three']));
  return held;
}

/** The numbers in a line the material does not hold. Empty where every one is held. */
export function numbersNotHeld(line: string | null | undefined, held: Set<string>): string[] {
  return [...new Set(theNumbersIn(String(line ?? '')))].filter((n) => !held.has(n));
}

const LINES_IN: Record<string, string[]> = {
  whatTheNumbersSay: ['says', 'soWhat'],
  whatToDo: ['move', 'because', 'startWith'],
  whatThisCannotTellYou: ['why', 'about', 'toKnow'],
  whatWeFailedToAsk: ['what', 'why'],
};

/**
 * The judgement with every line that holds a number the material does not hold left out. In the gap, only the
 * sentence that holds it goes, and the gap is kept whole where it is the only sentence (it is what the reader reads
 * first; the line is logged instead). Returns what was left out, for the log.
 */
export function onlyNumbersTheBlocksHold<T extends Record<string, any>>(judgement: T, material: string): { judgement: T; leftOut: string[] } {
  if (!judgement || typeof judgement !== 'object') return { judgement, leftOut: [] };
  const held = theNumbersTheMaterialHolds(material);
  const leftOut: string[] = [];
  const out: Record<string, any> = { ...judgement };
  for (const [key, fields] of Object.entries(LINES_IN)) {
    if (!Array.isArray(out[key])) continue;
    out[key] = out[key].filter((item: any) => {
      if (!item || typeof item !== 'object') return true;
      const bad = fields.flatMap((f) => numbersNotHeld(item[f], held));
      if (bad.length) leftOut.push(fields.map((f) => item[f]).filter(Boolean).join(' '));
      return !bad.length;
    });
  }
  if (typeof out.theGap === 'string') {
    const sentences = out.theGap.split(/(?<=[.!?])\s+/);
    const kept = sentences.filter((s: string) => !numbersNotHeld(s, held).length);
    if (kept.length && kept.length < sentences.length) {
      leftOut.push(...sentences.filter((s: string) => numbersNotHeld(s, held).length));
      out.theGap = kept.join(' ');
    } else if (!kept.length && sentences.length) {
      leftOut.push(`(kept, as the only gap) ${out.theGap}`);
    }
  }
  return { judgement: out as T, leftOut };
}
