/**
 * A PERSON'S NAME IS NOT THE POSSESSIVE FORM OF IT.
 *
 * From a live run, 11 September. The person said "Tunde's name on the approver field of the payment
 * run", and the extraction returned the mentioned person as:
 *
 *   { name: "Tunde's", context: "The new Operations Lead who is taking on supplier management." }
 *
 * Which then appeared on the report as a card headed "Tunde's" with an "Add them" button under it,
 * and in the report's own prose as "a successful handover to Tunde's looks like". A person invited
 * to give their account of their own work, under a name with an apostrophe-s stuck on the end, is a
 * small thing that tells the reader nobody is looking.
 *
 * WHY IT IS TRIMMED RATHER THAN ASKED FOR AGAIN. The prompt can be told to give the nominative form
 * and that is a request; this is a fact about English that can be settled here, on the way out, for
 * every extraction that returns a name. It is also reversible in the only direction that matters: a
 * real surname ending in "s" (James, Hicks, Rogers) has no apostrophe in it, so it is untouched.
 */
const A_TRAILING_POSSESSIVE = /[’']s?$/;

/** "Tunde's" -> "Tunde". "James" -> "James". "Rogers'" -> "Rogers". */
export function theNameWithoutThePossessive(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(A_TRAILING_POSSESSIVE, '').trim() || trimmed;
}

/** The same, over the shape the extraction returns. */
export function namesWithoutPossessives<T extends { name: string }>(people: T[]): T[] {
  return (people ?? []).map((p) => ({ ...p, name: theNameWithoutThePossessive(p.name) }));
}

/**
 * WHY THE ORDER MATTERS, written down because it cost two runs.
 *
 * `restoreTheirWords` exists to undo the model shortening or altering what a person typed, and it is
 * right to. But it cannot tell the difference between a sentence and a name: the lead typed
 * "Segun's name on the close pack", so a name field reading "Segun" looks to it like a word that has
 * been cut short, and it puts the apostrophe back. It won twice, on two different runs, and the log
 * said so each time - `Shortened one of their own words on the entry path: adaeze (they typed
 * "adaeze's")`.
 *
 * So this runs AFTER the restore, on the name field only. A name is not a quotation of what somebody
 * typed; it is who an invitation is addressed to.
 */
