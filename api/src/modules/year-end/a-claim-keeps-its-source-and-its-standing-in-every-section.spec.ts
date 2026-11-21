import { aYearEndWorld } from './a-world-for-the-year-end';
import { loadTheRecord } from './the-year-end-versions';
import { buildTheContent } from './the-year-end-content';
import { applyTheNarrative, THE_FLAG } from './the-year-end-narrative';
import { reportBlocks, slidesOf, whatMattersMost } from './the-year-end-files';

/**
 * FATIMA ROUND 4, UNTRUE LINES 3 TO 6 (N24, N25). After "Add March" rewrote the narrative, the report's opening stated "the office held at least 14 meetings with 6 institutions" as
 * plain fact although Amaka had marked it as not backed up (a lower section still honoured it), said the notes cover 12 months when eleven notes had come, never named the month with
 * no note, and said "from the December note" for an email. The report is read as a person reads it: the text of what matters most, the opening and the months, and the slide.
 */
const NOW = new Date('2026-11-12T10:00:00Z');
const note = (month: string, text: string) => `Abuja office activity note, ${month} 2026\n\n${text}`;
const JAN = note('January', 'The office met the Federal Ministry of Industry about the local content guidelines.');
const MAR = note('March', 'Musa Ibrahim visited the Kano state office on 17 March and delivered a letter.');
const MAY = note('May', 'National Assembly monitoring started and the first weekly report came on 8 May.');
const Q3 = 'Abuja office Q3 report, draft v2\n\nDuring the year the office held at least 14 meetings with 6 institutions.';
const TRACKER = 'Payments tracker\n2026-02-12 vehicle hire 4,580,000\n2026-06-02 caterer 120,000\n2026-12-01 printing 90,000';
const CHAIN = 'From: Ibrahim Danjuma\nTo: Folake\nSubject: Local Content Bill hearing\nDate: 2 December 2026\n\nThe committee asked for written views by 15 December.';

async function theRecord() {
  const w = aYearEndWorld(NOW);
  w.t.principalMaterial = w.aTable([], 'pm');
  const add = (id: string, fileName: string, text: string) => w.t.principalMaterial.rows.push({ id, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b1', fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName, mimeType: 'text/plain', text, state: 'kept', receivedAt: new Date('2026-11-11T09:00:00Z') });
  add('pm-jan', 'activity-2026-01-January.txt', JAN);
  add('pm-mar', 'activity-2026-03-March.txt', MAR);
  add('pm-may', 'activity-2026-05-May.txt', MAY);
  add('pm-q3', 'q3-2026-09-September.txt', Q3);
  add('pm-trk', 'payments.txt', TRACKER);
  add('pm-eml', 'chain-2026-12.txt', CHAIN);
  return loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
}

describe('what matters most counts monthly notes, and names the month with none', () => {
  it('a tracker dated across the year, an email about December and a month she asked to add are not months covered by a note', async () => {
    const record = await theRecord();
    const c = buildTheContent(record, [{ id: 'e1', kind: 'add_month', month: '2026-02', text: null, by: 'u-fatima', at: NOW.toISOString(), channel: 'email' }]);
    const says = whatMattersMost(c);
    console.log(`SHE READS\n${says}`);
    expect(c.noteMonths).toEqual(['2026-01', '2026-03', '2026-05', '2026-09']);
    expect(says).toContain('The monthly notes cover 4 months of 2026');
    expect(says).toMatch(/no note covers February/);
    expect(says).not.toMatch(/12 months|11 months/);
  });
});

describe('a claim somebody marked as not backed up is said so wherever the report states it', () => {
  it('the opening, the month and the slide say it, and a sentence about something else does not', async () => {
    const record = await theRecord();
    const base = buildTheContent(record, []);
    const q3 = base.evidence.find((e) => /Q3 report/.test(e.title ?? ''))!;
    const mar = base.evidence.find((e) => /March/.test(e.title ?? ''))!;
    base.register.push({ key: 'k14', item: '14 meetings with 6 institutions', workstream: null, owner: 'Amaka Obi', actionNeeded: '', status: 'unverified', priority: 'not stated', dueOn: null, dueInferred: false, dependency: null, decision: null, refs: [q3.ref], lastVerifiedAt: NOW.toISOString(), nextFollowUp: '', carryForward: false, resolution: null, disputed: true } as any);
    const fact = (text: string, ref: string, quote: string) => ({ text, ref, quote });
    const c = applyTheNarrative(base, {
      inputHash: 'h', promptKey: 'k', promptVersionId: null, instructionsFound: [],
      opening: [
        fact('Musa Ibrahim visited the Kano state office on 17 March and delivered a letter.', mar.ref, 'visited the Kano state office on 17 March'),
        fact('During the year, the office held at least 14 meetings with 6 institutions.', q3.ref, 'held at least 14 meetings with 6 institutions'),
      ],
      months: { '2026-09': { sentences: [fact('The office held at least 14 meetings with 6 institutions in the year.', q3.ref, 'held at least 14 meetings with 6 institutions')], status: 'uncertain', notKnown: null } },
    }, new Map());
    const text = reportBlocks(c, { version: 5, status: 'revised' }).map((b) => b.text).join('\n');
    const slide = slidesOf(c, { version: 5, status: 'revised' }).find((s) => s.title === 'The year in one slide')!.lines.join('\n');
    console.log(`SHE READS\n${text}\n\nTHE SLIDE\n${slide}`);
    expect(text).toContain(`During the year, the office held at least 14 meetings with 6 institutions (from the note "Abuja office Q3 report, draft v2"). ${THE_FLAG}`);
    expect(text).toContain(`The office held at least 14 meetings with 6 institutions in the year. ${THE_FLAG}`);
    expect(text).toContain('delivered a letter (from the March note).');
    expect(text).not.toMatch(/delivered a letter[^.]*\. Somebody has marked/);
    expect(slide).toContain(THE_FLAG);
  });

  it('an email chain is named as an email, never as a note for the month', async () => {
    const record = await theRecord();
    const base = buildTheContent(record, []);
    const chain = base.evidence.find((e) => /Local Content Bill hearing/.test(e.title ?? ''))!;
    const c = applyTheNarrative(base, { inputHash: 'h', promptKey: 'k', promptVersionId: null, instructionsFound: [], months: {}, opening: [{ text: 'The office was asked to submit views on the bill by 15 December.', ref: chain.ref, quote: 'asked for written views by 15 December' }] }, new Map());
    const text = reportBlocks(c, { version: 1, status: 'draft' }).map((b) => b.text).join('\n');
    console.log(`SHE READS\n${text}`);
    expect(text).toContain('(from the email "Local Content Bill hearing")');
    expect(text).not.toMatch(/December note/);
  });
});
