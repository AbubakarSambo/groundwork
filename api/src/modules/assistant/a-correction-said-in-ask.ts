/**
 * A CORRECTION SAID IN ASK IS CHECKED AGAINST THE RECORD, NOT SHRUGGED AT (polish round 1, 26 October 2026; the first principle).
 *
 * Wanjiru read on her morning summary 'You said "Njeri will know today when I set up the check-in"', wrote in Ask "I did not say that.
 * I do not normally mention Njeri in the check-in.", and read "I cannot answer that one yet." A correction is a claim: Groundwork checks
 * the record, without accusing anybody. Where her own words are on record, it shows her where and when she said them and asks what is
 * true now. Where nothing she said matches, it says so plainly and takes the line off: what she typed into a check-in is the record.
 */
const A_CORRECTION = /\b(?:i\s+(?:did\s+not|didn['’]t|never|have\s+not|haven['’]t)\s+(?:say|said|write|wrote|tell|told)\b|that(?:['’]s|\s+is)\s+(?:not\s+(?:right|true|correct|what\s+i\s+said)|wrong|incorrect|untrue)|not\s+what\s+i\s+said|this\s+is\s+wrong)/i;

export function isACorrection(message: string): boolean {
  return A_CORRECTION.test(String(message ?? ''));
}

const STOP = new Set(['that', 'this', 'with', 'from', 'have', 'said', 'what', 'when', 'will', 'would', 'they', 'there', 'their', 'normally', 'never', 'didn', 'mention', 'which', 'about', 'check', 'checkin', 'right', 'true', 'wrong']);
const words = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').split(/[\s-]+/).filter((w) => w.length >= 4 && !STOP.has(w));
const sentences = (t: string) => String(t ?? '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

export interface ATurnOfTheirs { text: string; at: Date; label: string | null }

/** The sentence of theirs the correction is about: a quotation in it, else the one sharing the most words with it (two at least). */
export function whatTheyMean(message: string, theirTurns: ATurnOfTheirs[]): { sentence: string; at: Date; label: string | null } | null {
  const quoted = /["“]([^"”]{6,})["”]/.exec(message)?.[1]?.trim() ?? null;
  const said = theirTurns.flatMap((t) => sentences(t.text).map((s) => ({ sentence: s, at: t.at, label: t.label })));
  if (quoted) {
    const q = quoted.toLowerCase().replace(/[.!?]+$/, '');
    return said.find((s) => s.sentence.toLowerCase().includes(q)) ?? null;
  }
  const mine = new Set(words(message));
  if (!mine.size) return null;
  let best: { sentence: string; at: Date; label: string | null; n: number } | null = null;
  for (const s of said) {
    const n = new Set(words(s.sentence).filter((w) => mine.has(w))).size;
    if (n >= 1 && (!best || n > best.n || (n === best.n && s.at > best.at))) best = { ...s, n };
  }
  return best ? { sentence: best.sentence, at: best.at, label: best.label } : null;
}

const onTheDay = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Nairobi' });

/** What Ask says back. `quotedButNotFound`: they quoted words nothing of theirs holds, so the line is taken off. */
export function theCorrectionAnswered(found: { sentence: string; at: Date; label: string | null } | null, quotedButNotFound: boolean): string {
  if (found) {
    return `I checked. On ${onTheDay(found.at)}${found.label ? `, in “${found.label}”,` : ','} you wrote: “${found.sentence.replace(/[“”"]/g, '')}” If that is no longer true, tell me what is true now and I will put it on record.`;
  }
  if (quotedButNotFound) return 'I checked, and nothing you wrote says that. It is taken off, and Groundwork will not say it again.';
  return 'Which line is wrong? Copy it here, or say it in your own words, and I will check it against what you wrote.';
}
