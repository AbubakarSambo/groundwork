import { aNumberInWords } from './a-number-in-words';
import { theConversationWorthHavingSaying } from '../grounds/what-is-sent-in-simpler-words';

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

/** A thing the report names, as it is quoted: no full stop or colon at its end, and not longer than a line. */
export function aTopicQuoted(t: unknown): string | null {
  const x = String(t ?? '').replace(/\s+/g, ' ').trim().replace(/[.:;,\s]+$/, '');
  if (!x) return null;
  const cut = x.length <= 90 ? x : `${x.slice(0, 90).replace(/\s+\S*$/, '')}...`;
  return `"${cut}"`;
}

const listed = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

/** "differ on "a"", "differ on "a" and "b"", "differ on "a", "b" and one more". */
function differOn(topics: string[]): string {
  const shown = topics.slice(0, 2);
  const rest = topics.length - shown.length;
  return `differ on ${listed(rest > 0 ? [...shown, `${aNumberInWords(rest)} more`] : shown)}`;
}

const cutLabel = (label: string, max: number) => (label.length <= max ? label : `${label.slice(0, max).replace(/\s+\S*$/, '')}...`);

/**
 * The insight for one reader from the report they are served. Null where the report has nothing settled and nothing open yet (it is still forming, or
 * nobody has said enough to name either), so nothing is claimed.
 */
export function theFirstInsight(report: any, label: string, reader: { isTheLead: boolean; simplerWords?: boolean | null }): TheInsight | null {
  const stand = report?.whereThingsStand;
  if (!stand || report?.withheldUntilYouAnswer) return null;
  const settled = Array.isArray(stand.settled) ? stand.settled.length : Number(stand.agreed) || 0;
  const open: string[] = (Array.isArray(stand.open) ? stand.open : []).map(aTopicQuoted).filter((t: string | null): t is string => !!t);
  if (settled === 0 && open.length === 0) return null;

  const lines: string[] = [];
  const name = cutLabel(label, 60);
  if (open.length) lines.push(`The people in "${name}" ${differOn(open)}.`);
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
    subjectForTheLead: reader.isTheLead && open.length ? `The people in "${cutLabel(label, 40)}" ${differOn(open)}` : null,
    lines,
  };
}

/** The first thing the served report names as still open, quoted, or null. Used by the follow-up a week after, which asks again about the same thing. */
export function theFirstOpenDifference(report: any): string | null {
  if (!report?.whereThingsStand || report?.withheldUntilYouAnswer) return null;
  const open: unknown[] = Array.isArray(report.whereThingsStand.open) ? report.whereThingsStand.open : [];
  for (const t of open) { const q = aTopicQuoted(t); if (q) return q; }
  return null;
}
