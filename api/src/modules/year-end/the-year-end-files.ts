/**
 * THE YEAR-END FILES, WRITTEN FROM THE ONE CONTENT (Fatima, increment 4).
 *
 *   report            editable DOCX, and a PDF of the same words
 *   presentation      editable PPTX
 *   register          editable XLSX (with the evidence index as its second sheet), and a short readable DOCX and PDF
 *   evidence index    its own DOCX, so it can be sent on its own
 *
 * Each writer only lays out what `the-year-end-content.ts` already says, so a line that is in one file is in the others. Nothing here
 * adds a claim. The DOCX and PPTX are written as the zips of XML they are (JSZip, which the product already uses to read them), the XLSX
 * with the `xlsx` library the finance export already uses, and the PDF with pdfkit. No new dependency is needed.
 */
import {
  dayWords, EMPTY_SECTION, MONTHS, plain, sourceWords, STATUS_PLAIN, STATUS_WORDS, theSourceLine, theSourceName,
  type Claim, type RegisterLine, type YearEndContent,
} from './the-year-end-content';
import { THE_FLAG, theMonthAsAParagraph, theOpeningAsAParagraph } from './the-year-end-narrative';
import type { AnAttachment } from '../email/attachments';

const JSZip = require('jszip') as typeof import('jszip');
const XLSX = require('xlsx') as typeof import('xlsx');
const PDFDocument = require('pdfkit') as any;

export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const PDF_TYPE = 'application/pdf';

export interface TheVersion { version: number; status: string }

/** A paragraph, a heading, a list item, a small source line, or a table. The report on request writes tables too (reports-on-request/the-report-files.ts). */
export type Block = { t: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'small' | 'table'; text: string; columns?: string[]; rows?: string[][] };

const esc = (s: string) => plain(String(s ?? '')).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const oneLine = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim();

const STATUS_SAID: Record<string, string> = { draft: 'a first draft', revised: 'a revised draft', approved: 'approved', final: 'final' };
const theStatus = (v: TheVersion) => STATUS_SAID[v.status] ?? v.status;

/* ------------------------------------------------------------------ what each document says */

const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
const claimsIn = (c: YearEndContent, id: string) => c.sections.find((x) => x.id === id)?.claims ?? [];
const monthSections = (c: YearEndContent) => c.sections.filter((x) => x.id.startsWith('month:') && x.claims.length);

/**
 * WHAT MATTERS MOST, IN A PARAGRAPH AT THE TOP (Fatima round 6; Hafsah's judgement: a short first thing to read before the long report). Written by code from the
 * same content the files are made from: only counts and months the content holds, in plain sentences, with her name, and nothing about any person.
 */
export function whatMattersMost(c: YearEndContent): string {
  const first = c.principalFirstName;
  const decide = claimsIn(c, 'decision').length;
  const said = claimsIn(c, 'unverified').length;
  const done = claimsIn(c, 'achieved').length;
  const open = claimsIn(c, 'open').length;
  const missing = [...new Set([...(c.noteGaps ?? []), ...c.gaps])].sort().map((g) => MONTHS[Number(g.slice(5)) - 1]);
  /* The months with a monthly note, not the months that have a section: a month she asked to add, an email about a month and a payments tracker do not make a month covered by a note. */
  const months = (c.noteMonths ?? monthSections(c).map((x) => x.id.slice(6))).map((m) => MONTHS[Number(m.slice(5)) - 1]).filter((m) => !missing.includes(m));
  const out: string[] = [];
  out.push(months.length ? `The monthly notes cover ${months.length === 1 ? 'one month' : `${months.length} months`} of ${c.year}${missing.length ? `, and no note covers ${listOf(missing)}` : ''}.` : `No monthly notes have been forwarded yet, so this report has little to say about the year.`);
  out.push(done ? `${many(done, 'matter is', 'matters are')} settled with proof.` : 'Nothing is settled with proof yet, so nothing is claimed as achieved.');
  if (said) out.push(`${many(said, 'matter was', 'matters were')} said to be done, with nothing yet to show it.`);
  if (decide) out.push(`${many(decide, 'matter waits', 'matters wait')} for ${first}'s decision.`);
  if (open) out.push(`${many(open, 'matter is', 'matters are')} still open.`);
  return out.join(' ');
}

/**
 * WHETHER A DRAFT HAS ANYTHING TO SAY (release test of 21 November, bug 92). Halima was sent her year-end draft one minute after her introduction, and
 * it said only "Nothing has been promised, paid or approved on Halima's record for 2026 yet" and "Nothing has been forwarded for January, February ...".
 * A draft says something when the record holds a matter (settled, said, open or waiting for a decision) or a monthly note. The same counts the draft's
 * own first sentences are written from (theYearInWords), so the two cannot disagree.
 */
export function aDraftHasSomethingToSay(c: YearEndContent): boolean {
  const matters = ['achieved', 'unverified', 'open', 'decision'].some((id) => claimsIn(c, id).length > 0);
  return matters || (c.noteMonths ?? []).length > 0 || monthSections(c).length > 0;
}

/** The year in two or three sentences, from what the content holds. Both the report and the presentation say it. */
export function theYearInWords(c: YearEndContent): string[] {
  const done = claimsIn(c, 'achieved').length;
  const said = claimsIn(c, 'unverified').length;
  const open = claimsIn(c, 'open').length + claimsIn(c, 'decision').length;
  const months = (c.noteMonths ?? monthSections(c).map((x) => x.id.slice(6))).map((m) => MONTHS[Number(m.slice(5)) - 1]);
  const carried = c.register.filter((r) => r.carryForward && r.status !== 'completed' && r.status !== 'cancelled').length;
  const out = [
    done + said + open === 0 ? `Nothing has been promised, paid or approved on ${c.principalFirstName}'s record for ${c.year} yet, so what follows is what the notes say.` : `${c.principalFirstName}'s record for ${c.year} has ${many(done, 'matter', 'matters')} settled with proof, ${many(said, 'matter', 'matters')} reported as done without anything to show it, and ${many(open, 'matter', 'matters')} still open or waiting for a decision.`,
    months.length ? `Monthly notes were forwarded for ${listOf(months)}, and what they say is set out month by month.` : 'No monthly notes have been forwarded yet, so there is no month-by-month account.',
  ];
  /* When the narrative was written, the opening paragraph says what the notes say, so the line that only counts the months is not needed. */
  if (c.narrative?.opening.length) out.splice(1, 1);
  if (carried) out.push(`${many(carried, 'open matter is', 'open matters are')} marked to carry into ${c.year + 1}.`);
  if (c.gaps.length) out.push(`Nothing has been forwarded for ${listOf(c.gaps.map((g) => MONTHS[Number(g.slice(5)) - 1]))}.`);
  return out;
}

/** The year in one slide: the counts, then the first of the verified sentences the opening paragraph is made of, each with where it comes from in a few words. */
export function theYearOnASlide(c: YearEndContent): string[] {
  const words = theYearInWords(c);
  const o = c.narrative?.opening ?? [];
  if (!o.length) return words.slice(0, 5);
  const from = (ref: string) => { const e = c.evidence.find((x) => x.ref === ref); return e ? ` (${e.label}, ${dayWords(e.at)})` : ''; };
  return [words[0], ...o.slice(0, 3).map((x) => `${clip(x.text, 200)}${from(x.ref)}${x.flagged ? ` ${THE_FLAG}` : ''}`), ...words.slice(1, 2)].slice(0, 5);
}

/** The proven lines with the outcomes first, in the order the model gave them, then the rest as they were. With no outcomes picked, the lines as they were. */
export function theAchievedLines(c: YearEndContent): { outcomes: Claim[]; routine: Claim[] } {
  const all = claimsIn(c, 'achieved');
  const ids = c.outcomes?.ids ?? [];
  if (!ids.length) return { outcomes: all, routine: [] };
  const outcomes = ids.map((id) => all.find((cl) => cl.id === id)).filter((cl): cl is Claim => !!cl);
  return { outcomes, routine: all.filter((cl) => !ids.includes(cl.id)) };
}

/** A line the register marks as not backed up. */
const isDisputed = (c: YearEndContent, cl: Claim) => cl.status === 'disputed' || (!!cl.rowKey && !!c.register.find((r) => r.key === cl.rowKey)?.disputed);

/** How many lines of each part the briefing reads out. The rest are counted, and every line is in the register and the evidence index. */
const IN_THE_BRIEFING: Record<string, number> = { achieved: 12, disputed: 8, unverified: 8, decision: 8, open: 12, corrections: 20, record: 3, gaps: 6 };
const A_MONTH_IN_THE_BRIEFING = 3;

/**
 * THE REPORT IS A BRIEFING (Dangote stress test, D9: 68,559 words, every forwarded note month by month). Outcomes first, then each claim by its standing: proven, said
 * and not shown, disputed, waiting for a decision, still open. Then the year month by month, a few lines each. Each part reads out its first lines and counts the
 * rest; the full evidence, every statement with its source, is the evidence index that goes with it.
 */
export function reportBlocks(c: YearEndContent, v: TheVersion): Block[] {
  const out: Block[] = [
    { t: 'h1', text: `${c.year} year-end report` },
    { t: 'p', text: `Prepared for ${c.principalName}. This is version ${v.version}, ${theStatus(v)}, built on ${dayWords(c.builtAt)}.` },
    { t: 'h2', text: 'What matters most' },
    { t: 'p', text: whatMattersMost(c) },
    ...(v.status === 'draft' || v.status === 'revised' ? [{ t: 'p' as const, text: `This is a draft. It is not final until ${c.principalFirstName} approves it.` }] : []),
    { t: 'p', text: 'Each statement says where it comes from, and whether it is proven, only said, or disputed. Nothing is counted as achieved without proof. Every statement and its source is in the evidence index that comes with this report.' },
    ...(theOpeningAsAParagraph(c) ? [{ t: 'p' as const, text: theOpeningAsAParagraph(c)! }] : []),
    ...theYearInWords(c).slice(1).map((text) => ({ t: 'p' as const, text })),
  ];
  const part = (title: string, claims: Claim[], most: number, empty: string | null) => {
    if (!claims.length && !empty) return;
    out.push({ t: 'h2', text: title });
    if (!claims.length) { out.push({ t: 'p', text: empty! }); return; }
    const n = c.shortened.includes('all') ? Math.min(3, most) : most;
    for (const cl of claims.slice(0, n)) out.push({ t: 'li', text: oneLine(`${cl.text} ${theSourceLine(c, cl)}${cl.note ? ` ${cl.note}` : ''}`) });
    if (claims.length > n) out.push({ t: 'p', text: `${claims.length - n} more ${claims.length - n === 1 ? 'line is' : 'lines are'} in the register and the evidence index.` });
  };
  const { outcomes, routine } = theAchievedLines(c);
  part('What was achieved, with proof', outcomes, IN_THE_BRIEFING.achieved, EMPTY_SECTION('achieved'));
  if (routine.length) out.push({ t: 'p', text: `${many(routine.length, 'routine task was', 'routine tasks were')} also done and shown, such as ${listOf(routine.slice(0, 2).map((cl) => `"${clip(firstSentence(cl.text).replace(/[.!?]+$/, ''), 80)}"`))}. ${routine.length === 1 ? 'It is' : 'They are'} in the register.` });
  const unverified = claimsIn(c, 'unverified');
  part('Disputed, and not counted', unverified.filter((cl) => isDisputed(c, cl)), IN_THE_BRIEFING.disputed, null);
  part('Said to be done, but not yet shown', unverified.filter((cl) => !isDisputed(c, cl)), IN_THE_BRIEFING.unverified, null);
  part('Waiting for a decision', claimsIn(c, 'decision'), IN_THE_BRIEFING.decision, null);
  part('Still open, and what carries into the next year', claimsIn(c, 'open'), IN_THE_BRIEFING.open, EMPTY_SECTION('open'));
  part('What you corrected', claimsIn(c, 'corrections'), IN_THE_BRIEFING.corrections, null);
  const months = monthSections(c);
  if (months.length) {
    out.push({ t: 'h2', text: 'The year, month by month' });
    out.push({ t: 'p', text: 'Each month below is what that month\'s notes and messages say. No separate proof has been shown for it, except where a line says otherwise.' });
    for (const s of months) {
      out.push({ t: 'h3', text: s.title });
      const prose = theMonthAsAParagraph(c, s.id.slice(6), sourceWords, A_MONTH_IN_THE_BRIEFING, true);
      if (prose) out.push({ t: 'p', text: oneLine(prose) });
      const lines = s.claims.filter((x) => !(prose && x.id.startsWith('nn:')));
      const n = prose ? Math.min(1, lines.length) : A_MONTH_IN_THE_BRIEFING;
      /* The count of the month's messages is always said; the notes it has are read out first. */
      const shown = [...lines.filter((x) => !x.id.startsWith('msg:')).slice(0, n), ...lines.filter((x) => x.id.startsWith('msg:'))];
      for (const cl of shown) out.push({ t: 'li', text: oneLine(`${cl.text}${cl.id.startsWith('msg:') ? '' : ` ${theSourceLine(c, cl)}`}`) });
      const left = lines.length - shown.length;
      if (left > 0) out.push({ t: 'p', text: `${left} more ${left === 1 ? 'line' : 'lines'} for ${s.title} ${left === 1 ? 'is' : 'are'} in the evidence index.` });
    }
  }
  part('Reports and other documents kept', claimsIn(c, 'record'), IN_THE_BRIEFING.record, null);
  part('What the record does not cover', claimsIn(c, 'gaps'), IN_THE_BRIEFING.gaps, null);
  return out;
}

const dueWords = (r: RegisterLine) => (r.dueOn ? `It is due ${dayWords(r.dueOn)}${r.dueInferred ? ' (a day worked out from the words, not given)' : ''}.` : 'No date was given.');
const ownerWords = (r: RegisterLine, first: string) => (r.owner === 'unconfirmed' ? 'Nobody has confirmed who owns it' : r.owner === 'you' ? `${first} has it` : `${r.owner} has it`);

export function registerBlocks(c: YearEndContent, v: TheVersion): Block[] {
  const open = c.register.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');
  const out: Block[] = [
    { t: 'h1', text: `${c.year} outstanding matters and ${c.year + 1} carry-forward register` },
    { t: 'p', text: `Prepared for ${c.principalName}. This is version ${v.version}, ${theStatus(v)}, built on ${dayWords(c.builtAt)}. There ${open.length === 1 ? 'is' : 'are'} ${open.length} ${open.length === 1 ? 'matter' : 'matters'} still open and ${c.register.length - open.length} completed or cancelled.` },
    { t: 'p', text: 'Each matter says which record it is taken from, or that it is unverified. The full table with every column is in the spreadsheet.' },
    { t: 'h2', text: 'Still open' },
  ];
  if (!open.length) out.push({ t: 'p', text: 'Nothing is open on the record.' });
  for (const r of open) {
    out.push({ t: 'li', text: oneLine(`${r.item.replace(/[.!?]+$/, '')}. ${ownerWords(r, c.principalFirstName)}. ${dueWords(r)} ${r.dependency && (r.status === 'awaiting external party' || r.status === 'blocked') ? `${r.dependency}.` : `${STATUS_WORDS[r.status] ?? r.status}.${r.dependency ? ` ${r.dependency}.` : ''}`}${r.decision ? ` The decision needed is ${r.decision}` : ''} Next, ${r.nextFollowUp}.${r.carryForward ? ' It carries into the next year.' : ''}${r.note ? ` ${r.note}` : ''} ${sourceWords(c, r.refs)}`) });
  }
  const done = c.register.filter((r) => r.status === 'completed');
  out.push({ t: 'h2', text: 'Completed with proof' });
  if (!done.length) out.push({ t: 'p', text: 'Nothing on the record is settled with proof yet.' });
  for (const r of done) out.push({ t: 'li', text: oneLine(`${r.item.replace(/[.!?]+$/, '')}. ${r.resolution ?? ''} ${sourceWords(c, r.refs)}`) });
  return out;
}

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : t);
const firstSentence = (t: string) => { const m = /^.*?[.!?](?=\s|$)/.exec(oneLine(t)); return m ? m[0] : oneLine(t); };

/** Every statement in the report, with the source it rests on and the day that source arrived; then each source once, with what it says. */
export function indexBlocks(c: YearEndContent, v: TheVersion): Block[] {
  const out: Block[] = [
    { t: 'h1', text: `${c.year} evidence index` },
    { t: 'p', text: `Prepared for ${c.principalName}. This is version ${v.version}, ${theStatus(v)}. The first part lists each statement in the report and the source it rests on, with the day the source arrived. The second part lists each source once and what it says.` },
    { t: 'h2', text: 'Each statement and its source' },
  ];
  for (const o of c.narrative?.opening ?? []) out.push({ t: 'li', text: oneLine(`${firstSentence(o.text)} ${sourceWords(c, [o.ref])}`) });
  for (const s of c.sections) for (const cl of s.claims) out.push({ t: 'li', text: oneLine(`${firstSentence(cl.text)} ${theSourceLine(c, cl)}`) });
  out.push({ t: 'h2', text: 'The sources, in the order they arrived' });
  for (const e of c.evidence) out.push({ t: 'li', text: oneLine(`${theSourceName(e)[0].toUpperCase()}${theSourceName(e).slice(1)}.${e.fileName ? ` The file is called ${e.fileName}.` : ''} It says: ${clip(plain(e.said), 400)}`) });
  if (!c.evidence.length) out.push({ t: 'p', text: 'No record has been added yet, so nothing is listed.' });
  return out;
}

/* ------------------------------------------------------------------ DOCX */

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/></w:style>
</w:styles>`;

const tableXml = (columns: string[], rows: string[][]) => {
  const cell = (t: string, head: boolean) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="E7ECF3"/>' : ''}</w:tcPr><w:p><w:r>${head ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p></w:tc>`;
  const border = '<w:top w:val="single" w:sz="4" w:color="BFC7D2"/><w:left w:val="single" w:sz="4" w:color="BFC7D2"/><w:bottom w:val="single" w:sz="4" w:color="BFC7D2"/><w:right w:val="single" w:sz="4" w:color="BFC7D2"/><w:insideH w:val="single" w:sz="4" w:color="BFC7D2"/><w:insideV w:val="single" w:sz="4" w:color="BFC7D2"/>';
  const row = (cells: string[], head: boolean) => `<w:tr>${columns.map((_, i) => cell(cells[i] ?? '', head)).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${border}</w:tblBorders></w:tblPr>${row(columns, true)}${rows.map((r) => row(r, false)).join('')}</w:tbl><w:p/>`;
};

export async function docxOf(blocks: Block[], title: string): Promise<Buffer> {
  const para = (b: Block) => {
    if (b.t === 'table') return tableXml(b.columns ?? [], b.rows ?? []);
    if (b.t === 'small') return `<w:p><w:r><w:rPr><w:color w:val="5B6472"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(b.text)}</w:t></w:r></w:p>`;
    const style = b.t === 'h1' ? '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' : b.t === 'h2' ? '<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>' : b.t === 'h3' ? '<w:pPr><w:pStyle w:val="Heading3"/></w:pPr>' : b.t === 'li' ? '<w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="360" w:hanging="260"/></w:pPr>' : '';
    const text = b.t === 'li' ? `• ${b.text}` : b.text;
    return `<w:p>${style}<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  };
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('word/styles.xml', STYLES);
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title><dc:creator>Groundwork</dc:creator></cp:coreProperties>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${blocks.map(para).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/* ------------------------------------------------------------------ PDF */

function pdfOf(blocks: Block[], title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: title, Author: 'Groundwork' } });
    const chunks: Buffer[] = [];
    doc.on('data', (d: Buffer) => chunks.push(d));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    for (const b of blocks) {
      if (b.t === 'table') { const head = b.columns ?? []; for (const r of [head, ...(b.rows ?? [])]) doc.font(r === head ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).text(r.join('   |   '), { paragraphGap: 3 }); doc.moveDown(0.4); }
      else if (b.t === 'small') doc.font('Helvetica').fontSize(8.5).fillColor('#5B6472').text(b.text, { paragraphGap: 6 }).fillColor('black');
      else if (b.t === 'h1') doc.font('Helvetica-Bold').fontSize(20).text(b.text, { paragraphGap: 8 });
      else if (b.t === 'h2') doc.moveDown(0.6).font('Helvetica-Bold').fontSize(14).text(b.text, { paragraphGap: 4 });
      else if (b.t === 'h3') doc.moveDown(0.3).font('Helvetica-Bold').fontSize(12).text(b.text, { paragraphGap: 2 });
      else if (b.t === 'li') doc.font('Helvetica').fontSize(10.5).text(`• ${b.text}`, { indent: 0, paragraphGap: 4 });
      else doc.font('Helvetica').fontSize(10.5).text(b.text, { paragraphGap: 6 });
    }
    doc.end();
  });
}

/* ------------------------------------------------------------------ XLSX */

const REGISTER_HEAD = ['Item', 'Workstream or institution', 'Owner', 'Action needed', 'Status', 'Priority', 'Due', 'Due date worked out from words', 'Dependency or blocker', 'Decision needed from you', 'Source', 'Last verified', 'Next follow-up', 'Carry into next year', 'Resolution', 'What was said about it'];

export function registerXlsx(c: YearEndContent, v: TheVersion): Buffer {
  const sourcesOf = (refs: string[]) => (refs.length ? refs.map((r) => c.evidence.find((e) => e.ref === r)).filter(Boolean).map((e) => theSourceName(e!)).join('; ') || 'unverified' : 'unverified');
  const rows = c.register.map((r) => [
    r.item, r.workstream ?? 'not stated', r.owner === 'you' ? c.principalFirstName : r.owner, r.actionNeeded, STATUS_PLAIN[r.status] ?? r.status, r.priority, r.dueOn ? dayWords(r.dueOn) : 'no date given', r.dueInferred ? 'yes' : 'no',
    r.dependency ?? 'none stated', r.decision ?? 'none', sourcesOf(r.refs), dayWords(r.lastVerifiedAt), r.nextFollowUp, r.carryForward ? 'yes' : 'not decided', r.resolution ?? 'not resolved', r.note ?? '',
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([REGISTER_HEAD, ...rows]);
  sheet['!cols'] = REGISTER_HEAD.map((h, i) => ({ wch: [40, 24, 18, 40, 22, 12, 18, 14, 28, 36, 48, 16, 28, 12, 36, 40][i] ?? h.length + 4 }));
  const KIND: Record<string, string> = { document: 'Document or note', report: 'Report' };
  const evidence = XLSX.utils.aoa_to_sheet([['Source', 'Date', 'Kind', 'File name', 'What it says'], ...c.evidence.map((e) => [theSourceName(e), dayWords(e.at), e.kind === 'principal' ? `${c.principalFirstName}'s own words` : KIND[e.kind] ?? 'Check-in or agreement', e.fileName ?? '', clip(plain(e.said), 600)])]);
  evidence['!cols'] = [{ wch: 60 }, { wch: 16 }, { wch: 22 }, { wch: 30 }, { wch: 90 }];
  const about = XLSX.utils.aoa_to_sheet([
    [`${c.year} outstanding matters and ${c.year + 1} carry-forward register`],
    [`Prepared for ${c.principalName}`],
    [`Version ${v.version}, ${theStatus(v)}, built on ${dayWords(c.builtAt)}`],
    ['Every row names the record it is taken from, or says unverified. An owner nobody confirmed is shown as unconfirmed. A due date worked out from words is marked.'],
  ]);
  about['!cols'] = [{ wch: 120 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, about, 'About this file');
  XLSX.utils.book_append_sheet(book, sheet, 'Register');
  XLSX.utils.book_append_sheet(book, evidence, 'Evidence index');
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/* ------------------------------------------------------------------ PPTX */

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const textBox = (id: number, name: string, x: number, y: number, w: number, h: number, paras: { text: string; size: number; bold?: boolean }[]) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paras.map((p) => `<a:p><a:r><a:rPr lang="en-GB" sz="${p.size * 100}"${p.bold ? ' b="1"' : ''}/><a:t>${esc(p.text)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp>`;

export interface ASlide { title: string; lines: string[] }

/** What the slide says of one line: its first sentence, kept short, with where it comes from in a few words. */
const slideLine = (c: YearEndContent, cl: Claim): string => {
  const e = cl.refs.map((r) => c.evidence.find((x) => x.ref === r)).find(Boolean);
  const from = cl.status === 'recollection' || !e ? 'unverified' : `${e.label}, ${dayWords(e.at)}`;
  return `${clip(firstSentence(cl.text), 150)} (${from})`;
};

/**
 * THE LEADERSHIP PRESENTATION, SIZED TO THE MATERIAL (Dangote stress test, D8: seven slides for a whole year, "What was achieved" led by routine tasks, and five small
 * payments as "What needs a decision"). It follows the brief's executive briefing: the year in one slide, the outcomes, the year quarter by quarter, the payments, what
 * is only said or disputed, what the record does not cover, what is open and carried into the next year, and what needs a decision. A part with more than a slide
 * holds goes on over more slides, up to a few, so a full year reads in about 15 to 20 slides and a small record in a few. Only proven outcomes are on "What was
 * achieved"; nothing unproven and no routine task is. Each slide carries at most five lines, and the full lists stay in the report and the register.
 */
const MOST_SLIDES = 20;
const LINES_ON_A_SLIDE = 5;
export function slidesOf(c: YearEndContent, v: TheVersion): ASlide[] {
  const shortened = c.shortened.includes('all');
  const countIn = (id: string) => claimsIn(c, id).length;
  const open = c.register.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');
  const carried = open.filter((r) => r.carryForward);
  const noOwner = open.filter((r) => r.owner === 'unconfirmed').length;
  const more = (shown: number, total: number) => (total > shown ? [`${total - shown} more ${total - shown === 1 ? 'is' : 'are'} in the report.`] : []);
  /** A part over as many slides as it needs, up to `most`, five lines each, and how many more are in the report. */
  const over = (title: string, lines: string[], most: number): ASlide[] => {
    const pages = Math.max(1, Math.min(shortened ? 1 : most, Math.ceil(lines.length / LINES_ON_A_SLIDE)));
    const out: ASlide[] = [];
    for (let i = 0; i < pages; i += 1) out.push({ title: i === 0 ? title : `${title}, continued`, lines: lines.slice(i * LINES_ON_A_SLIDE, (i + 1) * LINES_ON_A_SLIDE) });
    const shown = pages * LINES_ON_A_SLIDE;
    if (lines.length > shown) out[out.length - 1].lines.push(...more(shown, lines.length));
    return out;
  };
  const head: ASlide[] = [
    { title: `${c.year} year-end review`, lines: [`Prepared for ${c.principalName}`, `Version ${v.version}, ${theStatus(v)}, built on ${dayWords(c.builtAt)}`] },
    { title: 'The year in one slide', lines: theYearOnASlide(c) },
  ];
  const body: ASlide[] = [];
  const { outcomes } = theAchievedLines(c);
  body.push(...(outcomes.length ? over('What was achieved, with evidence', outcomes.map((cl) => slideLine(c, cl)), 3) : [{ title: 'What was achieved, with evidence', lines: [EMPTY_SECTION('achieved')] }]));
  /* The year, by quarter: each month in one line, its first sentences, from what its notes and messages say. */
  const noted = c.sections.filter((x) => x.id.startsWith('month:')).flatMap((x) => x.claims.filter((cl) => cl.status === 'noted').map((cl) => ({ key: x.id.slice(6), month: MONTHS[Number(x.id.slice(-2)) - 1], cl })));
  if (noted.length) {
    /* The checked narrative's sentences for a month when it has them, else the note's own (D8: the last line used to win, and the last was the raw note). */
    const forMonth = (key: string) => { const all = noted.filter((x) => x.key === key); const told = all.filter((x) => x.cl.id.startsWith('nn:')); return (told.length ? told.slice(0, 2) : all.slice(0, 1)).map((x) => x.cl.text).join(' '); };
    const byMonth = [...new Map(noted.map(({ key, month }) => [key, { month, text: forMonth(key) }])).entries()].sort(([a], [b]) => a.localeCompare(b));
    const lineOf = ({ month, text }: { month: string; text: string }) => `${month}: ${clip(text.replace(/^The (?:note|email) for \w+ says: /, '').replace(/ This is what the (?:note|email) says.*$/, ''), 190)}`;
    if (byMonth.length <= LINES_ON_A_SLIDE || shortened) body.push({ title: 'What the monthly notes report, not yet proven', lines: [...byMonth.slice(0, LINES_ON_A_SLIDE).map(([, m]) => lineOf(m)), ...more(Math.min(LINES_ON_A_SLIDE, byMonth.length), byMonth.length)] });
    else for (let q = 0; q < 4; q += 1) {
      const these = byMonth.filter(([k]) => Math.floor((Number(k.slice(5)) - 1) / 3) === q);
      if (these.length) body.push({ title: `What the notes report for ${['January to March', 'April to June', 'July to September', 'October to December'][q]}, not yet proven`, lines: these.map(([, m]) => lineOf(m)) });
    }
  }
  /* A month she asked to be added is in the presentation too, whatever the record holds for it. */
  for (const m of c.sections.filter((x) => x.id.startsWith('month:') && x.claims.some((cl) => cl.status !== 'noted' && !cl.id.startsWith('msg:')))) {
    body.push({ title: `${m.title}, added at ${c.principalFirstName}'s request`, lines: m.claims.filter((cl) => !cl.id.startsWith('msg:')).slice(0, 5).map((cl) => (cl.status === 'noted' ? slideLine(c, cl) : oneLine(`${firstSentence(cl.text)}${cl.status === 'recollection' ? ' (unverified)' : ''}`))) });
  }
  const payments = open.filter((r) => r.workstream === 'Payments');
  if (payments.length) body.push(...over('Payments', payments.map((r) => clip(firstSentence(r.item), 190)), 1));
  const unverified = claimsIn(c, 'unverified');
  const disputed = unverified.filter((cl) => isDisputed(c, cl));
  const said = unverified.filter((cl) => !isDisputed(c, cl));
  if (said.length) body.push(...over('Said to be done, but not yet shown', said.map((cl) => slideLine(c, cl)), 2));
  if (disputed.length) body.push(...over('Disputed, and not counted', disputed.map((cl) => slideLine(c, cl)), 1));
  const gaps = claimsIn(c, 'gaps');
  if (gaps.length && !shortened) body.push(...over('What the record does not cover', gaps.map((cl) => clip(firstSentence(cl.text), 190)), 1));
  const stillOpen = claimsIn(c, 'open').map((cl) => slideLine(c, cl));
  const openLead = open.length === 0 ? 'Nothing is open on the record.' : `${carried.length ? `${carried.length} of the ${open.length} open ${open.length === 1 ? 'matter is' : 'matters are'} marked to carry into ${c.year + 1}.` : `None of the ${open.length} open ${open.length === 1 ? 'matter is' : 'matters are'} marked yet to carry into ${c.year + 1}.`} ${noOwner ? `${noOwner} ${noOwner === 1 ? 'has' : 'have'} no confirmed owner.` : 'Each has an owner.'}`;
  const openSlides = over(`What is open and carried into ${c.year + 1}`, [openLead, ...stillOpen], 2);
  /* The decision itself is the line: the matter and the question she must answer, not the matter's first sentence alone (Batch E, N7). */
  const decisions = claimsIn(c, 'decision').map((cl) => slideLine(c, cl).replace(clip(firstSentence(cl.text), 150), clip(cl.text, 220)));
  /* Only what the record says waits on her decision (Dangote rerun, N7: the slide filled itself with "is X the same thing as Y?" questions for Maryam). */
  const decide: ASlide = { title: 'What needs a decision', lines: decisions.length ? [...decisions.slice(0, LINES_ON_A_SLIDE), ...more(Math.min(LINES_ON_A_SLIDE, decisions.length), countIn('decision'))] : [`Nothing is waiting for a decision from ${c.principalFirstName}.`] };
  /* The head, then the body as far as it fits, and always what is open and what needs a decision last. */
  const room = MOST_SLIDES - head.length - openSlides.length - 1;
  return [...head, ...body.slice(0, Math.max(0, room)), ...openSlides, decide];
}

export async function presentationPptx(c: YearEndContent, v: TheVersion): Promise<Buffer> {
  const slides = slidesOf(c, v);
  const zip = new JSZip();
  const n = slides.length;
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);
  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="${REL}/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 2}" Type="${REL}/theme" Target="theme/theme1.xml"/></Relationships>`);
  zip.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`);
  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${REL}/theme" Target="../theme/theme1.xml"/></Relationships>`);
  zip.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS} type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>`);
  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
  const fill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  zip.file('ppt/theme/theme1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Groundwork"><a:themeElements><a:clrScheme name="Groundwork"><a:dk1><a:srgbClr val="1F1A14"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="4E4236"/></a:dk2><a:lt2><a:srgbClr val="F5EFE4"/></a:lt2><a:accent1><a:srgbClr val="2F6B4F"/></a:accent1><a:accent2><a:srgbClr val="B5651D"/></a:accent2><a:accent3><a:srgbClr val="4E4236"/></a:accent3><a:accent4><a:srgbClr val="7A6A58"/></a:accent4><a:accent5><a:srgbClr val="2B5C8A"/></a:accent5><a:accent6><a:srgbClr val="8A2B2B"/></a:accent6><a:hlink><a:srgbClr val="2B5C8A"/></a:hlink><a:folHlink><a:srgbClr val="7A6A58"/></a:folHlink></a:clrScheme><a:fontScheme name="Groundwork"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Groundwork"><a:fillStyleLst>${fill}${fill}${fill}</a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="28575"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${fill}${fill}${fill}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
  slides.forEach((s, i) => {
    zip.file(`ppt/slides/slide${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${textBox(2, 'Title', 609600, 365760, 10972800, 1000000, [{ text: s.title, size: 32, bold: true }])}${textBox(3, 'Body', 609600, 1500000, 10972800, 4800000, s.lines.map((l) => ({ text: l, size: i === 0 ? 20 : 18 })))}</p:spTree></p:cSld></p:sld>`);
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`);
  });
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/* ------------------------------------------------------------------ the set */

export type AFileKind = 'report_docx' | 'report_pdf' | 'presentation' | 'register_xlsx' | 'register_docx' | 'register_pdf' | 'evidence_index';

/** What the files are called: the year, what it is, the version, and whether it is a draft. Nothing in a name is from a person's words. */
export function fileNameFor(kind: AFileKind, c: YearEndContent, v: TheVersion): string {
  const stage = v.status === 'final' || v.status === 'approved' ? 'final' : 'draft';
  const base = `${c.year}-${{ report_docx: 'year-end-report', report_pdf: 'year-end-report', presentation: 'leadership-presentation', register_xlsx: 'outstanding-register', register_docx: 'outstanding-summary', register_pdf: 'outstanding-summary', evidence_index: 'evidence-index' }[kind]}-v${v.version}-${stage}`;
  return `${base}.${{ report_docx: 'docx', report_pdf: 'pdf', presentation: 'pptx', register_xlsx: 'xlsx', register_docx: 'docx', register_pdf: 'pdf', evidence_index: 'docx' }[kind]}`;
}

export async function oneFile(kind: AFileKind, c: YearEndContent, v: TheVersion): Promise<AnAttachment> {
  const filename = fileNameFor(kind, c, v);
  const title = filename.replace(/\.\w+$/, '');
  switch (kind) {
    case 'report_docx': return { filename, contentType: DOCX_TYPE, content: await docxOf(reportBlocks(c, v), title) };
    case 'report_pdf': return { filename, contentType: PDF_TYPE, content: await pdfOf(reportBlocks(c, v), title) };
    case 'presentation': return { filename, contentType: PPTX_TYPE, content: await presentationPptx(c, v) };
    case 'register_xlsx': return { filename, contentType: XLSX_TYPE, content: registerXlsx(c, v) };
    case 'register_docx': return { filename, contentType: DOCX_TYPE, content: await docxOf(registerBlocks(c, v), title) };
    case 'register_pdf': return { filename, contentType: PDF_TYPE, content: await pdfOf(registerBlocks(c, v), title) };
    case 'evidence_index': return { filename, contentType: DOCX_TYPE, content: await docxOf(indexBlocks(c, v), title) };
  }
}

/** Both drafts, as the draft-ready mail carries them: the report and the presentation, the register and its summary, and the evidence index. */
export const THE_DRAFT_SET: AFileKind[] = ['report_docx', 'report_pdf', 'presentation', 'register_xlsx', 'register_pdf', 'evidence_index'];
export const THE_FINAL_SET: AFileKind[] = ['report_docx', 'report_pdf', 'presentation', 'register_xlsx', 'register_docx', 'register_pdf', 'evidence_index'];

export const theFiles = (kinds: AFileKind[], c: YearEndContent, v: TheVersion): Promise<AnAttachment[]> => Promise.all(kinds.map((k) => oneFile(k, c, v)));
