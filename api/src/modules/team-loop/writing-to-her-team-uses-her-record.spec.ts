import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { runTheStandingInstructions } from './standing-instructions';
import { THE_ASK_FOR_AN_UPDATE } from './the-team-words';
import { theirWorkNow } from './what-their-reply-says';

/**
 * BATCH D, R5, IN THE RUN'S OWN WORDS (the Dangote stress test of 20 November 2026). "Write to my team now and ask each of them for their 2026 recap ..."
 * was answered "Who should be in it, and how do I reach each of them?", although her people were on record; "No, not Thursday. I need it today." got
 * nothing; and replies asked people for documents already on record. Now the people on her record are the team, she is told who will be written to,
 * how, and about what from their own part of the record, it goes only on her yes, the same day when she says today, and nobody is asked for what the
 * record already holds. Every text a person reads is printed.
 */
const at = (day: number, hhmm: string) => new Date(`2026-11-${String(day).padStart(2, '0')}T${hhmm}:00Z`);
const WRITE_TO_MY_TEAM = 'Write to my team now and ask each of them for their 2026 recap, outstanding matters, corrections and supporting documents. Do it today, not Thursday.';
const MATTER = 'their 2026 recap, outstanding matters, corrections and supporting documents';

describe('"Write to my team now ..." uses the people on her record', () => {
  it('says back who will be written to, how, and about what is open with each, and writes to nobody before her yes', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'handle_with_team', matter: MATTER, today: true } }), now: at(20, '10:20') });
    const ibrahim = x.person('ibrahim@example.com');
    await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: ibrahim.externalId, source: 'team_reply', text: 'Send the Ministry of Industry approval letter', dueSaid: 'tomorrow', state: 'OPEN' } });
    const back = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: WRITE_TO_MY_TEAM });
    console.log(`WHAT FATIMA READS\n${back}`);
    expect(back).toBe(`Fatima, I will write to 2 people on your record today, and ask each of them about ${MATTER}. I will write to Ibrahim Sule on WhatsApp and ask about “Send the Ministry of Industry approval letter”, which is still open. I will write to Amina Yusuf by email, and ask what they have done and what is still open. Nobody is asked for a document I already have. I will tell you as soon as they have answered, and this evening with whatever I have and who has not answered. Shall I go ahead?`);
    expect(back).not.toMatch(/Who should be in it|how do I reach/);
    expect(x.w.sent).toHaveLength(0);

    expect(await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Yes.' })).toBe('Done. I will do it as I said, and I will tell you if anything stops me.');
    const sweep = (when: Date) => runTheStandingInstructions(x.prisma, (x.service as any).ports(), when);
    expect((await sweep(at(20, '10:21'))).join()).toMatch(/asked 2/);
    const toIbrahim = x.w.sent.find((m) => m.to === '+2348035550101' || /Ibrahim/.test(m.text))!;
    console.log(`WHAT IBRAHIM READS\n${toIbrahim.text}`);
    expect(toIbrahim.text).toMatch(/^Hello Ibrahim, Fatima asked me to collect the team's updates on their 2026 recap, outstanding matters, corrections and supporting documents today\. The record shows “Send the Ministry of Industry approval letter”, which you said for tomorrow, is still open with you\. Please tell me where it stands\./);
    /* Asked for today: she hears the same evening, at five in the office's own time, whoever has answered. */
    expect(await sweep(at(20, '15:00'))).toEqual([]);
    expect((await sweep(at(20, '16:30'))).join()).toMatch(/told her/);
  });

  it('"No, not Thursday. I need it today." changes the instruction waiting, and is said back again for today (D18)', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'collect_and_report', reportWeekday: 5, matter: 'what we actually achieved, not just meetings' } }), now: at(20, '07:50') });
    const first = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Please don\'t make me chase everyone. And check the payments. I need to know what we actually achieved, not just meetings. Email me Friday.' });
    console.log(`WHAT FATIMA READS\n${first}`);
    expect(first).toMatch(/on Thursday morning, and email you what they send on Friday morning\. Shall I go ahead\?$/);
    (x.service as any).mind = aScriptedMind({ instruction: { kind: 'handle_with_team', matter: 'what we actually achieved, not just meetings', today: true } });
    const again = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'No, not Thursday. I need it today.' });
    console.log(`WHAT FATIMA READS\n${again}`);
    expect(again).toMatch(/^Fatima, I will write to 2 people on your record today, and ask each of them about what we actually achieved, not just meetings\./);
    const jobs = x.t.persistentJob.rows.filter((j: any) => j.kind.startsWith('standing:'));
    expect(jobs.map((j: any) => j.state)).toEqual(['stopped', 'proposed']);
    expect(jobs[1].details).toMatchObject({ kind: 'handle_with_team', today: true, dueOn: '2026-11-20' });
  });

  it('with no day said, it is asked now, never put off to a Friday she did not name (D18)', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'collect_and_report', reportWeekday: null } }), now: at(20, '07:50') });
    const back = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: "Please don't make me chase everyone. Get the team's updates." });
    console.log(`WHAT FATIMA READS\n${back}`);
    expect(back).not.toMatch(/Thursday|Friday/);
    expect(back).toMatch(/I will write to 2 people on your record now/);
  });

  it('only she can give one, and she is named by her own name', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'handle_with_team', matter: MATTER, today: true } }), now: at(20, '10:20') });
    const { grantADelegate } = await import('../outstanding/a-delegate-acts-for-a-principal');
    await grantADelegate(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    expect(await x.service.hearHer({ organizationId: 'org-1', userId: 'u-amina', message: WRITE_TO_MY_TEAM })).toBe('Only Fatima can give me an instruction like that.');
  });
});

describe('nobody is asked for a document the record already holds (D13)', () => {
  it('what they sent, and what a document already proves, is given to whatever writes to them and said in the ask', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind(), now: at(20, '10:20') });
    const amina = x.contact('Amina Yusuf');
    x.t.principalMaterial.rows.push({ id: 'pm-kogi', principalUserId: 'u-fatima', fromUserId: `contact:${amina.id}`, fileName: 'Kogi permit letter.pdf', receivedAt: new Date('2026-05-25T09:00:00Z') });
    const person = x.person('amina@example.com');
    await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: person.externalId, source: 'team_reply', text: 'Get the Kogi permit granted', state: 'KEPT', provenBy: 'material:pm-kogi', resolvedAt: new Date('2026-05-25T09:00:00Z') } });
    const { work } = await theirWorkNow(x.prisma, amina);
    expect(work.alreadyHeld).toEqual(['the file “Kogi permit letter.pdf”, sent on 25 May', 'the proof that “Get the Kogi permit granted” is done, from 25 May']);
    const ask = THE_ASK_FOR_AN_UPDATE('Amina', 'Fatima', null, { open: [], held: work.alreadyHeld!, today: true });
    console.log(`WHAT AMINA READS\n${ask}`);
    expect(ask).toBe("Hello Amina, Fatima asked me to collect the team's updates today. Please send me where things stand on your work. I already have the file “Kogi permit letter.pdf”, sent on 25 May and the proof that “Get the Kogi permit granted” is done, from 25 May, so there is no need to send them again. Send a document only for something I do not have yet. You can write it here, forward it, or send a voice note.");
  });
});
