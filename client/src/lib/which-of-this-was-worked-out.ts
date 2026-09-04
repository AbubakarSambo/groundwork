/**
 * WHICH SENTENCES IN A REPORT NOBODY ACTUALLY SAID.
 *
 * A report reads in one confident register whether a claim came from somebody's own account or the
 * model worked it out across two of them. Both are set in the same weight, in the same boxes. The
 * person the report is about then has to argue with a sentence nobody wrote.
 *
 * The data already knows: `inferences[]` carries each concluded claim, with `text` specified as
 * "the sentence as it appears in the report". This splits the prose on those sentences so the page
 * can mark them where they are read, rather than listing them in a panel underneath.
 *
 * MATCHING IS EXACT, AND SILENCE IS THE RIGHT FAILURE. The model writes `text` separately from the
 * body and can paraphrase itself. A fuzzy match that marked the wrong sentence would tell somebody
 * a colleague's statement was invented, which is worse than marking nothing - so anything that does
 * not appear verbatim is left unmarked and the panel below still lists it.
 */
export type Piece = { text: string; workedOut: boolean; inferenceId?: string }

export function splitOutWhatWasWorkedOut(
  prose: string | null | undefined,
  inferences: Array<{ id: string; text: string }> | null | undefined,
): Piece[] {
  const body = (prose ?? '').trim()
  if (!body) return []
  const claims = (inferences ?? []).filter(i => i?.text && body.includes(i.text.trim()))
  if (!claims.length) return [{ text: body, workedOut: false }]

  /* Longest first: one inference's text can contain another's, and the outer one should win. */
  const ordered = [...claims].sort((a, b) => b.text.trim().length - a.text.trim().length)

  let pieces: Piece[] = [{ text: body, workedOut: false }]
  for (const claim of ordered) {
    const needle = claim.text.trim()
    const next: Piece[] = []
    for (const piece of pieces) {
      if (piece.workedOut || !piece.text.includes(needle)) { next.push(piece); continue }
      const at = piece.text.indexOf(needle)
      const before = piece.text.slice(0, at)
      const after = piece.text.slice(at + needle.length)
      if (before) next.push({ text: before, workedOut: false })
      next.push({ text: needle, workedOut: true, inferenceId: claim.id })
      if (after) next.push({ text: after, workedOut: false })
    }
    pieces = next
  }
  return pieces
}
