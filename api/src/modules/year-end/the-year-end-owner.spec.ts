import { aYearEndWorld } from './a-year-end-world-for-specs';
import { actOnTheJobs } from './the-year-end-owner';
import { advanceThePersistentJobs, ensureThePrincipalsJobs } from '../outstanding/the-persistent-jobs';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { latestDraft } from './the-year-end-versions';
import { progressFull, progressShort } from './the-year-end-words';

const NOW = new Date('2026-11-10T09:00:00Z');
const at = (iso: string) => new Date(iso);

async function aWorldWithJobs(now = NOW, withAmina = true) {
  const w = aYearEndWorld(now);
  if (withAmina) await grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', delegateUserId: 'u-amina', via: 'chat' });
  await ensureThePrincipalsJobs(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now });
  const run = async (when: Date = w.clock.now) => { w.clock.now = when; await advanceThePersistentJobs(w.prisma, when); return actOnTheJobs(w.prisma, w.ports, when); };
  return { w, run };
}
/** Everything the record needs for the draft to be ready: every month covered, an owner on every line, nothing unproven. */
function makeItReady(w: ReturnType<typeof aYearEndWorld>) {
  for (let m = 0; m < 9; m += 1) w.t.groundCommitment.rows.push({ id: `c-m${m}`, groundId: 'g-ministry', participantId: 'gp-amina', text: `Close out month ${m + 1} reporting`, action: `Close out month ${m + 1} reporting.`, whenSaid: null, status: 'DONE', source: 'CHECK_IN', settledBy: 'PROVEN', settledAt: new Date(Date.UTC(2026, m, 20)), createdAt: new Date(Date.UTC(2026, m, 15)), updatedAt: new Date(Date.UTC(2026, m, 20)) });
  Object.assign(w.t.groundCommitment.rows.find((r: any) => r.id === 'c-done-said'), { settledBy: 'PROVEN' });
  Object.assign(w.t.groundCommitment.rows.find((r: any) => r.id === 'c-nobody'), { participantId: 'gp-ibrahim' });
}

describe('a draft that is ready is made once, and sent with both drafts attached', () => {
  it('the record has gaps, unproven lines and a line nobody owns, and the draft is still made: it names each of them, and nobody waits for impossible completeness', async () => {
    const { w, run } = await aWorldWithJobs();
    const done = await run();
    expect(done.map((d) => d.action)).toContain('draft_ready');
    expect(w.t.yearEndDraft.rows).toHaveLength(1);
    const claims = w.t.yearEndDraft.rows[0].content.sections.flatMap((x: any) => x.claims.map((c: any) => `${c.status}|${c.text}`));
    expect(claims.some((c: string) => c.startsWith('gap|Nothing in the record covers January, February, March, April, May, June, July, August and September 2026. That does not mean nothing happened.'))).toBe(true);
    expect(claims.some((c: string) => c.startsWith('unverified|File the quarterly assembly summary. Ibrahim Sule said it was done'))).toBe(true);
    expect(claims).toContain('gap|Nobody has confirmed who owns "Chase the audit letter", so it cannot move until somebody does.');
    expect(w.mails.filter((m) => m.kind === 'files')).toHaveLength(1);
  });

  it('when both jobs are ready, version 1 is made, the mail goes with its files, and the WhatsApp line follows once the mail has been sent', async () => {
    const { w, run } = await aWorldWithJobs();
    makeItReady(w);
    const done = await run();
    expect(done.map((d) => d.action)).toEqual(expect.arrayContaining(['draft_ready', 'whatsapp_draft_ready']));
    const mail = w.mails.find((m) => m.kind === 'files')!;
    expect(mail.to).toBe('fatima@example.com');
    expect(mail.subject).toBe('Your year-end report and presentation are ready for review');
    expect(mail.files.map((f) => f.filename)).toEqual(expect.arrayContaining(['2026-year-end-report-v1-draft.docx', '2026-leadership-presentation-v1-draft.pptx', '2026-outstanding-register-v1-draft.xlsx']));
    expect(w.whatsapps).toHaveLength(1);
    expect(w.whatsapps[0].text.startsWith("Fatima, I've put together the first draft of your year-end report and presentation")).toBe(true);
    /* the job says it is waiting on her, not that the draft can be sent */
    await advanceThePersistentJobs(w.prisma, w.clock.now);
    expect(w.t.persistentJob.rows[0].nextAction).toBe('Wait for changes to version 1, or its approval.');
  });

  it('running the night again changes nothing: one draft, one mail, one WhatsApp line', async () => {
    const { w, run } = await aWorldWithJobs();
    makeItReady(w);
    await run();
    await run(at('2026-11-10T14:00:00Z'));
    await run(at('2026-11-11T09:00:00Z'));
    expect(w.t.yearEndDraft.rows).toHaveLength(1);
    expect(w.mails.filter((m) => m.kind === 'files')).toHaveLength(1);
    expect(w.whatsapps.filter((x) => x.kind === 'year-end-draft-ready')).toHaveLength(1);
  });

  it('held for the morning, the mail is queued and the WhatsApp line waits until it has really gone', async () => {
    const { w, run } = await aWorldWithJobs();
    makeItReady(w);
    w.mode.mail = 'held';
    const first = await run();
    expect(first.map((d) => d.action)).toContain('draft_ready');
    expect(first.map((d) => d.action)).not.toContain('whatsapp_draft_ready');
    expect(w.whatsapps).toEqual([]);
    w.mode.mail = 'sent';
    await w.releaseTheHeldMails();
    const next = await run(at('2026-11-11T09:00:00Z'));
    expect(next.map((d) => d.action)).toContain('whatsapp_draft_ready');
    expect(w.whatsapps).toHaveLength(1);
  });
});

describe('a note that is not meaningful is not sent', () => {
  it('with nothing new, the night is silent, and says so in the log of what was done', async () => {
    const { w, run } = await aWorldWithJobs();
    expect((await run(at('2026-11-10T09:00:00Z'))).map((d) => d.action)).toContain('draft_ready');
    expect((await run(at('2026-11-11T09:00:00Z'))).map((d) => d.action)).toEqual(['silent']);
    expect((await run(at('2026-11-12T09:00:00Z'))).map((d) => d.action)).toEqual(['silent']);
    expect(w.whatsapps).toHaveLength(1);
    /* three days on there is still nothing new, so there is still nothing to say */
    expect((await run(at('2026-11-13T09:00:00Z'))).map((d) => d.action)).toEqual(['silent']);
    expect(w.whatsapps).toHaveLength(1);
  });

  it('never a second routine message in a day, and never one in her quiet hours', async () => {
    const { w, run } = await aWorldWithJobs();
    await run(at('2026-11-10T09:00:00Z'));
    w.t.groundCommitment.rows.push({ id: 'c-late', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Send the thank-you letters', action: 'Send the thank-you letters.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: at('2026-11-11T08:00:00Z'), updatedAt: at('2026-11-11T08:00:00Z') });
    const quiet = await run(at('2026-11-11T22:30:00Z'));
    expect(quiet.map((d) => d.action).filter((a) => a.startsWith('told_'))).toEqual([]);
    expect(w.whatsapps).toHaveLength(1);
    const morning = await run(at('2026-11-12T09:00:00Z'));
    expect(morning.map((d) => d.action)).toContain('told_newer');
    const again = await run(at('2026-11-12T12:00:00Z'));
    expect(again.map((d) => d.action).filter((a) => a.startsWith('told_'))).toEqual([]);
    expect(w.whatsapps).toHaveLength(2);
  });

  it('what was told is not told again: the same note, the same decision', async () => {
    const { w, run } = await aWorldWithJobs();
    for (let d = 0; d < 5; d += 1) await run(at(`2026-11-${10 + d}T09:00:00Z`));
    const texts = w.whatsapps.map((x) => x.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('a decision that only she can make, with nobody to act for her, is said once, in plain words, after the draft has gone', async () => {
    const { w, run } = await aWorldWithJobs(NOW, false);
    w.t.groundCommitment.rows.push(
      { id: 'c-pay-1', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Prepare the quarterly payment schedule', action: 'Prepare the quarterly payment schedule.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: at('2026-11-05T10:00:00Z'), updatedAt: at('2026-11-05T10:00:00Z') },
      { id: 'c-pay-2', groundId: 'g-assembly', participantId: 'gp-ibrahim', text: 'Quarterly payment schedule preparation', action: 'Quarterly payment schedule preparation.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: at('2026-11-05T10:00:00Z'), updatedAt: at('2026-11-05T10:00:00Z') },
    );
    await run();
    await run(at('2026-11-11T09:00:00Z'));
    const decisions = w.whatsapps.filter((x) => /needs your decision/.test(x.text));
    expect(decisions.map((x) => x.text)).toEqual(['Fatima, one thing for your year-end work needs your decision. Is "Prepare the quarterly payment schedule" from a check-in the same thing as "Quarterly payment schedule preparation" from a check-in? I have kept them apart until you tell me.']);
    await run(at('2026-11-12T09:00:00Z'));
    expect(w.whatsapps.filter((x) => /needs your decision/.test(x.text))).toHaveLength(1);
  });
});

describe('where a gap is asked, and where it is not', () => {
  it('a month with nothing is asked of the person who acts for her, in one mail, once; Fatima is not asked', async () => {
    const { w, run } = await aWorldWithJobs();
    await run();
    await run(at('2026-11-11T09:00:00Z'));
    const asks = w.mails.filter((m) => m.kind === 'ask');
    expect(asks.filter((m) => m.to === 'fatima@example.com')).toEqual([]);
    const toAmina = asks.filter((m) => m.to === 'amina@example.com');
    expect(toAmina).toHaveLength(1);
    expect(toAmina[0].text).toBe("Hello Amina Yusuf, I'm putting together Fatima's year-end report, and I don't have anything yet from January, February, March, April, May, June, July, August and September. If you have emails, documents or notes from then, you can forward them to this address or reply here, and I'll add them. Thank you.");
  });

  it('the person who said a thing was done is asked the one question, once, and not after the proof arrives', async () => {
    const { w, run } = await aWorldWithJobs();
    await run();
    const q = w.mails.filter((m) => m.kind === 'ask' && m.to === 'ibrahim@example.com');
    expect(q).toHaveLength(1);
    expect(q[0].text).toBe('Hello Ibrahim Sule, one question for the year-end report. You said "File the quarterly assembly summary" is done. What was it, who got it, and on which day?');
    await run(at('2026-11-11T09:00:00Z'));
    expect(w.mails.filter((m) => m.kind === 'ask' && m.to === 'ibrahim@example.com')).toHaveLength(1);
  });

  it('with nobody to act for her, the person with most on the record is asked, not her', async () => {
    const { w, run } = await aWorldWithJobs(NOW, false);
    await run();
    const asks = w.mails.filter((m) => m.kind === 'ask');
    expect(asks.some((m) => m.to === 'fatima@example.com')).toBe(false);
    expect(asks.some((m) => /don't have anything yet from January/.test(m.text))).toBe(true);
  });

  it('a mail the person\'s own one-a-day rule refused is asked again another day, not lost', async () => {
    const { w, run } = await aWorldWithJobs();
    w.mode.routineMailsToday.add('ibrahim@example.com|2026-11-10');
    await run();
    expect(w.mails.filter((m) => m.kind === 'ask' && m.to === 'ibrahim@example.com')).toHaveLength(0);
    await run(at('2026-11-11T09:00:00Z'));
    expect(w.mails.filter((m) => m.kind === 'ask' && m.to === 'ibrahim@example.com')).toHaveLength(1);
  });
});

describe('where the short note goes', () => {
  it('on WhatsApp, short, when there is a number; by email, fuller, when there is not or WhatsApp could not take it', async () => {
    const late = (a: Awaited<ReturnType<typeof aWorldWithJobs>>) => a.w.t.groundCommitment.rows.push({ id: 'c-late', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Send the thank-you letters', action: 'Send the thank-you letters.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: at('2026-11-11T08:00:00Z'), updatedAt: at('2026-11-11T08:00:00Z') });
    const a = await aWorldWithJobs();
    await a.run(at('2026-11-10T09:00:00Z'));
    late(a);
    await a.run(at('2026-11-12T09:00:00Z'));
    expect(a.w.whatsapps.slice(-1)[0].text).toMatch(/new records have arrived since version 1/);
    expect(a.w.mails.filter((m) => m.kind === 'progress')).toEqual([]);
    const b = await aWorldWithJobs();
    await b.run(at('2026-11-10T09:00:00Z'));
    b.w.mode.whatsapp = false;
    late(b);
    await b.run(at('2026-11-12T09:00:00Z'));
    const note = b.w.mails.find((m) => m.kind === 'progress')!;
    expect(note.to).toBe('fatima@example.com');
    expect(note.text.startsWith('Hello Fatima,')).toBe(true);
  });

  it('says what is true, in plain sentences', () => {
    expect(progressShort('Fatima', { kind: 'coverage', newRecords: 12, first: false, months: ['2026-10', '2026-11'], gaps: ['2026-01', '2026-02'] })).toBe("Fatima, I now have 12 more records for your year-end work, covering October and November. I still have nothing from January and February. I'll send you the draft when it's ready.");
    expect(progressShort('Fatima', { kind: 'gap', gaps: ['2026-01', '2026-02', '2026-03'], askedOf: 'Amina Yusuf' })).toBe("Fatima, I don't have anything yet from January, February and March for your year-end work. I've asked Amina Yusuf for it, so you don't need to chase it.");
    expect(progressShort('Fatima', { kind: 'newer', version: 2 })).toBe('Fatima, new records have arrived since version 2 of your draft. Say "update the draft" and I\'ll make a new version. Nothing changes until you do.');
    expect(progressFull('Fatima', { kind: 'gap', gaps: ['2026-03'], askedOf: null }).text).toBe("Hello Fatima,\n\nI don't have anything yet from March for your year-end work. I'll ask the team for it.\n\nNothing has been guessed for those months. They are marked unverified in the draft until a record arrives.\n\nGroundwork");
  });

  it('after the draft, new records are offered as an update she asks for, and are never put in without her', async () => {
    const { w, run } = await aWorldWithJobs();
    makeItReady(w);
    await run();
    const before = (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!;
    w.t.groundCommitment.rows.push({ id: 'c-late', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Send the thank-you letters', action: 'Send the thank-you letters.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: at('2026-11-11T08:00:00Z'), updatedAt: at('2026-11-11T08:00:00Z') });
    await run(at('2026-11-12T09:00:00Z'));
    expect(w.whatsapps.slice(-1)[0].text).toBe('Fatima, new records have arrived since version 1 of your draft. Say "update the draft" and I\'ll make a new version. Nothing changes until you do.');
    const after = (await latestDraft(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', year: 2026 }))!;
    expect(after.version).toBe(before.version);
  });
});
