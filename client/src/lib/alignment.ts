/**
 * HOW A GROUND'S ALIGNMENT IS SAID OUT LOUD.
 *
 * There used to be a number: `confidence`, rendered as "5/5 Aligned" with a
 * five-step scale from Unresolved to Aligned. It was `min(5, completedCheckIns)`
 * - a count of activity wearing the words of agreement. Across a ten-ground run
 * it could not tell the two apart:
 *
 *   Adam, advisor terms     5 agreements, 0 divergences  ->  "5/5 Aligned"
 *   Hafeezah, improvement   0 agreements, 0 divergences  ->  "5/5 Aligned"
 *
 * The second is a formal performance process whose report contained nothing at
 * all, and the product told both parties they were fully aligned.
 *
 * The replacement says only what the report actually holds, and says nothing
 * when it holds nothing. Two states, not three: the report records agreements
 * and divergences, and inventing a "partly there" bucket to match a marketing
 * sentence is exactly how a check-in count came to be called "Aligned".
 */
export interface AlignmentRead {
  /** Areas the parties' accounts agree on. */
  agreed: number
  /** Areas where the accounts still differ. */
  open: number
}

/**
 * A short phrase for a ground's alignment, or null when there is no read yet.
 * Null means "the record does not support a statement", and the caller must
 * render nothing at all rather than a placeholder score.
 */
export function alignmentLabel(a: AlignmentRead | null | undefined): string | null {
  if (!a) return null
  const { agreed, open } = a
  if (agreed + open === 0) return null
  if (open === 0) return `Agreed on ${agreed === 1 ? 'the 1 area' : `all ${agreed} areas`}`
  if (agreed === 0) return `${open === 1 ? '1 area' : `All ${open} areas`} still open`
  return `${agreed} agreed, ${open} still open`
}

/** The same read, compact enough for a sidebar row. Null when there is no read. */
export function alignmentShort(a: AlignmentRead | null | undefined): string | null {
  if (!a) return null
  const { agreed, open } = a
  if (agreed + open === 0) return null
  if (open === 0) return `${agreed} agreed`
  if (agreed === 0) return `${open} open`
  return `${agreed} agreed, ${open} open`
}

/**
 * Tone for the phrase. Deliberately not a red/amber/green ladder: an open area
 * is a thing to talk about, not a failure, and colouring it as a warning would
 * reintroduce the judgement this replaced.
 */
export function alignmentTone(a: AlignmentRead | null | undefined): 'settled' | 'open' | 'none' {
  if (!a || a.agreed + a.open === 0) return 'none'
  return a.open === 0 ? 'settled' : 'open'
}
