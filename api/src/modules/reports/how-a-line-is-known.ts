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
