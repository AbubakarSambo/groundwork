import { ExecutiveOnboardingService } from './executive-onboarding.service';
import { addAnExecutive } from './onboard-an-executive';
import { hearHer } from './her-words';
import { whoIsMeant } from './an-assistant-for-several-principals';
import { closeWhatTheyAnswered } from './information-gaps';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { aWorldForOnboarding, addFatima, ORG } from './a-world-for-onboarding';

/**
 * FATIMA ROUND 2, E2: AN ASSISTANT WHO ACTS FOR SEVERAL SENIOR PEOPLE. Amina acts for Fatima and for Zainab. What she writes or forwards without saying
 * which of them it is for used to fall through (nothing kept, nobody asked). Now she is asked ONE question, it is held, nothing is kept for anybody until she
 * names one, and then it is carried on as that person's. Everything Amina reads is printed.
 */
const b = (s: string) => Buffer.from(s, 'utf8');

async function aWorldWithTwo() {
  const w = aWorldForOnboarding();
  const svc = new ExecutiveOnboardingService(w.prisma as any, { sendTheIntroduction: async () => 'sent', sendTheAssistantsReply: async () => 'sent' } as any, { sendFor: async () => ({ sent: false }) } as any, { readForMaterial: async (f: any) => ({ text: f.buffer.toString('utf8') }) } as any, {} as any, w.intake.transcriber as any);
  await addAnExecutive(w.prisma, w.ports, addFatima(w));
  await addAnExecutive(w.prisma, w.ports, addFatima(w, { firstName: 'Zainab', lastName: 'Musa', email: 'zainab@example.com', whatsappNumber: '+2348033334444' }));
  const principals: string[] = w.t.principalSetup.rows.map((r: any) => r.principalUserId);
  for (const id of principals) await grantADelegate(w.prisma, { organizationId: ORG, principalUserId: id, delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
  w.sent.length = 0;
  const forward = (over: Record<string, unknown> = {}) => svc.receiveForward({ organizationId: ORG, userId: 'u-amina', hasOpenCheckIn: async () => false, fromAddress: 'amina@example.com', providerId: `p-${Math.random()}`, subject: 'Fwd: ministry letter', body: null, receivedAt: new Date(), loadFiles: async () => [], ...over } as any);
  const says = (message: string) => hearHer(w.prisma, w.ports, { organizationId: ORG, userId: 'u-amina', message, now: w.now });
  return { w, svc, forward, says, principals };
}

describe('somebody who acts for two senior people is asked which one, and what she sent is held', () => {
  it('an instruction that names neither is held, one question is asked, and nothing is done for anybody', async () => {
    const { w, says } = await aWorldWithTwo();
    const q = await says('Tell the team to send me their updates by Friday.');
    expect(q).toBe('Amina, who is this for, Fatima Wali Abdulrahman or Zainab Musa? I am holding what you sent, and I have not kept it for anybody or done anything with it yet.');
    expect(w.t.informationGap.rows.filter((g: any) => /^which:/.test(g.gapKey)).map((g: any) => [g.principalUserId, g.state, g.what])).toEqual([['u-amina', 'asked', 'Tell the team to send me their updates by Friday.']]);
    expect(w.t.persistentJob.rows.filter((j: any) => String(j.kind).startsWith('standing'))).toHaveLength(0);
    expect(w.t.principalMaterial.rows).toHaveLength(0);
    expect(w.sent).toHaveLength(0);
    console.log(`WHAT AMINA READS\n${q}`);
  });

  it('words that do not name one are asked again, once more, and the item is still held; naming one carries the held words on as that person\'s', async () => {
    const { w, says } = await aWorldWithTwo();
    await says('Collect the team updates every Friday and send them to her.');
    const again = await says('The one from the Abuja office.');
    expect(again).toBe('I still cannot tell who it is for, and I am still holding it. Is it for Fatima Wali Abdulrahman or Zainab Musa? Please give me one name.');
    const named = await says('Zainab');
    expect(named!.startsWith('Thank you. I have taken what you sent for Zainab.')).toBe(true);
    const gap = w.t.informationGap.rows.find((g: any) => /^which:/.test(g.gapKey));
    expect(gap.state).toBe('answered');
    /* it was carried on as Zainab's, and nothing was made for Fatima */
    const fatima = w.t.principalSetup.rows[0].principalUserId;
    expect(w.t.persistentJob.rows.filter((j: any) => String(j.kind).startsWith('standing') && j.principalUserId === fatima)).toHaveLength(0);
    console.log(`WHAT AMINA READS WHEN SHE NAMES ONE\n${named}`);
  });

  it('a name inside the words settles it at once, with no question and no hold', async () => {
    const { w, says } = await aWorldWithTwo();
    const r = await says('For Zainab: stop my morning summary.');
    expect(r ?? '').not.toContain('who is this for');
    expect(w.t.informationGap.rows.filter((g: any) => /^which:/.test(g.gapKey))).toHaveLength(0);
  });

  it('a forward with files that does not say who it is for is not kept for anybody, and she is asked to send it again with a name', async () => {
    const { w, forward } = await aWorldWithTwo();
    const r = await forward({ loadFiles: async () => [{ fileName: 'Ministry.txt', mimeType: 'text/plain', bytes: b('Dear Minister') }] });
    expect(r).toEqual({ became: 'her words', reply: 'Amina, who are these for, Fatima Wali Abdulrahman or Zainab Musa? I have not kept them for anybody. Please send them again with the name in your message, and I will keep them for that person.' });
    expect(w.t.principalMaterial.rows).toHaveLength(0);
    expect(w.t.intakeBatch.rows).toHaveLength(0);
    console.log(`WHAT AMINA READS FOR A FORWARD WITH FILES\n${r!.reply}`);
  });

  it('a forward that names one in its subject is kept for that person only', async () => {
    const { w, forward } = await aWorldWithTwo();
    const r = await forward({ subject: 'Fwd: ministry letter for Zainab Musa', loadFiles: async () => [{ fileName: 'Ministry.txt', mimeType: 'text/plain', bytes: b('Dear Minister') }] });
    expect(r).toEqual({ became: 'kept for her', reply: null });
    const zainab = w.t.principalSetup.rows.find((s: any) => s.principalUserId !== w.t.principalSetup.rows[0].principalUserId).principalUserId;
    expect(w.t.principalMaterial.rows.length).toBeGreaterThan(0);
    expect(w.t.principalMaterial.rows.every((m: any) => m.principalUserId === zainab)).toBe(true);
  });

  it('sending something else does not close the held item, and a person who acts for one is never asked', async () => {
    const { w, says, forward } = await aWorldWithTwo();
    await says('Please chase the Kano letter.');
    await closeWhatTheyAnswered(w.prisma, { organizationId: ORG, email: 'amina@example.com', now: new Date(Date.now() + 1000) });
    expect(w.t.informationGap.rows.find((g: any) => /^which:/.test(g.gapKey)).state).toBe('asked');
    /* Tunde is not somebody's assistant here, and a stranger is nobody's. */
    expect(await hearHer(w.prisma, w.ports, { organizationId: ORG, userId: 'u-tunde', message: 'Please chase the Kano letter.', now: w.now })).toBeNull();
    expect(await forward({ fromAddress: 'stranger@evil.example' })).toBeDefined();
  });

  it('who is meant is a name she wrote, exactly one person\'s: two names or none mean nobody is meant', () => {
    const people = [{ principalUserId: 'a', first: 'Fatima', full: 'Fatima Wali' }, { principalUserId: 'b', first: 'Zainab', full: 'Zainab Musa' }, { principalUserId: 'c', first: 'Fatima', full: 'Fatima Bello' }];
    expect(whoIsMeant('send it to Zainab', people)?.principalUserId).toBe('b');
    expect(whoIsMeant('this is for Fatima', people)).toBeNull();
    expect(whoIsMeant('this is for Fatima Bello', people)?.principalUserId).toBe('c');
    expect(whoIsMeant('Fatima Wali should send it to Zainab', people)).toBeNull();
    /* A possessive names the person (Fatima round 3: "Give me Amara's day" was asked about again). */
    expect(whoIsMeant("Zainab's day", people)?.principalUserId).toBe('b');
    expect(whoIsMeant('the Kano thing', people)).toBeNull();
  });
});
