/**
 * IN AN EVALUATION CHECK-IN, THE PERSON BEING REVIEWED READS THE FACTS, NEVER A COLLEAGUE'S EXACT
 * WORDS.
 *
 * Hafsah's ruling, part 3, 30 September 2026: "the person being reviewed sees the facts, and the
 * decision with its reasons, not colleagues' exact words. Those go only to the manager." Decision
 * 4's exception, clarified 29 September, says the same thing from the other side: "in an evaluation
 * check-in, colleagues' exact words go only to the manager. The person being reviewed sees the
 * facts, and the decision with its reasons." `isEvaluationCheckIn` (is-this-an-evaluation-check-in)
 * decides WHICH check-ins these are; this file decides what changes on one, for the one reader it
 * changes for.
 *
 * ONLY FOR THE SUBJECT, AND NOBODY ELSE. The manager - the person who runs the check-in - reads
 * colleagues' exact words as now. An admin is treated like the manager (morning report, 29
 * September, item 4: decision 5 already keeps a performance plan from an admin with no access, so
 * one who has access reads it as the manager does). A colleague who gave a view reads what they
 * read today: this ruling is about what the SUBJECT is shown, not about who else may be named or
 * quoted. Every function here is a no-op unless the caller has already established, with
 * `viewerIsTheSubjectOfAnEvaluationCheckIn`, that the reader in front of it is the subject.
 *
 * THEIR OWN WORDS STAY THEIRS. Commit 7eb0aed1 (request 77, `their-own-words-stay.ts`) exists so a
 * privacy rule meant for Groundwork's own writing never empties a line a person wrote themselves.
 * This ruling is the one deliberate exception to that on the other side: a COLLEAGUE'S line is taken
 * out for the subject, on purpose, because it is not the subject's own words that are the problem -
 * it is reading somebody else's, verbatim, on a check-in that ends in a verdict about them. The
 * subject's OWN rows (`isYou`, or `participantId === subjectParticipantId`) are never touched here.
 *
 * WHAT THIS DOES NOT TOUCH, AND WHY. `theJudgement`, `divergences` (the report's own field, with
 * positions and sides named) and the rest of `NOT_A_PARTICIPANT_READ` are already gone for every
 * participant before this ever runs (the-judgement-is-the-leads.ts) - a denylist that already
 * removes more than exact words, for every non-lead reader, on every scenario. Transcripts are
 * already owner-only (`GET :id/my-transcript`) and the lead's own read of them is already derived,
 * never raw (`GET :id/conversation`, "Never the words themselves") - nobody but the speaker reads a
 * transcript turn today, evaluation or not, so there is nothing to wall there. `theirWords` on a
 * pattern is the PATTERN OWNER'S own words about themselves, never a colleague's about them, so it
 * is untouched by design (their own words stay theirs).
 *
 * WHAT THIS DOES TOUCH: the two places a colleague's own account currently reaches a participant in
 * whatever their own words were - the session report's "What each person said" lines, and the
 * board's "Who owns what" lines and its divergence positions/perspectives - each read through
 * `their-own-words-stay.ts`'s own list today for people generally, but never gated on WHOSE words
 * they are for the one reader this ruling is about.
 */

const THE_FACTS_ONLY =
  "A colleague's own words are not shown to you here. What was found, and the decision with its reasons, are below.";

/**
 * "WHAT EACH PERSON SAID" (the session report's `whatEachPersonSaid`), FOR THE SUBJECT.
 *
 * Each row already carries `isYou`: true for the reader's own row, false for everybody else's. For
 * the subject of an evaluation check-in, `isYou` false means "a colleague's row" - there is no
 * third kind of row a subject can read here - so every row that is not theirs loses its `lines`,
 * the fragments taken word for word out of what a colleague wrote.
 *
 * `saying` IS KEPT WHERE IT IS ALREADY THE FACTS, WRITTEN. `fillWhatEachPersonSaid` (above, in
 * reports.service.ts) already writes `saying` as a paraphrase, never a quote - "write it, do not
 * quote it" is in its own prompt - so where one is already there, it already IS "the facts in the
 * product's own sentences" and is left alone. Where none was ever composed (the warm-up has not run
 * for these lines, or it declined), this says so plainly instead of silently showing nothing, the
 * same way the product already says "answered, and nothing specific enough to record came out of
 * it" when a row has nothing else to show.
 *
 * The subject's own row, `lines` included, is returned exactly as given.
 */
export function whatEachPersonSaidForTheSubject<T extends { isYou: boolean; lines?: unknown; lineMarks?: unknown; saying?: string }>(
  rows: readonly T[] | null | undefined,
): T[] {
  if (!Array.isArray(rows)) return (rows ?? []) as T[];
  return rows.map((row) => {
    if (!row || row.isYou) return row;
    const { lineMarks, ...rest } = row as any;
    const saying = typeof rest.saying === 'string' ? rest.saying.trim() : '';
    return { ...rest, lines: [], saying: saying || THE_FACTS_ONLY };
  });
}

/**
 * "WHO OWNS WHAT" (the board's `whoOwnsWhat`), FOR THE SUBJECT.
 *
 * One row per party, each holding THAT party's own lines under `items[].text` (their-own-words-
 * stay.ts's `THEIR_OWN_WORDS_ON_THE_BOARD`). The subject's own row is untouched; every other row
 * keeps its shape - the type, the mark, which session - and loses only the words, so the subject
 * still reads that a colleague committed to something, without reading what, in their words.
 */
export function whoOwnsWhatForTheSubject<T extends { participantId: string; items?: readonly any[] }>(
  rows: readonly T[] | null | undefined,
  subjectParticipantId: string | null,
): T[] {
  if (!Array.isArray(rows)) return (rows ?? []) as T[];
  return rows.map((row) => {
    if (!row || row.participantId === subjectParticipantId || !Array.isArray(row.items)) return row;
    return {
      ...row,
      items: row.items.map((item: any) => (item && typeof item.text === 'string' ? { ...item, text: THE_FACTS_ONLY } : item)),
    };
  });
}

/**
 * DIVERGENCE POSITIONS AND PERSPECTIVES (the board's `divergence.items[].positions` / `.perspectives`),
 * FOR THE SUBJECT.
 *
 * Each side carries `view` (or `position`, the older name for the same field, kept because a stored
 * report row may still hold it) - a colleague's own account of where they stand, named or not
 * depending on `peersAreNamedOn`. Naming is a separate rule (decision 17) and is left exactly as it
 * is; only the words of the account itself are replaced, on every side, because the board does not
 * mark which side is the subject's own view and a subject's divergence with a colleague is still a
 * colleague's account reaching them word for word.
 */
export function divergenceForTheSubject<T extends { positions?: readonly any[]; perspectives?: readonly any[] }>(
  items: readonly T[] | null | undefined,
  /**
   * The subject's own resolved name(s) on this board - `nameOf(subjectParticipantId)`, and "You"
   * where a surface prints that instead. A side whose `who` or `participantLabel` matches one of
   * these is the subject's OWN account and is left alone: their own words stay theirs, word for
   * word, exactly the same exception `their-own-words-stay.ts` carves out the other way round.
   */
  viewerNames: readonly (string | null | undefined)[] = [],
): T[] {
  if (!Array.isArray(items)) return (items ?? []) as T[];
  const mine = new Set(viewerNames.filter((n): n is string => !!n && n.trim().length > 0).map((n) => n.trim().toLowerCase()));
  const isTheirs = (side: any) => {
    const label = String(side?.who ?? side?.participantLabel ?? '').trim().toLowerCase();
    return !!label && mine.has(label);
  };
  const stripSide = (side: any) => {
    if (!side || typeof side !== 'object' || isTheirs(side)) return side;
    const out = { ...side };
    if (typeof out.view === 'string' && out.view) out.view = THE_FACTS_ONLY;
    if (typeof out.position === 'string' && out.position) out.position = THE_FACTS_ONLY;
    return out;
  };
  return items.map((d) => ({
    ...d,
    ...(Array.isArray((d as any).positions) ? { positions: (d as any).positions.map(stripSide) } : {}),
    ...(Array.isArray((d as any).perspectives) ? { perspectives: (d as any).perspectives.map(stripSide) } : {}),
  }));
}
