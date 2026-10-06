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

import { quotationsIn, theRecordsWordsFor } from './a-quote-is-what-they-said';

/**
 * THE SENTENCE THAT TAKES THE PLACE OF A SIDE'S WORDS. It says "and the decision with its reasons" only where a decision
 * has been made (request 124, part 2): the person read "What was found, and the decision with its reasons, are below."
 * where no decision had been made and none was below.
 */
const BELOW = (aDecisionIsBelow: boolean) => (aDecisionIsBelow ? 'What was found, and the decision with its reasons, are below.' : 'What was found is below.');
const THE_FACTS_ONLY = (aDecisionIsBelow = false) => `A colleague's own words are not shown to you here. ${BELOW(aDecisionIsBelow)}`;

/** The same, where the side that is not shown is the lead's own, who is not a colleague. */
const THE_FACTS_ONLY_LEAD = (aDecisionIsBelow = false) => `The words your lead used are not shown to you here. ${BELOW(aDecisionIsBelow)}`;

/**
 * THE NEW HIRE READS THE LEAD'S OWN WORDS AND ROW (request 124, Hafsah's answer of 3 October, decision 88; decision 3, "Nobody is
 * special because of their title"; decision 4, "what people say in check-ins can be shown word for word to the people in that
 * check-in"). On an onboarding check-in that reaches a verdict (a new hire's first 90 days), the person it is about reads what
 * their lead said and the lead's row, word for word. A colleague's words stay with the manager (decision 17), and the lead's
 * private notes and own report stay private. Every other evaluation check-in (a plan, a promotion, a renewal) is unchanged.
 */
export function theNewHireReadsTheLeadsWords(scenario: string | null | undefined): boolean {
  return scenario === 'NEW_HIRE';
}

/* A generic, plain sentence for the one case there is no way to keep the rest of a sentence
   grammatical once a colleague's quoted words come out of it. */
const A_COLLEAGUE_PUT_IT_DIFFERENTLY = 'A colleague described this differently.';

/** Where a sentence in a served text starts and ends, kept together with its own trailing space. */
function sentencesOf(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  let at = 0;
  for (const m of text.matchAll(/[.!?]["”’)\]]*(?:\s+|$)|\n+/g)) {
    out.push({ text: text.slice(at, m.index! + m[0].length), start: at, end: m.index! + m[0].length });
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), start: at, end: text.length });
  return out;
}

/*
 * A SENTENCE THAT STILL ENDS MID-THOUGHT ONCE THE QUOTED WORDS ARE GONE IS NOT A FINISHED
 * STATEMENT. Two shapes of dangling word: the reporting verb itself ("Chidi says", "as Chidi put
 * it"), and the small connective word that usually sits right before a quoted clause ("described it
 * as", "said that", "called it") - both leave a sentence that reads as cut off rather than replaced.
 */
const DANGLES_ON_A_REPORTING_WORD =
  /\b(?:said|says|saying|stated|explained|described|wrote|added|noted|mentioned|called|put it|according to|as|that|like|whether|because|since|though|if|when|been|be|is|are|was|were|have|has|had|of|to|in|for|with|about|on|by|and|or|but|the|a|an)\s*[:,]?$/i;

/*
 * THE WORD JUST BEFORE A QUOTE THAT CAME OUT. A quote that stood in the middle of a sentence ("describes the
 * same discussions as 'operational noise' and not a significant issue") leaves a hole the end of the sentence
 * does not show. Where the word before it needs something after it, the sentence is replaced, never left
 * with the hole.
 */
const NEEDS_SOMETHING_AFTER =
  /\b(?:as|that|like|been|be|is|are|was|were|called|of|to|with|by|and|or|but|the|a|an|said|says|described|describes|confirms|confirmed|puts it|put it)\s*[:,]?\s*$/i;

/**
 * A QUOTE IN THE TEAM REPORT (`sharedPicture`, `theOpening`, `findings[].text`, `agreements`, and
 * anywhere else a participant is served prose), FOR THE SUBJECT.
 *
 * Every quote a person is served is already the record's exact words - `a-quote-is-what-they-said`
 * makes sure of that once, before a report is stored, and `a-quote-built-at-the-read` does the same
 * for prose built when the report is opened. So by the time this runs, a quote still carrying marks
 * is KNOWN to be somebody's own words, word for word; the only question left is whose.
 *
 * `subjectRecord` is the subject's own lines - the same list `theRecordsWordsFor` already matches a
 * quote against to restore it, built per participant by `theRecordAQuoteMayComeFromByParticipant`.
 * FAILS CLOSED: a quote is left alone only where it POSITIVELY matches one of the subject's own
 * lines. Anything else - a colleague's words, or a quote this pass cannot place - has its quoted
 * passage taken out. Where the sentence still reads as a finished statement without it, the rest of
 * the sentence stays; where it does not, the whole sentence becomes a plain, unnamed one
 * ("A colleague described this differently."), never a colleague's words and never blank.
 *
 * "STILL READS AS A FINISHED STATEMENT" IS A HEURISTIC, NOT A PARSER. It catches the shape the
 * product's own report prose actually uses - a name or a plain word followed by a reporting verb
 * ("Chidi says '...'", "described it as '...'") - because that IS how these sentences are written
 * (see SAYING_PROMPT: "third person... start with the verb"). It does not catch every way a quote
 * can be woven into a longer sentence ("Chidi flagged that things '...'" loses its predicate and
 * still reads as cut short). The one thing that never varies with the sentence quality is the
 * privacy property: the colleague's words are always gone, kept or replaced.
 */
export function withoutColleaguesQuotesForTheSubject(
  text: string | null | undefined,
  subjectRecord: readonly string[],
): string {
  if (!text) return text ?? '';
  const quotes = quotationsIn(text);
  if (!quotes.length) return text;
  const notTheirs = quotes.filter((q) => theRecordsWordsFor(q.inner, [...subjectRecord]) === null);
  if (!notTheirs.length) return text;

  let out = '';
  for (const s of sentencesOf(text)) {
    const mine = notTheirs.filter((q) => q.start >= s.start && q.end <= s.end);
    if (!mine.length) { out += s.text; continue; }
    const leavesAHole = mine.some((q) => NEEDS_SOMETHING_AFTER.test(text.slice(s.start, q.start)) && !/^\s*[.!?]/.test(text.slice(q.end, s.end)));
    let modified = s.text;
    for (const q of [...mine].sort((a, b) => b.start - a.start)) {
      modified = modified.slice(0, q.start - s.start) + modified.slice(q.end - s.start);
    }
    modified = modified
      .replace(/[ \t]+([.,;:!?])/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/([.,;:!?])\1+/g, '$1')
      .replace(/^[ \t]+/, '');
    const body = modified.replace(/\s+$/, '');
    const trailingSpace = modified.slice(body.length);
    const words = body.match(/\p{L}+/gu) ?? [];
    const keeps = !leavesAHole && words.length >= 5 && !DANGLES_ON_A_REPORTING_WORD.test(body.replace(/[.!?]+$/, '').trim()) && !/^[.,;:!?\s]*$/.test(body);
    out += keeps ? `${body}${trailingSpace}` : `${A_COLLEAGUE_PUT_IT_DIFFERENTLY}${trailingSpace}`;
  }
  return out;
}

/**
 * A SENTENCE THAT SAYS WHAT A COLLEAGUE IS, to the person an evaluation check-in is about (decision 17).
 *
 * "A colleague is the account manager." names who the colleague is by their job, which gives them away. The
 * rule is "never a job title or detail that would give them away", so a sentence whose subject is an unnamed
 * colleague and which says what they are, or where they work, is taken out. Said about a colleague only: the
 * lead's own job is not a secret from the person the lead is reviewing.
 */
const A_COLLEAGUE = '(?:(?:a|one|another|the same|the \\w+|an? \\w+th|a third|a fourth|a fifth) colleague)';
const SAYS_WHAT_A_COLLEAGUE_IS = new RegExp(`(?:^|[.!?]\\s+|\\n)\\s*${A_COLLEAGUE}(?:'s role)?\\s+(?:(?:is|was)\\s+(?:the|a|an|our|their|his|her|your)\\b|works\\s+(?:as|in|for|on)\\b|(?:leads|manages|runs|heads|reports to|sits in)\\b)`, 'i');

export function withoutWhatGivesAColleagueAway(text: string | null | undefined): string {
  if (!text) return text ?? '';
  if (!SAYS_WHAT_A_COLLEAGUE_IS.test(text)) return text;
  return sentencesOf(text).filter((s) => !SAYS_WHAT_A_COLLEAGUE_IS.test(s.text.trimStart().replace(/^/, '. '))).map((s) => s.text).join('').trim();
}

/* The same keys `a-quote-is-what-they-said` leaves alone: a label or an identifier, never prose -
   see NOT_PROSE there. Kept as a separate constant rather than imported, since it is not exported. */
const NOT_PROSE_HERE = /^(label|participantLabel|who|on|from|fieldId|code|status|type|band|tone)$|Id$|Ids$/;

/**
 * THE SAME, OVER A WHOLE TEAM REPORT (or any report-shaped value) - `sharedPicture`, `theOpening`,
 * `findings[].text`, `agreements`, and anything else the subject is served as prose. Walks every
 * string field, however deep, the same way `everyQuoteFromTheRecord` does; a label or an identifier
 * is left exactly as it is.
 */
export function deeplyWithoutColleaguesQuotesForTheSubject<T>(value: T, subjectRecord: readonly string[]): T {
  const walk = (v: any): any => {
    if (typeof v === 'string') return withoutWhatGivesAColleagueAway(withoutColleaguesQuotesForTheSubject(v, subjectRecord));
    if (v === null || v === undefined || v instanceof Date) return v;
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === 'object') {
      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) out[k] = NOT_PROSE_HERE.test(k) ? val : walk(val);
      return out;
    }
    return v;
  };
  return walk(value) as T;
}

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
export function whatEachPersonSaidForTheSubject<T extends { isYou: boolean; lines?: unknown; lineMarks?: unknown; lineMarksSay?: unknown; saying?: string }>(
  rows: readonly T[] | null | undefined,
  more: { aDecisionIsBelow?: boolean } = {},
): T[] {
  if (!Array.isArray(rows)) return (rows ?? []) as T[];
  return rows.map((row) => {
    if (!row || row.isYou) return row;
    const { lineMarks, lineMarksSay, ...rest } = row as any;
    const saying = typeof rest.saying === 'string' ? rest.saying.trim() : '';
    return { ...rest, lines: [], saying: saying || THE_FACTS_ONLY(more.aDecisionIsBelow) };
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
  /** `theLeadsRow`: the lead's row, left as it is, where the new hire reads the lead's own words (request 124). */
  more: { aDecisionIsBelow?: boolean; theLeadsRow?: string | null } = {},
): T[] {
  if (!Array.isArray(rows)) return (rows ?? []) as T[];
  return rows.map((row) => {
    if (!row || row.participantId === subjectParticipantId || (!!more.theLeadsRow && row.participantId === more.theLeadsRow) || !Array.isArray(row.items)) return row;
    return {
      ...row,
      items: row.items.map((item: any) => (item && typeof item.text === 'string' ? { ...item, text: THE_FACTS_ONLY(more.aDecisionIsBelow) } : item)),
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
  /**
   * `subjectRecord`: the subject's own lines, so a quote of theirs inside the evidence stays and a colleague's
   * comes out. `leadNames`: how the lead's own side is named here, so it is not told as "a colleague".
   */
  more: { subjectRecord?: readonly string[]; leadNames?: readonly (string | null | undefined)[]; theLeadsWordsAreReadable?: boolean; aDecisionIsBelow?: boolean } = {},
): T[] {
  if (!Array.isArray(items)) return (items ?? []) as T[];
  /* The reader's own side is always named "You" on the board, whatever their name is. */
  const mine = new Set([...viewerNames, 'You'].filter((n): n is string => !!n && n.trim().length > 0).map((n) => n.trim().toLowerCase()));
  const lead = new Set((more.leadNames ?? []).filter((n): n is string => !!n && n.trim().length > 0).map((n) => n.trim().toLowerCase()));
  const labelOf = (side: any) => String(side?.who ?? side?.participantLabel ?? '').trim().toLowerCase();
  const isTheirs = (side: any) => {
    const label = labelOf(side);
    return !!label && mine.has(label);
  };
  const stripSide = (side: any) => {
    if (!side || typeof side !== 'object' || isTheirs(side)) return side;
    /* The new hire reads the lead's own account word for word (request 124); a colleague's still comes out. */
    if (more.theLeadsWordsAreReadable && lead.has(labelOf(side))) return side;
    const said = lead.has(labelOf(side)) ? THE_FACTS_ONLY_LEAD(more.aDecisionIsBelow) : THE_FACTS_ONLY(more.aDecisionIsBelow);
    const out = { ...side };
    if (typeof out.view === 'string' && out.view) out.view = said;
    if (typeof out.position === 'string' && out.position) out.position = said;
    return out;
  };
  /* The evidence is the engine's sentences about what somebody said, with their words inside it. */
  const record = more.subjectRecord ?? [];
  const stripEvidence = (e: any) => (typeof e === 'string' ? withoutWhatGivesAColleagueAway(withoutColleaguesQuotesForTheSubject(e, record)) : e);
  return items.map((d) => ({
    ...d,
    ...(Array.isArray((d as any).positions) ? { positions: (d as any).positions.map(stripSide) } : {}),
    ...(Array.isArray((d as any).perspectives) ? { perspectives: (d as any).perspectives.map(stripSide) } : {}),
    ...(Array.isArray((d as any).evidence) ? { evidence: (d as any).evidence.map(stripEvidence) } : {}),
  }));
}
