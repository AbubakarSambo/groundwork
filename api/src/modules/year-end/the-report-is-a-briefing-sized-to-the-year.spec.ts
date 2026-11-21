import { aYearEndWorld } from './a-world-for-the-year-end';
import { loadTheRecord } from './the-year-end-versions';
import { buildTheContentWithTheNarrative, type TheNarrator } from './the-year-end-narrative';
import { reportBlocks, slidesOf } from './the-year-end-files';
import { whatTheRecordCoversNow } from '../outstanding/the-persistent-jobs';

/**
 * DANGOTE STRESS TEST, D8 AND D9. The year-end report was 68,559 words, every forwarded note month by month, and the 9,400 plain emails and WhatsApp messages on her
 * record shaped none of it. The deck had seven slides for the year, and "What was achieved" was led by "Follow up local government permits update".
 *
 * Now the messages count as evidence and as coverage; the report is a briefing, outcomes first, a few lines a part with the rest counted; and the deck is sized to
 * the material, about 15 to 20 slides for a full year, with only proven outcomes on "What was achieved".
 */
const NOW = new Date('2026-11-20T10:00:00Z');
const OUTCOMES = ['Obtain the Kogi permit letter', 'Sign the fertilizer subsidy memorandum', 'Receive the fortification certificate', 'Sign the Ibese community agreement', 'Settle the Apapa port access dispute', 'Recover the customs bond deposit', 'Secure the export incentive approval letter', 'Close the Obajana depot land title', 'Win the scholarship partnership grant', 'Register the Kano distribution hub', 'Clear the NMDPRA inspection report', 'Agree the Rivers community compensation terms'];
const ROUTINE = ['Follow up local government permits update', 'Submit payment requests for this month', 'Send the weekly meeting reminders'];
const SAID = ['Deliver the senate engagement summary', 'Book the minister courtesy visit', 'Hand over the media monitoring file', 'Prepare the governors forum brief', 'Confirm the ports authority meeting', 'Draft the levy position paper', 'Collect the haulage invoices', 'Share the youth programme results'];
const OPEN = ['Renew the depot operating licence', 'Finalise the 2027 engagement calendar', 'Appoint the new community liaison officer', 'Review the customs waiver application', 'Publish the annual sustainability statement', 'Plan the January stakeholder retreat', 'Audit the regional office expenses', 'Prepare the board briefing pack', 'Refresh the crisis communication plan', 'Map the new state assembly members', 'Settle the BuildRight contract range', 'Update the government relations manual'];

function aFullYear() {
  const w = aYearEndWorld(NOW);
  const rows = w.t.groundCommitment.rows;
  const at = (m: number, d = 15) => new Date(Date.UTC(2026, m, d));
  [...OUTCOMES, ...ROUTINE].forEach((text, i) => rows.push({ id: `c-done-${i}`, groundId: 'g-ministry', participantId: 'gp-amina', text, action: `${text}.`, whenSaid: null, status: 'DONE', source: 'CHECK_IN', settledBy: 'PROVEN', settledAt: at(i % 10, 20), createdAt: at(i % 10), updatedAt: at(i % 10, 20) }));
  SAID.forEach((text, i) => rows.push({ id: `c-said-${i}`, groundId: 'g-assembly', participantId: 'gp-ibrahim', text, action: `${text}.`, whenSaid: null, status: 'DONE', source: 'CHECK_IN', settledBy: 'SAID', settledAt: at(i, 22), createdAt: at(i), updatedAt: at(i, 22) }));
  OPEN.forEach((text, i) => rows.push({ id: `c-open-${i}`, groundId: 'g-ministry', participantId: 'gp-amina', text, action: `${text}.`, whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: at(i % 11), updatedAt: at(i % 11) }));
  /* A monthly note for each month, and two hundred plain messages a month: what her office really sends. */
  w.t.principalMaterial = w.aTable([], 'pm');
  for (let m = 0; m < 10; m += 1) {
    const name = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October'][m];
    w.t.principalMaterial.rows.push({ id: `pm-note-${m}`, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b1', fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName: `activity-2026-${String(m + 1).padStart(2, '0')}-${name}.txt`, mimeType: 'text/plain', text: `Abuja office activity note, ${name} 2026\n\nDate: 18-${String(m + 1).padStart(2, '0')}-2026\nThe office met the ministry about the ${name} permits. The visit was held as planned.`, state: 'kept', receivedAt: at(m, 28) });
    for (let k = 0; k < 200; k += 1) w.t.principalMaterial.rows.push({ id: `m${m}x${k}`, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: `bm-${m}`, fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: k % 2 ? 'whatsapp' : 'email', kind: 'message', fileName: `message:${m}-${k}`, mimeType: 'text/plain', text: `Ma, the port meeting moved to Thursday number ${k}. We will send the minutes after.`, state: 'kept', receivedAt: at(m, 1 + (k % 27)) });
  }
  return w;
}

/** A narrator that writes nothing and picks the outcomes by what each proven line says, as the model would. */
const aNarrator = (): TheNarrator => ({
  write: async () => null,
  outcomes: async (a) => ({ ids: a.lines.filter((l) => OUTCOMES.some((o) => l.text.startsWith(o.split(' ').slice(0, 3).join(' ')))).map((l) => l.id), promptVersionId: null }),
});

describe('plain emails and WhatsApp messages are evidence', () => {
  it('count for the months they are about, and are in the report as what each month holds', async () => {
    const w = aFullYear();
    const covered = await whatTheRecordCoversNow(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    expect(covered.sources.filter((s) => s.kind === 'message')).toHaveLength(2000);
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    const c = await buildTheContentWithTheNarrative(record, [], { narrator: aNarrator() });
    expect(c.evidence.filter((e) => e.label === 'an email' || e.label === 'a WhatsApp message')).toHaveLength(2000);
    const report = reportBlocks(c, { version: 1, status: 'draft' }).map((b) => b.text).join('\n');
    expect(report).toContain('200 emails and WhatsApp messages about March 2026 are on the record. What each says is in the evidence index.');
  });
});

describe('the report is a briefing', () => {
  it('reads outcomes first, a few lines a part, and counts the rest, in a few pages', async () => {
    const w = aFullYear();
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    const c = await buildTheContentWithTheNarrative(record, [], { narrator: aNarrator() });
    const blocks = reportBlocks(c, { version: 1, status: 'draft' });
    const text = blocks.map((b) => b.text).join('\n');
    const words = text.split(/\s+/).length;
    console.log(`THE REPORT, ${words} WORDS\n${blocks.map((b) => (b.t === 'li' ? `  • ${b.text}` : b.t === 'p' ? b.text : `\n${b.text.toUpperCase()}`)).join('\n')}`);
    expect(words).toBeLessThan(4000);
    const headings = blocks.filter((b) => b.t === 'h2').map((b) => b.text);
    expect(headings.indexOf('What was achieved, with proof')).toBeLessThan(headings.indexOf('The year, month by month'));
    expect(headings.indexOf('Said to be done, but not yet shown')).toBeLessThan(headings.indexOf('The year, month by month'));
    /* The routine tasks are counted, never led with. */
    const achieved = text.slice(text.indexOf('What was achieved, with proof'), text.indexOf('Said to be done'));
    expect(achieved).toContain('Obtain the Kogi permit letter');
    expect(achieved).toContain('4 routine tasks were also done and shown');
    expect(achieved.indexOf('Follow up local government permits update')).toBeGreaterThan(achieved.indexOf('routine tasks'));
  });
});

describe('the presentation is sized to the material', () => {
  it('a full year is 15 to 20 slides, and "What was achieved" holds only proven outcomes', async () => {
    const w = aFullYear();
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    const c = await buildTheContentWithTheNarrative(record, [], { narrator: aNarrator() });
    const slides = slidesOf(c, { version: 1, status: 'draft' });
    console.log(`THE DECK, ${slides.length} SLIDES\n${slides.map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.lines.map((l) => `  ${l}`).join('\n')}`).join('\n')}`);
    expect(slides.length).toBeGreaterThanOrEqual(15);
    expect(slides.length).toBeLessThanOrEqual(20);
    for (const s of slides) expect(s.lines.length).toBeLessThanOrEqual(6);
    const achieved = slides.filter((s) => s.title.startsWith('What was achieved')).flatMap((s) => s.lines).join('\n');
    for (const r of ROUTINE) expect(achieved).not.toContain(r);
    for (const r of SAID) expect(achieved).not.toContain(r);
    expect(achieved).toContain('Obtain the Kogi permit letter');
    expect(slides.slice(-1)[0].title).toBe('What needs a decision');
  });

  it('a small record is a few slides', async () => {
    const w = aYearEndWorld(NOW);
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    const c = await buildTheContentWithTheNarrative(record, [], { narrator: null });
    expect(slidesOf(c, { version: 1, status: 'draft' }).length).toBeLessThanOrEqual(8);
  });
});
