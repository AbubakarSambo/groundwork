import { aYearEndWorld } from './a-year-end-world-for-specs';
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
