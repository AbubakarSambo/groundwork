/**
 * A GOAL THE LEAD HAS NOT TOLD THE PERSON ABOUT STAYS WITH THE LEAD (the more private option,
 * 29 September 2026).
 *
 * The lead writes what they expect of somebody and says whether they have told them (`awareness`:
 * TOLD, NOT_TOLD, UNSURE, NOT_ASKED). Tobi's You board listed "Take over the scheduling." while the
 * lead had said they had not told him yet, and his check-in page carried the lead's own words about
 * it ("I need to talk to Tobi about taking over the scheduling..."). Learning a goal from a screen,
 * before the lead has said it, is not how anybody should be told.
 *
 * So a lead-written goal marked NOT_TOLD reaches the lead and nobody else: not the person, not a
 * colleague, not an admin who only reads. Once the lead says they told them, it shows as before.
 * A goal the person wrote themselves is theirs and is never held back.
 *
 * Not `seenBySubject`: that flag turns true only when the person is shown the goal
 * (markMyExpectationShown), so hiding everything it marks false would mean nobody is ever shown one.
 */
export function notToldYet(o: { awareness?: string | null; authoredBy?: string | null } | null | undefined): boolean {
  return !!o && String(o.awareness ?? '').toUpperCase() === 'NOT_TOLD' && o.authoredBy !== 'self';
}

/** The goals this reader may read: all of them for the lead, and none not told yet for anybody else. */
export function goalsThisReaderMaySee<T extends { awareness?: string | null; authoredBy?: string | null }>(rows: readonly T[], isTheLead: boolean): T[] {
  return isTheLead ? [...rows] : rows.filter((o) => !notToldYet(o));
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[’‘`´]/g, "'").toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

/**
 * AND NO PRODUCT SENTENCE GIVES IT EITHER. A sentence that carries the goal's own words is taken out
 * of what this reader is served (a report, a board). Only goals long enough to be recognised are
 * matched, so a two-word goal cannot empty unrelated sentences.
 */
export function withoutGoalsNotToldIn<T>(value: T, goals: readonly string[]): T {
  const keys = goals.map((g) => plain(g ?? '')).filter((g) => g.length >= 12);
  if (!keys.length) return value;
  const sentencesOf = (t: string) => t.match(/[^.!?\n]+(?:[.!?]+|\n|$)\s*/g) ?? [t];
  const strip = (t: string): string => {
    const all = sentencesOf(t);
    const kept = all.filter((s) => !keys.some((k) => plain(s).includes(k)));
    return kept.length === all.length ? t : kept.join('').trim();
  };
  const NOT_WORDS = /^(?:id|.*Id|.*Ids|.*[Tt]oken|.*[Uu]rl|href|slug|email|.*At)$/;
  const walk = (v: any): any => {
    if (typeof v === 'string') return strip(v);
    if (v === null || typeof v !== 'object' || v instanceof Date) return v;
    if (Array.isArray(v)) return v.map(walk).filter((x, i) => !(typeof v[i] === 'string' && v[i].trim() && !String(x).trim()));
    if (![Object.prototype, null].includes(Object.getPrototypeOf(v))) return v;
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = typeof x === 'string' && NOT_WORDS.test(k) ? x : walk(x);
    return out;
  };
  return walk(value);
}
