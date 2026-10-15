/**
 * WHAT IS READ FROM A PRIVATE DOCUMENT KEEPS THAT DOCUMENT'S AUDIENCE (pilots, 13 October 2026, problem 3).
 *
 * Grace uploaded the Q4 targets sheet as "Only you". When her check-in was read for what she expects of
 * the team, the sheet went in with her words, and three lines came back as the team's own aims: "Kevin
 * Omondi is aiming for 120 units sold", "Mercy Wairimu is aiming for 100 units sold", "Joseph Kariuki is
 * aiming for 80 units sold". They were written with nobody's name on them, so every rep read every
 * colleague's share, under the line that says nobody does.
 *
 * What a lead's check-in writes reaches other people: the team's aims, and what she expects of each
 * person. So only the documents everybody on the check-in may open go into that reading. A document
 * marked "Only you" (OWN) or "Only the lead" (CLOSED) stays with whoever may open it.
 *
 * And because the conversation itself may have quoted the private document back to her, a line written
 * for others that carries a figure found only in a private document, and never in her own words, is not
 * written at all. Taking just the number off is not enough: the number is still in the line's words.
 */
import { numbersIn } from './a-claim-the-numbers-do-not-support';

export interface ADocumentWithItsAudience {
  content: string | null;
  visibility?: string | null;
}

/** Whether everybody on the check-in may open this document. Anything else is private to someone. */
export const everybodyMayOpen = (d: ADocumentWithItsAudience): boolean => d.visibility === 'OPEN';

/** The figures, at every scale they could be read at, that appear only in documents not everybody may open. */
export function figuresOnlyInPrivateDocuments(documents: ADocumentWithItsAudience[], theirOwnWords: string[]): Set<number> {
  const said = new Set<number>(theirOwnWords.flatMap((t) => numbersIn(t ?? '')).flatMap((n) => [n, Math.round(n)]));
  const out = new Set<number>();
  for (const d of documents) {
    if (everybodyMayOpen(d)) continue;
    for (const n of numbersIn(d.content ?? '')) {
      /* A small figure (a quarter's "4", a page's "1") is in everybody's words; only a real figure is held back. */
      if (n < 10) continue;
      for (const v of [n, Math.round(n)]) if (!said.has(v)) out.add(v);
    }
  }
  return out;
}

/** True when a line written for other people would carry a figure found only in a private document. */
export function carriesAPrivateFigure(line: { name?: string | null; target?: number | null }, privateFigures: Set<number>): boolean {
  if (!privateFigures.size) return false;
  if (line.target != null && Number.isFinite(line.target) && privateFigures.has(Math.round(line.target as number))) return true;
  return numbersIn(line.name ?? '').some((n) => privateFigures.has(n) || privateFigures.has(Math.round(n)));
}
