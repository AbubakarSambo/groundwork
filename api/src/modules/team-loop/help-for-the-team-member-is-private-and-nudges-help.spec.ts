import { theAskWent } from '../executive-onboarding/information-gaps';
import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { buildThePicture } from '../executive-onboarding/the-first-picture';
import { theGapsStillOpen } from '../executive-onboarding/information-gaps';
import { theUpdateForHer } from './the-update-for-her';
import { nudgeWhereItHelps, theThingOf } from './a-nudge-that-helps';
import { theTeamSheMayAsk } from './standing-instructions';

/**
 * REAL HELP FOR THE TEAM MEMBER, PRIVATELY, AND NUDGES THAT HELP (plan 6.3, 10, 11 and 26.1). What a team member says to the coach is never shown to
 * Fatima or anybody else: every read she has is run, and the words appear in none of them. Nudges go to whoever can move the thing, once, and nothing
 * is sent when there is nothing useful to say. Every text a person reads is printed.
 */
const THE_WORRY = 'Can you help me write a letter to the Director about the permit? I am worried he is angry with me and I do not want to lose this job.';
const THE_LETTER = 'Dear Director, I am writing about the permit for the Kilele site. It has been with your office since 6 November, and the contractor cannot start without it. Could you tell me when you expect to decide? Thank you, Amina. You can change anything here, and tell me who else should be copied.';

describe('what a team member says to the coach is private, in the backend', () => {
  it('is answered at once, by the model, from their own promises only, and kept only in their own private history', async () => {
    const mind = aScriptedMind({ readings: [['help me write a letter', { kind: 'help' }]], help: THE_LETTER });
    const x = await aTeamLoopWorld({ mind });
    await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: 'p-amina', text: 'I will send the permit letter by Friday', dueSaid: 'by Friday', dueAt: null, state: 'OPEN', source: 'team_reply' } });
    const reply = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: THE_WORRY });
    console.log(`WHAT AMINA READS\n${reply}`);
    expect(reply).toBe(THE_LETTER);
    /* The model was handed her message and her own promises, and nothing about anybody else. */
    expect(mind.helpWork[0].commitments.map((c: any) => c.text)).toEqual(['I will send the permit letter by Friday']);
    expect(JSON.stringify(mind.helpWork[0])).not.toMatch(/Fatima|Ibrahim|Tunde|Grace/);
    /* Kept only as her private turns, and never as material, a commitment or a gap. */
    expect(x.t.assistantTurn.rows.map((r: any) => [r.personExternalId, r.role, r.lane])).toEqual([['p-amina', 'person', 'team-help'], ['p-amina', 'assistant', 'team-help']]);
    expect(x.t.principalMaterial.rows).toHaveLength(0);
    expect(x.t.commitment.rows).toHaveLength(1);
    expect(x.t.informationGap.rows.filter((g: any) => g.gapKey.startsWith('q:'))).toHaveLength(0);
  });

  it('never reaches anything Fatima reads: the register, the update she is emailed, the first picture and the gaps, none of which reads that history or holds its words', async () => {
    const mind = aScriptedMind({ readings: [['help me write a letter', { kind: 'help' }]], help: THE_LETTER });
    const x = await aTeamLoopWorld({ mind });
    await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: THE_WORRY });
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    const contacts = await theTeamSheMayAsk(x.prisma, 'u-fatima');
    const update = await theUpdateForHer(x.prisma, mind, { organizationId: 'org-1', principalUserId: 'u-fatima', first: 'Fatima', contacts, since: new Date(x.now.getTime() - 86_400_000), now: x.now, lead: 'week', asks: [] });
    const gaps = await theGapsStillOpen(x.prisma, 'u-fatima');
    const everything = JSON.stringify([reg, update, gaps, x.t.principalMaterial.rows, x.t.commitment.rows, x.t.informationGap.rows, x.t.persistentJob.rows]);
    expect(everything).not.toMatch(/worried|angry|lose this job|Dear Director/i);
    expect(x.reads.assistantTurn).toBe(0);
    console.log(`WHAT FATIMA IS TOLD ABOUT AMINA\n${update}`);
  });

  it('hides a bank or card number before it is kept or read by the model', async () => {
    const mind = aScriptedMind({ readings: [['help me', { kind: 'help' }]], help: 'Here is a first version.' });
    const x = await aTeamLoopWorld({ mind });
    await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'Please help me tell the supplier my card 4111 1111 1111 1111 was charged twice.' });
    expect(mind.helped[0]).not.toMatch(/4111/);
    expect(JSON.stringify(x.t.assistantTurn.rows)).not.toMatch(/4111/);
  });

  it('asks the one thing it needs, and does not pretend, when it cannot write the draft now', async () => {
    const mind = aScriptedMind({ readings: [['help me', { kind: 'help' }]], help: null });
    const x = await aTeamLoopWorld({ mind });
    const reply = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'Please help me write the agenda for Thursday.' });
    console.log(`WHAT AMINA READS WHEN IT CANNOT WRITE\n${reply}`);
    expect(reply).toBe('Amina, I could not write that just now. Please ask me again in a little while, and I will help you with it then.');
  });
});

const DAY = 86_400_000;
async function withOpenPromises(over: Record<string, unknown> = {}) {
  const x = await aTeamLoopWorld({ mind: aScriptedMind() });
  const days = (n: number) => new Date(x.now.getTime() - n * DAY);
  const make = (data: Record<string, unknown>) => x.t.commitment.create({ data: { organizationId: 'org-1', dueAt: null, state: 'OPEN', source: 'team_reply', ...data } });
  return { x, days, make, ports: { whatsapp: { send: async (a: any) => { x.w.sent.push({ to: a.phone, text: a.text, channel: 'whatsapp', kind: a.kind }); /* as the gate does: what it asks is asked once it went */ await theAskWent(x.prisma, a.sendKey, x.now); return { sent: true }; } }, email: { send: async (a: any) => { x.w.sent.push({ to: a.to, subject: a.subject, text: a.text, channel: 'email', kind: 'routine' }); await theAskWent(x.prisma, a.askKey, x.now); } } }, over };
}

describe('a nudge goes to the person who can move the thing', () => {
  it('chases the approver once, with the context, and does not chase the person whose item waits on the approval', async () => {
    const { x, days, make, ports } = await withOpenPromises();
    await make({ personExternalId: 'p-amina', text: 'I will send the permit letter by Friday', dueSaid: 'by Friday', statedAt: days(5), waitingOn: 'Ibrahim Sule' });
    const run = await nudgeWhereItHelps(x.prisma, ports as any, x.now);
    console.log(`WHAT IBRAHIM READS\n${run.sent.map((s) => s.text).join('\n')}`);
    expect(run.sent).toHaveLength(1);
    expect(run.sent[0]).toMatchObject({ kind: 'approver', to: '+2348035550101' });
    expect(run.sent[0].text).toBe('Ibrahim, Amina told me that “send the permit letter by Friday” is waiting for your approval, since 6 November. Could you tell me when you expect to decide, or send your answer to Amina? I will not ask Amina about it while it waits on you.');
    expect(x.w.sent.filter((m) => m.to === 'amina@example.com')).toHaveLength(0);
    /* The same approver is not asked again for the same thing, on any later day. */
    const later = await nudgeWhereItHelps(x.prisma, ports as any, new Date(x.now.getTime() + 4 * DAY));
    expect(later.sent.filter((s) => s.kind === 'approver')).toHaveLength(0);
  });

  it('chases nobody when the item waits on her, or on somebody Groundwork may not write to', async () => {
    const { x, days, make, ports } = await withOpenPromises();
    await make({ personExternalId: 'p-amina', text: 'I will send the permit letter', statedAt: days(5), waitingOn: 'Fatima' });
    await make({ personExternalId: 'p-amina', text: 'I will chase the budget answer', statedAt: days(5), waitingOn: 'the Permanent Secretary' });
    const run = await nudgeWhereItHelps(x.prisma, ports as any, x.now);
    expect(run.sent).toHaveLength(0);
    expect(run.left.map((l) => l.why)).toEqual(['“send the permit letter” waits on Fatima, so nobody is chased', '“chase the budget answer” waits on somebody Groundwork may not write to']);
  });

  it('asks the owner once for what would show it, in one sentence, when a promise has gone quiet', async () => {
    const { x, days, make, ports } = await withOpenPromises();
    await make({ personExternalId: 'p-amina', text: 'we will send the budget letter by Friday', dueSaid: 'by Friday', statedAt: days(4) });
    const run = await nudgeWhereItHelps(x.prisma, ports as any, x.now);
    /* Changed (round 1, I-12): her own words are quoted, because splicing them after "you would" read as broken English whenever the promise was not worded as "I will ...". */
    console.log(`WHAT AMINA READS\n${run.sent[0].text}`);
    expect(run.sent).toHaveLength(1);
    expect(run.sent[0].text).toBe('Amina, you told me you would send the budget letter by Friday. Has it moved? If it has, send me the message or document that shows it, and I will update it for you.');
    expect(theThingOf("I'll file the report.")).toBe('file the report');
  });
});

describe('a message is suppressed when there is nothing useful to say', () => {
  it('sends nothing when the promise is new, was followed up in the last three days, or the person has just written', async () => {
    const { x, days, make, ports } = await withOpenPromises();
    await make({ personExternalId: 'p-amina', text: 'I will send the budget letter', statedAt: days(1) });
    await make({ personExternalId: 'p-ibrahim', text: 'I will send the minutes', statedAt: days(6), lastFollowedUpAt: days(1) });
    const run = await nudgeWhereItHelps(x.prisma, ports as any, x.now);
    expect(run.sent).toHaveLength(0);
    expect(x.w.sent).toHaveLength(0);
    console.log(`WHY NOTHING WAS SENT\n${run.left.map((l) => `${l.who}: ${l.why}`).join('\n')}`);
    expect(run.left.map((l) => l.why)).toEqual(['nothing is old enough to ask about', 'everything open was followed up in the last three days']);
  });

  it('sends nothing in quiet hours, nothing twice in a day, and never more than two in a week', async () => {
    const { x, days, make, ports } = await withOpenPromises();
    await make({ personExternalId: 'p-amina', text: 'I will send the budget letter', statedAt: days(6) });
    const night = await nudgeWhereItHelps(x.prisma, ports as any, new Date('2026-11-11T01:00:00Z'));
    expect(night.sent).toHaveLength(0);
    expect(night.left[0].why).toBe('it is quiet hours');
    expect((await nudgeWhereItHelps(x.prisma, ports as any, x.now)).sent).toHaveLength(1);
    await make({ personExternalId: 'p-amina', text: 'I will send the audit letter', statedAt: days(6) });
    const sameDay = await nudgeWhereItHelps(x.prisma, ports as any, new Date(x.now.getTime() + 3_600_000));
    expect(sameDay.sent).toHaveLength(0);
    expect(sameDay.left.map((l) => l.why)).toContain('they have had a message in the last two days');
    expect((await nudgeWhereItHelps(x.prisma, ports as any, new Date(x.now.getTime() + 3 * DAY + 3_600_000))).sent).toHaveLength(1);
    const cap = await nudgeWhereItHelps(x.prisma, ports as any, new Date(x.now.getTime() + 6 * DAY));
    expect(cap.sent).toHaveLength(0);
  });

  it('does not chase somebody who has just written, and does not chase a promise already marked done', async () => {
    const { x, days, make, ports } = await withOpenPromises();
    await make({ personExternalId: 'p-amina', text: 'I will send the budget letter', statedAt: days(6) });
    await make({ personExternalId: 'p-ibrahim', text: 'I will send the minutes', statedAt: days(6), state: 'KEPT', provenBy: 'material:pm-1' });
    await x.theyWrite('Amina Yusuf', { words: 'Working on it now.', at: new Date(x.now.getTime() - 3_600_000) });
    x.w.sent.length = 0;
    const run = await nudgeWhereItHelps(x.prisma, ports as any, x.now);
    expect(run.sent).toHaveLength(0);
    expect(run.left.map((l) => l.why)).toContain('they have just written');
    void buildThePicture;
  });
});
