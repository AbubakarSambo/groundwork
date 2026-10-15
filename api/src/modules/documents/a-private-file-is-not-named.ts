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
 * introduce it: "The attached team-plan.txt document confirms" becomes "The document confirms", and
 * "come from team-plan.txt" becomes "come from a document".
 */
export function withoutPrivateFileNames(text: string, names: readonly string[]): string {
  let out = text ?? '';
  for (const name of names) {
    const re = new RegExp(
      `(\\bthe\\s+)?(?:(?:attached|uploaded|shared)\\s+)?(?:(?:file|document|sheet)\\s+)?["“'‘]?${escape(name)}["”'’]?(?:\\s+(?:file|document|sheet))?`,
      'gi',
    );
    /* "The attached X document" keeps its "the"; a bare "from X" becomes "from a document". */
    out = out.replace(re, (m, the, offset: number, whole: string) => {
      const word = the ? 'the document' : 'a document';
      /* At the start of a sentence it takes a capital, even where the file name did not have one:
         "chandarana-quote.png is a photo." becomes "A document is a photo." */
      const startsASentence = /^\s*$|[.!?]\s+$/.test(whole.slice(0, offset));
      return /^[A-Z]/.test(m) || startsASentence ? word[0].toUpperCase() + word.slice(1) : word;
    });
  }
  return out;
}

/**
 * AND FOR EVERYTHING A READER IS SERVED, NOT ONLY THE CORPUS. Hafsah, 28 September 2026: a private
 * file's name may not reach anyone the lead has not shared it with, by any route - a report stored
 * before the corpus was cleaned, a note typed by hand, a line nobody thought of. So what a reader is
 * served is read once more at the end, against the files this reader may not open, by the same
 * rule every document read uses (who-can-see-a-document.ts, with the context feature on: the
 * strict reading for a name, since a name is never needed to say what a file showed).
 */
export function namesThisReaderMayNotOpen(
  docs: readonly { fileName: string | null | undefined; visibility: any; participantId: string | null }[] | null | undefined,
  reader: { participantId: string | null; isLead: boolean },
  canSee: (doc: { participantId: string | null; visibility: any }, reader: { participantId: string | null; isLead: boolean }) => boolean,
): string[] {
  return [...new Set((docs ?? [])
    .filter((d) => !canSee({ participantId: d.participantId, visibility: d.visibility }, reader))
    .map((d) => (d.fileName ?? '').trim())
    .filter((n) => n.length >= 3))];
}

/** Through every string in a served object. Dates and non-strings are left as they are. */
export function withoutPrivateFileNamesIn<T>(value: T, names: readonly string[]): T {
  if (!names.length) return value;
  const walk = (v: any): any => {
    if (typeof v === 'string') return withoutPrivateFileNames(v, names);
    if (v instanceof Date || v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = walk(x);
    return out;
  };
  return walk(value);
}
