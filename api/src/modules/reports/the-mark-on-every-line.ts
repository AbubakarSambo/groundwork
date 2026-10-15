import { theThingsTheyDisagreeOnAreSentences } from './the-things-people-disagree-on-are-sentences';
import { HowALineIsKnown, theMarkOf, ARecordRowToMark } from './how-a-line-is-known';
import { contentWords } from './what-the-record-actually-holds';
import { intoSentences } from '../conversation/nothing-invented-reaches-them';
import { howSolid, MARK as FIGURE_MARK } from './a-figure-nobody-can-check-says-so';

/**
 * THE SAME FOUR MARKS ON EVERY LINE A LEAD READS IN A REPORT (week 6b, decision 43).
 *
 * The prototype marks each line: "Proven", "Confirmed by the person who received it", "Only
 * someone’s word", "From memory only" (docs/prototype/screens/B4-reports-and-sharing/team-report.txt).
 * The lines of the record already carry them (how-a-line-is-known.ts). The lines the synthesis WRITES
 * (the shared picture, each agreement, each difference with its sides and its evidence, each person's
 * finding) are built from several record lines, and until now carried none.
 *
 * THE PRODUCT DECIDES, NEVER THE MODEL. The model's wording is never asked how sure it is. A line is
 * tied to the record lines it restates (the same crude word test the rest of the reports use, made
 * stricter here: most of the record line's own words must be in it), and takes the mark of those
 * record lines. Several record lines behind one line: it takes the WEAKEST mark, and says so in a
 * plain sentence when they differ. The order, strongest first, is the prototype's own:
 * proven, confirmed, said, memory.
 *
 * WHEN NO RECORD LINE IS BEHIND IT. "Only someone’s word" is the mark, not silence: the line is
 * something the synthesis said, and nothing written or confirmed stands behind it.
 *
 * A mark describes the line. It never says who said it, never names a file, and carries nothing
 * about how anybody's answers were rated.
 *
 * WHEN IT IS WORKED OUT. When the report is built from the record (the synthesis write), and stored
 * with the report. Opening a report reads what was stored and asks nothing (decision 7). A report
 * stored before this existed has none stored, and reads as it always did: no mark, not an invented one.
 */

export const WHAT_EACH_MARK_SAYS: Record<HowALineIsKnown, string> = {
  proven: 'Proven',
  confirmed: 'Confirmed by the person who received it',
  said: 'Only someone’s word',
  memory: 'From memory only',
};

/** Strongest first. The weakest mark of several is the one furthest along this list. */
const STRONGEST_FIRST: HowALineIsKnown[] = ['proven', 'confirmed', 'said', 'memory'];

export const WHEN_THE_MARKS_DIFFER =
  'This line rests on more than one thing people said, and they are not all known in the same way. It carries the mark of the one that is known least well.';

/** What a served line carries. `marksBehind` and `markNote` are there only when the marks behind it differ. */
export interface AMarkOnALine {
  mark: HowALineIsKnown;
  markSays: string;
  /** Only where the marks behind the line differ. */
  marksBehind?: HowALineIsKnown[];
  markNote?: string;
  /** The older figure-only mark ("their estimate", "from memory"), kept where the line carries a figure it applies to. */
  figureIs?: 'their estimate' | 'from memory';
}

export function theWeakestOf(marks: readonly HowALineIsKnown[]): HowALineIsKnown {
  let weakest: HowALineIsKnown = 'proven';
  for (const m of marks) if (STRONGEST_FIRST.indexOf(m) > STRONGEST_FIRST.indexOf(weakest)) weakest = m;
  return weakest;
}

/** A row of the record, with the mark the product already gave it. */
export interface AMarkedRow {
  participantId: string | null;
  text: string;
  mark: HowALineIsKnown;
}

export function markTheRows(rows: readonly (ARecordRowToMark & { disputedAt?: unknown })[], whoAdded: Map<string, string | null>): AMarkedRow[] {
  return rows
    .filter((r) => !r.disputedAt && String(r.text ?? '').trim())
    .map((r) => ({ participantId: r.participantId ?? null, text: r.text, mark: theMarkOf(r, whoAdded) }));
}

/**
 * Whether a line restates a record line: at least two of the record line's content words, and at
 * least 60 per cent of them. Stricter than `touches`, which only asks for two shared words: a mark
 * taken from a record line that merely shares a client's name would be a mark on the wrong thing.
 */
export function restates(line: string, rowText: string): boolean {
  const wanted = contentWords(rowText);
  if (wanted.size < 2) return false;
  const have = contentWords(line);
  let shared = 0;
  for (const w of wanted) if (have.has(w)) shared++;
  return shared >= 2 && shared / wanted.size >= 0.75;
}

function asAMark(marks: HowALineIsKnown[], text: string): AMarkOnALine {
  const mark = marks.length ? theWeakestOf(marks) : 'said';
  const distinct = STRONGEST_FIRST.filter((m) => marks.includes(m));
  const figure = mark === 'memory' ? howSolid({ text, recallBased: true }) : null;
  return {
    mark,
    markSays: WHAT_EACH_MARK_SAYS[mark],
    ...(distinct.length > 1 ? { marksBehind: distinct, markNote: WHEN_THE_MARKS_DIFFER } : {}),
    ...((figure === 'estimated' || figure === 'from-memory') && FIGURE_MARK[figure]
      ? { figureIs: FIGURE_MARK[figure] as 'their estimate' | 'from memory' }
      : {}),
  };
}

/** The mark of one line the synthesis wrote, from the record lines behind it. `aboutPerson` narrows to one person's own lines. */
export function theMarkOnALine(text: string, rows: readonly AMarkedRow[], aboutPerson?: string | null): AMarkOnALine {
  const pool = aboutPerson ? rows.filter((r) => r.participantId === aboutPerson) : rows;
  return asAMark(pool.filter((r) => restates(text, r.text)).map((r) => r.mark), text);
}

/**
 * The marks of a whole report, in the shape it is stored and served: one per sentence of the shared
 * picture, one per agreement, and for each difference one for the topic, one per side and one per
 * piece of evidence, and one per finding. Positions are the same as in the stored report.
 */
export interface TheMarksOfAReport {
  sharedPicture: AMarkOnALine[];
  agreements: AMarkOnALine[];
  divergences: { topic: AMarkOnALine; positions: AMarkOnALine[]; evidence: AMarkOnALine[] }[];
  findings: AMarkOnALine[];
}

const words = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const topicOf = (d: any): string => words(d?.topic) || words(d?.title) || words(d?.area) || words(d?.summary) || words(d?.text);
const sidesOf = (d: any): any[] => (Array.isArray(d?.positions) ? d.positions : Array.isArray(d?.perspectives) ? d.perspectives : []);

/** The sentences of the shared picture, as a person reads them. The same split builds and serves the marks. */
export function theSentencesOf(text: unknown): string[] {
  return intoSentences(theThingsTheyDisagreeOnAreSentences(String(text ?? ''))).map((s) => s.trim()).filter(Boolean);
}

export function theMarksOfAReport(
  report: { sharedPicture?: unknown; agreements?: unknown; divergences?: unknown; findings?: unknown },
  rows: readonly AMarkedRow[],
): TheMarksOfAReport {
  const agreements = Array.isArray(report.agreements) ? (report.agreements as unknown[]) : [];
  const divergences = Array.isArray(report.divergences) ? (report.divergences as any[]) : [];
  const findings = Array.isArray(report.findings) ? (report.findings as any[]) : [];
  return {
    sharedPicture: theSentencesOf(report.sharedPicture).map((s) => theMarkOnALine(s, rows)),
    agreements: agreements.map((a) => theMarkOnALine(typeof a === 'string' ? a : topicOf(a), rows)),
    divergences: divergences.map((d) => ({
      topic: theMarkOnALine(topicOf(d), rows),
      positions: sidesOf(d).map((p) => theMarkOnALine(words(p?.view) || words(p?.said), rows)),
      evidence: (Array.isArray(d?.evidence) ? d.evidence : []).map((e: unknown) => theMarkOnALine(words(e), rows)),
    })),
    findings: findings.map((f) => theMarkOnALine(words(f?.text), rows, f?.participantId ?? null)),
  };
}

/**
 * THE REPORT AS A READER IS SERVED IT, WITH THE STORED MARKS BESIDE EACH LINE.
 *
 * `marks` is what the build stored (`engagement.marksOnItsLines`). Where the report has none (it was
 * stored before this), nothing is added. Where the stored marks no longer fit the lines (a count
 * that differs), nothing is added to that field rather than a mark on the wrong line.
 *
 * - `sharedPictureLines`: the shared picture, sentence by sentence, each with its mark. `sharedPicture` itself is unchanged.
 * - `agreementMarks`: one mark per agreement, in the order of `agreements`.
 * - each difference carries its own `mark`, each side `mark`, and `evidenceMarks` in the order of `evidence`.
 * - each finding carries `mark`.
 */
export function withTheMarksOnItsLines<T extends Record<string, any> | null | undefined>(report: T, marks: TheMarksOfAReport | null | undefined): T {
  if (!report || typeof report !== 'object') return report;
  const r = report as Record<string, any>;
  const out: Record<string, any> = { ...r };
  /* The things people disagree on are sentences, in the text as well as in its lines. */
  if (typeof r.sharedPicture === 'string') out.sharedPicture = theThingsTheyDisagreeOnAreSentences(r.sharedPicture);
  if (typeof r.theOpening === 'string') out.theOpening = theThingsTheyDisagreeOnAreSentences(r.theOpening);
  if (!marks) return out.sharedPicture === r.sharedPicture && out.theOpening === r.theOpening ? report : (out as T);

  if (Array.isArray(marks.sharedPicture) && typeof r.sharedPicture === 'string') {
    const sentences = theSentencesOf(r.sharedPicture);
    if (sentences.length && sentences.length === marks.sharedPicture.length) {
      out.sharedPictureLines = sentences.map((text, i) => ({ text, ...marks.sharedPicture[i] }));
    }
  }
  if (Array.isArray(r.agreements) && Array.isArray(marks.agreements) && r.agreements.length === marks.agreements.length) {
    out.agreementMarks = marks.agreements;
  }
  if (Array.isArray(r.divergences) && Array.isArray(marks.divergences) && r.divergences.length === marks.divergences.length) {
    out.divergences = r.divergences.map((d: any, i: number) => {
      if (!d || typeof d !== 'object') return d;
      const m = marks.divergences[i];
      const withSides = (key: 'positions' | 'perspectives') =>
        Array.isArray(d[key]) && d[key].length === m.positions.length
          ? { [key]: d[key].map((p: any, j: number) => (p && typeof p === 'object' ? { ...p, ...m.positions[j] } : p)) }
          : {};
      return {
        ...d,
        ...m.topic,
        ...withSides('positions'),
        ...withSides('perspectives'),
        ...(Array.isArray(d.evidence) && d.evidence.length === m.evidence.length ? { evidenceMarks: m.evidence } : {}),
      };
    });
  }
  if (Array.isArray(r.findings) && Array.isArray(marks.findings) && r.findings.length === marks.findings.length) {
    out.findings = r.findings.map((f: any, i: number) => (f && typeof f === 'object' ? { ...f, ...marks.findings[i] } : f));
  }
  return out as T;
}
