/**
 * THE REPORT, LAID OUT (the documents test of 24 November 2026).
 *
 * One written record (`TheWrittenReport`), three layouts, so they cannot disagree:
 *   - the chat: what to read first, in the place they asked: the summary, what they are least likely to know, the decisions waiting, the gaps the
 *     team must close before a final version, and an offer to ask the people who can close them;
 *   - the Word file: the whole report, with its tables, each part naming the documents it rests on;
 *   - the Excel file: the actions register, the gaps, the evidence index (every worked-out figure with where it sits and how it was worked out),
 *     and the list of documents read.
 * A line no document backs is said to be unverified, in every layout.
 */
import { docxOf, type Block } from '../year-end/the-year-end-files';
import type { AnAttachment } from '../email/attachments';
import type { ALine, TheWrittenReport, AGapWritten } from './writing-the-report';
import type { ASource, TheChannel } from './the-report-on-request';
import { aList } from './the-report-on-request';

const XLSX = require('xlsx') as typeof import('xlsx');

export const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const UNVERIFIED = 'I could not find this in any of the documents, so treat it as unverified.';

const sentence = (s: string) => { const t = String(s ?? '').trim(); return !t ? '' : /[.!?]["”)]?$/.test(t) ? t : `${t}.`; };
/** A document by its file name; a check-in or the Desk as a sentence says it ("the report on \"Warehouse daily\""). */
const nameOf = (s: ASource) => (s.kind === 'material' ? s.name || s.label : s.label);
const fromWords = (sources: ASource[]) => (sources.length ? `From ${aList(sources.map(nameOf))}.` : UNVERIFIED);
const aLineSaid = (l: ALine) => (l.sources.length ? sentence(l.text) : `${sentence(l.text)} ${UNVERIFIED}`);
/** A finding with the documents it rests on: up to three by name, the rest counted. */
const withItsSources = (text: string, sources: ASource[]) => {
  if (!sources.length) return `${sentence(text)} ${UNVERIFIED}`;
  const names = sources.map(nameOf);
  const named = names.length <= 3 ? aList(names) : `${names.slice(0, 2).join(', ')} and ${names.length - 2} other documents`;
  return `${sentence(text)} This is from ${named}.`;
};

/* ------------------------------------------------------------------ the chat */

/** The gaps the team must close before the final report, each with who can close it. */
export const beforeTheFinal = (w: TheWrittenReport): AGapWritten[] => w.gaps.filter((g) => g.beforeFinal);

export function theReportInTheChat(w: TheWrittenReport, a: { on: Date; documents: number; emailedTo: string | null; channel: TheChannel }): string {
  const parts: string[] = [];
  const day = a.on.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  parts.push(`Here is your report, "${w.title}", written on ${day} from ${a.documents === 1 ? 'the one document' : a.documents === 2 ? 'both documents' : `all ${a.documents} documents`} you gave me.`);
  if (w.summary.length) parts.push(`${w.summary.map(aLineSaid).join(' ')} The Word file names the documents behind every line.`);
  if (w.knowFirst.length) parts.push(`What you should know first.\n${w.knowFirst.map((l, i) => `${i + 1}. ${withItsSources(l.text, l.sources)}`).join('\n')}`);
  if (w.decisions.length) parts.push(`What needs a decision.\n${w.decisions.map((d, i) => `${i + 1}. ${sentence(d.text)}${d.when ? ` ${sentence(`This is needed ${lowerFirst(d.when)}`)}` : ''}${d.sources.length ? '' : ` ${UNVERIFIED}`}`).join('\n')}`);
  const before = beforeTheFinal(w);
  if (before.length) parts.push(`What your team should close before the final report.\n${before.map((g, i) => `${i + 1}. ${sentence(g.gap)} ${g.who ? sentence(`${g.who} can supply ${lowerFirst(g.recordsNeeded)}`) : sentence(`It needs ${lowerFirst(g.recordsNeeded)}`)}`).join('\n')}`);
  const files = `The full report, with its tables, is in the Word file, and the ${w.register.length === 1 ? 'one outstanding action' : `${w.register.length} outstanding actions`}, the gaps and the evidence behind every figure are in the Excel file.`;
  parts.push(a.emailedTo ? `${files} I have emailed both to ${a.emailedTo}.` : `${files} Ask me to email them to you.`);
  if (before.length) parts.push('If you want, I can set up check-ins to ask the people who can close these gaps for the updates. Tell me who should be asked, or say yes and I will start with the people named above.');
  parts.push('I have kept this report, so you can ask me for it again at any time.');
  return parts.join('\n\n');
}

const lowerFirst = (s: string) => { const t = String(s ?? '').trim(); return t && /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t; };

/* ------------------------------------------------------------------ the Word file */

export function theReportAsBlocks(w: TheWrittenReport, on: Date): Block[] {
  const out: Block[] = [];
  const day = on.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  out.push({ t: 'h1', text: w.title });
  out.push({ t: 'small', text: `Written by Groundwork on ${day} from ${w.sources.length === 1 ? 'one document' : `${w.sources.length} documents`}. Every part names the documents it rests on.` });
  const lines = (heading: string, xs: ALine[], numbered = false) => {
    if (!xs.length) return;
    out.push({ t: 'h2', text: heading });
    xs.forEach((l, i) => { out.push({ t: 'p', text: numbered ? `${i + 1}. ${sentence(l.text)}` : sentence(l.text) }); out.push({ t: 'small', text: fromWords(l.sources) }); });
  };
  lines('Summary', w.summary);
  lines('What to know first', w.knowFirst, true);
  lines('Patterns across the year', w.patterns, true);
  for (const s of w.sections) {
    out.push({ t: 'h2', text: s.heading });
    for (const b of s.blocks) {
      if (b.line) { out.push({ t: 'p', text: sentence(b.line.text) }); out.push({ t: 'small', text: fromWords(b.line.sources) }); }
      if (b.table) {
        if (b.table.title) out.push({ t: 'h3', text: b.table.title });
        out.push({ t: 'table', text: '', columns: b.table.columns, rows: b.table.rows });
        out.push({ t: 'small', text: fromWords(b.table.sources) });
      }
    }
  }
  if (w.decisions.length) {
    out.push({ t: 'h2', text: 'Decisions for leadership' });
    out.push({ t: 'table', text: '', columns: ['Decision', 'When'], rows: w.decisions.map((d) => [sentence(d.text), d.when]) });
  }
  if (w.gaps.length) {
    out.push({ t: 'h2', text: 'What the documents could not support' });
    out.push({ t: 'table', text: '', columns: ['Gap', 'What it limits', 'Records needed', 'Who should supply them', 'Before the final report'], rows: w.gaps.map((g) => [g.gap, g.limits, g.recordsNeeded, g.who, g.beforeFinal ? 'Yes' : 'No']) });
  }
  if (w.register.length) {
    out.push({ t: 'h2', text: 'Outstanding actions' });
    out.push({ t: 'p', text: `There ${w.register.length === 1 ? 'is one action' : `are ${w.register.length} actions`}. Each is in the Excel file with its evidence.` });
    out.push({ t: 'table', text: '', columns: ['', 'Action', 'Owner', 'Due', 'Priority'], rows: w.register.map((r) => [r.id, r.action, r.owner, r.due, r.priority]) });
  }
  out.push({ t: 'h2', text: 'The documents this report rests on' });
  for (const s of w.sources) out.push({ t: 'li', text: nameOf(s) });
  return out;
}

/* ------------------------------------------------------------------ the Excel file */

export function theRegisterAsAWorkbook(w: TheWrittenReport): Buffer {
  const book = XLSX.utils.book_new();
  const sheet = (name: string, rows: (string | number)[][], widths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    (ws as any)['!cols'] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, ws, name);
  };
  sheet('Actions register', [
    ['ID', 'Action', 'Area', 'Owner', 'Due', 'Priority', 'Amount', 'Evidence', 'Documents'],
    ...w.register.map((r) => [r.id, r.action, r.area, r.owner, r.due, r.priority, r.amount, r.evidence, r.sources.map(nameOf).join('; ') || 'Unverified']),
  ], [6, 60, 16, 28, 14, 10, 14, 40, 40]);
  sheet('Gaps', [
    ['Gap', 'What it limits', 'Records needed', 'Who should supply them', 'Before the final report', 'Documents'],
    ...w.gaps.map((g) => [g.gap, g.limits, g.recordsNeeded, g.who, g.beforeFinal ? 'Yes' : 'No', g.sources.map(nameOf).join('; ')]),
  ], [40, 40, 40, 28, 12, 40]);
  sheet('Evidence index', [
    ['Figure', 'Value', 'Where it is', 'How it was worked out', 'Document'],
    ...w.evidence.map((e) => [e.figure, e.value, e.where, e.working, e.source]),
  ], [40, 18, 30, 60, 40]);
  sheet('Documents read', [['Document'], ...w.sources.map((s) => [nameOf(s)])], [70]);
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const fileSafe = (s: string) => String(s ?? 'Report').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Report';

export async function theReportFiles(w: TheWrittenReport, on: Date): Promise<AnAttachment[]> {
  return [
    { filename: `${fileSafe(w.title)}.docx`, contentType: DOCX, content: await docxOf(theReportAsBlocks(w, on), w.title) },
    { filename: `${fileSafe(w.title)} - actions register and evidence.xlsx`, contentType: XLSX_TYPE, content: theRegisterAsAWorkbook(w) },
  ];
}
