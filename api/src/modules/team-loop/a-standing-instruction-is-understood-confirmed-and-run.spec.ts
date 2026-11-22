import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { runTheStandingInstructions } from './standing-instructions';
import { TeamLoopService } from './team-loop.service';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';

/**
 * STANDING INSTRUCTIONS BY PLAIN WORDS (plan 11, 19 and 31). "Get everyone's updates and email me Friday." is recognised by the model, repeated back in
 * one sentence with who will be asked and when, acted on only on her yes, and then run on the job machinery from increment 3: restart-safe, the Friday
 * email to her sent once. The clock is the test's own, so days pass in a moment. Every text a person reads is printed.
 */
const at = (day: number, hhmm: string) => new Date(`2026-11-${String(day).padStart(2, '0')}T${hhmm}:00Z`);
const COLLECT = { kind: 'collect_and_report' as const, reportWeekday: 5 };

async function fatimaGivesIt(words = "Get everyone's updates and email me Friday.") {
  const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: COLLECT }), now: at(11, '10:00') });
  const back = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: words });
  return { x, back };
}

describe('a standing instruction is understood and repeated back before anything happens', () => {
  it('says in one sentence who will be asked and when, and asks nobody until she says yes', async () => {
    const { x, back } = await fatimaGivesIt();
    console.log(`WHAT FATIMA READS\n${back}`);
    expect(back).toBe('Fatima, I understand. I will ask Amina and Ibrahim for their updates on Thursday morning, and email you what they send on Friday morning. Shall I go ahead?');
    expect(x.w.sent).toHaveLength(0);
    expect(x.t.persistentJob.rows.filter((j: any) => j.kind.startsWith('standing:')).map((j: any) => j.state)).toEqual(['proposed']);
  });

  it('does nothing on a no, and nothing for anybody but her', async () => {
    const { x } = await fatimaGivesIt();
    expect(await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'No' })).toBe('All right. I have not asked anybody anything.');
    expect(x.t.persistentJob.rows.find((j: any) => j.kind.startsWith('standing:')).state).toBe('stopped');
    const swept = await runTheStandingInstructions(x.prisma, (x.service as any).ports(), at(12, '09:30'));
    expect(swept).toEqual([]);
    expect(x.w.sent).toHaveLength(0);
  });

  it('is not read as an instruction when it is only a question, and nothing is made', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: null }), now: at(11, '10:00') });
    expect(await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'What did the team say about the permit this week?' })).toBeNull();
    expect(x.t.persistentJob.rows.filter((j: any) => j.kind.startsWith('standing:'))).toHaveLength(0);
  });

  /* Release test 21 November, 81: "What can the team close this week" was read as an instruction and answered "nobody in your team has told me they are happy to hear from me yet". */
  it('a question asked of her register is not an instruction, even when the model would read it as one', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'handle_with_team', matter: 'what the team can close this week' } }), now: at(11, '10:00') });
    expect(await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'What can the team close this week' })).toBeNull();
    expect(x.t.persistentJob.rows.filter((j: any) => j.kind.startsWith('standing:'))).toHaveLength(0);
  });

  it('with nobody to write to, she is told what is true of her record: nobody given, or nobody introduced yet', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'handle_with_team', matter: 'their recap' } }), now: at(11, '10:00') });
    const words = 'Write to my team now and ask each of them for their recap';
    for (const c of x.t.outreachContact.rows) c.state = 'proposed';
    const notYet = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: words });
    x.t.outreachContact.rows.length = 0;
    const nobody = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: words });
    console.log(`FATIMA READS\n${notYet}\n${nobody}`);
    expect(notYet).toBe('Fatima, I would do that, but I have not been able to introduce myself to anybody in your team yet, so there is nobody I can write to. I will tell you as soon as I can.');
    expect(nobody).toBe('Fatima, I would do that, but you have not given me anybody in your team to write to yet. Send me their names with a phone number or an email address, and I will introduce myself to them first.');
    expect(`${notYet} ${nobody}`).not.toMatch(/happy to hear from me/);
  });

  it('reads it with no model at all, plainly, and still repeats it back', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind(), now: at(11, '10:00') });
    (x.service as any).mind = { ...aScriptedMind(), readAnInstruction: async () => null };
    const back = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: "Get everyone's updates and email me Friday." });
    expect(back).toBe('Fatima, I understand. I will ask Amina and Ibrahim for their updates on Thursday morning, and email you what they send on Friday morning. Shall I go ahead?');
  });
});

describe('a standing instruction is run on the clock, once, and survives a restart', () => {
  it('asks the team the morning before, and emails her on her day, from what they sent, with where each line came from', async () => {
    const { x } = await fatimaGivesIt();
    expect(await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Yes' })).toBe('Done. I will do it as I said, and I will tell you if anything stops me.');
    const sweep = (when: Date, service: TeamLoopService = x.service) => runTheStandingInstructions(x.prisma, (service as any).ports(), when);
    /* The introductions went a week ago, so Thursday's ask is the first they hear for an update (a person asked in the last three days is not asked again: has-this-person-been-asked.ts). */
    for (const r of x.t.introductionDelivery.rows) { r.createdAt = at(1, '10:00'); r.lastTriedAt = at(1, '10:00'); }

    /* Wednesday: nothing yet. */
    expect(await sweep(at(11, '10:30'))).toEqual([]);
    expect(x.w.sent).toHaveLength(0);

    /* Thursday morning: both are asked, each by the channel they have, once. */
    expect((await sweep(at(12, '08:30'))).join()).toMatch(/asked 2 for 2026-11-13/);
    expect(await sweep(at(12, '08:35'))).toEqual([]);
    const asks = x.w.sent.map((m) => [m.to, m.channel, m.kind]);
    /* Changed 21 November 2026 (Batch E, N1): Ibrahim has not written on WhatsApp in the last 24 hours, and the ask has no approved template, so it goes by email, as she was told. (This fake accepted any WhatsApp; the real gate refuses it, which is how 55 people told "WhatsApp" got an email in the Dangote rerun.) */
    expect(asks).toEqual([['amina@example.com', 'email', 'routine'], ['ibrahim@example.com', 'email', 'routine']]);
    console.log(`WHAT IBRAHIM READS ON THURSDAY\n${x.w.sent[1].text}\n\nWHAT AMINA READS ON THURSDAY\n${x.w.sent[0].text}`);
    expect(x.w.sent[1].text).toBe("Hello Ibrahim, Fatima asked me to collect the team's updates. Please send me where things stand on your work, and any document that shows it. You can write it here, forward it, or send a voice note.");

    /* Amina answers on Thursday afternoon; Ibrahim says nothing. */
    const mind = aScriptedMind({ readings: [['permit letter', { kind: 'update', commitments: [{ text: 'I will send the permit letter on Monday', whenSaid: 'on Monday' }] }]] });
    (x.service as any).mind = mind;
    await x.theyWrite('Amina Yusuf', { words: 'I will send the permit letter on Monday.', at: at(12, '14:00') });

    /* Friday before eight: not yet. After eight, and six hours after the ask: the one email. */
    expect(await sweep(at(13, '06:30'))).toEqual([]);
    const sentBefore = x.w.sent.length;
    expect((await sweep(at(13, '07:30'))).join()).toMatch(/emailed her for 2026-11-13/);
    const mail = x.w.sent.slice(sentBefore);
    expect(mail).toHaveLength(1);
    expect(mail[0]).toMatchObject({ to: 'fatimawale@example.com', subject: 'What your team has told me' });
    console.log(`THE EMAIL FATIMA READS ON FRIDAY\n${mail[0].text}`);
    expect(mail[0].text).toBe([
      'Fatima, here is what your team has told me since I asked on 12 November for 13 November.',
      'Amina said they will send the permit letter on Monday, in a message on 12 November.',
      'I have had no new message from Ibrahim since I asked.',
      'Everything above comes from what they sent me.',
    ].join('\n\n'));

    /* Run again, and after a restart (a fresh service over the same record): nothing is sent twice. */
    expect(await sweep(at(13, '07:45'))).toEqual([]);
    const restarted = new TeamLoopService(x.prisma, (x.service as any).email, (x.service as any).whatsapp, aScriptedMind(), undefined, undefined);
    expect(await sweep(at(13, '09:00'), restarted)).toEqual([]);
    expect(x.w.sent.filter((m) => m.to === 'fatimawale@example.com' && m.subject === 'What your team has told me')).toHaveLength(1);
    expect(x.t.persistentJob.rows.find((j: any) => j.kind.startsWith('standing:')).details.lastReport).toBe('2026-11-13');

    /* The next cycle begins the next Thursday, on its own. */
    expect((await sweep(at(19, '08:30'))).join()).toMatch(/asked 2 for 2026-11-20/);
  });

  it('holds the email while she has asked for quiet, and sends it when she says carry on, saying which day it was for', async () => {
    const { x } = await fatimaGivesIt();
    await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Yes' });
    const sweep = (when: Date) => runTheStandingInstructions(x.prisma, (x.service as any).ports(), when);
    await sweep(at(12, '08:30'));
    await x.says('u-fatima', 'Stop');
    expect(await sweep(at(13, '08:30'))).toEqual([]);
    expect(x.w.sent.filter((m) => m.to === 'fatimawale@example.com' && m.subject === 'What your team has told me')).toHaveLength(0);
    await x.says('u-fatima', 'Carry on');
    expect((await sweep(at(14, '09:00'))).join()).toMatch(/emailed her for 2026-11-13/);
    expect(x.w.sent.find((m) => m.subject === 'What your team has told me')!.text).toMatch(/^Fatima, here is what your team has told me since I asked on 12 November for 13 November\./);
  });

  it('only she can give one or say yes: somebody who acts for her is told so, and nothing starts', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: COLLECT }), now: at(11, '10:00') });
    await grantADelegate(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    const refused = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-amina', message: "Get everyone's updates and email me Friday." });
    expect(refused).toBe('Only Fatima can give me an instruction like that.');
    expect(x.t.persistentJob.rows.filter((j: any) => j.kind.startsWith('standing:'))).toHaveLength(0);
    await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: "Get everyone's updates and email me Friday." });
    expect(await x.service.hearHer({ organizationId: 'org-1', userId: 'u-amina', message: 'Yes' })).toBe('Only Fatima can give me an instruction like that.');
    expect(x.t.persistentJob.rows.find((j: any) => j.kind.startsWith('standing:')).state).toBe('proposed');
  });
});

describe('"Handle this with the team and come back when ready"', () => {
  it('asks the team once, now, and comes back to her once when everybody has answered', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'handle_with_team', matter: 'the Kilele permit' } }), now: at(11, '10:00') });
    const back = await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Handle the Kilele permit with the team and come back when ready.' });
    console.log(`WHAT FATIMA READS\n${back}`);
    /* Batch D, R5: the say-back names each person on her record, how they are reached and what is open with them, instead of first names only. */
    /* Changed 21 November 2026 (Batch E, N1 and N2): the say-back names people by how they are reached, in one form whatever the number of people. */
    expect(back).toBe('Fatima, I will write to 2 people on your record now, and ask each of them about the Kilele permit. I will write to Amina Yusuf and Ibrahim Sule by email. Nobody is asked for a document I already have. I will tell you as soon as they have answered, or after three days with whatever I have and who has not answered. Shall I go ahead?');
    await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Yes' });
    const sweep = (when: Date) => runTheStandingInstructions(x.prisma, (x.service as any).ports(), when);
    expect((await sweep(at(11, '10:05'))).join()).toMatch(/asked 2/);
    expect(x.w.sent[0].text).toMatch(/^Hello Amina, Fatima asked me to collect the team's updates on the Kilele permit\./);
    (x.service as any).mind = aScriptedMind({ readings: [['permit', { kind: 'update', commitments: [{ text: 'I will bring the permit forms on Tuesday', whenSaid: 'on Tuesday' }] }]] });
    await x.theyWrite('Amina Yusuf', { words: 'I will bring the permit forms on Tuesday.', at: at(11, '12:00') });
    expect(await sweep(at(11, '13:00'))).toEqual([]);
    await x.theyWrite('Ibrahim Sule', { words: 'I will bring the permit forms on Wednesday.', at: at(11, '14:00') });
    (x.service as any).mind = aScriptedMind();
    expect((await sweep(at(11, '15:00'))).join()).toMatch(/told her/);
    const mail = x.w.sent.filter((m) => m.to === 'fatimawale@example.com');
    expect(mail).toHaveLength(1);
    expect(mail[0].subject).toBe('Where things stand on the Kilele permit');
    expect(mail[0].text).toMatch(/^Fatima, the team has answered about the Kilele permit\. Here is where things stand\./);
    console.log(`THE EMAIL FATIMA READS\n${mail[0].text}`);
    expect(await sweep(at(12, '15:00'))).toEqual([]);
    expect(x.t.persistentJob.rows.find((j: any) => j.kind.startsWith('standing:')).state).toBe('done');
  });

  it('comes back after three days with who has not answered, rather than waiting for ever', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: { kind: 'handle_with_team', matter: null } }), now: at(11, '10:00') });
    await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Handle this with the team and come back to me when ready.' });
    await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Yes' });
    const sweep = (when: Date) => runTheStandingInstructions(x.prisma, (x.service as any).ports(), when);
    await sweep(at(11, '10:05'));
    expect(await sweep(at(13, '10:00'))).toEqual([]);
    expect((await sweep(at(14, '10:06'))).join()).toMatch(/told her/);
    const mail = x.w.sent.find((m) => m.to === 'fatimawale@example.com')!;
    console.log(`THE EMAIL FATIMA READS AFTER THREE DAYS\n${mail.text}`);
    expect(mail.text).toMatch(/^Fatima, not everybody has answered yet, but here is where things stand\./);
    expect(mail.text).toMatch(/I have had no new message from Amina and Ibrahim since I asked/);
  });
});
