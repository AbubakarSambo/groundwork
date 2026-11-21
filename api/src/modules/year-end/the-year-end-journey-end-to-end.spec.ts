import { aYearEndWorld } from './a-world-for-the-year-end';
import { aReadingOfHerWords } from './a-reading-of-her-words-for-specs';
import { actOnTheJobs } from './the-year-end-owner';
import { advanceThePersistentJobs, ensureThePrincipalsJobs } from '../outstanding/the-persistent-jobs';
import { handleTheDraftWords } from './year-end.service';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, writeFileSync } from 'fs';

const JSZip = require('jszip') as typeof import('jszip');
const mammoth = require('mammoth') as { extractRawText: (a: { buffer: Buffer }) => Promise<{ value: string }> };
const XLSX = require('xlsx') as typeof import('xlsx');

/**
 * THE YEAR-END JOURNEY, END TO END (Fatima round 1, H3), through the real handlers and the real file writers, with the mail and WhatsApp ports the
 * local catcher stands for: forwarded monthly notes, the first night's draft, "Add March", "Shorten this", "This is ready", and the final set. Every file
 * that was mailed is opened again and its words printed (SHOW_THE_FILES=1), so what she would open can be read.
 */
const NOW = new Date('2026-11-12T10:00:00Z');
const NAMES = ['January', 'February', 'April', 'May', 'June', 'July', 'August', 'September', 'October'];
const pdfText = (b: Buffer): string => {
  const file = join(tmpdir(), `ye-${process.pid}-${Math.random().toString(36).slice(2)}.pdf`);
  writeFileSync(file, b);
  try { return execFileSync(process.execPath, ['-e', `const {PDFParse}=require(${JSON.stringify(require.resolve('pdf-parse'))});(async()=>{const p=new PDFParse({data:require('fs').readFileSync(process.argv[1])});const r=await p.getText();process.stdout.write(r.text);await p.destroy();})()`, file], { encoding: 'utf8' }); } finally { unlinkSync(file); }
};
const pptxText = async (b: Buffer) => { const zip = await JSZip.loadAsync(b); const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, c) => Number(a.match(/\d+/)![0]) - Number(c.match(/\d+/)![0])); return (await Promise.all(names.map(async (n) => [...(await zip.file(n)!.async('string')).matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(' ')))).map((t, i) => `Slide ${i + 1}: ${t}`).join('\n'); };
const xlsxText = (b: Buffer) => { const wb = XLSX.read(b, { type: 'buffer' }); return wb.SheetNames.map((n) => `Sheet ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n'); };
const open = async (f: { filename: string; content: Buffer }): Promise<string> => /\.docx$/.test(f.filename) ? (await mammoth.extractRawText({ buffer: f.content })).value : /\.pdf$/.test(f.filename) ? pdfText(f.content) : /\.pptx$/.test(f.filename) ? pptxText(f.content) : xlsxText(f.content);

it('forwarded notes, the first draft, add March, shorten, approve, and the final set, each file opened again', async () => {
  const w = aYearEndWorld(NOW);
  w.t.principalMaterial = w.aTable([], 'pm');
  NAMES.forEach((name, i) => { const mm = String(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October'].indexOf(name) + 1).padStart(2, '0'); w.t.principalMaterial.rows.push({ id: `pm-${i}`, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b1', fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName: `activity-2026-${mm}-${name}.txt`, mimeType: 'text/plain', text: `Abuja office activity note, ${name} 2026\n\nDate: 18-${mm}-2026\nSomething happened in ${name}.`, state: 'kept', receivedAt: new Date('2026-11-10T15:00:00Z') }); });
  await ensureThePrincipalsJobs(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
  await advanceThePersistentJobs(w.prisma, NOW);
  const night = await actOnTheJobs(w.prisma, w.ports, NOW);
  expect(night.map((d) => d.action)).toContain('draft_ready');
  expect(w.mails.filter((m) => m.kind === 'files')).toHaveLength(1);

  const say = (message: string) => handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message, channel: 'whatsapp', now: NOW, readTheRequest: aReadingOfHerWords({ 'This is ready': 'approve' }) });
  const added = await say('Add March: we held the budget workshop with the ministry on 12 March.');
  const shorter = await say('Shorten this');
  const approved = await say('This is ready');
  console.log(`FATIMA SAYS "Add March: ..."\nFATIMA READS ${added}\nFATIMA SAYS "Shorten this"\nFATIMA READS ${shorter}\nFATIMA SAYS "This is ready"\nFATIMA READS ${approved}`);
  expect(added).toMatch(/version 2/);
  expect(approved).toMatch(/approved/);

  const sets = w.mails.filter((m) => m.kind === 'files');
  const lines: string[] = [];
  for (const m of sets) {
    lines.push(`\n===== MAIL to ${m.to}, subject "${m.subject}", ${m.files.length} files`, m.text);
    for (const f of m.files) {
      const t = await open(f);
      expect(t.length).toBeGreaterThan(100);
      lines.push(`--- ${f.filename} (${f.content.length} bytes)`, t.split('\n').filter((l) => l.trim()).slice(0, 14).join('\n'));
    }
  }
  if (process.env.SHOW_THE_FILES) console.log(lines.join('\n'));
  expect(sets.map((m) => m.files.map((f) => f.filename).filter((n) => /report.*\.docx|presentation|register.*xlsx/.test(n)).length).every((n) => n >= 3)).toBe(true);
  const last = sets[sets.length - 1];
  expect(last.files.some((f) => /final/.test(f.filename))).toBe(true);
  const reportText = await open(last.files.find((f) => /report.*\.docx$/.test(f.filename))!);
  expect(reportText).toContain('March 2026');
  expect(reportText).toContain('we held the budget workshop with the ministry on 12 March');
});
