/**
 * A NAME IS SHORT, OR IT IS NOT A NAME.
 *
 * Where somebody has not signed in yet there is no first name to print, and the fallback was
 * `roleAsDescribed` - the sentence the lead typed about them when they were invited. Read on a live
 * run, 11 September, in the place a person's name goes on the shared picture:
 *
 *   "Chidinma Obi - She is handing over key financial processes after running them for five
 *    years.: 0 check-ins on record, nothing specific named yet."
 *
 * That is a whole sentence standing in for a name, with the colon of the sentence that follows it
 * stuck on the end. It runs across the line, it repeats on every read that names that person, and it
 * broadcasts to everybody what the lead wrote about them in private.
 *
 * WHY IT FALLS BACK AT ALL, and that part is right: a person invited by email who has not opened
 * their invitation still has to appear on the picture, because their absence is the finding. What
 * was wrong is what it printed.
 *
 * SO: a short description is a usable stand-in for a name - "the lead nurse", "our finance manager"
 * - and a long one is not. Where it is long, the leading fragment is taken if there is one, because
 * the lead usually writes "Chidinma Obi - she is handing over..." and the half before the dash is
 * exactly the name. Where there is nothing short to use, nothing is printed and the caller falls
 * through to its own wording for somebody it cannot name.
 *
 * NO LONGER USED FOR A LABEL, 27 September 2026 (request 36). Whatever it takes, it takes from the
 * lead's own words about somebody, and a short description such as "our underperforming rep" is as
 * private as a long one. Hafsah's rule: the label never uses the lead's description. A person's label
 * is now their name or "a colleague", and `a-label-is-never-the-leads-description.spec.ts` checks that no label builder
 * calls this. It stays for anything that needs a short handle for the lead's own reading.
 */

/** Longer than this is a sentence about a person, not a way of referring to them. */
const A_NAME_IS_AT_MOST = 40;

export function aNameOrNothing(described: string | null | undefined): string | null {
  const t = (described ?? '').trim();
  if (!t) return null;
  if (t.length <= A_NAME_IS_AT_MOST) return withoutATrailingStop(t);

  /*
   * "Chidinma Obi - She is handing over key financial processes" - the half before the dash is the
   * name, and this is the shape the invite flow produces, so it is worth taking.
   */
  const beforeTheDash = t.split(/\s+[-–]\s+/)[0]?.trim() ?? '';
  if (beforeTheDash && beforeTheDash.length <= A_NAME_IS_AT_MOST) return withoutATrailingStop(beforeTheDash);

  /* A first sentence can also be short enough to use. */
  const firstSentence = t.split(/(?<=[.!?])\s/)[0]?.trim() ?? '';
  if (firstSentence && firstSentence.length <= A_NAME_IS_AT_MOST) return withoutATrailingStop(firstSentence);

  return null;
}

function withoutATrailingStop(t: string): string {
  return t.replace(/[.,;:]+$/, '').trim() || t;
}
