import { addAnExecutive } from './onboard-an-executive';
import { retryTheHeldIntroductions } from './the-introduction-delivery';
import { aWorldForOnboarding, addFatima, ADMIN, ORG } from './a-world-for-onboarding';
import { emailToThePrincipal, whatsAppToThePrincipal, whatsAppToATeamMember } from './the-introductions';
import { TEMPLATES, withinTheLimit } from '../whatsapp/a-message-outside-the-window';

/**
 * ACCEPTANCE TESTS 1 TO 3 (plan section 21): an admin adds Fatima without her registering; the WhatsApp introduction is sent, or held plainly when
 * Meta has not approved the opening message; the email introduction is sent with its reply routed to the right workspace. Every message a person
 * reads is printed below as the test saw it.
 */
const ADDRESS = 'assistant+dangote-abuja@myground.work';

describe('the WhatsApp scripts fit inside the opening template whole', () => {
  it('neither of them is cut by the template\'s limit, so what is delivered is the plan\'s words', () => {
    for (const text of [whatsAppToThePrincipal('Fatima', ADDRESS).text, whatsAppToATeamMember('Fatima', 'the Abuja office').text]) {
      const whole = text.replace(/\s+/g, ' ').trim();
      expect(withinTheLimit(TEMPLATES['first-contact'].body, ['Dangote Abuja Office', whole])[1]).toBe(whole);
    }
  });
});

describe('adding Fatima without her registering', () => {
  it('makes her identity, both jobs, her preferences and the approval from the admin\'s one act', async () => {
    const w = aWorldForOnboarding();
    const r = await addAnExecutive(w.prisma, w.ports, addFatima(w));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    /* identity: a sign-in record with no password, on the roster with her number, in her own organisation */
    expect(w.t.user.rows.find((u: any) => u.id === r.principalUserId)).toMatchObject({ email: 'fatimawale@example.com', organizationId: ORG, isEmailVerified: true });
    expect(w.t.user.rows.find((u: any) => u.id === r.principalUserId).passwordHash).toBeUndefined();
    expect(w.t.person.rows.find((p: any) => p.linkedUserId === r.principalUserId)).toMatchObject({ email: 'fatimawale@example.com', phone: '+2348031112222' });
    /* both jobs, from that moment */
    expect(w.t.persistentJob.rows.map((j: any) => j.kind).sort()).toEqual(['annual_report', 'outstanding_register']);
    expect(w.t.persistentJob.rows.map((j: any) => j.title)).toEqual(['2026 annual report and presentation', '2026 outstanding matters and 2027 carry-forward register']);
    /* preferences with sensible defaults, and the approval with who gave it and when */
    const setup = w.t.principalSetup.rows[0];
    expect(setup.preferences).toMatchObject({ channel: 'both', quietBeforeHour: 7, quietAfterHour: 20, followUps: 'ask_first', reviewBeforeSending: true, officeName: 'Abuja office' });
    expect(setup.permissions).toMatchObject({ dataHandling: true, teamOutreach: true, confidentialInformation: true, messaging: true, confirmedByUserId: ADMIN });
    expect(setup.verifiedVia).toBe('admin');
    /* her quiet hours live in the one place quiet hours live */
    expect(w.t.emailPreference.rows[0]).toMatchObject({ quietBeforeHour: 7, quietAfterHour: 20 });
    console.log(`WHAT THE ADMIN READS\n${r.said}`);
  });

  it('sends the email word for word with the reply routed to her workspace, and holds the WhatsApp message plainly when Meta has not approved the opening message', async () => {
    const w = aWorldForOnboarding();
    const r = await addAnExecutive(w.prisma, w.ports, addFatima(w));
    if (!r.ok) throw new Error(r.said);
    const mail = w.sent.find((m) => m.channel === 'email')!;
    expect(mail.to).toBe('fatimawale@example.com');
    expect(mail.replyTo).toBe(ADDRESS);
    expect(mail.subject).toBe('I’m your Groundwork assistant');
    expect(mail.text).toBe(emailToThePrincipal('Fatima').text);
    /* nothing went to her on WhatsApp, and the delivery row says why, in plain words, and that it is waiting */
    expect(w.sent.filter((m) => m.channel === 'whatsapp')).toHaveLength(0);
    const rows = w.t.introductionDelivery.rows;
    expect(rows.map((x: any) => [x.channel, x.state])).toEqual([['email', 'sent'], ['whatsapp', 'held']]);
    expect(rows[1].reason).toBe('This message is waiting. Groundwork cannot write first to this number on WhatsApp yet, because Meta has not approved the opening message. It will go once the opening message is approved, or once the person writes first.');
    expect(rows[1].text).toBe(whatsAppToThePrincipal('Fatima', ADDRESS).text);
    console.log(`WHAT THE ADMIN READS WHEN THE WHATSAPP MESSAGE IS HELD\n${r.said}`);
    console.log(`THE EMAIL SHE READS\nSubject: ${mail.subject}\n\n${mail.text}\n\nTHE WHATSAPP MESSAGE, HELD\n${rows[1].text}\n\nTHE DELIVERY STATE OF THE WHATSAPP MESSAGE\n${rows[1].state}. ${rows[1].reason}`);
  });

  it('sends the WhatsApp message once the gate allows it, and a retry never sends it twice', async () => {
    const w = aWorldForOnboarding();
    await addAnExecutive(w.prisma, w.ports, addFatima(w));
    w.settings.whatsapp = 'accept';
    const later = new Date(w.now.getTime() + 2 * 3600_000);
    expect(await retryTheHeldIntroductions(w.prisma, w.ports, later)).toBe(1);
    expect(await retryTheHeldIntroductions(w.prisma, w.ports, new Date(later.getTime() + 2 * 3600_000))).toBe(0);
    const wa = w.sent.filter((m) => m.channel === 'whatsapp');
    expect(wa).toHaveLength(1);
    expect(wa[0].text).toBe(whatsAppToThePrincipal('Fatima', ADDRESS).text);
    expect(w.t.introductionDelivery.rows.map((x: any) => x.state)).toEqual(['sent', 'sent']);
    console.log(`THE WHATSAPP MESSAGE SHE READS\n${wa[0].text}`);
  });

  it('does not retry inside the hour, and does not send a mail the door is already holding a second time', async () => {
    const w = aWorldForOnboarding();
    w.settings.mail = 'held';
    await addAnExecutive(w.prisma, w.ports, addFatima(w));
    expect(w.t.introductionDelivery.rows.map((x: any) => [x.channel, x.state])).toEqual([['email', 'held'], ['whatsapp', 'held']]);
    w.settings.mail = 'sent';
    w.settings.whatsapp = 'accept';
    expect(await retryTheHeldIntroductions(w.prisma, w.ports, new Date(w.now.getTime() + 600_000))).toBe(0);
    /* an hour on: WhatsApp is tried again, the held email is the door's own and is never sent from here */
    expect(await retryTheHeldIntroductions(w.prisma, w.ports, new Date(w.now.getTime() + 2 * 3600_000))).toBe(1);
    expect(w.sent.filter((m) => m.channel === 'email')).toHaveLength(0);
  });

  it('says a held night plainly, and a STOP as not sent', async () => {
    const w = aWorldForOnboarding();
    w.settings.whatsapp = 'night';
    await addAnExecutive(w.prisma, w.ports, addFatima(w));
    expect(w.t.introductionDelivery.rows[1]).toMatchObject({ state: 'held', reason: 'It is night where the person is, so this message will go in the morning.' });
    const w2 = aWorldForOnboarding();
    w2.settings.whatsapp = 'stopped';
    await addAnExecutive(w2.prisma, w2.ports, addFatima(w2));
    expect(w2.t.introductionDelivery.rows[1]).toMatchObject({ state: 'suppressed', reason: 'Nothing was sent, because this number asked Groundwork to stop sending WhatsApp messages.' });
  });

  it('is safe to do twice: one person, one setup, two jobs and two introductions', async () => {
    const w = aWorldForOnboarding();
    const first = await addAnExecutive(w.prisma, w.ports, addFatima(w));
    const second = await addAnExecutive(w.prisma, w.ports, addFatima(w));
    expect(first.ok && second.ok && first.principalUserId === second.principalUserId).toBe(true);
    expect(w.t.user.rows.filter((u: any) => u.email === 'fatimawale@example.com')).toHaveLength(1);
    expect(w.t.person.rows.filter((p: any) => p.email === 'fatimawale@example.com')).toHaveLength(1);
    expect(w.t.principalSetup.rows).toHaveLength(1);
    expect(w.t.persistentJob.rows).toHaveLength(2);
    expect(w.t.introductionDelivery.rows).toHaveLength(2);
    expect(w.sent.filter((m) => m.channel === 'email')).toHaveLength(1);
  });

  it('sends nothing until the approval to message her is on record, and says so', async () => {
    const w = aWorldForOnboarding();
    const r = await addAnExecutive(w.prisma, w.ports, addFatima(w, { permissions: { dataHandling: true, teamOutreach: false, confidentialInformation: true, messaging: false } }));
    expect(w.sent).toHaveLength(0);
    expect(w.t.introductionDelivery.rows).toHaveLength(0);
    expect(r.said).toBe('I have added Fatima. Fatima does not need to register or sign in to anything. I have started the two standing jobs, “2026 annual report and presentation” and “2026 outstanding matters and 2027 carry-forward register”. Nothing has been sent to Fatima yet, because the approval to message Fatima has not been confirmed. The approval for writing to the team has not been confirmed yet, and I will not act on those until it is.');
    console.log(`WHAT THE ADMIN READS WITHOUT THE APPROVAL\n${r.said}`);
  });

  it('refuses anybody who is not an administrator of the organisation, and writes nothing', async () => {
    const w = aWorldForOnboarding();
    for (const who of ['u-amina', 'u-tunde', 'u-ibrahim', 'u-stranger']) {
      const r = await addAnExecutive(w.prisma, w.ports, addFatima(w, { byUserId: who }));
      expect(r).toEqual({ ok: false, said: 'Only an administrator of the organisation can add a senior person.' });
    }
    expect(w.t.principalSetup.rows).toHaveLength(0);
    expect(w.sent).toHaveLength(0);
  });

  it('refuses an address that belongs to another organisation, and a number that is somebody else\'s', async () => {
    const w = aWorldForOnboarding();
    w.t.user.rows.push({ id: 'u-other', email: 'fatimawale@example.com', organizationId: 'org-2', firstName: 'Fatima', lastName: 'X' });
    expect(await addAnExecutive(w.prisma, w.ports, addFatima(w))).toEqual({ ok: false, said: 'That email address already belongs to somebody in another organisation, so I have not added anybody. Please use the address the office uses.' });
    const w2 = aWorldForOnboarding();
    w2.t.person.rows.find((p: any) => p.email === 'amina@example.com').phone = '+2348031112222';
    expect(await addAnExecutive(w2.prisma, w2.ports, addFatima(w2))).toEqual({ ok: false, said: 'That number is already on Amina Yusuf\'s entry, and one number belongs to one person. I have not added anybody. Please check the number.' });
    const w3 = aWorldForOnboarding();
    expect(await addAnExecutive(w3.prisma, w3.ports, addFatima(w3, { email: 'not-an-address' }))).toEqual({ ok: false, said: 'That does not look like an email address. Please write the whole address.' });
  });
});
