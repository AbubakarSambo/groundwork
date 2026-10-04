/**
 * A REPORT NEVER SERVES AN EMPTY STRING AS A LINE (run-29, the advisor check-in).
 *
 * The wall that keeps what is about somebody else from a participant takes a sentence out and, where nothing
 * was left, left "" behind. The person Peter read a report with an empty central question, a finding with an
 * empty headline, and a guide to the next conversation made of three empty lines. A line with no words is not
 * a line. So at the one door every report read goes through:
 *   - a blank string in a list is not in the list;
 *   - a field that is blank is not sent, and a block whose every field was blank is not sent;
 *   - the central question, which the screen reads as "no question" when it is null, is null.
 * The wall is not touched and nothing it took out is put back: where it emptied the central question, the
 * reader is served none.
 */
const BLANK = (v: unknown): boolean => typeof v === 'string' && !v.trim();
const NO_QUESTION_IS_NULL = new Set(['centralQuestion']);

export function aReportWithNoEmptyLine<T>(report: T): T {
  const DROP = Symbol('drop');
  const walk = (v: any): any => {
    if (Array.isArray(v)) {
      const out: any[] = [];
      for (const x of v) {
        if (BLANK(x)) continue;
        const w = walk(x);
        if (w !== DROP) out.push(w);
      }
      return out;
    }
    if (!v || typeof v !== 'object') return v;
    const proto = Object.getPrototypeOf(v);
    if (v instanceof Date || (proto !== Object.prototype && proto !== null)) return v;
    const out: Record<string, any> = {};
    let blanks = 0;
    const keys = Object.keys(v);
    for (const k of keys) {
      const x = v[k];
      if (BLANK(x)) {
        blanks++;
        if (NO_QUESTION_IS_NULL.has(k)) out[k] = null;
        continue;
      }
      const w = walk(x);
      if (w === DROP) continue;
      out[k] = w;
    }
    /* A block whose every field was blank has nothing to say. */
    if (keys.length > 0 && blanks === keys.length && !keys.some((k) => NO_QUESTION_IS_NULL.has(k))) return DROP;
    return out;
  };
  const walked = walk(report);
  return (walked === DROP ? (Array.isArray(report) ? [] : {}) : walked) as T;
}
