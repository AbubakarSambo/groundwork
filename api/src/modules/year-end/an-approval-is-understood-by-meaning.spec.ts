import { aYearEndWorld } from './a-year-end-world-for-specs';
import { aReadingOfHerWords } from './a-reading-of-her-words-for-specs';
import { latestDraft, makeTheFirstDraft, reviseTheDraft } from './the-year-end-versions';
import { sendTheDraft } from './the-year-end-delivery';
import { handleTheDraftWords } from './year-end.service';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { THE_DRAFT_REQUEST_PROMPT, THE_DRAFT_REQUEST_SCHEMA, mightAskForTheDraft, whatSheMeans } from './the-draft-request';

/**
 * FIX PLAN 16 NOVEMBER, GROUP 4: AN APPROVAL IS UNDERSTOOD BY MEANING. Round 4: "I approve it. Please send me the final versions." returned the draft again, "I approve version 5."
 * was told "Nothing is waiting for you to approve" while version 5 waited, and only "This is ready" approved. The model reads whether she means approve, decline or neither, and which
 * version she names; the approval stays fixed code. A spec has no model, so each message below carries the reading the model is asked for (aReadingOfHerWords); what is read here is
 * what the code does with it and what Fatima is told. Every text she reads is printed.
 */
const NOW = new Date('2026-11-10T09:00:00Z');

/** A draft she has been sent, and a number of newer versions of it, each sent to her too: the newest is the one that waits. */
async function versionsSentToHer(count: number) {
  const w = aYearEndWorld(NOW);
  const a = { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW };
  const { row } = await makeTheFirstDraft(w.prisma, a);
  await sendTheDraft(w.prisma, w.ports, { ...a, row });
  for (let v = 2; v <= count; v++) {
    await reviseTheDraft(w.prisma, { ...a, by: { userId: 'u-fatima', isPrincipal: true }, channel: 'chat', message: 'Shorten this' });
    await sendTheDraft(w.prisma, w.ports, { ...a, row: (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))! });
  }
  return { w, a };
}
const say = (w: any, userId: string, message: string, readings: any) => handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId, message, channel: 'whatsapp', now: NOW, readTheRequest: aReadingOfHerWords(readings) });
const status = async (w: any) => (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.status;

describe('what she is asked to read, and what the model is asked for', () => {
  it('names approving and declining and a version number, and says a bare yes is not an approval', () => {
    expect(THE_DRAFT_REQUEST_PROMPT).toContain('I approve version 5');
    expect(THE_DRAFT_REQUEST_PROMPT).toContain('not yet');
    expect(THE_DRAFT_REQUEST_PROMPT).toMatch(/A bare "yes"/);
    expect(THE_DRAFT_REQUEST_SCHEMA.input_schema.properties.asks.enum).toEqual(['send_draft', 'send_list', 'approve', 'decline', 'none']);
    expect(Object.keys(THE_DRAFT_REQUEST_SCHEMA.input_schema.properties)).toContain('version');
  });

  it('is read by the model when she writes in words no list had, and a thank-you alone is not worth reading', async () => {
    for (const m of ['I approve it. Please send me the final versions.', 'I approve version 5.', 'Yes, send it.', 'Approve.', 'Not yet.']) expect(mightAskForTheDraft(m)).toBe(true);
    expect(mightAskForTheDraft('Thanks.')).toBe(false);
    const seen: string[] = [];
    const out = await whatSheMeans('I approve version 5.', { extract: async (_s, h) => { seen.push(h[0].content); return { asks: 'approve', version: 5 }; }, waiting: 5 });
    expect(out).toEqual({ asks: 'approve', version: 5 });
    expect(seen[0]).toContain('Version 5 is the one waiting for her approval.');
    expect(await whatSheMeans('I approve it.', { extract: async () => { throw new Error('down'); } })).toEqual({ asks: 'none', version: null });
  });
});

describe('Fatima approves, in her own words, and Fatima reads what was done', () => {
  it.each([
    ['I approve it. Please send me the final versions.', 'approve'],
    ['Yes, send it.', 'approve'],
    ['Approve.', 'approve'],
  ])('"%s" approves the version that waits and says so', async (message, asks) => {
    const { w } = await versionsSentToHer(1);
    const said = await say(w, 'u-fatima', message, { [message]: asks });
    console.log(`FATIMA SAYS "${message}"\nFATIMA READS ${said}`);
    expect(said).toBe('Thank you. I have marked version 1 as approved. The final files for version 1 have been sent to you.');
    expect(await status(w)).toBe('final');
  });

  it('"I approve version 5." approves version 5, the one that waits, and never says that nothing is waiting', async () => {
    const { w } = await versionsSentToHer(5);
    const said = await say(w, 'u-fatima', 'I approve version 5.', { 'I approve version 5.': { asks: 'approve', version: 5 } });
    console.log(`FATIMA SAYS "I approve version 5."\nFATIMA READS ${said}`);
    expect(said).toBe('Thank you. I have marked version 5 as approved. The final files for version 5 have been sent to you.');
    expect(said).not.toMatch(/Nothing is waiting/);
    expect((await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.version).toBe(5);
  });

  it('naming an older version approves nothing, and she is told which one waits', async () => {
    const { w } = await versionsSentToHer(5);
    const said = await say(w, 'u-fatima', 'I approve version 3.', { 'I approve version 3.': { asks: 'approve', version: 3 } });
    console.log(`FATIMA SAYS "I approve version 3."\nFATIMA READS ${said}`);
    expect(said).toBe('You named version 3, and the newest version is 5. I have not approved anything. Say "I approve version 5" if that is the one you mean.');
    expect(await status(w)).toBe('revised');
  });

  it('"Not yet." approves nothing and says what was done', async () => {
    const { w } = await versionsSentToHer(2);
    const said = await say(w, 'u-fatima', 'Not yet.', { 'Not yet.': 'decline' });
    console.log(`FATIMA SAYS "Not yet."\nFATIMA READS ${said}`);
    expect(said).toBe('Understood. I have not approved version 2, and nothing has gone out as final. Tell me what to change, or say that you approve it when it is ready.');
    expect(await status(w)).toBe('revised');
    expect(w.mails.some((m: any) => /final/i.test(m.subject))).toBe(false);
  });

  it('somebody who acts for her is refused in plain words, whatever they say, and nothing changes', async () => {
    const { w } = await versionsSentToHer(1);
    await grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', delegateUserId: 'u-amina', via: 'chat' });
    const said = await say(w, 'u-amina', 'I approve it.', { 'I approve it.': 'approve' });
    console.log(`AMINA SAYS "I approve it."\nAMINA READS ${said}`);
    expect(said).toBe('Only Fatima can approve this. I have not marked anything as approved, and I have told nobody it is.');
    expect(await status(w)).toBe('draft');
  });

  it('a change is never an approval, whatever the model reads', async () => {
    const { w } = await versionsSentToHer(1);
    const said = await say(w, 'u-fatima', 'Add March', { 'Add March': 'approve' });
    expect(said).not.toMatch(/marked version 1 as approved/);
    expect(await status(w)).not.toBe('final');
  });
});

/* Fatima round 4, N35: "This is wrong" was answered with "I am making version 3 now" and nothing about the line. The first thing she reads says what is being done with it. */
describe('what she reads at once when she asks for a change', () => {
  const { theAckBeforeTheRevision } = require('./the-year-end-versions');
  it('a correction says her words go beside the line and the line stays as the record has it', () => {
    const said = theAckBeforeTheRevision('wrong', 3);
    console.log(`SHE READS\n${said}`);
    expect(said).toBe('I am making version 3 now, with your correction put beside the line it is about. The line stays as the record has it until a record shows otherwise, and your words are marked as yours. It can take about a minute, and I will tell you when it is ready.');
  });
  it('a shorter report or another month is the plain acknowledgement, as before', () => {
    expect(theAckBeforeTheRevision('shorten', 2)).toBe('I am making version 2 now. It can take about a minute, and I will tell you when it is ready.');
    expect(theAckBeforeTheRevision('add_month', 4)).toBe('I am making version 4 now. It can take about a minute, and I will tell you when it is ready.');
  });
});
