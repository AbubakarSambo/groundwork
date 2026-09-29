import { COUNTS_AS_A_SOURCE } from '../documents/what-kind-of-thing-a-document-is';
import { howSolid } from './a-figure-nobody-can-check-says-so';

/**
 * HOW A LINE IS KNOWN: THE PROTOTYPE'S FOUR MARKS, DECIDED IN ONE PLACE (weeks 6 and 6b, decision 43).
 *
 * The prototype marks each line a person reads (docs/prototype/screens/B4-reports-and-sharing/
 * one-session.txt and team-report.txt): "Proven", "Confirmed by the person who received it", "Only
 * someone's word", "From memory only". The screens show them as `proven`, `confirmed`, `said` and
 * `memory` (screens requests 2 and 7b). The end card and the reports use this one rule, so a line
 * reads the same on both.
 *
 * - proven: a document the person added backs it (not notes we generated). Somebody else's document
 *   does not prove their line: read on the local corpus, the lead's workplan "backed" a participant's
 *   "The build is on track for the 14th", because the plan says the 14th. A plan is not proof.
 * - confirmed: the colleague who received the work said it arrived (conversation/confirmed-by-who-
 *   received-it.ts).
 * - memory: a line about what happened, with a figure and nothing attached. A target, a plan or a
 *   definition with a number in it is not remembered; it is said.
 * - said: everything else.
 *
 * The mark describes the line, never the person, and says nothing about how anybody's answers were
 * rated.
 */
export type HowALineIsKnown = 'proven' | 'confirmed' | 'said' | 'memory';

export interface ALineToMark {
  type: string;
  text: string;
  recallBased?: boolean | null;
  /** The backing document's id, where the caller has it. A line not recalled is anchored either way. */
  anchoredDocumentId?: string | null;
  /** The backing document's origin: generated notes do not count as a source. */
  anchoredOrigin?: string | null;
  confirmedAt?: Date | string | null;
  /** False when the document that backs it was added by somebody else. Unknown counts as theirs. */
  documentIsTheirOwn?: boolean;
}

export function howALineIsKnown(line: ALineToMark): HowALineIsKnown {
  const recalled = line.recallBased !== false;
  const aSource = line.anchoredOrigin == null || COUNTS_AS_A_SOURCE.has(line.anchoredOrigin);
  if (!recalled && aSource && line.documentIsTheirOwn !== false) return 'proven';
  if (line.confirmedAt) return 'confirmed';
  if (line.type === 'PROGRESS' && howSolid({ text: line.text, recallBased: recalled }) === 'from-memory') return 'memory';
  return 'said';
}

/**
 * THE SAME RULE, FOR A RECORD ROW AS STORED (week 6b: the team report and the board).
 *
 * The session report, the team report and the board each read record rows and each needs to know
 * whose document backs a line. This is that read, once, so no surface decides it for itself. It
 * reads stored columns only: no model is asked anything, so opening a report or a board still never
 * rebuilds it (decision 7). The document's name never leaves here, only whose it is.
 */
export interface ARecordRowToMark {
  participantId: string | null;
  type: string;
  text: string;
  recallBased?: boolean | null;
  anchoredOrigin?: string | null;
  anchoredDocumentId?: string | null;
  confirmedAt?: Date | string | null;
}

/** The columns a read must select for a row to be marked. */
export const WHAT_A_MARK_READS = { recallBased: true, anchoredOrigin: true, anchoredDocumentId: true, confirmedAt: true } as const;

/** Who added each backing document, by its id. A document that cannot be found is left out. */
export async function whoAddedEachBackingDocument(
  prisma: any,
  rows: { anchoredDocumentId?: string | null }[],
): Promise<Map<string, string | null>> {
  const ids = [...new Set(rows.map((r) => r.anchoredDocumentId).filter(Boolean))] as string[];
  if (!ids.length) return new Map();
  const docs = (await (prisma?.groundDocument?.findMany?.({ where: { id: { in: ids } }, select: { id: true, participantId: true } }) ?? Promise.resolve([])).catch(() => [])) as any[];
  return new Map(docs.map((d) => [d.id, d.participantId ?? null]));
}

/** The mark of one stored row, given who added each backing document. */
export function theMarkOf(row: ARecordRowToMark, whoAdded: Map<string, string | null>): HowALineIsKnown {
  const doc = row.anchoredDocumentId ?? null;
  return howALineIsKnown({
    type: String(row.type ?? ''),
    text: row.text,
    recallBased: row.recallBased,
    anchoredOrigin: row.anchoredOrigin ?? null,
    confirmedAt: row.confirmedAt ?? null,
    ...(doc && whoAdded.has(doc) ? { documentIsTheirOwn: whoAdded.get(doc) === row.participantId } : {}),
  });
}
