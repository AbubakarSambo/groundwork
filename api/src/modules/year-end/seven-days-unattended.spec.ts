import { aYearEndWorld } from './a-world-for-the-year-end';
import { aReadingOfHerWords } from './a-reading-of-her-words-for-specs';
import { actOnTheJobs } from './the-year-end-owner';
import { advanceThePersistentJobs, ensureThePrincipalsJobs } from '../outstanding/the-persistent-jobs';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { recordTheMatchAnswer } from '../outstanding/the-outstanding-register';
import { latestDraft, theVersions } from './the-year-end-versions';
import { handleTheDraftWords } from './year-end.service';

const mammoth = require('mammoth') as { extractRawText: (a: { buffer: Buffer }) => Promise<{ value: string }> };

/**
 * SEVEN DAYS IN WHICH FATIMA DOES NOT START A CONVERSATION (plan section 32), run on a clock the test moves.
 *
 * THIS IS A DETERMINISTIC ACCELERATED-CLOCK SIMULATION on synthetic data and the local fakes (the mail and WhatsApp ports record what would be
 * sent, with the files). It proves the logic across days: what is asked of whom, what Fatima is told and when, that a draft is made once and
 * sent once, and where permissions stop. It does NOT prove real-time durability (a process restarting between nights, real Resend, real
 * WhatsApp templates, real delivery receipts), which is unverified and needs a real run.
 *
 * The seeded year: unfinished synthesis, nine months with nothing, a "done" with nothing shown, a matter nobody owns, two lines that may be one
 * matter with two owners, a payment exception, an authorised team contact (Amina), and another lead's confidential matter that must never be
 * seen. Each day the team does something. Fatima does nothing.
 */
const day = (n: number, hour = 9) => new Date(Date.UTC(2026, 10, 10 + n, hour));
const commit = (id: string, ground: string, participant: string | null, text: string, over: Record<string, any> = {}) => ({
  id, groundId: ground, participantId: participant, text, action: `${text}.`, whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null,
  createdAt: new Date('2026-11-05T10:00:00Z'), updatedAt: new Date('2026-11-05T10:00:00Z'), ...over,
});

async function theWeek() {
  const w = aYearEndWorld(day(0));
  await grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', delegateUserId: 'u-amina', via: 'chat' });
  await ensureThePrincipalsJobs(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: day(0) });
  /* seeds: overlapping owners, and a payment exception the ministry has not answered */
  w.t.groundCommitment.rows.push(
    commit('c-pay-1', 'g-ministry', 'gp-amina', 'Prepare the quarterly payment schedule'),
/* Changed 21 November 2026 (Batch E, N6): two people's lines are never asked about as one on shared words, so the pair that may be one matter is now one person's two lines. */
    commit('c-pay-2', 'g-ministry', 'gp-amina', 'Quarterly payment report for the board'),
  );
  w.t.groundDependency.rows.push({ id: 'd-payment', groundId: 'g-ministry', fromParticipantId: 'gp-amina', onParticipantId: null, onLabel: 'Kilele', what: 'the Kilele payment, which was paid twice', status: 'BLOCKING', createdAt: new Date('2026-11-03T10:00:00Z'), updatedAt: new Date('2026-11-03T10:00:00Z') });

  const arrivals: Record<number, () => Promise<void> | void> = {
    /* Day 2: Ibrahim answers the one question, with proof. */
    2: () => { Object.assign(w.t.groundCommitment.rows.find((r: any) => r.id === 'c-done-said'), { settledBy: 'PROVEN', settledAt: day(2), updatedAt: day(2) }); },
    /* Day 3: Amina forwards the records from January to June. */
    3: () => { for (let m = 0; m < 6; m += 1) w.t.groundCommitment.rows.push(commit(`c-early-${m}`, 'g-ministry', 'gp-amina', `Close out month ${m + 1} reporting`, { status: 'DONE', settledBy: 'PROVEN', settledAt: new Date(Date.UTC(2026, m, 20)), createdAt: new Date(Date.UTC(2026, m, 15)), updatedAt: new Date(Date.UTC(2026, m, 20)) })); },
    /* Day 4: and July to September. */
    4: () => { for (let m = 6; m < 9; m += 1) w.t.groundCommitment.rows.push(commit(`c-early-${m}`, 'g-ministry', 'gp-amina', `Close out month ${m + 1} reporting`, { status: 'DONE', settledBy: 'PROVEN', settledAt: new Date(Date.UTC(2026, m, 20)), createdAt: new Date(Date.UTC(2026, m, 15)), updatedAt: new Date(Date.UTC(2026, m, 20)) })); },
    /* Day 5: Amina, who acts for Fatima, says who owns the audit letter and that the two payment lines are one matter. */
    5: async () => {
      Object.assign(w.t.groundCommitment.rows.find((r: any) => r.id === 'c-nobody'), { participantId: 'gp-ibrahim' });
      await recordTheMatchAnswer(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', aKey: 'commitment:c-pay-1', bKey: 'commitment:c-pay-2', same: true });
    },
  };
  const days: { n: number; actions: string[]; whatsapps: string[]; mails: string[] }[] = [];
  for (let n = 1; n <= 7; n += 1) {
    w.clock.now = day(n);
    await arrivals[n]?.();
    const wa0 = w.whatsapps.length;
    const m0 = w.mails.length;
    await advanceThePersistentJobs(w.prisma, day(n));
    const actions = await actOnTheJobs(w.prisma, w.ports, day(n));
    days.push({ n, actions: actions.map((a) => `${a.action}${a.detail ? `(${a.detail})` : ''}`), whatsapps: w.whatsapps.slice(wa0).map((x) => x.text), mails: w.mails.slice(m0).map((m) => `${m.kind} to ${m.to}: ${m.subject}${m.files.length ? ` [${m.files.length} files]` : ''}`) });
  }
  return { w, days };
}

describe('seven days with no conversation from Fatima (accelerated clock; real-time durability is unverified)', () => {
  let week: Awaited<ReturnType<typeof theWeek>>;
  beforeAll(async () => { week = await theWeek(); });

  it('tells Fatima at most one routine thing a day, never the same thing twice, and stays silent when there is nothing new', () => {
    for (const d of week.days) expect(d.whatsapps.filter((t) => !/first draft/.test(t)).length).toBeLessThanOrEqual(1);
    const all = week.days.flatMap((d) => d.whatsapps);
    expect(new Set(all).size).toBe(all.length);
    const silent = week.days.filter((d) => !d.whatsapps.length && !d.mails.some((m) => m.endsWith('files')));
    expect(silent.length).toBeGreaterThanOrEqual(4);
    expect(week.days.slice(-1)[0].actions).toEqual(['silent']);
  });

  it('what she was told, and when, word for word', () => {
    /* Readiness follows the plan (30.4): the draft goes on the first night the record holds anything, with its gaps, unproven lines and open questions said plainly in it, and new records are offered as an update she asks for. */
    expect(week.days.map((d) => ({ n: d.n, whatsapps: d.whatsapps.map((t) => t.replace(/\d+ records?/, 'N records')) }))).toEqual([
      { n: 1, whatsapps: [expect.stringMatching(/^Fatima, I've put together the first draft of your year-end report and presentation/)] },
      { n: 2, whatsapps: [] },
      { n: 3, whatsapps: ['Fatima, new records have arrived since version 1 of your draft. Say "update the draft" and I\'ll make a new version. Nothing changes until you do.'] },
      { n: 4, whatsapps: [] }, { n: 5, whatsapps: [] }, { n: 6, whatsapps: [] }, { n: 7, whatsapps: [] },
    ]);
  });

  it('collects without her: the team is asked, once, and what they send is recognised and never asked for again', () => {
    const asks = week.w.mails.filter((m) => m.kind === 'ask');
    /* Changed for the Dangote stress test (D4): everything Amina is asked in one night is one message, not one for the months and one for the two lines. */
    expect(asks.map((m) => m.to).sort()).toEqual(['amina@example.com', 'ibrahim@example.com']);
    expect(asks.some((m) => m.to === 'fatima@example.com')).toBe(false);
    expect(asks.find((m) => m.to === 'ibrahim@example.com')!.text).toContain('You said "File the quarterly assembly summary" is done.');
    expect(asks.filter((m) => m.to === 'amina@example.com').map((m) => m.text).join(' ')).toContain('Is "Prepare the quarterly payment schedule"');
  });

  it('advances BOTH outputs: the draft is made once, on the first day the record holds anything, with the report, presentation, register and index from the same version', async () => {
    const drafts = await theVersions(week.w.prisma, { organizationId: week.w.ORG, principalUserId: 'u-fatima', year: 2026 });
    expect(drafts.map((d) => [d.version, d.status])).toEqual([[1, 'draft']]);
    expect(week.days.find((d) => d.actions.some((a) => a.startsWith('draft_ready')))!.n).toBe(1);
    const mail = week.w.mails.find((m) => m.kind === 'files')!;
    expect(mail.files.map((f) => f.filename)).toEqual([
      '2026-year-end-report-v1-draft.docx', '2026-year-end-report-v1-draft.pdf', '2026-leadership-presentation-v1-draft.pptx', '2026-outstanding-register-v1-draft.xlsx', '2026-outstanding-summary-v1-draft.pdf', '2026-evidence-index-v1-draft.docx',
    ]);
    const report = (await mammoth.extractRawText({ buffer: mail.files[0].content })).value;
    /* Day 1: nothing is settled yet, the "done" with nothing shown is said to be unverified, and the nine months with nothing are listed as gaps. */
    expect(report).toContain('File the quarterly assembly summary. Ibrahim Sule said it was done, and nothing on the record shows it yet, so it is not counted as achieved. It is part of National Assembly reporting.');
    expect(report).toContain('the Kilele payment, which was paid twice');
    expect(report).toContain('Nothing in the record covers January, February, March, April, May, June, July, August and September 2026. That does not mean nothing happened.');
    const jobs = week.w.t.persistentJob.rows;
    expect(jobs.map((j: any) => j.state)).toEqual(['draft_ready', 'draft_ready']);
    expect(jobs.map((j: any) => j.nextAction)).toEqual(['Wait for changes to version 1, or its approval.', 'Wait for changes to version 1, or its approval.']);
  });

  it('the log says what happened, once each, and the draft was sent before it was called sent', () => {
    const rows = week.w.t.yearEndLog.rows;
    const keys = rows.map((r: any) => `${r.kind}|${r.subject}`);
    expect(new Set(keys).size).toBe(keys.length);
    const kinds = (k: string) => rows.filter((r: any) => r.kind === k).length;
    expect(kinds('generated')).toBe(1);
    expect(kinds('queued')).toBe(1);
    expect(kinds('sent')).toBe(1);
    expect(kinds('delivered')).toBe(0);
    expect(kinds('approved')).toBe(0);
    expect(rows.find((r: any) => r.kind === 'sent').data.providerId).toBe('provider-' + (week.w.mails.findIndex((m) => m.kind === 'files') + 1));
  });

  it('keeps to its permissions: the files went to Fatima alone, and another lead\'s matter and her own private list are in nothing that was sent', async () => {
    const withFiles = week.w.mails.filter((m) => m.files.length);
    expect(withFiles.map((m) => m.to)).toEqual(['fatima@example.com']);
    expect(week.w.mails.filter((m) => /tunde|grace/.test(m.to))).toEqual([]);
    const everything = [...week.w.mails.map((m) => `${m.subject} ${m.text}`), ...week.w.whatsapps.map((x) => x.text)].join(' ');
    expect(everything).not.toMatch(/severance|retirement/);
    for (const f of withFiles[0].files.filter((f) => f.filename.endsWith('.docx'))) expect((await mammoth.extractRawText({ buffer: f.content })).value).not.toMatch(/severance|retirement/);
  });

  it('prints what each day did, for the record of the run', () => {
    const lines = week.days.map((d) => `Day ${d.n}: ${d.actions.join(', ') || 'nothing'} | WhatsApp ${d.whatsapps.length} | mail ${d.mails.join('; ') || 'none'}`);
    expect(lines).toHaveLength(7);
    // eslint-disable-next-line no-console
    if (process.env.SHOW_THE_WEEK) console.log(lines.join('\n'));
  });

  it('on the eighth day she writes for the first time, and the same draft is revised, approved and sent as final', async () => {
    const { w } = week;
    const now = day(8);
    const said = await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'Add December: the board met on the 4th.', channel: 'chat', now });
    expect(said).toContain('I have added December 2026 to the draft as version 2');
    expect(said).toContain('I have emailed version 2 to you.');
    expect(said).toMatch(/Version 1 is kept\./);
    expect((await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.version).toBe(2);
    expect(await handleTheDraftWords(w.prisma, w.ports, { organizationId: w.ORG, userId: 'u-fatima', message: 'This is ready', channel: 'email', now, readTheRequest: aReadingOfHerWords({ 'This is ready': 'approve' }) })).toBe('Thank you. I have marked version 2 as approved. The final files for version 2 have been sent to you.');
    expect(w.mails.filter((m) => m.subject === 'Your final 2026 year-end report and presentation')).toHaveLength(1);
    expect((await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!.status).toBe('final');
  });
});
