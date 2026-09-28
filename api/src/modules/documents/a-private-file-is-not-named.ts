/**
 * A FILE ONLY ITS OWNER CAN OPEN IS NOT NAMED TO ANYBODY ELSE.
 *
 * Screens request 46, 28 September 2026. A board served to participants and admins read "The
 * attached team-plan.txt document confirms the split…". team-plan.txt was the lead's own document,
 * visible to her alone. The report's list of documents takes only OPEN ones, so the name did not
 * come that way. It came through the lead's own check-in: Groundwork's reply named the file ("Here
 * is the context we have from team-plan.txt"), her answer echoed it, the line went on the record,
 * and the synthesis reads every record line, whoever may see the document behind it.
 *
 * So the name comes off wherever text built for more than its owner is assembled: the synthesis
 * corpus, and the note that reaches everyone's check-in. The stored record line is not changed.
 * What the document showed can still be said; which file it was is the owner's to share.
 */
export interface ADocumentName {
  fileName: string | null | undefined;
  visibility?: string | null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The file names on this ground that not everybody may open. */
export function namesNotEverybodyMayOpen(docs: readonly ADocumentName[] | null | undefined): string[] {
  return [...new Set((docs ?? [])
    .filter((d) => (d?.visibility ?? 'OWN') !== 'OPEN')
    .map((d) => (d?.fileName ?? '').trim())
    .filter((n) => n.length >= 3))];
}

/**
 * The text with each of those names taken out, together with the words that were only there to
 * introduce it: "The attached team-plan.txt document confirms" becomes "The document confirms".
 */
export function withoutPrivateFileNames(text: string, names: readonly string[]): string {
  let out = text ?? '';
  for (const name of names) {
    const re = new RegExp(
      `(\\bthe\\s+)?(?:(?:attached|uploaded|shared)\\s+)?(?:(?:file|document|sheet)\\s+)?["“'‘]?${escape(name)}["”'’]?(?:\\s+(?:file|document|sheet))?`,
      'gi',
    );
    out = out.replace(re, (m) => (/^[A-Z]/.test(m) ? 'The document' : 'the document'));
  }
  return out;
}
