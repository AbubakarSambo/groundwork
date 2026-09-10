import { COUNTS_AS_A_SOURCE } from '../documents/what-kind-of-thing-a-document-is';

/**
 * BACKED BY A DOCUMENT: ONE DEFINITION, FROM THE COLUMNS THE ANCHORING PATH ACTUALLY WRITES.
 *
 * `documentBackedPct` was computed from `RecordEntry.evidenceType`, an enum with four readers and
 * zero writers - its last writer, `extractAndStoreClaims`, was deleted as a category error (a
 * document backing lines the document itself had written; see documents.service.ts), and nothing
 * replaced it. Every row carried the default. So the figure was structurally 0%, it gated a
 * capability line that could never be true, and it permanently suppressed the strong coverage
 * band, while the homepage showed worked reports carrying 64% and 83%.
 *
 * The plan proposed restoring a writer. The audit (planaudit_a_e.md, A13) said the smaller fix is
 * the right one: the sanctioned path, `anchorRecordToDocuments`, already writes `anchoredDocumentId`
 * and `anchoredOrigin` on every line it backs, so the column with no writer is dropped and its
 * readers read these instead. A line is backed by a document when a document is anchored to it,
 * the line is not recalled from memory, and the document is an independent source - generated
 * notes are not (COUNTS_AS_A_SOURCE).
 *
 * NOT THE SAME QUESTION AS THE SESSION REPORT'S `documented`. the-session-report.ts counts a line as
 * documented when it is not recall-based and not backed by generated notes, whether or not a
 * document is attached - "how much of this came from memory". This asks "how much of this has a
 * document behind it". Both are honest; they are different numbers and are labelled differently.
 */
export interface MaybeBacked {
  anchoredDocumentId: string | null;
  anchoredOrigin: string | null;
  recallBased: boolean;
}

export function isBackedByADocument(e: MaybeBacked): boolean {
  if (!e.anchoredDocumentId || e.recallBased) return false;
  return e.anchoredOrigin == null || COUNTS_AS_A_SOURCE.has(e.anchoredOrigin);
}

/** The share, as a whole percentage; 0 over nothing, said by the caller rather than implied here. */
export function documentBackedShare(entries: MaybeBacked[]): number {
  if (entries.length === 0) return 0;
  return Math.round((entries.filter(isBackedByADocument).length / entries.length) * 100);
}
