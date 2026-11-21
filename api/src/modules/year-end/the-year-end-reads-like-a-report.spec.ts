import { aYearEndWorld } from './a-world-for-the-year-end';
import { loadTheRecord } from './the-year-end-versions';
import { buildTheContent, plain, whatANoteSays } from './the-year-end-content';
import { oneFile, theFiles, THE_FINAL_SET, reportBlocks, slidesOf } from './the-year-end-files';
import { execFileSync } from 'child_process';
import { join } from 'path';

const JSZip = require('jszip') as typeof import('jszip');
const mammoth = require('mammoth') as { extractRawText: (a: { buffer: Buffer }) => Promise<{ value: string }> };
const XLSX = require('xlsx') as typeof import('xlsx');

/**
 * FATIMA ROUND 2, D1: THE YEAR-END REPORT WAS NOT READABLE. None of the ten monthly notes was content, nearly half the lines were file names, a line showed a code
 * ("C-9b3e98f8") and a literal "&quot;", and a gap was listed as several duplicate lines. Here the five files are rendered from a year like Rakiya's (two monthly notes
 * with real sentences, a note with no month, a claim that came in with an HTML entity, two lines that may be one matter) and read the way she reads them: the text
 * of each file, never the content object.
 */
const NOW = new Date('2026-11-12T10:00:00Z');
const V = { version: 1, status: 'draft' };
const CODE = /\b[CDOTQRFP]-[0-9a-zA-Z]{6,8}\b/;

const pdfText = (b: Buffer): string => {
  try { return execFileSync(process.execPath, ['-e', `const {PDFParse}=require(${JSON.stringify(require.resolve('pdf-parse'))});(async()=>{const p=new PDFParse({data:Buffer.from(process.argv[1],'base64')});const r=await p.getText();process.stdout.write(r.text);await p.destroy();})()`, b.toString('base64')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } finally { /* nothing is written to disk */ }
};
const pptxText = async (b: Buffer) => {
  const zip = await JSZip.loadAsync(b);
  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, c) => Number(a.match(/\d+/)![0]) - Number(c.match(/\d+/)![0]));
  return Promise.all(names.map(async (n) => [...(await zip.file(n)!.async('string')).matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')).join(' ')));
};

async function aYearLikeRakiyas() {
  const w = aYearEndWorld(NOW);
  w.t.principalMaterial = w.aTable([], 'pm');
  const note = (id: string, fileName: string, text: string) => w.t.principalMaterial.rows.push({ id, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b1', fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName, mimeType: 'text/plain', text, state: 'kept', receivedAt: new Date('2026-11-11T15:00:00Z') });
  note('pm-mar', 'activity-2026-03-March.txt', 'Abuja office activity note, March 2026\n\nDate: 14-03-2026\nKano state office visit by Musa Ibrahim on 17 March. Letter from the Abuja office delivered and signed for by the Kano liaison officer.');
  note('pm-may', 'activity-2026-05-May.txt', 'Abuja office activity note, May 2026\n\nDate: 18-05-2026\nNational Assembly monitoring started. First weekly report received on 8 May.');
  note('pm-memo', 'memo-office-01.txt', 'Office note 1. Visitors list for the week. Nothing here is final.');
  w.t.groundCommitment.rows.find((r: any) => r.id === 'c-done-said').text = 'I delivered the letter and the officer signed for it &quot;on the day&quot;';
  const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
  return { w, record, c: buildTheContent(record, []) };
}

describe('the notes are the report\'s content', () => {
  it('reads a note as sentences, without its heading or its Date line, and decodes entities at the source', () => {
    expect(whatANoteSays('Abuja office activity note, March 2026\n\nDate: 14-03-2026\nKano state office visit by Musa Ibrahim on 17 March. Letter from the Abuja office delivered and signed for.')).toEqual({
      title: 'Abuja office activity note, March 2026',
      sentences: ['Kano state office visit by Musa Ibrahim on 17 March.', 'Letter from the Abuja office delivered and signed for.'],
      kind: 'note',
    });
    /* A forwarded email: its headers and the forward line are not content, and its subject is its name. */
    expect(whatANoteSays('From: Grace Ogunleye\nTo: Hauwa\nSubject: Fwd: Northgate payment\n\n---------- Forwarded message ----------\nHauwa, I approve the vehicle payment. Please pay after the invoice is stamped.')).toEqual({ title: 'Northgate payment', sentences: ['Hauwa, I approve the vehicle payment.', 'Please pay after the invoice is stamped.'], kind: 'email' });
    expect(plain('He said &quot;go&quot; &amp; left, &amp;quot;twice&amp;quot;')).toBe('He said "go" & left, "twice"');
  });

  it('the report says what happened in March and May, under their months, from the notes, and says where each comes from as a person would', async () => {
    const { c } = await aYearLikeRakiyas();
    const text = (await mammoth.extractRawText({ buffer: (await oneFile('report_docx', c, V)).content })).value;
    expect(text).toContain('The year, month by month');
    expect(text).toContain('The note for March says: Kano state office visit by Musa Ibrahim on 17 March. Letter from the Abuja office delivered and signed for by the Kano liaison officer. This is what the note says, and no separate proof has been shown for it. The source is the note "Abuja office activity note, March 2026", forwarded on 11 November 2026.');
    expect(text).toContain('The note for May says: National Assembly monitoring started. First weekly report received on 8 May.');
    expect(text.indexOf('March 2026')).toBeLessThan(text.indexOf('May 2026'));
    expect(text).toContain('Monthly notes were forwarded for March and May');
  });

  it('a note with no month is kept and counted once, and its file name is not a line of the report', async () => {
    const { c } = await aYearLikeRakiyas();
    const text = (await mammoth.extractRawText({ buffer: (await oneFile('report_docx', c, V)).content })).value;
    expect(text).toContain('1 other document was kept that does not name one month');
    expect(text).not.toContain('memo-office-01.txt');
    expect(text).not.toContain('activity-2026-03-March.txt');
    expect(text).not.toContain('A document called');
  });
});

describe('no file shows a code, a file name outside the index, or an HTML entity', () => {
  it('in the report, its PDF, the presentation, the register, its summary and the index', async () => {
    const { c } = await aYearLikeRakiyas();
    const files = await theFiles(THE_FINAL_SET, c, { version: 3, status: 'final' });
    const seen: Record<string, string> = {};
    for (const f of files) {
      if (f.filename.endsWith('.docx')) seen[f.filename] = (await mammoth.extractRawText({ buffer: f.content })).value;
      else if (f.filename.endsWith('.pdf')) seen[f.filename] = pdfText(f.content);
      else if (f.filename.endsWith('.pptx')) seen[f.filename] = (await pptxText(f.content)).join('\n');
      else seen[f.filename] = JSON.stringify(XLSX.utils.sheet_to_json(XLSX.read(f.content, { type: 'buffer' }).Sheets['Register'], { header: 1 }));
    }
    for (const [name, text] of Object.entries(seen)) {
      expect({ name, code: CODE.exec(text)?.[0] ?? null }).toEqual({ name, code: null });
      expect({ name, entity: /&(?:quot|amp|lt|gt|#\d+);/.exec(text.replace(/&amp;/g, '&'))?.[0] ?? null }).toEqual({ name, entity: null });
      if (!name.includes('evidence-index')) expect({ name, file: /\b[\w-]+\.(?:txt|docx|xlsx|pdf)\b/.exec(text.replace(/\d{4}-[a-z-]+-v\d+-\w+\.\w+/g, ''))?.[0] ?? null }).toEqual({ name, file: null });
    }
    expect(seen['2026-year-end-report-v3-final.docx']).toContain('I delivered the letter and the officer signed for it "on the day". Ibrahim Sule said it was done, and nothing on the record shows it yet, so it is not counted as achieved. It is part of National Assembly reporting.');
  });

  it('the evidence index maps each statement to its source and the day it arrived, and names a file only as the file it is', async () => {
    const { c } = await aYearLikeRakiyas();
    const text = (await mammoth.extractRawText({ buffer: (await oneFile('evidence_index', c, V)).content })).value;
    expect(text).toContain('Each statement and its source');
    expect(text).toContain('The note for March says:');
    expect(text).toContain('The source is the note "Abuja office activity note, March 2026", forwarded on 11 November 2026.');
    expect(text).toContain('The file is called activity-2026-03-March.txt.');
  });
});

describe('a gap is said once, with who is being asked', () => {
  it('one line for the months with nothing, one for lines that may be one matter, none repeated', async () => {
    const { record, c } = await aYearLikeRakiyas();
    const gaps = c.sections.find((s) => s.id === 'gaps')!.claims;
    expect(gaps.filter((g) => g.id === 'g:months')).toHaveLength(1);
    expect(gaps.find((g) => g.id === 'g:months')!.text).toContain('Nobody has been asked for it yet.');
    const asked = buildTheContent({ ...record, askedOf: { months: 'Zainab Musa', matches: {} } }, []);
    expect(asked.sections.find((s) => s.id === 'gaps')!.claims.find((g) => g.id === 'g:months')!.text).toContain('Zainab Musa is being asked for it.');
    const pairs = [{ a: { key: 'x', item: 'the Kano visit was in October' }, b: { key: 'y', item: 'add the Kano visit' }, question: 'q1' }, { a: { key: 'y', item: 'add the Kano visit' }, b: { key: 'z', item: 'Kano visit: planned for October' }, question: 'q2' }];
    const chained = buildTheContent({ ...record, register: { ...record.register, toAsk: pairs as any } }, []);
    const matches = chained.sections.find((s) => s.id === 'gaps')!.claims.filter((g) => g.id.startsWith('m:'));
    expect(matches).toHaveLength(1);
    /* Nobody was asked (no message went), so nobody is said to be asked (Dangote stress test, D4). */
    expect(matches[0].text).toBe('The record may hold one matter in different words: "the Kano visit was in October", "add the Kano visit" and "Kano visit: planned for October". Nobody has been asked yet which is right, and the lines are kept apart until then.');
    /* Once the question about one of its pairs went to somebody, that person is named for the whole group. */
    const once = buildTheContent({ ...record, register: { ...record.register, toAsk: pairs as any }, askedOf: { months: null, matches: { 'y|z': 'Zainab Musa' } } }, []);
    expect(once.sections.find((s) => s.id === 'gaps')!.claims.find((g) => g.id.startsWith('m:'))!.text).toContain('Zainab Musa is being asked which is right');
  });
});

describe('the presentation is a short leadership narrative', () => {
  it('a few slides: the year in one slide, achievements with evidence, what the notes report, what is open, and what needs a decision', async () => {
    const { c } = await aYearLikeRakiyas();
    const slides = slidesOf(c, V);
    expect(slides.map((s) => s.title)).toEqual(expect.arrayContaining(['The year in one slide', 'What was achieved, with evidence', 'What the monthly notes report, not yet proven', 'What needs a decision']));
    expect(slides.length).toBeLessThanOrEqual(8);
    for (const s of slides) expect(s.lines.length).toBeLessThanOrEqual(6);
    const notes = slides.find((s) => s.title === 'What the monthly notes report, not yet proven')!;
    expect(notes.lines[0]).toBe('March: Kano state office visit by Musa Ibrahim on 17 March. Letter from the Abuja office delivered and signed for by the Kano liaison officer.');
  });

  it('the register has plain columns and says who has each matter and where it comes from', async () => {
    const { c } = await aYearLikeRakiyas();
    const book = XLSX.read((await oneFile('register_xlsx', c, V)).content, { type: 'buffer' });
    const rows: any[][] = XLSX.utils.sheet_to_json(book.Sheets['Register'], { header: 1 });
    expect(rows[0]).toEqual(['Item', 'Workstream or institution', 'Owner', 'Action needed', 'Status', 'Priority', 'Due', 'Due date worked out from words', 'Dependency or blocker', 'Decision needed from you', 'Source', 'Last verified', 'Next follow-up', 'Carry into next year', 'Resolution', 'What was said about it']);
    const statusCol = rows[0].indexOf('Status');
    for (const r of rows.slice(1)) expect(['Open', 'In progress', 'Blocked', 'Waiting for a decision', 'Waiting on somebody outside', 'Done, with proof', 'Cancelled', 'Said to be done, not shown']).toContain(r[statusCol]);
  });
});

describe('the words never say he or she', () => {
  it('in the report, the presentation or the mail that carries them', async () => {
    const { c } = await aYearLikeRakiyas();
    const text = reportBlocks(c, V).map((b) => b.text).join('\n') + slidesOf(c, V).map((s) => s.lines.join(' ')).join('\n');
    expect(text).not.toMatch(/\b(she|he|her|hers|him|his)\b/i);
  });
});

describe('what matters most, at the top (Fatima round 6)', () => {
  it('is a short paragraph from the content, with her name and only what the content holds', () => {
    const { whatMattersMost } = require('./the-year-end-files');
    const mk = (id: string, status: string) => ({ id, status, refs: [], text: 'x' });
    const c: any = { year: 2026, principalFirstName: 'Ifeoma', gaps: [], noteGaps: ['2026-03'], sections: [
      { id: 'month:2026-01', title: 'January', claims: [mk('n:1', 'noted')] }, { id: 'month:2026-02', title: 'February', claims: [mk('n:2', 'noted')] },
      { id: 'decision', title: 'd', claims: [mk('d:1', 'decision'), mk('d:2', 'decision')] }, { id: 'unverified', title: 'u', claims: [mk('u:1', 'unverified')] }, { id: 'open', title: 'o', claims: [] }, { id: 'achieved', title: 'a', claims: [] },
    ] };
    /* Changed 16 November (Fatima round 4): a month with a payment but no note is not a month with "nothing" on the record, so the words say "no note". */
    const text = whatMattersMost(c);
    expect(text).toBe("The monthly notes cover 2 months of 2026, and no note covers March. Nothing is settled with proof yet, so nothing is claimed as achieved. 1 matter was said to be done, with nothing yet to show it. 2 matters wait for Ifeoma's decision.");
  });
});
