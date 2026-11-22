import { aYearEndWorld } from './a-world-for-the-year-end';
import { actOnTheJobs } from './the-year-end-owner';
import { advanceThePersistentJobs, ensureThePrincipalsJobs } from '../outstanding/the-persistent-jobs';
import { handleTheDraftWords } from './year-end.service';
import { readItPlainly, whatSheAsksFor, mightAskForTheDraft } from './the-draft-request';
import { route } from '../assistant/the-router-is-deterministic';

/**
 * "PLEASE SEND ME THE DRAFT" IS A REQUEST FOR THE DRAFT, IN ANY WORDS (Fatima round 2, C2). The chat's router read "send me" as "email me what you just said" and
 * offered to email "what I said about 'What needs my decision'". Now the words are read by meaning (the model; the plain reading when there is none) and the
 * lifecycle's own sender answers: the same draft, to her only, once for each day. Every text she reads is printed.
 */
const NOW = new Date('2026-11-12T10:00:00Z');

const PHRASINGS = [
  'Please send me the draft.',
  'Can I see the report?',
  'Send the latest version.',
  'Send me the presentation again.',
  'I have not got the draft. Can you resend it?',
  'Could you email me the report and the slides?',
  'Please forward the files to me.',
  'Let me see the draft please.',
  'Share the year-end report with me.',
  'I did not receive the presentation.',
  'Where is the report?',
  'I want to see the latest draft.',
];

async function aDraftExists() {
  const w = aYearEndWorld(NOW);
  w.t.principalMaterial = w.aTable([], 'pm');
  await ensureThePrincipalsJobs(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
  await advanceThePersistentJobs(w.prisma, NOW);
  await actOnTheJobs(w.prisma, w.ports, NOW);
  w.mails.length = 0;
  return w;
}

describe('every way of asking for the draft is read as asking for the draft', () => {
  it.each(PHRASINGS)('%s', (message) => {
    expect(mightAskForTheDraft(message)).toBe(true);
    expect(readItPlainly(message)).toBe('send_draft');
  });
  it('does not take "email me that", a change, or a thank you for a request for the draft', () => {
    for (const m of ['Email me that.', 'Send me this.', 'Shorten this.', 'Thank you.', 'What needs my decision?']) expect(readItPlainly(m)).toBe('none');
  });
  it('the model\'s reading is used where there is one, and the plain one where it fails', async () => {
    expect(await whatSheAsksFor('Could I get the whole thing again?', { extract: async () => ({ asks: 'send_draft' }) })).toBe('send_draft');
    expect(await whatSheAsksFor('Please send me the draft.', { extract: async () => { throw new Error('down'); } })).toBe('send_draft');
    expect(await whatSheAsksFor('Please send me the draft.', { extract: async () => ({ asks: 'none' }) })).toBe('none');
  });
});

describe('the lifecycle sends it, to her only, once for each day', () => {
  it.each(PHRASINGS.slice(0, 6))('"%s" emails the same draft with its files and says so', async (message) => {
    const w = await aDraftExists();
    const said = await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message, channel: 'whatsapp', now: NOW });
    console.log(`FATIMA SAYS "${message}"\nFATIMA READS ${said}`);
    expect(said).toMatch(/^I have emailed version \d+ of the report and presentation to you, with the files attached\.$/);
    const sent = w.mails.filter((m) => m.kind === 'files');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('fatima@example.com');
    expect(sent[0].files.length).toBeGreaterThanOrEqual(3);
    expect(said).not.toMatch(/what I said about/);
  });

  it('asking twice on one day sends it once and says so plainly; a later day sends it again', async () => {
    const w = await aDraftExists();
    const ask = (when: Date) => handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'Please send me the draft.', channel: 'whatsapp', now: when });
    await ask(NOW);
    const second = await ask(new Date(NOW.getTime() + 60_000));
    console.log(`FATIMA READS THE SECOND TIME ${second}`);
    expect(second).toMatch(/^I already emailed version \d+ to you today, with the subject “.+”\. I have not sent it a second time\.$/);
    expect(w.mails.filter((m) => m.kind === 'files')).toHaveLength(1);
    await ask(new Date(NOW.getTime() + 86_400_000 + 60_000));
    expect(w.mails.filter((m) => m.kind === 'files')).toHaveLength(2);
  });

  it('nobody who is neither her nor acting for her is answered', async () => {
    const w = await aDraftExists();
    expect(await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-nobody', message: 'Please send me the draft.', channel: 'chat', now: NOW })).toBeNull();
  });
});

describe('the chat reaches the lifecycle before the router can misplace the words', () => {
  it('the router would have placed "Please send me the draft" as send_me_that, and the service asks the lifecycle first', () => {
    expect(route('Please send me the draft.').lane).toBe('send_me_that');
    const { YearEndService } = require('./year-end.service');
    expect(YearEndService.isAboutTheDraft('Please send me the draft.')).toBe(true);
  });
});

describe('asking for a draft that does not exist yet (Fatima round 3)', () => {
  it('is told there is none, and is not offered an email of something else', async () => {
    const w = aYearEndWorld(NOW);
    /* She has a year-end job, which is what makes "send me the draft" hers to ask (Batch S round 2, T8). */
    (w.prisma as any).persistentJob = { findFirst: async ({ where }: any) => (where.principalUserId === 'u-fatima' && where.kind === 'annual_report' ? { id: 'job-1' } : null) };
    const said = await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'Please send me the draft', channel: 'whatsapp', now: NOW });
    console.log(`SHE READS\n${said}`);
    expect(said).toContain('There is no draft yet');
    expect(said).not.toMatch(/what I said about/);
    expect(await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'What is the weather like', channel: 'whatsapp', now: NOW })).toBeNull();
  });

  it('asked to change it, she is told there is nothing to change yet, never offered a follow-up with her team (release test of 22 November 2026, #74)', async () => {
    const w = aYearEndWorld(NOW);
    (w.prisma as any).persistentJob = { findFirst: async ({ where }: any) => (where.principalUserId === 'u-fatima' && where.kind === 'annual_report' ? { id: 'job-1' } : null) };
    const said = await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'add March to the report', channel: 'whatsapp', now: NOW });
    console.log(`SHE SAYS "add March to the report" AND READS\n${said}`);
    expect(said).toBe('There is no draft yet, so there is nothing to change. I make the first one when there is something on the record to put in it, and I will email it as soon as it is ready. Tell me then what to change.');
  });
});

describe('somebody with no year-end job (Batch S round 2, T8)', () => {
  it('is not answered about a draft at all, so "can u send me a report" and "send it to me" go on to what they are about', async () => {
    const w = aYearEndWorld(NOW);
    (w.prisma as any).persistentJob = { findFirst: async () => null };
    expect(await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'can u send me a report on my departments for the quarter', channel: 'whatsapp', now: NOW })).toBeNull();
    expect(await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'send it to me', channel: 'chat', now: NOW })).toBeNull();
  });
});

describe('a change asked for in ordinary words, typed or mailed (Fatima round 3)', () => {
  it('"Please make the presentation shorter and move the payments to the end" is a request to shorten, not a courtesy', async () => {
    const w = await aDraftExists();
    const said = await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'Please make the presentation shorter and move the payments to the end. Thank you.', channel: 'email', now: NOW });
    console.log(`SHE READS\n${said}`);
    expect(said).toContain('I have made the report and the presentation shorter in version 2.');
  });
});

/*
 * BATCH F, F4 (E-1). "Update the draft." then "Send me the draft." made two mails for the versions and three WhatsApp messages saying version 3 was ready and sent:
 * the draft asked for while version 3 was being built sent version 2 again, and the reply and the WhatsApp line both said version 3 went.
 */
describe('one send for a version, and one message saying it', () => {
  it('while a version is being built she is told it is coming; when it is ready one mail goes and the reply is the only message', async () => {
    const { setTheNarratorThatIsRunning } = require('./the-year-end-narrative');
    const w = await aDraftExists();
    w.whatsapps.length = 0;
    /* Something new on the record, so the update is a new version. */
    w.t.groundCommitment.rows.push({ id: 'c-new', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Send the levy memo to the House committee', action: 'Send the levy memo to the House committee.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: NOW, updatedAt: NOW });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => { release = r; });
    setTheNarratorThatIsRunning({ write: async () => null, readTheRecordWhole: async () => { await gate; return null; } });
    try {
      const say = (message: string) => handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message, channel: 'chat', now: NOW });
      const updating = say('Update the draft.');
      await new Promise((r) => setTimeout(r, 20));
      const meanwhile = await say('Send me the draft.');
      console.log(`WHILE VERSION 2 IS BUILT, FATIMA READS\n${meanwhile}`);
      expect(meanwhile).toBe('I am making version 2 now, from the record as it is today. I will email it to you as soon as it is ready, so I have not sent version 1 again.');
      release();
      const updated = await updating;
      console.log(`WHEN IT IS READY, FATIMA READS\n${updated}`);
      expect(updated).toMatch(/^I have made version 2 from the record as it is now\. Version 1 is kept\. I have emailed version 2 to you\.$/);
      expect(w.mails.filter((m) => m.kind === 'files').map((m) => m.subject)).toHaveLength(1);
      /* The reply said it; the WhatsApp line is not sent as well, now or by the night's job. */
      expect(w.whatsapps.filter((x) => /version 2/.test(x.text))).toHaveLength(0);
      await actOnTheJobs(w.prisma, w.ports, new Date(NOW.getTime() + 3_600_000));
      expect(w.whatsapps.filter((x) => /version 2/.test(x.text))).toHaveLength(0);
    } finally {
      setTheNarratorThatIsRunning(null);
    }
  });
});
