import { aWorldForPrincipalWork, read, DAY, fatima, amina } from './a-world-for-principal-work';
import { makeTheFirstDraft, theVersions } from '../year-end/the-year-end-versions';
import { saidAsAnInstruction } from './the-voice-revisions';

/**
 * A VOICE NOTE REVISES THE CURRENT DRAFT (plan sections 8 and 14). "Make the presentation shorter", "add March" and "this is wrong" said aloud change the
 * year-end draft as a new version and do nothing else: no new document, no task. The earlier version is kept. A phrase the transcriber was unsure of is
 * checked back first, and nothing changes until she answers.
 */
const b = (s: string) => Buffer.from(s, 'utf8');
const NOW = new Date('2026-11-10T09:00:00Z');

async function aDraftExists() {
  const w = aWorldForPrincipalWork(NOW);
  await makeTheFirstDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
  const versions = async () => theVersions(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 });
  const say = (text: string, over: Record<string, unknown> = {}) => w.work.hearAVoiceNote({ organizationId: w.ORG, userId: 'u-fatima', text, unclear: [], channel: 'whatsapp', now: NOW, ...over } as any);
  const hear = (message: string, speaker = fatima, channel: 'whatsapp' | 'email' = 'whatsapp') => w.work.hear({ organizationId: w.ORG, principalUserId: 'u-fatima', principalFirst: 'Fatima', speaker, message, channel, now: NOW });
  return { w, versions, say, hear };
}

describe('a voice note that changes the draft', () => {
  it('"make the presentation a bit shorter" makes version 2 of the same draft, keeps version 1, and makes nothing else', async () => {
    const { w, versions, say } = await aDraftExists();
    const tasksBefore = JSON.stringify([w.t.groundCommitment.rows.length, w.t.todo.rows.length, w.t.groundDependency.rows.length]);
    const said = await say('Could you make the presentation a bit shorter please');
    console.log(`WHAT SHE READS AFTER THE VOICE NOTE\n\n${said}`);
    expect(said).toBe('I have made the report and the presentation shorter in version 2. Nothing was taken out of the register or the evidence index, which stay in full. Version 1 is kept. I have emailed version 2 to you.');
    expect((await versions()).map((v) => [v.version, v.status])).toEqual([[1, 'draft'], [2, 'revised']]);
    expect((await versions())[1].parentId).toBe((await versions())[0].id);
    /* nothing but the draft changed: no task, no commitment, no to-do, no second document */
    expect(JSON.stringify([w.t.groundCommitment.rows.length, w.t.todo.rows.length, w.t.groundDependency.rows.length])).toBe(tasksBefore);
    expect(w.t.yearEndDraft.rows).toHaveLength(2);
  });

  it('"add March" with what she says about it, and "this is wrong: ..." revise the same draft in turn, each a new version, all kept', async () => {
    const { w, versions, say } = await aDraftExists();
    const a = await say('Please add March, we signed the Kilele agreement on the 12th');
    expect(a).toContain('I have added March 2026 to the draft as version 2, in the report, the presentation and the register.');
    expect(a).toContain('What you said is marked as your own recollection until a record shows it.');
    const c = await say('This is wrong: Ibrahim did not file the quarterly summary');
    expect(c).toContain('I have put your correction beside that line in version 3');
    expect((await versions()).map((v) => v.version)).toEqual([1, 2, 3]);
    expect((await versions())[2].content.edits.map((e: any) => [e.kind, e.channel])).toEqual([['add_month', 'voice'], ['wrong', 'voice']]);
    expect(w.t.yearEndDraft.rows).toHaveLength(3);
  });

  it('a phrase the transcriber was unsure of is checked back first, and nothing changes until she says yes', async () => {
    const { w, versions, say, hear } = await aDraftExists();
    const asked = await say('Add March, we signed the Kilele agreement', { unclear: [{ heard: 'March' }] });
    expect(asked).toBe('I think you said "March", but I am not sure I heard it right. Is that right? Reply yes, or type what you meant.');
    expect(await versions()).toHaveLength(1);
    const done = await hear('yes');
    expect(done).toContain('I have added March 2026 to the draft as version 2');
    expect(await versions()).toHaveLength(2);
    /* the question is closed: a second yes changes nothing */
    expect(await hear('yes')).toBeNull();
    expect(await versions()).toHaveLength(2);
  });

  it('and a no leaves the draft as it was', async () => {
    const { versions, say, hear } = await aDraftExists();
    await say('Shorten it', { unclear: [{ heard: 'Shorten' }] });
    expect(await hear('no')).toBe('Thank you. I have not changed the draft. Please type what you meant, or send the voice note again.');
    expect(await versions()).toHaveLength(1);
  });

  it('words that are not about the draft, or a draft that does not exist yet, are left alone', async () => {
    const { w, say } = await aDraftExists();
    expect(await say('Please remind Tunde about the minutes')).toBeNull();
    const none = aWorldForPrincipalWork(NOW);
    expect(await none.work.hearAVoiceNote({ organizationId: none.ORG, userId: 'u-fatima', text: 'Shorten this', unclear: [], channel: 'whatsapp', now: NOW })).toBeNull();
    expect(w.t.yearEndLog.rows.filter((r: any) => r.kind === 'asked')).toHaveLength(0);
  });

  it('somebody who acts for her may make the change, and her yes to a check-back is hers only', async () => {
    const { w, versions, hear } = await aDraftExists();
    await w.withAmina();
    const said = await w.work.hearAVoiceNote({ organizationId: w.ORG, userId: 'u-amina', text: 'make it shorter', unclear: [], channel: 'whatsapp', now: NOW });
    expect(said).toContain('I have made the report and the presentation shorter in version 2.');
    /* Amina's own check-back is waiting on Amina's yes, and Fatima's yes does not make Amina's change */
    await w.work.hearAVoiceNote({ organizationId: w.ORG, userId: 'u-amina', text: 'add March', unclear: [{ heard: 'March' }], channel: 'whatsapp', now: NOW });
    expect(await hear('yes', fatima)).toBeNull();
    expect(await versions()).toHaveLength(2);
    expect(await hear('yes', amina)).toContain('I have added March 2026 to the draft as version 3');
  });
});

describe('an audio file on a forwarded mail', () => {
  const audio = (name: string, said: string) => [{ fileName: name, mimeType: 'audio/mp4', bytes: b(said) }];

  it('is heard, changes the current draft, and is answered by mail once, with the batch not answered a second time', async () => {
    const { w, versions } = await aDraftExists();
    await w.forward({ subject: 'Voice note', files: audio('memo.m4a', 'VOICE:This is wrong: Ibrahim did not file the quarterly summary'), at: NOW });
    expect(await w.work.readTheQuietBatches(w.afterQuiet(NOW))).toBe(1);
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0].subject).toBe('Your voice note');
    expect(w.sent[0].text).toContain('I have put your correction beside that line in version 2');
    expect((await versions()).map((v) => v.version)).toEqual([1, 2]);
    expect(w.t.intakeBatch.rows[0].acknowledgedAt).toBeTruthy();
    /* the original is kept as material, and no task was made */
    expect(w.t.principalMaterial.rows.some((r: any) => r.kind === 'voice' && Buffer.isBuffer(r.bytes))).toBe(true);
    expect(await w.work.readTheQuietBatches(w.afterQuiet(new Date(NOW.getTime() + DAY)))).toBe(0);
  });

  it('where the phrase was unclear it is checked back by mail first, and her reply by mail makes the change', async () => {
    const { w, versions, hear } = await aDraftExists();
    await w.forward({ subject: 'Voice note', files: audio('memo.m4a', 'UNCLEAR:Add March'), at: NOW });
    await w.work.readTheQuietBatches(w.afterQuiet(NOW));
    /* Changed (round 1, I-06): no file name, and "reply here" is right on either channel. */
    expect(w.sent[0].text).toBe('In your voice note, I think you said "March", but I am not sure I heard it right. Is that right? Reply here and tell me, or tell me what you meant.');
    expect(await versions()).toHaveLength(1);
    expect(await hear('Yes', fatima, 'email')).toContain('I have added March 2026 to the draft as version 2');
  });

  it('a team member\'s voice note never changes her draft', async () => {
    const { w, versions } = await aDraftExists();
    await w.forward({ from: 'ngozi', subject: 'Voice note', files: audio('memo.m4a', 'VOICE:Make the report shorter'), at: NOW });
    await w.work.readTheQuietBatches(w.afterQuiet(NOW));
    expect(await versions()).toHaveLength(1);
    expect(w.sent.filter((m) => /version 2/.test(m.text))).toHaveLength(0);
  });
});

describe('the words the year-end code is given', () => {
  it('are the three plain instructions it already knows', () => {
    expect(saidAsAnInstruction({ kind: 'shorten', section: 'all' })).toBe('Shorten this');
    expect(saidAsAnInstruction({ kind: 'add_month', month: '2026-03', text: null })).toBe('Add March');
    expect(saidAsAnInstruction({ kind: 'add_month', month: '2026-03', text: 'we signed' })).toBe('Add March: we signed');
    expect(saidAsAnInstruction({ kind: 'wrong', text: 'the date' })).toBe('This is wrong: the date');
  });
});
