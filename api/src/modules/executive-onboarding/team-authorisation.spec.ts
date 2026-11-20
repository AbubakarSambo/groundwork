import { addAnExecutive } from './onboard-an-executive';
import { hearHer } from './her-words';
import { readContactsFrom } from './team-introductions';
import { emailToATeamMember, whatsAppToATeamMember } from './the-introductions';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { aWorldForOnboarding, addFatima, ORG } from './a-world-for-onboarding';

/**
 * HER TEAM, BY HER WORD (plan sections 6 and 19; acceptance tests 8 and 9 start here). She gives names and contacts in a message; Groundwork repeats
 * back who it will write to and asks once; on yes each person gets their own two introductions, word for word; people outside the organisation need
 * their own yes and are never sent the team's introduction.
 */
async function fatimaIsAdded() {
  const w = aWorldForOnboarding();
  await addAnExecutive(w.prisma, w.ports, addFatima(w));
  w.sent.length = 0;
  const says = (userId: string, message: string) => hearHer(w.prisma, w.ports, { organizationId: ORG, userId, message, now: w.now });
  return { w, says };
}

describe('reading names and contacts from her words', () => {
  it('pairs each name with the address or number beside it, and a number that follows an address belongs to the same person', () => {
    expect(readContactsFrom('Amina Yusuf, amina@example.com and Ibrahim Sule on +234 803 555 0101')).toEqual([
      { name: 'Amina Yusuf', email: 'amina@example.com', phone: null },
      { name: 'Ibrahim Sule', email: null, phone: '+234 803 555 0101' },
    ]);
    expect(readContactsFrom('Ngozi Eze: ngozi@works.gov.ng, +234 803 555 0202')).toEqual([{ name: 'Ngozi Eze', email: 'ngozi@works.gov.ng', phone: '+234 803 555 0202' }]);
    expect(readContactsFrom('My team is Amina Yusuf, amina@example.com.')).toEqual([{ name: 'Amina Yusuf', email: 'amina@example.com', phone: null }]);
  });
});

describe('asking once, and the go-ahead', () => {
  it('repeats back who it will write to in one question, and writes to nobody yet', async () => {
    const { w, says } = await fatimaIsAdded();
    const q = await says('u-fatima', 'My team is Amina Yusuf, amina@example.com and Ibrahim Sule, +234 803 555 0101.');
    expect(q).toBe('Shall I write to Amina Yusuf (amina@example.com) and Ibrahim Sule (+2348035550101), tell them you asked me to, and ask what they are working on?');
    expect(w.sent).toHaveLength(0);
    expect(w.t.outreachContact.rows.map((c: any) => [c.name, c.kind, c.state])).toEqual([['Amina Yusuf', 'team', 'proposed'], ['Ibrahim Sule', 'team', 'proposed']]);
    console.log(`THE ONE QUESTION FATIMA READS\n${q}`);
  });

  it('on yes, each person gets their OWN email and WhatsApp message word for word, and goes on the roster without signing up', async () => {
    const { w, says } = await fatimaIsAdded();
    await says('u-fatima', 'My team is Amina Yusuf, amina@example.com and Ibrahim Sule, +234 803 555 0101.');
    const done = await says('u-fatima', 'Yes');
    expect(done).toBe('Thank you. I have written to Amina Yusuf. The WhatsApp message to Ibrahim Sule has to wait. WhatsApp does not let me message a new number first, so it goes when they write to me. I have no email address for Ibrahim Sule. Nothing has reached Ibrahim Sule yet. I will tell you what they say, and I will not ask you again.');
    const amina = w.sent.filter((m) => m.to === 'amina@example.com');
    expect(amina).toHaveLength(1);
    expect(amina[0]).toMatchObject({ subject: 'Updates and support for your work from Groundwork', replyTo: 'assistant+dangote-abuja@myground.work', text: emailToATeamMember('Fatima', 'the Abuja office', 'Amina').text });
    /* Ibrahim has only a number: his WhatsApp message is held, in his own delivery row, until the opening message is approved */
    expect(w.sent.filter((m) => m.to === 'ibrahim@example.com' || m.to === '+2348035550101')).toHaveLength(0);
    const rows = w.t.introductionDelivery.rows.filter((r: any) => r.audience === 'team');
    expect(rows.map((r: any) => [r.recipient, r.channel, r.state])).toEqual([['amina@example.com', 'email', 'sent'], ['+2348035550101', 'whatsapp', 'held']]);
    expect(rows[1].text).toBe(whatsAppToATeamMember('Fatima', 'the Abuja office', 'Ibrahim').text);
    expect(w.t.person.rows.find((p: any) => p.phone === '+2348035550101')).toMatchObject({ displayName: 'Ibrahim Sule', sourceSystem: 'groundwork-outreach' });
    expect(w.t.outreachContact.rows.map((c: any) => c.state)).toEqual(['introduced', 'introduced']);
    console.log(`THE EMAIL AMINA READS\nSubject: ${amina[0].subject}\n\n${amina[0].text}\n\nTHE WHATSAPP MESSAGE IBRAHIM WILL READ (HELD: ${rows[1].reason})\n${rows[1].text}`);
  });

  it('says yes twice and nobody is written to twice', async () => {
    const { w, says } = await fatimaIsAdded();
    await says('u-fatima', 'My team is Amina Yusuf, amina@example.com.');
    await says('u-fatima', 'Yes');
    expect(await says('u-fatima', 'Yes')).toBeNull();
    await says('u-fatima', 'Colleagues: Amina Yusuf, amina@example.com.');
    expect(w.sent.filter((m) => m.to === 'amina@example.com')).toHaveLength(1);
  });

  it('says no and nothing is sent, and the same people are not asked about again by accident', async () => {
    const { w, says } = await fatimaIsAdded();
    await says('u-fatima', 'My team is Amina Yusuf, amina@example.com.');
    expect(await says('u-fatima', 'No')).toBe('Understood. I have not written to anyone, and I will not unless you ask me to.');
    expect(w.sent).toHaveLength(0);
    expect(w.t.outreachContact.rows[0].state).toBe('declined');
  });

  it('asks for a name when the words have an address and no name', async () => {
    const { says } = await fatimaIsAdded();
    expect(await says('u-fatima', 'My team: info@example.com')).toBe('I could not tell whose email address that is. Please tell me the name, and the email address once more.');
  });

  it('will not write to anyone when the organisation did not confirm team outreach', async () => {
    const w = aWorldForOnboarding();
    await addAnExecutive(w.prisma, w.ports, addFatima(w, { permissions: { dataHandling: true, teamOutreach: false, confidentialInformation: true, messaging: true } }));
    w.sent.length = 0;
    const said = await hearHer(w.prisma, w.ports, { organizationId: ORG, userId: 'u-fatima', message: 'My team is Amina Yusuf, amina@example.com.', now: w.now });
    expect(said).toBe('I cannot write to your team yet, because your organisation has not confirmed that I may. Please ask the person who set this up.');
    expect(w.t.outreachContact.rows).toHaveLength(0);
    expect(w.sent).toHaveLength(0);
  });
});

describe('people outside the organisation (plan section 19)', () => {
  it('are asked about on their own, never sent the team introduction, and only she can say yes for them', async () => {
    const { w, says } = await fatimaIsAdded();
    await grantADelegate(w.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    const q = await says('u-fatima', 'My team is Amina Yusuf, amina@example.com. The Permanent Secretary is Ngozi Eze, ngozi@works.gov.ng.');
    expect(q).toBe('Shall I write to Amina Yusuf (amina@example.com), tell them you asked me to, and ask what they are working on? Ngozi Eze (ngozi@works.gov.ng) is outside your office, so I will not write to them until you say yes to that separately.');
    expect(w.t.outreachContact.rows.map((c: any) => [c.name, c.kind])).toEqual([['Amina Yusuf', 'team'], ['Ngozi Eze', 'external']]);
    /* Amina, who acts for her, may say yes for her own side of the office, and is told that the outsider is Fatima's to approve */
    const amina = await says('u-amina', 'Yes');
    expect(amina).toBe('Thank you. I have written to Amina Yusuf. I will tell you what they say, and I will not ask you again. Only Fatima can say yes to contacting people outside the office. I have not written to them.');
    expect(w.t.outreachContact.rows.find((c: any) => c.name === 'Ngozi Eze').state).toBe('proposed');
    expect(w.t.delegateAction.rows[0].summary).toBe('Amina Yusuf for Fatima: said yes to writing to Amina Yusuf.');
    const she = await says('u-fatima', 'Yes');
    expect(she).toBe('I have noted that you are happy for me to contact Ngozi Eze. I have not written to anyone outside your office, and I will not until we have agreed what to say.');
    expect(w.sent.filter((m) => m.to === 'ngozi@works.gov.ng')).toHaveLength(0);
    expect(w.t.outreachContact.rows.find((c: any) => c.name === 'Ngozi Eze')).toMatchObject({ state: 'held_external', confirmedByUserId: 'u-fatima' });
    console.log(`WHAT FATIMA READS ABOUT THE OUTSIDER\n${q}\n\n${she}`);
  });
});

describe('whose words these are', () => {
  it('nobody else can name a team for her, and a stranger or a colleague with his own check-in is simply not answered', async () => {
    const { w, says } = await fatimaIsAdded();
    for (const who of ['u-tunde', 'u-ibrahim', 'u-grace', 'u-amina']) expect(await says(who, 'My team is Mallory Hacker, mallory@evil.example.')).toBeNull();
    expect(w.t.outreachContact.rows).toHaveLength(0);
    expect(w.sent).toHaveLength(0);
  });

  it('a person acting for her cannot make her stop, slow down or carry on', async () => {
    const { w, says } = await fatimaIsAdded();
    await grantADelegate(w.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    expect(await says('u-amina', 'Stop')).toBeNull();
    expect(w.t.principalSetup.rows[0].preferences.paused).toBe(false);
  });
});
