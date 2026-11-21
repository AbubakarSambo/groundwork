import { aYearEndWorld } from './a-world-for-the-year-end';
import { loadTheRecord } from './the-year-end-versions';
import { buildTheContent, everyLineHasASourceOrIsUnverified, type YearEndContent } from './the-year-end-content';
import { oneFile, theFiles, THE_FINAL_SET, slidesOf, reportBlocks } from './the-year-end-files';
import { ATTACHMENT_LIMITS } from '../email/attachments';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, writeFileSync } from 'fs';

const JSZip = require('jszip') as typeof import('jszip');
const mammoth = require('mammoth') as { extractRawText: (a: { buffer: Buffer }) => Promise<{ value: string }> };
const XLSX = require('xlsx') as typeof import('xlsx');
const { DOMParser } = require('@xmldom/xmldom') as { DOMParser: new (o?: any) => { parseFromString: (s: string, t: string) => any } };

const NOW = new Date('2026-11-10T09:00:00Z');

async function theContent(extra: (w: ReturnType<typeof aYearEndWorld>) => void = () => undefined): Promise<YearEndContent> {
  const w = aYearEndWorld(NOW);
  extra(w);
  return buildTheContent(await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW }), []);
}
const V = { version: 2, status: 'revised' };
/* pdf-parse loads its reader with a dynamic import that jest's VM refuses, so a plain node reads the file, which is also how the product reads one. */
const pdfText = async (b: Buffer): Promise<string> => {
  const file = join(tmpdir(), `year-end-${process.pid}-${Math.random().toString(36).slice(2)}.pdf`);
  writeFileSync(file, b);
  try {
    return execFileSync(process.execPath, ['-e', `const {PDFParse}=require(${JSON.stringify(require.resolve('pdf-parse'))});(async()=>{const p=new PDFParse({data:require('fs').readFileSync(process.argv[1])});const r=await p.getText();process.stdout.write(r.text);await p.destroy();})()`, file], { encoding: 'utf8' });
  } finally { unlinkSync(file); }
};
const pptxText = async (b: Buffer) => {
  const zip = await JSZip.loadAsync(b);
  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, c) => Number(a.match(/\d+/)![0]) - Number(c.match(/\d+/)![0]));
  return Promise.all(names.map(async (n) => [...(await zip.file(n)!.async('string')).matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(' ')));
};

describe('the files are valid, and open with the readers the product already has', () => {
  it('the report opens as a Word file, and says what is proven, what is only said, and what is open', async () => {
    const c = await theContent();
    const docx = await oneFile('report_docx', c, V);
    const text = (await mammoth.extractRawText({ buffer: docx.content })).value;
    expect(text).toContain('2026 year-end report');
    expect(text).toContain('Prepared for Fatima Bello. This is version 2, a revised draft');
    expect(text).toContain('This is a draft. It is not final until Fatima approves it.');
    expect(text).toContain('What was achieved, with proof');
    expect(text).toContain('Send the ministry the revised brief. Amina Yusuf had it, and it was settled on the record on');
    expect(text).toContain('Ibrahim Sule said it was done, and nothing on the record shows it yet, so it is not counted as achieved. It is part of National Assembly reporting.');
    expect(text).toContain('Nobody has confirmed who owns it');
    expect(text).toContain('Nothing in the record covers January, February, March, April, May, June, July, August and September 2026. That does not mean nothing happened. Nobody has been asked for it yet. It is unverified, because no record backs it yet.');
  });

  it('the report PDF carries the same words', async () => {
    const c = await theContent();
    const pdf = await oneFile('report_pdf', c, V);
    expect(pdf.content.subarray(0, 5).toString()).toBe('%PDF-');
    const text = await pdfText(pdf.content);
    expect(text).toContain('2026 year-end report');
    expect(text.replace(/\s+/g, ' ')).toContain('so it is not counted as achieved');
  });

  it('the presentation is a real deck: every part is well-formed XML and the slides read in order', async () => {
    const c = await theContent();
    const deck = await oneFile('presentation', c, V);
    const zip = await JSZip.loadAsync(deck.content);
    for (const name of Object.keys(zip.files).filter((n) => /\.(xml|rels)$/.test(n))) {
      const errors: string[] = [];
      new DOMParser({ onError: (_l: string, m: string) => errors.push(m) } as any).parseFromString(await zip.file(name)!.async('string'), 'text/xml');
      expect({ name, errors }).toEqual({ name, errors: [] });
    }
    const slides = await pptxText(deck.content);
    expect(slides[0]).toBe('2026 year-end review Prepared for Fatima Bello Version 2, a revised draft, built on 10 November 2026');
    /* A short leadership narrative: a few slides, not the record read out. */
    expect(slides.length).toBeLessThanOrEqual(8);
    expect(slides[1]).toContain('The year in one slide');
    expect(slides[1]).toContain("Fatima's record for 2026 has 1 matter settled with proof");
    expect(slides.join(' ')).toContain('Send the ministry the revised brief.');
    expect(slides.join(' ')).not.toMatch(/\b[CDOTQRF]-[0-9a-z]{6,8}\b/);
    expect(slides.slice(-2)[0]).toContain('What is open and carried into 2027');
    expect(slides.slice(-1)[0]).toContain('What needs a decision');
  });

  it('the register opens as a spreadsheet with every column, every row sourced or unverified, and the evidence index beside it', async () => {
    const c = await theContent();
    const xlsx = await oneFile('register_xlsx', c, V);
    const book = XLSX.read(xlsx.content, { type: 'buffer' });
    expect(book.SheetNames).toEqual(['About this file', 'Register', 'Evidence index']);
    const rows: any[][] = XLSX.utils.sheet_to_json(book.Sheets['Register'], { header: 1 });
    expect(rows[0]).toEqual(expect.arrayContaining(['Item', 'Owner', 'Action needed', 'Status', 'Due', 'Source', 'Last verified', 'Next follow-up', 'Carry into next year', 'Resolution']));
    const sourceCol = rows[0].indexOf('Source');
    const ownerCol = rows[0].indexOf('Owner');
    expect(rows.length - 1).toBe(c.register.length);
    /* A source is named as a person would name it, with its day. No code, no file name. */
    for (const r of rows.slice(1)) { expect(String(r[sourceCol])).toMatch(/ on \d{1,2} [A-Z][a-z]+ 2026|^unverified$/); expect(String(r[sourceCol])).not.toMatch(/\b[CDOTQRF]-[0-9a-z]{6,8}\b|\.(txt|docx|xlsx|pdf)/); }
    expect(rows.slice(1).some((r) => r[ownerCol] === 'unconfirmed')).toBe(true);
    const evidence: any[][] = XLSX.utils.sheet_to_json(book.Sheets['Evidence index'], { header: 1 });
    expect(evidence[0]).toEqual(['Source', 'Date', 'Kind', 'File name', 'What it says']);
    expect(evidence.length - 1).toBe(c.evidence.length);
  });

  it('the short readable register is a Word file and a PDF in plain sentences, with a date marked when it was worked out', async () => {
    const c = await theContent();
    const docx = (await mammoth.extractRawText({ buffer: (await oneFile('register_docx', c, V)).content })).value;
    expect(docx).toContain('2026 outstanding matters and 2027 carry-forward register');
    expect(docx).toContain('Circulate the committee minutes. Ibrahim Sule has it. It is due 13 November 2026 (a day worked out from the words, not given).');
    expect(docx).toContain('Chase the audit letter. Nobody has confirmed who owns it. No date was given.');
    expect((await pdfText((await oneFile('register_pdf', c, V)).content)).replace(/\s+/g, ' ')).toContain('2027 carry-forward register');
  });

  it('the evidence index lists each reference once, with where it came from', async () => {
    const c = await theContent();
    const text = (await mammoth.extractRawText({ buffer: (await oneFile('evidence_index', c, V)).content })).value;
    expect(text).toContain('Each statement and its source');
    expect(text).toContain('A check-in on ');
    expect(text).not.toMatch(/\b[CDOTQRF]-[0-9a-z]{6,8}\b/);
    expect(new Set(c.evidence.map((e) => e.ref)).size).toBe(c.evidence.length);
  });

  it('the whole final set is within what a mail may carry, and every file has a name that says its version and stage', async () => {
    const c = await theContent();
    const files = await theFiles(THE_FINAL_SET, c, { version: 3, status: 'final' });
    expect(files.map((f) => f.filename)).toEqual([
      '2026-year-end-report-v3-final.docx', '2026-year-end-report-v3-final.pdf', '2026-leadership-presentation-v3-final.pptx', '2026-outstanding-register-v3-final.xlsx',
      '2026-outstanding-summary-v3-final.docx', '2026-outstanding-summary-v3-final.pdf', '2026-evidence-index-v3-final.docx',
    ]);
    expect(files.length).toBeLessThanOrEqual(ATTACHMENT_LIMITS.maxFiles);
    expect(files.reduce((n, f) => n + f.content.length, 0)).toBeLessThan(ATTACHMENT_LIMITS.maxBytesTotal);
  });
});

describe('every claim and every register row names its record, or says unverified', () => {
  it('holds for the whole synthetic year, and no achievement stands without proof', async () => {
    const c = await theContent();
    expect(everyLineHasASourceOrIsUnverified(c)).toEqual([]);
    const achieved = c.sections.find((s) => s.id === 'achieved')!.claims;
    expect(achieved.length).toBeGreaterThan(0);
    for (const a of achieved) expect(a.refs.length).toBeGreaterThan(0);
    /* the one the person only said was done is not under achieved */
    expect(achieved.map((a) => a.text).join(' ')).not.toContain('quarterly assembly summary');
    expect(c.sections.find((s) => s.id === 'unverified')!.claims.map((a) => a.text).join(' ')).toContain('quarterly assembly summary');
  });

  it('a line with no record is written as unverified, and the rule catches one that is not', async () => {
    const c = await theContent();
    c.sections[0].claims.push({ id: 'x', status: 'open', refs: [], text: 'Something was done.' });
    c.sections[0].claims.push({ id: 'y', status: 'achieved', refs: [], text: 'It was achieved.' });
    expect(everyLineHasASourceOrIsUnverified(c)).toEqual(['claim x', 'claim y', 'achievement without a source y']);
  });

  it('what is not known is not made up: an owner nobody confirmed stays "unconfirmed", and a priority nobody gave is "not stated"', async () => {
    const c = await theContent();
    const audit = c.register.find((r) => /audit letter/i.test(r.item))!;
    expect(audit.owner).toBe('unconfirmed');
    expect(audit.priority).toBe('not stated');
    expect(audit.resolution).toBeNull();
  });

  it('never carries what the principal may not hand on: another lead\'s confidential matter, or her own private to-do list', async () => {
    const c = await theContent();
    const everything = JSON.stringify(c) + (await Promise.all(['report_docx', 'register_docx', 'evidence_index'].map(async (k) => (await mammoth.extractRawText({ buffer: (await oneFile(k as any, c, V)).content })).value))).join(' ') + (await pptxText((await oneFile('presentation', c, V)).content)).join(' ');
    expect(everything).not.toContain('severance');
    expect(everything).not.toContain('retirement');
  });

  it('says in the report how the year stands, as sentences, and the presentation says the same', async () => {
    const c = await theContent();
    const text = reportBlocks(c, V).map((b) => b.text).join('\n');
    /* Round 6: the report opens with "What matters most", which says the same counts as sentences; the long count line stays on the slide and in the mail. */
    expect(text).toContain('What matters most');
    expect(text).toContain('1 matter is settled with proof. 1 matter was said to be done, with nothing yet to show it.');
    expect(slidesOf(c, V)[1].lines[0]).toBe("Fatima's record for 2026 has 1 matter settled with proof, 1 matter reported as done without anything to show it, and 3 matters still open or waiting for a decision.");
  });
});
