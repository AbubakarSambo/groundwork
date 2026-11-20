import { aYearEndWorld } from './a-year-end-world-for-specs';
import { actOnTheJobs } from './the-year-end-owner';
import { advanceThePersistentJobs, ensureThePrincipalsJobs } from '../outstanding/the-persistent-jobs';
import { theMonthsADocumentCovers } from '../executive-onboarding/the-months-a-document-covers';
import { loadTheRecord } from './the-year-end-versions';

const mammoth = require('mammoth') as { extractRawText: (a: { buffer: Buffer }) => Promise<{ value: string }> };

/**
 * Fatima round 1, I-09 and H3: ten dated monthly notes, forwarded in one afternoon in November, covered no month, and the year-end draft never came.
 * A note covers the month it says it is about, and the draft follows the plan: gaps listed, unproven claims marked unverified, nothing blocks it.
 */
const NOW = new Date('2026-11-12T10:00:00Z');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October'];

describe('which month a forwarded note is about', () => {
  it('reads its own date, a month written out, or the name it was sent under', () => {
    expect(theMonthsADocumentCovers({ fileName: 'activity-2026-05-May.txt', text: 'Abuja office activity note, May 2026\n\nDate: 18-05-2026\nNational Assembly monitoring started.' }, 2026)).toEqual(['2026-05']);
    expect(theMonthsADocumentCovers({ fileName: 'x.txt', text: 'Notes from the visit on 3 March 2026.' }, 2026)).toEqual(['2026-03']);
    expect(theMonthsADocumentCovers({ fileName: 'activity-2026-07-July.txt', text: 'No date in here.' }, 2026)).toEqual(['2026-07']);
    expect(theMonthsADocumentCovers({ fileName: 'memo-office-03.txt', text: 'Memo about the office.' }, 2026)).toEqual([]);
    expect(theMonthsADocumentCovers({ fileName: 'old.txt', text: 'Date: 18-05-2025' }, 2026)).toEqual([]);
  });
});

describe('ten monthly notes forwarded in one afternoon', () => {
  it('cover January to October, the draft is made on the first night, it lists November as the only gap, and its report says so', async () => {
    const w = aYearEndWorld(NOW);
    w.t.principalMaterial = w.aTable([], 'pm');
    MONTHS.forEach((name, i) => w.t.principalMaterial.rows.push({ id: `pm-${i}`, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b1', fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName: `activity-2026-${String(i + 1).padStart(2, '0')}-${name}.txt`, mimeType: 'text/plain', text: `Abuja office activity note, ${name} 2026\n\nDate: 18-${String(i + 1).padStart(2, '0')}-2026\nSomething happened.`, state: 'kept', receivedAt: new Date('2026-11-10T15:00:00Z') }));
    /* the files were forwarded in November, so by when they arrived they cover only November */
    await ensureThePrincipalsJobs(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    await advanceThePersistentJobs(w.prisma, NOW);
    const [report] = w.t.persistentJob.rows;
    expect(Object.keys(report.coverage.months)).toEqual(expect.arrayContaining(MONTHS.map((_, i) => `2026-${String(i + 1).padStart(2, '0')}`)));
    expect(report.coverage.gaps).toEqual([]);
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    expect(record.gaps).toEqual([]);
    const done = await actOnTheJobs(w.prisma, w.ports, NOW);
    expect(done.map((d) => d.action)).toContain('draft_ready');
    const mail = w.mails.find((m) => m.kind === 'files')!;
    expect(mail.files.map((f) => f.filename)).toHaveLength(6);
    const text = (await mammoth.extractRawText({ buffer: mail.files[0].content })).value;
    console.log(`WHAT THE REPORT SAYS ABOUT THE NOTES\n${text.split('\n').filter((l) => /activity-2026-0[35]|Nothing in the record covers|unverified|said it was done/.test(l)).join('\n')}`);
    /* The note is content now, under its month, and its file name is not what the report says. */
    expect(text).toContain('May 2026');
    expect(text).toContain('The note for May says: Something happened.');
    expect(text).toContain('The source is the note "Abuja office activity note, May 2026", forwarded on 10 November 2026.');
    expect(text).not.toContain('activity-2026-05-May.txt');
    expect(text).not.toContain('Nothing in the record covers May 2026');
  });
});

/** Fatima round 3: ten notes were forwarded with March missing, and the draft said nothing about March, because a payment dated in March made the record "cover" it. */
describe('a run of monthly notes with one month missing', () => {
  it('names the missing month in the report whatever else the record holds for it', async () => {
    const w = aYearEndWorld(NOW);
    w.t.principalMaterial = w.aTable([], 'pm');
    MONTHS.forEach((name, i) => { if (name === 'March') return; w.t.principalMaterial.rows.push({ id: `pm-${i}`, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b1', fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName: `activity-2026-${String(i + 1).padStart(2, '0')}-${name}.txt`, mimeType: 'text/plain', text: `Abuja office activity note, ${name} 2026\n\nDate: 18-${String(i + 1).padStart(2, '0')}-2026\nSomething happened.`, state: 'kept', receivedAt: new Date('2026-11-10T15:00:00Z') }); });
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    expect(record.noteGaps).toEqual(['2026-03']);
    const { buildTheContent } = require('./the-year-end-content');
    /* Another record dated in March (a payment, a promise) makes the record "cover" March; the missing note is still named. */
    const content = buildTheContent({ ...record, gaps: [] }, []);
    const gaps = content.sections.find((s: any) => s.id === 'gaps');
    expect(gaps.claims.map((c: any) => c.text).join(' ')).toContain('No note was forwarded for March 2026.');
  });
});
