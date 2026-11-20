import { aYearEndWorld } from './a-year-end-world-for-specs';
import { aReadingOfHerWords } from './a-reading-of-her-words-for-specs';
import { approveTheDraft, latestDraft, makeTheFirstDraft, readTheChange, refreshTheDraft, reviseTheDraft, theVersions, whatHappenedToIt } from './the-year-end-versions';
import { authoriseARecipient, deliverTheFinal, recipientsFor, sendTheDraft, sendTheRegister, tellHerOnWhatsApp } from './the-year-end-delivery';
import { handleTheDraftWords } from './year-end.service';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { draftReadyEmail, finalEmail, DRAFT_READY_WHATSAPP } from './the-year-end-words';
import { oneFile } from './the-year-end-files';

const mammoth = require('mammoth') as { extractRawText: (a: { buffer: Buffer }) => Promise<{ value: string }> };
const JSZip = require('jszip') as typeof import('jszip');
const XLSX = require('xlsx') as typeof import('xlsx');

const NOW = new Date('2026-11-10T09:00:00Z');
const fatima = { userId: 'u-fatima', isPrincipal: true };
const amina = { userId: 'u-amina', isPrincipal: false };

/** `notes`: that many forwarded notes about March, so a part of the report is long enough to be cut short. */
async function aSentDraft(notes = 0) {
  const w = aYearEndWorld(NOW);
  if (notes) {
    w.t.principalMaterial = w.aTable([], 'pm');
    for (let i = 0; i < notes; i++) w.t.principalMaterial.rows.push({ id: `pm-${i}`, organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b1', fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName: `march-note-${i}.txt`, mimeType: 'text/plain', text: `Abuja office note ${i}, March 2026\n\nDate: 1${i}-03-2026\nThe visit number ${i} took place in March.`, state: 'kept', receivedAt: new Date('2026-11-09T15:00:00Z') });
  }
  const a = { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW };
  const { row } = await makeTheFirstDraft(w.prisma, a);
  await sendTheDraft(w.prisma, w.ports, { ...a, row });
  return { w, a, row };
}
const docText = async (c: any, kind: any, v = { version: 2, status: 'revised' }) => (await mammoth.extractRawText({ buffer: (await oneFile(kind, c, v)).content })).value;
const pptText = async (c: any) => { const z = await JSZip.loadAsync((await oneFile('presentation', c, { version: 2, status: 'revised' })).content); return (await Promise.all(Object.keys(z.files).filter((n) => /slides\/slide\d+\.xml$/.test(n)).map((n) => z.file(n)!.async('string')))).join(' '); };

describe('"Add March", "Shorten this" and "This is wrong" revise the same draft', () => {
  it('reads the three changes in the words she is told she can use, and a voice transcript reads the same', () => {
    expect(readTheChange('Add March', 2026)).toEqual({ kind: 'add_month', month: '2026-03', text: null });
    expect(readTheChange('add march: we signed the Kilele agreement on the 12th.', 2026)).toEqual({ kind: 'add_month', month: '2026-03', text: 'we signed the Kilele agreement on the 12th.' });
    expect(readTheChange('Shorten this', 2026)).toEqual({ kind: 'shorten', section: 'all' });
    expect(readTheChange('This is wrong: Ibrahim did not file the summary.', 2026)).toEqual({ kind: 'wrong', text: 'Ibrahim did not file the summary.' });
    expect(readTheChange('What is outstanding?', 2026)).toBeNull();
    expect(readTheChange('This is wrong', 2026)).toBeNull();
  });

  it('"Add March" makes version 2 of the same draft, with the first kept, and March in the report, the presentation and the register', async () => {
    const { w, a } = await aSentDraft();
    const r = (await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'chat', message: 'Add March' }))!;
    expect(r.version).toBe(2);
    expect(r.said).toBe('I have added March 2026 to the draft as version 2, in the report, the presentation and the register. The record has nothing for March yet, so it is marked unverified, and the team is being asked for it. Version 1 is kept.');
    const versions = await theVersions(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 });
    expect(versions.map((v) => [v.version, v.status, v.parentId ? 'has parent' : 'first'])).toEqual([[1, 'draft', 'first'], [2, 'revised', 'has parent']]);
    expect(versions[0].content.sections.some((s) => s.id === 'month:2026-03')).toBe(false);
    const c = versions[1].content;
    expect(await docText(c, 'report_docx')).toContain('Nothing in the record covers March 2026 yet. The team is being asked for it.');
    expect(await pptText(c)).toContain('Nothing in the record covers March 2026 yet.');
    expect(c.questions).toContain('Is there anything from March 2026 that belongs in the year-end report?');
  });

  it('what she tells me about March is her own recollection, unverified, in every file', async () => {
    const { w, a } = await aSentDraft();
    const r = (await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'voice', message: 'Add March: we signed the Kilele agreement on the 12th.' }))!;
    expect(r.said).toContain('What you said is marked as your own recollection until a record shows it.');
    const c = (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.content;
    const line = c.sections.find((s) => s.id === 'month:2026-03')!.claims.find((x) => x.status === 'recollection')!;
    expect(line.text).toBe('Fatima told me on 10 November 2026: "we signed the Kilele agreement on the 12th". This is Fatima\'s recollection, and nothing on the record backs it yet.');
    expect(line.refs[0]).toMatch(/^P-/);
    expect(c.evidence.find((e) => e.ref === line.refs[0])).toMatchObject({ label: "Fatima's own words by voice" });
    expect(await docText(c, 'evidence_index')).toContain("Fatima's own words by voice on 10 November 2026");
    expect(c.sections.filter((s) => s.id === 'achieved')[0].claims.map((x) => x.text).join(' ')).not.toContain('Kilele');
  });

  it('"Shorten this" cuts the report and the presentation and leaves the register and the evidence index whole', async () => {
    const { w, a } = await aSentDraft(5);
    const full = await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 });
    const r = (await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'email', message: 'Shorten this' }))!;
    expect(r.said).toBe('I have made the report and the presentation shorter in version 2. Nothing was taken out of the register or the evidence index, which stay in full. Version 1 is kept.');
    const c = (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.content;
    expect(await docText(c, 'report_docx')).toContain('more lines in this part are left out to keep it short. They are all in the register and the evidence index.');
    expect(c.register).toEqual(full!.content.register);
    expect(c.evidence).toEqual(full!.content.evidence);
    expect(await docText(c, 'evidence_index')).toBe(await docText(full!.content, 'evidence_index'));
  });

  it('"This is wrong" puts her words beside the line it is about, in the report, the presentation and the register, and the line stays as the record has it', async () => {
    const { w, a } = await aSentDraft();
    const r = (await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'chat', message: 'This is wrong: Ibrahim did not file the quarterly assembly summary.' }))!;
    expect(r.said).toBe('I have put your correction beside that line in version 2, in the report, the presentation and the register. The line stays as the record has it until something shows otherwise, and your words are marked as yours. Version 1 is kept.');
    const c = (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.content;
    const note = 'Fatima said on 10 November 2026: "Ibrahim did not file the quarterly assembly summary". This is Fatima\'s correction, not yet backed by a record.';
    expect(await docText(c, 'report_docx')).toContain(note);
    expect(await docText(c, 'register_docx')).toContain(note);
    const book = XLSX.read((await oneFile('register_xlsx', c, { version: 2, status: 'revised' })).content, { type: 'buffer' });
    expect(JSON.stringify(XLSX.utils.sheet_to_json(book.Sheets['Register'], { header: 1 }))).toContain('Ibrahim did not file the quarterly assembly summary');
    expect(await docText(c, 'report_docx')).toContain('which stays as the record has it');
    expect(c.sections.find((s) => s.id === 'unverified')!.claims[0].text).toContain('Ibrahim Sule said it was done');
  });

  it('a correction it cannot place stands on its own, unverified, and a question is asked about which line', async () => {
    const { w, a } = await aSentDraft();
    const r = (await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'chat', message: 'This is wrong: the weather was bad in Lagos.' }))!;
    expect(r.said).toBe('I could not tell which line you meant, so I have kept your words as they are, marked unverified, in version 2. Which line is it about, Fatima? Version 1 is kept.');
  });

  it('a delegate may prepare and revise, and the change is noted as hers to approve, not theirs', async () => {
    const { w, a } = await aSentDraft();
    const r = (await reviseTheDraft(w.prisma, { ...a, by: amina, channel: 'email', message: 'Add April' }))!;
    expect(r.version).toBe(2);
    const row = (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!;
    expect(row.status).toBe('revised');
    expect((row as any).changedByUserId).toBe('u-amina');
  });

  it('with no draft yet, the words say so and nothing is made up', async () => {
    const w = aYearEndWorld(NOW);
    expect((await reviseTheDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', by: fatima, channel: 'chat', message: 'Add March', now: NOW }))!.said).toBe('There is no draft yet to change. I am still collecting, and I will tell you when the first one is ready.');
  });

  it('later evidence comes in only as a new version she asks for, and what she changed stays', async () => {
    const { w, a } = await aSentDraft();
    await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'chat', message: 'This is wrong: Ibrahim did not file the quarterly assembly summary.' });
    expect((await refreshTheDraft(w.prisma, { ...a, by: fatima, channel: 'chat' })).said).toBe('Version 2 already has everything in the record, so I have not made a new one.');
    w.t.groundCommitment.rows.push({ id: 'c-new-1', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Book the venue for the March review', action: 'Book the venue for the March review.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: new Date('2026-11-09T10:00:00Z'), updatedAt: new Date('2026-11-09T10:00:00Z') });
    const r = await refreshTheDraft(w.prisma, { ...a, by: fatima, channel: 'chat' });
    expect(r.said).toBe('I have made version 3 from the record as it is now. Version 2 is kept.');
    const v = await theVersions(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 });
    expect(v.map((x) => x.version)).toEqual([1, 2, 3]);
    expect(JSON.stringify(v[2].content)).toContain('Book the venue for the March review');
    expect(JSON.stringify(v[1].content)).not.toContain('Book the venue');
    expect(v[2].content.edits).toHaveLength(1);
  });
});

describe('the approval is hers, and only for a version she was sent', () => {
  it('somebody who acts for her cannot approve, whatever they say, and nothing changes', async () => {
    const { w, a } = await aSentDraft();
    const r = await approveTheDraft(w.prisma, { ...a, by: amina, firstName: 'Fatima' });
    expect(r.said).toBe('Only Fatima can approve this. I have not marked anything as approved, and I have told nobody it is.');
    expect((await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.status).toBe('draft');
    expect(w.mails.filter((m) => /final/i.test(m.subject))).toEqual([]);
  });

  it('through the assistant\'s own words: a delegate saying "this is ready" is refused, and the principal saying it approves and sends the final', async () => {
    const { w, a } = await aSentDraft();
    await grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', delegateUserId: 'u-amina', via: 'chat' });
    const refused = await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-amina', message: 'This is ready', channel: 'email', now: NOW, readTheRequest: aReadingOfHerWords({ 'This is ready': 'approve' }) });
    expect(refused).toBe('Only Fatima can approve this. I have not marked anything as approved, and I have told nobody it is.');
    expect(w.mails.filter((m) => m.subject.includes('final'))).toHaveLength(0);
    const said = await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'This is ready', channel: 'chat', now: NOW, readTheRequest: aReadingOfHerWords({ 'This is ready': 'approve' }) });
    expect(said).toBe('Thank you. I have marked version 1 as approved. The final files for version 1 have been sent to you.');
    expect((await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.status).toBe('final');
    const finalMail = w.mails.find((m) => m.subject === 'Your final 2026 year-end report and presentation')!;
    expect(finalMail.to).toBe('fatima@example.com');
    expect(finalMail.files.map((f) => f.filename)).toContain('2026-leadership-presentation-v1-final.pptx');
    void a;
  });

  it('a version she has not been sent cannot be approved, and "this is ready" about a newer one does not approve it', async () => {
    const { w, a } = await aSentDraft();
    await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'chat', message: 'Add March' });
    const r = await approveTheDraft(w.prisma, { ...a, by: fatima, firstName: 'Fatima' });
    expect(r.said).toBe('I have not sent you version 2 yet, so I cannot take an approval for it. I will send it to you first, and you can approve it when you have read it.');
    expect(r.approved).toBeNull();
    expect((await theVersions(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 })).every((v) => v.status !== 'approved')).toBe(true);
  });

  it('no final is made or sent for a draft that is not approved', async () => {
    const { w, a, row } = await aSentDraft();
    const r = await deliverTheFinal(w.prisma, w.ports, { ...a, row });
    expect(r.said).toBe('Version 1 has not been approved, so I have not sent a final. Nothing is sent as final until you approve it.');
    expect(w.mails.some((m) => /final/i.test(m.subject))).toBe(false);
  });

  it('an approved version is never rewritten: a change after the approval is a new version that needs its own approval, and the final goes from the row as it was kept', async () => {
    const { w, a } = await aSentDraft();
    const ok = await approveTheDraft(w.prisma, { ...a, by: fatima, firstName: 'Fatima' });
    const kept = JSON.stringify((await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.content);
    const r = (await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'email', message: 'Add March' }))!;
    expect(r.said).toContain('Version 1 stays exactly as it was approved, and this one needs approving again.');
    const v = await theVersions(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 });
    expect(v.map((x) => x.status)).toEqual(['approved', 'revised']);
    expect(JSON.stringify(v[0].content)).toBe(kept);
    const fin = await deliverTheFinal(w.prisma, w.ports, { ...a, row: ok.approved! });
    expect(fin.said).toBe('The final files for version 1 have been sent to you.');
    const reportDocx = w.mails.find((m) => m.subject.startsWith('Your final'))!.files.find((f) => f.filename.endsWith('year-end-report-v1-final.docx'))!;
    expect((await mammoth.extractRawText({ buffer: reportDocx.content })).value).not.toContain('March 2026 yet');
  });
});

describe('what is said about delivery is only what happened', () => {
  it('made but not emailed: it says so, and never "sent"', async () => {
    const w = aYearEndWorld(NOW);
    const a = { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW };
    await makeTheFirstDraft(w.prisma, a);
    const said = await whatHappenedToIt(w.prisma, { principalUserId: 'u-fatima', year: 2026, version: 1, firstName: 'Fatima' });
    expect(said).toBe('Version 1 was made on 10 November 2026. It has not been emailed yet. Fatima has not approved it yet.');
    expect(said).not.toMatch(/\bsent\b/);
  });

  it('queued and held for the morning: waiting to go, not sent; then sent when it goes; then delivered only when the provider says so', async () => {
    const w = aYearEndWorld(NOW);
    const a = { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW };
    const { row } = await makeTheFirstDraft(w.prisma, a);
    w.mode.mail = 'held';
    const sent = await sendTheDraft(w.prisma, w.ports, { ...a, row });
    expect(sent[0].outcome).toBe('held');
    const say = () => whatHappenedToIt(w.prisma, { principalUserId: 'u-fatima', year: 2026, version: 1, firstName: 'Fatima' });
    expect(await say()).toBe('Version 1 was made on 10 November 2026. The mail to fatima@example.com is waiting to go, and has not been sent yet. Fatima has not approved it yet.');
    /* her WhatsApp line is not sent while the mail has not gone, so it can never say "I've emailed both" about a held mail */
    expect(await tellHerOnWhatsApp(w.prisma, w.ports, { ...a, row, kind: 'draft' })).toBe(false);
    expect(w.whatsapps).toEqual([]);
    /* The log writes the real time it was sent, so the test holds the real clock at the world's day (it said the day the test was run before). */
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'clearImmediate', 'queueMicrotask'] });
    try { await w.releaseTheHeldMails(); } finally { jest.useRealTimers(); }
    expect(await say()).toBe('Version 1 was made on 10 November 2026. The mail to fatima@example.com was sent on 10 November 2026. I have not yet had word that it reached the inbox. Fatima has not approved it yet.');
    const { markTheYearEndFilesDelivered } = await import('./the-year-end-log');
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'clearImmediate', 'queueMicrotask'] });
    try { await markTheYearEndFilesDelivered(w.prisma, 'provider-1'); } finally { jest.useRealTimers(); }
    expect(await say()).toBe('Version 1 was made on 10 November 2026. The mail to fatima@example.com was delivered on 10 November 2026. Fatima has not approved it yet.');
  });

  it('a mail the door refuses gives its claim back and says it failed, so it can be tried again and is never reported sent', async () => {
    const w = aYearEndWorld(NOW);
    const a = { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW };
    const { row } = await makeTheFirstDraft(w.prisma, a);
    w.mode.mail = 'throws';
    expect((await sendTheDraft(w.prisma, w.ports, { ...a, row }))[0].outcome).toBe('failed');
    expect(w.t.yearEndLog.rows.map((r: any) => r.kind).sort()).toEqual(['failed', 'generated']);
    w.mode.mail = 'sent';
    expect((await sendTheDraft(w.prisma, w.ports, { ...a, row }))[0].outcome).toBe('sent');
  });

  it('the WhatsApp line goes once the mail has been sent, and only once', async () => {
    const { w, a, row } = await aSentDraft();
    expect(await tellHerOnWhatsApp(w.prisma, w.ports, { ...a, row, kind: 'draft' })).toBe(true);
    expect(await tellHerOnWhatsApp(w.prisma, w.ports, { ...a, row, kind: 'draft' })).toBe(false);
    expect(w.whatsapps).toEqual([{ phone: '+2348012345678', kind: 'year-end-draft-ready', text: DRAFT_READY_WHATSAPP('Fatima', 1) }]);
  });
});

describe('the same files never go twice, and only to the people who may have them', () => {
  it('asking again, or two copies of the API at once, sends one mail with its files', async () => {
    const w = aYearEndWorld(NOW);
    const a = { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW };
    const { row } = await makeTheFirstDraft(w.prisma, a);
    const both = await Promise.all([sendTheDraft(w.prisma, w.ports, { ...a, row }), sendTheDraft(w.prisma, w.ports, { ...a, row })]);
    expect(both.flat().map((s) => s.outcome).sort()).toEqual(['already', 'sent']);
    expect((await sendTheDraft(w.prisma, w.ports, { ...a, row }))[0].outcome).toBe('already');
    expect(w.mails.filter((m) => m.kind === 'files')).toHaveLength(1);
    expect(w.mails[0].files.map((f) => f.filename)).toEqual([
      '2026-year-end-report-v1-draft.docx', '2026-year-end-report-v1-draft.pdf', '2026-leadership-presentation-v1-draft.pptx', '2026-outstanding-register-v1-draft.xlsx', '2026-outstanding-summary-v1-draft.pdf', '2026-evidence-index-v1-draft.docx',
    ]);
  });

  it('a new version is a new send key, so the revised drafts do go', async () => {
    const { w, a } = await aSentDraft();
    await reviseTheDraft(w.prisma, { ...a, by: fatima, channel: 'chat', message: 'Add March' });
    const v2 = (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!;
    expect((await sendTheDraft(w.prisma, w.ports, { ...a, row: v2 }))[0].outcome).toBe('sent');
    expect(w.mails.map((m) => m.sendKey)).toEqual(['year-end:u-fatima:2026:v1:draft:fatima@example.com', 'year-end:u-fatima:2026:v2:draft:fatima@example.com']);
  });

  it('the draft goes to Fatima only. Somebody who acts for her does not get the files, and cannot give themselves the right to', async () => {
    const { w, a } = await aSentDraft();
    await grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', delegateUserId: 'u-amina', via: 'chat' });
    expect(await recipientsFor(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', kind: 'draft' })).toEqual(['fatima@example.com']);
    expect(await recipientsFor(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', kind: 'final' })).toEqual(['fatima@example.com']);
    const said = await authoriseARecipient(w.prisma, { ...a, byUserId: 'u-amina', firstName: 'Fatima', email: 'amina@example.com', name: 'Amina Yusuf', confirmed: true });
    expect(said).toBe('Only Fatima can say who else may be sent the year-end files. I have not added anyone.');
    expect(await recipientsFor(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', kind: 'final' })).toEqual(['fatima@example.com']);
    expect(w.mails.every((m) => m.to === 'fatima@example.com')).toBe(true);
  });

  it('a person she names and confirms gets the final, never the drafts, and not before she confirms', async () => {
    const { w, a } = await aSentDraft();
    const ask = await authoriseARecipient(w.prisma, { ...a, byUserId: 'u-fatima', firstName: 'Fatima', email: 'board@example.com', name: 'The chair', confirmed: false });
    expect(ask).toBe('You want me to send the final year-end files to The chair at board@example.com as well as to you. Shall I add them? Nothing is sent to them until you say yes.');
    expect(await recipientsFor(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', kind: 'final' })).toEqual(['fatima@example.com']);
    expect(await authoriseARecipient(w.prisma, { ...a, byUserId: 'u-fatima', firstName: 'Fatima', email: 'board@example.com', name: 'The chair', confirmed: true })).toBe('I have added The chair. They will get the final files when you approve them, and the drafts stay with you only.');
    expect(await recipientsFor(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', kind: 'draft' })).toEqual(['fatima@example.com']);
    const ok = await approveTheDraft(w.prisma, { ...a, by: fatima, firstName: 'Fatima' });
    await deliverTheFinal(w.prisma, w.ports, { ...a, row: ok.approved! });
    expect(w.mails.filter((m) => m.subject.startsWith('Your final')).map((m) => m.to).sort()).toEqual(['board@example.com', 'fatima@example.com']);
    expect(w.mails.filter((m) => m.subject.includes('ready for review')).map((m) => m.to)).toEqual(['fatima@example.com']);
  });

  it('"Send the outstanding list" emails the register once a day for one version, and says so when nothing has changed', async () => {
    const { w, a, row } = await aSentDraft();
    expect((await sendTheRegister(w.prisma, w.ports, { ...a, row })).said).toBe('I have emailed you the outstanding list from version 1.');
    expect((await sendTheRegister(w.prisma, w.ports, { ...a, row })).said).toBe('I already emailed you the outstanding list for version 1 today, and nothing has changed since.');
    expect(w.mails.find((m) => m.subject === 'Your outstanding list')!.files.map((f) => f.filename)).toEqual(['2026-outstanding-register-v1-draft.xlsx', '2026-outstanding-summary-v1-draft.pdf']);
  });
});

describe('what Fatima reads, word for word', () => {
  it('the draft-ready WhatsApp line and email, and the revised and final ones', async () => {
    const { w, row } = await aSentDraft();
    const c = row.content;
    expect(DRAFT_READY_WHATSAPP('Fatima', 1)).toBe("Fatima, I've put together the first draft of your year-end report and presentation from the information you and the team shared. I've emailed both to you for review. I'm still following up on a few gaps, which I've flagged clearly. You can reply here, send a voice note or email me any changes. When you're happy with it, I'll send the final versions.");
    expect(DRAFT_READY_WHATSAPP('Fatima', 2)).toBe("Fatima, I've updated your year-end report and presentation with your changes. This is version 2, and I've emailed both to you for review. You can reply here, send a voice note or email me any more changes. When you're happy with it, I'll send the final versions.");
    const mail = draftReadyEmail(c, 1);
    expect(mail.subject).toBe('Your year-end report and presentation are ready for review');
    expect(mail.text).toBe([
      'Hello Fatima,',
      "I've prepared the draft of your year-end report and leadership presentation and attached both files. I've also included the supporting information and flagged the items that still need confirmation.",
      "Fatima's record for 2026 has 1 matter settled with proof, 1 matter reported as done without anything to show it, and 3 matters still open or waiting for a decision. No monthly notes have been forwarded yet, so there is no month-by-month account. Nothing has been forwarded for January, February, March, April, May, June, July, August and September. 4 matters are still open in the outstanding register, and 1 of them has no confirmed owner.",
      "You can reply to this email, send a WhatsApp message or record a voice note with changes. I'll update the drafts and send you the final versions once you approve them.",
      'Groundwork',
    ].join('\n\n'));
    expect(finalEmail(c, 1).text).toBe([
      'Hello Fatima,',
      "As you approved version 1, I've attached the final report as a Word file and a PDF, the editable presentation, the outstanding register as a spreadsheet with a short readable summary, and the evidence index. Nothing has been changed since you approved it.",
      "If you want a later change, tell me and I'll make a new version for you to approve. This one stays as it is.",
      'Groundwork',
    ].join('\n\n'));
    void w;
  });
});
