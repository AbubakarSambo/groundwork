/**
 * A BOARD NEVER SERVES AN EMPTY LINE (run-29).
 *
 * Three kinds of line came out with nothing in them: a section that said what it holds as '' when Groundwork does not yet know
 * what kind of work the check-in is about (`workRecords[].holds`, on 22 boards), a side of a difference with a person's name and
 * a mark and no sentence (`divergence.items[].positions[].view`, left empty where the wall took the sentence out), and a row of
 * "What was agreed at the start" with no step (`startingState.rows[].when`). Whatever the cause upstream, they are put right
 * where the board is served, for every reader: an empty `holds` is not sent, a side with no words is not a side, and a row with
 * no step is on "Day 1", the step the engine gives a goal that has no day (the screen draws a row under its step, so a row with
 * no step was not drawn at all).
 */
const NO_WORDS = (v: unknown): boolean => typeof v === 'string' && !v.trim();
const SIDE_WORDS = ['view', 'position'] as const;

function aSideWithNoWords(item: any): boolean {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const present = SIDE_WORDS.filter((k) => k in item);
  return present.length > 0 && present.every((k) => NO_WORDS(item[k])) && ('participantLabel' in item || 'who' in item);
}

function withAStepOnEveryRow(state: any): any {
  if (!state || typeof state !== 'object' || !Array.isArray(state.rows)) return state;
  return { ...state, rows: state.rows.map((r: any) => (r && typeof r === 'object' && NO_WORDS(r.when) ? { ...r, when: 'Day 1' } : r)) };
}

export function aBoardWithNoEmptyLine<T>(board: T): T {
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.filter((x) => !aSideWithNoWords(x)).map(walk);
    if (!v || typeof v !== 'object') return v;
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return v;
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === 'holds' && NO_WORDS(x)) continue;
      out[k] = k === 'startingState' ? withAStepOnEveryRow(walk(x)) : walk(x);
    }
    return out;
  };
  return walk(board);
}
