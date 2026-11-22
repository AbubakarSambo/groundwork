import { aWorldForPrincipalWork, fatima, amina, NOW, DAY, read } from './a-world-for-principal-work';
import { aStandingNote } from './principal-work';

/**
 * THE DAILY BRIEFING AND THE WEEKLY UPDATE (plan section 15): on request ("Give me my day"), short on WhatsApp and fuller by email, and on schedule
 * only if she set it, and only when there is something in it. Written from the register, so nothing in it can come from a private conversation.
 */
const at = (h: number, d = 10) => new Date(Date.UTC(2026, 10, d, h, 0, 0));

async function aWorld() {
  const w = aWorldForPrincipalWork(NOW);
  w.waitingList.push({ ref: 'sr-fuel', firstName: 'Tunde', thing: 'Tunde’s request to spend NGN 120,000 on fuel for the site visits' });
  /* a payment due this week, said to be paid by a sheet that has no proof */
  w.t.paymentTrackerLine.rows.push({ id: 'pl-x', organizationId: w.ORG, principalUserId: 'u-fatima', lineKey: 'x', fileName: 'Payments.xlsx', rowNumber: 2, paymentKey: 'zenith|inv77', payee: 'Zenith Cleaners', reference: 'INV-77', amount: '90000.00', currency: 'NGN', owner: 'Ngozi Eze', dueOn: new Date('2026-11-12'), statedStatus: 'pending', statedApproval: 'approved', evidence: null, receivedAt: NOW, createdAt: NOW });
  const hear = (message: string, o: { speaker?: typeof fatima; channel?: 'chat' | 'whatsapp' | 'email'; now?: Date } = {}) => w.work.hear({ organizationId: w.ORG, principalUserId: 'u-fatima', principalFirst: 'Fatima', speaker: o.speaker ?? fatima, message, channel: o.channel ?? 'chat', now: o.now ?? NOW });
  return { w, hear };
}

describe('"Give me my day"', () => {
  it('says what needs her decision, what is due (including a payment not shown as paid), what matters most, and what changed', async () => {
    const { w, hear } = await aWorld();
    const first = (await hear('Give me my day'))!;
    console.log(`HER DAY, ASKED FOR IN CHAT\n\n${first}`);
    /* Changed for the Dangote stress test (D5): a payment the office's sheet marks Approved is not a decision for her, so the day's decisions are her real ones. */
    expect(first.startsWith('Here is your day, Fatima.\n\nWhat needs your decision\n- Do you approve Tunde’s request to spend NGN 120,000 on fuel for the site visits?\n\nWhat is due')).toBe(true);
    expect(first).toContain('- Circulate the committee minutes (Ibrahim Sule). It is due on 13 November 2026.');
    expect(first).toContain('- The payment of NGN 90,000 to Zenith Cleaners is due on 12 November 2026. It is not shown as paid.');
    expect(first).toContain('What matters most\n- Get the ministry’s reply on the budget (Amina Yusuf). It is waiting for somebody outside the office.\n- Chase the audit letter. It is open.');
    /* the first time there is nothing to compare with, so nothing is said to have changed */
    expect(first).not.toContain('What has changed since I last told you');
    /* a new commitment appears, and the next day says so */
    w.t.groundCommitment.rows.push({ id: 'c-new', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Book the permanent secretary for Friday', action: 'Amina Yusuf books the permanent secretary for Friday.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: NOW, updatedAt: NOW });
    const second = (await hear('give me my day', { now: new Date(NOW.getTime() + 60_000) }))!;
    expect(second).toContain('What has changed since I last told you\n- Book the permanent secretary for Friday (Amina Yusuf) is new on the record.');
    expect(w.t.yearEndLog.rows.filter((r: any) => String(r.subject).startsWith('briefing:day:'))).toHaveLength(2);
  });

  it('on WhatsApp the short one is the answer and the fuller one goes by email, said only because it went', async () => {
    const { w, hear } = await aWorld();
    for (const i of [2, 3, 4, 5]) w.waitingList.push({ ref: `sr-${i}`, firstName: 'Tunde', thing: `Tunde’s request number ${i} to spend NGN 10,000 on printing` });
    const said = (await hear('Give me my day', { channel: 'whatsapp' }))!;
    console.log(`HER DAY, ASKED FOR ON WHATSAPP\n\n${said}\n\nAND BY EMAIL\n\n${read(w.sent)}`);
    expect(said.endsWith('I have emailed you the fuller version.')).toBe(true);
    expect(said).toContain('- And 2 more.');
    expect(w.sent[0].text).not.toContain('And 1 more');
    expect(w.sent[0].text.length).toBeGreaterThan(said.length);
    expect(w.sent.map((m) => [m.via, m.to, m.subject])).toEqual([['reply', 'fatima@example.com', 'Your day, 10 November 2026']]);
    /* where the mail does not go, it is not said to have gone */
    const bad = await aWorld();
    for (const i of [2, 3, 4, 5]) bad.w.waitingList.push({ ref: `sr-${i}`, firstName: 'Tunde', thing: `Tunde’s request number ${i} to spend NGN 10,000 on printing` });
    bad.w.mode.mail = 'suppressed';
    expect(await bad.hear('Give me my day', { channel: 'whatsapp' })).not.toContain('I have emailed you');
  });

  it('what the person who acts for her reads is hers without her own private to-do list, and says whose day it is', async () => {
    const { w, hear } = await aWorld();
    await w.withAmina();
    const own = (await hear('Give me my day'))!;
    const hers = (await hear('Give me my day', { speaker: amina }))!;
    expect(own).toContain('Think about my own retirement date');
    expect(hers.startsWith('Here is Fatima\'s day, Amina.')).toBe(true);
    expect(hers).not.toContain('retirement');
    expect(hers).not.toContain('Here is your day');
  });

  it('with nothing to tell, she is told so on request', async () => {
    const w = aWorldForPrincipalWork(NOW);
    for (const t of ['groundCommitment', 'groundDependency', 'todo']) w.t[t].rows.length = 0;
    const said = await w.work.hear({ organizationId: w.ORG, principalUserId: 'u-fatima', principalFirst: 'Fatima', speaker: fatima, message: 'Give me my day', channel: 'chat', now: NOW });
    expect(said).toBe('Nothing needs you today, Fatima. I will tell you when something does.');
  });
});

describe('the weekly update', () => {
  it('says what moved with proof, what is in progress, what is stuck, what waits for her, and what is said to be done with nothing shown', async () => {
    const { w, hear } = await aWorld();
    const week = (await hear('Give me the weekly update'))!;
    console.log(`HER WEEK\n\n${week}`);
    expect(week.startsWith('Here is the update on the work for the week to 10 November 2026, Fatima.')).toBe(true);
    expect(week).toContain('What moved this week\n- Revised brief to the ministry (Amina Yusuf). It is done, and the record shows it.');
    expect(week).toContain('What is stuck, and what would help\n- Get the ministry’s reply on the budget (Amina Yusuf). It is waiting on the ministry.');
    expect(week).toContain('What waits for your decision\n- Do you approve Tunde’s request to spend NGN 120,000 on fuel for the site visits?');
    expect(week).toMatch(/Said to be done, with nothing shown yet\n- File the quarterly assembly summary\./);
    /* Changed for the Dangote stress test (D5): the one line is marked Approved in the office's own sheet, so nothing on it disagrees with the record. */
    expect(week).toContain('Payments\n- One payment is on the tracker. None is shown as paid yet. Nothing on it disagrees with the record.');
  });
});

describe('standing preferences', () => {
  it('she sets them by saying so, and only she can', async () => {
    const { w, hear } = await aWorld();
    expect(await hear('Send me my day every morning at 7')).toBe('I will send you your day each morning at 7 in the morning, only when there is something to tell you. Tell me if you want me to stop.');
    expect(w.t.principalSetup.rows[0].preferences.dailyBriefing).toEqual({ on: true, hour: 7 });
    expect(await hear('Send me a weekly update every Friday at 4pm')).toBe('I will send you the update on the work every Friday at 4 in the afternoon, only when there is something in it. Tell me if you want me to stop.');
    expect(w.t.principalSetup.rows[0].preferences.weeklyUpdate).toEqual({ on: true, hour: 16, weekday: 5 });
    expect(await hear('Stop my daily briefing')).toBe('I have stopped your daily briefing. You can still ask me for your day whenever you like.');
    expect(w.t.principalSetup.rows[0].preferences.dailyBriefing).toEqual({ on: false });
    await w.withAmina();
    expect(await hear('Send me my day every morning', { speaker: amina })).toBe('Only Fatima can set up a regular briefing. I have not changed anything.');
    expect(aStandingNote('day', true, null, null)).toContain('at 7 in the morning');
  });

  it('on schedule: sent once, only when there is something in it, never in her quiet hours or when she asked for quiet', async () => {
    const { w } = await aWorld();
    w.t.principalSetup.rows[0].preferences = { ...w.t.principalSetup.rows[0].preferences, dailyBriefing: { on: true, hour: 7 } };
    expect(await w.work.sendWhatIsDue(at(3))).toBe(0);
    expect(await w.work.sendWhatIsDue(at(8, 10))).toBe(1);
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0]).toMatchObject({ via: 'whatsapp', to: '+2348012345678' });
    expect(w.sent[0].text.startsWith('Here is your day, Fatima.')).toBe(true);
    /* once a day */
    expect(await w.work.sendWhatIsDue(at(9, 10))).toBe(0);
    /* she asked for quiet */
    w.t.principalSetup.rows[0].preferences.paused = true;
    expect(await w.work.sendWhatIsDue(at(8, 11))).toBe(0);
    expect(w.sent).toHaveLength(1);
  });

  it('with nothing in it, nothing is sent', async () => {
    const w = aWorldForPrincipalWork(NOW);
    for (const t of ['groundCommitment', 'groundDependency', 'todo']) w.t[t].rows.length = 0;
    w.t.principalSetup.rows[0].preferences = { ...w.t.principalSetup.rows[0].preferences, dailyBriefing: { on: true, hour: 7 }, weeklyUpdate: { on: true, hour: 7, weekday: 2 } };
    expect(await w.work.sendWhatIsDue(at(8, 10))).toBe(0);
    expect(w.sent).toEqual([]);
  });

  it('the weekly one goes by email in full, with the short one on WhatsApp, on her day', async () => {
    const { w } = await aWorld();
    w.t.principalSetup.rows[0].preferences = { ...w.t.principalSetup.rows[0].preferences, weeklyUpdate: { on: true, hour: 7, weekday: 2 } };
    /* 10 November 2026 is a Tuesday */
    expect(await w.work.sendWhatIsDue(at(8, 10))).toBe(1);
    expect(w.sent.map((m) => [m.via, m.subject ?? null]).sort()).toEqual([['ask', "The week's update, 10 November 2026"], ['whatsapp', null]]);
  });
});
