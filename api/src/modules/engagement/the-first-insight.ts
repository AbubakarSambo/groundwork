import { aNumberInWords } from './a-number-in-words';
import { theConversationWorthHavingSaying } from '../grounds/what-is-sent-in-simpler-words';
import { isAWholeSentence } from '../reports/what-people-said-differently-about';

/**
 * THE FIRST MEANINGFUL INSIGHT IS IN THE MAIL (engagement spec section 7; section 36, journey 5).
 *
 * "Your report is ready" is a link to a finding. The lead should read the finding. This is built from the report AS THE READER IS SERVED IT
 * (ReportsService.sessionReport, which is what the report page and the WhatsApp copy read), so it has the privacy and the naming rules that reader has: a
 * colleague's words are walled until the picture is shared, an anonymous picture names nobody, and the lead's own layer is not given to a participant.
 * It uses only fields the report already holds, which the report's own synthesis wrote: how many things are settled and how many are still open, the
 * name of each thing still open, the one conversation worth having, and what the report says would settle the first of them. Nothing is worded by a
 * model here, and no prompt is involved.
 *
 * WHAT IT NEVER DOES. It never makes up a finding: with nothing settled and nothing open it says nothing, and the mail is the one it was. It never quotes a
 * person, never ranks one, and never gives a participant what only the lead is given ("what I would do" is the lead's). The subject names the thing
 * still open for the LEAD only; everybody else's subject stays the count (decision 109 item 3).
 */
export interface TheInsight {
  /** The lead's subject. Null where the report names nothing still open, and the subject is what it was. */
  subjectForTheLead: string | null;
  /** The sentences the mail opens with, in order. */
  lines: string[];
}

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/** What the report names as still open, cleaned: no full stop or colon at its end, and not longer than a line. */
export function anOpenThing(t: unknown): string | null {
  const x = String(t ?? '').replace(/\s+/g, ' ').trim().replace(/[.:;,\s]+$/, '');
  if (!x) return null;
  /* A sentence is not cut in the middle: it is said whole, or (in a subject) not said. */
  return x.length <= 400 ? x : `${x.slice(0, 400).replace(/\s+\S*$/, '')}...`;
}

/** A thing the report names, as it is quoted. */
export function aTopicQuoted(t: unknown): string | null {
  const x = anOpenThing(t);
  return x ? `"${x}"` : null;
}

const LOWER_AFTER_A_COMMA = /^(?:The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/;
const lowerFirstOfAClause = (s: string) => (LOWER_AFTER_A_COMMA.test(s) ? `${s.charAt(0).toLowerCase()}${s.slice(1)}` : s);

/**
 * The first thing open, said as the report says it. The report writes a difference either as a noun phrase ("the unit of measurement for success") or as a
 * whole sentence ("Who owns the next step with the distributor is not agreed upon by the team."), and a sentence does not follow "differ on". So a phrase is
 * "The people in "X" differ on "T"" and a sentence is said as itself: "In "X", who owns the next step ... is not agreed upon by the team". The same test the
 * report's own tile uses (isAWholeSentence), so the mail and the page say it the same way.
 */
function firstOpenSaid(label: string, items: string[], capitalised: boolean): string {
  const first = items[0];
  const more = items.length - 1;
  const rest = more > 0 ? `, and ${aNumberInWords(more)} more ${more === 1 ? 'difference is' : 'differences are'} still open` : '';
  if (isAWholeSentence(first)) {
    const clause = lowerFirstOfAClause(first);
    return capitalised ? `${capital(first)}${rest}.` : `In "${label}", ${clause}${rest}`;
  }
  return `The people in "${label}" differ on "${first}"${rest}${capitalised ? '.' : ''}`;
}

/** A subject is read in a list, so it is short; where the finding does not fit, the count says it and the body says the rest. */
export const A_SUBJECT_FITS = 150;
export const aSubjectThatFits = (said: string, instead: string) => (said.length <= A_SUBJECT_FITS ? said : instead);

const cutLabel = (label: string, max: number) => (label.length <= max ? label : `${label.slice(0, max).replace(/\s+\S*$/, '')}...`);

/**
 * The insight for one reader from the report they are served. Null where the report has nothing settled and nothing open yet (it is still forming, or
 * nobody has said enough to name either), so nothing is claimed.
 */
export function theFirstInsight(report: any, label: string, reader: { isTheLead: boolean; simplerWords?: boolean | null }): TheInsight | null {
  const stand = report?.whereThingsStand;
  if (!stand || report?.withheldUntilYouAnswer) return null;
  const settled = Array.isArray(stand.settled) ? stand.settled.length : Number(stand.agreed) || 0;
  const open: string[] = (Array.isArray(stand.open) ? stand.open : []).map(anOpenThing).filter((t: string | null): t is string => !!t);
  if (settled === 0 && open.length === 0) return null;

  const lines: string[] = [];
  const name = cutLabel(label, 60);
  if (open.length) lines.push(firstOpenSaid(name, open, true));
  else lines.push(`${capital(aNumberInWords(settled))} ${settled === 1 ? 'thing' : 'things'} in "${name}" ${settled === 1 ? 'is' : 'are'} settled, and none are still open.`);
  if (open.length) {
    lines.push(
      `${capital(aNumberInWords(settled))} ${settled === 1 ? 'thing is' : 'things are'} settled and ${aNumberInWords(open.length)} ${open.length === 1 ? 'is' : 'are'} still open.`,
    );
  }
  const question = String(report?.theConversationWorthHaving ?? '').replace(/\s+/g, ' ').trim();
  if (question) lines.push(`${theConversationWorthHavingSaying(reader.simplerWords)} ${question}`);

  if (reader.isTheLead && open.length) {
    const first = (Array.isArray(stand.openWithReasons) ? stand.openWithReasons : [])[0];
    const settledBy = String(first?.settledBy ?? '').replace(/\s+/g, ' ').trim();
    lines.push(
      settledBy
        ? `Here is what I would do first. ${/[.!?]$/.test(settledBy) ? settledBy : `${settledBy}.`}`
        : question ? 'What I would do is bring the people involved together on that one question.' : 'What I would do is start with the first of these.',
    );
  }

  return {
    subjectForTheLead: reader.isTheLead && open.length ? aSubjectThatFits(firstOpenSaid(cutLabel(label, 40), open, false), `The shared picture for "${cutLabel(label, 40)}" found ${aNumberInWords(open.length)} ${open.length === 1 ? 'difference' : 'differences'} still open`) : null,
    lines,
  };
}

/**
 * The first thing the served report names as still open, as a clause that follows "found that" or "In "X",": a phrase is "the people differ on "T"" and a
 * sentence is itself with its first word lower case where it is not a name. Null where the report names nothing open.
 */
export function theFirstOpenDifference(report: any): string | null {
  if (!report?.whereThingsStand || report?.withheldUntilYouAnswer) return null;
  const open: unknown[] = Array.isArray(report.whereThingsStand.open) ? report.whereThingsStand.open : [];
  for (const t of open) {
    const x = anOpenThing(t);
    if (x) return isAWholeSentence(x) ? lowerFirstOfAClause(x) : `the people differ on "${x}"`;
  }
  return null;
}
