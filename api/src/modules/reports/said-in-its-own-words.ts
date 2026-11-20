/**
 * A REPORT SAYS IT IN ITS OWN WORDS, IN EVERY FIELD, WHETHER IT IS FORMING OR RELEASED.
 *
 * The product's promise is that nobody's raw answers reach anyone else. The shared picture was
 * checked for that - a run of eight words lifted from one person's record is a fault the synthesis
 * retries on - and the agreements and divergences were not, though "where you disagree" is exactly
 * where somebody's grievance arrives in their exact words. And the report is read while it FORMS,
 * from the first check-in on, not only at release: a lift in a forming report is on a screen today.
 *
 * Decided by the product owner, 11 September 2026: never verbatim, and never withhold the
 * information either - pull it through, said differently. So the order is: check every field at
 * synthesis (which is where the forming report comes from too); retry the report; then ask once for
 * the lifted phrases alone to be restated; and only if a run still survives, withhold the SENTENCE
 * that carries it, say so IN THE REPORT where the reader can see it, and count it in the log for
 * us. The sentence, never the report, and never a rewrite by us
 * of what a sentence claims - see counts-accounts.ts for why altering a claim inside an
 * accountability record is worse than losing a badly phrased one.
 */

/** Same rule as the shared picture always used. */
export const A_LIFTED_RUN = 8;

const plainWords = (t: string): string => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/** The first run of their words found in this text, or null. */
export function liftedRunIn(text: string, corpus: string[]): string | null {
  const flat = plainWords(text);
  if (!flat) return null;
  for (const entry of corpus) {
    const words = plainWords(entry).split(' ').filter(Boolean);
    for (let i = 0; i + A_LIFTED_RUN <= words.length; i++) {
      const run = words.slice(i, i + A_LIFTED_RUN).join(' ');
      if (run.length > 30 && flat.includes(run)) return run;
    }
  }
  return null;
}

/** Every string in a report field, however nested, with a path so a fault can name where it was. */
export function stringsIn(field: string, value: unknown): { path: string; text: string }[] {
  if (typeof value === 'string') return value.trim() ? [{ path: field, text: value }] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => stringsIn(`${field}[${i}]`, v));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => stringsIn(`${field}.${k}`, v));
  return [];
}

/** Every lift in the three prose fields of a report. */
export function liftsInReport(
  report: { sharedPicture?: unknown; agreements?: unknown; divergences?: unknown },
  corpus: string[],
): { path: string; run: string }[] {
  const out: { path: string; run: string }[] = [];
  for (const field of ['sharedPicture', 'agreements', 'divergences'] as const) {
    for (const { path, text } of stringsIn(field, report[field])) {
      const run = liftedRunIn(text, corpus);
      if (run) out.push({ path, run });
    }
  }
  return out;
}

/**
 * The last resort: the sentence that carries a lift is withheld, the rest of the text stands. A
 * sentence-level cut removes a quotation without changing what any other sentence claims.
 */
/**
 * WHAT STANDS IN FOR A SENTENCE THAT COULD NOT BE SAID SAFELY.
 *
 * Read by a person, in place, where the sentence was. It has to say three things: that something
 * was here, why it is not, and that nothing was lost - because a reader who notices a gap and is
 * told nothing assumes the worst about what was removed and who removed it.
 */
export const A_LINE_WE_COULD_NOT_RESTATE =
  '[One line here repeated somebody\'s exact words closely enough to identify them, and could not be '
  + 'restated. Nothing was removed from the record: it is in their own check-in.]';

/**
 * THE REPORT DELETES NOTHING. Decided by the product owner, 11 September 2026, and it is the second
 * half of the rule this file's header already carried: never verbatim, and never withhold the
 * information either.
 *
 * This used to drop the sentence and tell the log. That is the one thing the report must not do -
 * a reader cannot ask about an absence they cannot see, and the log is read by us, not by them. So
 * the sentence is replaced in place by a line that says what happened, and the count still goes to
 * the log for us.
 *
 * The verbatim run itself still cannot ship: eight words of somebody's own phrasing names them as
 * surely as a name would, and that promise is the reason anybody answers honestly. So this is the
 * narrow case where the report shows an absence rather than content - and it shows it, which is
 * the difference.
 */
export function withoutLiftedSentences(text: string, corpus: string[]): { text: string; withheld: number } {
  const sentences = text.match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const kept: string[] = [];
  let withheld = 0;
  for (const s of sentences) {
    if (liftedRunIn(s, corpus)) {
      withheld += 1;
      /* Once, however many lines went: two of these in a row reads as redaction, not as candour. */
      if (!kept.includes(A_LINE_WE_COULD_NOT_RESTATE)) kept.push(A_LINE_WE_COULD_NOT_RESTATE);
      continue;
    }
    kept.push(s);
  }
  return { text: kept.join(' '), withheld };
}

/** The same cut applied through a field's nested strings, in place. Returns how many sentences went. */
export function withholdLiftsIn(value: unknown, corpus: string[]): { value: unknown; withheld: number } {
  if (typeof value === 'string') {
    const r = withoutLiftedSentences(value, corpus);
    return { value: r.text, withheld: r.withheld };
  }
  if (value instanceof Date) return { value, withheld: 0 };
  if (Array.isArray(value)) {
    let withheld = 0;
    const out = value.map((v) => { const r = withholdLiftsIn(v, corpus); withheld += r.withheld; return r.value; });
    return { value: out, withheld };
  }
  if (value && typeof value === 'object') {
    let withheld = 0;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) { const r = withholdLiftsIn(v, corpus); withheld += r.withheld; out[k] = r.value; }
    return { value: out, withheld };
  }
  return { value, withheld: 0 };
}
