import { WhoIsWaitingAtTheDoorService } from './who-is-waiting-at-the-door.service';
import { AskingForMoreTimeService } from '../grounds/asking-for-more-time.service';
import { whoTheyMeant } from '../grounds/who-they-meant';

/**
 * AN ADDRESS IS NEVER SHOWN IN PLACE OF A NAME (Hafsah, 6 October), IN EVERY PLACE A NAME IS SERVED OR SENT.
 * Each case is a person with no name on their account, and what the reader is told must hold no "@" and no part of the address.
 */
const NOBODY = { firstName: null, lastName: null, email: 'amina.otieno@x.test' };
const leaks = (t: unknown) => /@|amina|otieno/i.test(JSON.stringify(t));

describe('who is waiting at the door, for the admin', () => {
  it('names the person who added them, and the person let in, as "Someone" and not as an address', async () => {
    const told: any[] = [];
    const prisma: any = {
      membershipRequest: {
        findMany: jest.fn(async () => [{ id: 'r1', email: 'new@x.test', createdAt: new Date(), groundId: null, requestedByUserId: 'u1', user: null }]),
      },
      user: { findMany: jest.fn(async () => [{ id: 'u1', ...NOBODY }]) },
      ground: { findMany: jest.fn(async () => []) },
    };
    const s = new WhoIsWaitingAtTheDoorService(prisma, { sendTheyAreInNow: (...a: any[]) => told.push(a) } as any, {} as any);
    const rows: any[] = await s.waiting('org');
    expect(rows[0].addedBy).toBe('Someone');
    expect(leaks(rows[0].addedBy)).toBe(false);
  });
});

describe('asking for more time, as the lead reads the email', () => {
  it('says "Someone" when the person has no name, never their address', async () => {
    const sent: any[] = [];
    const prisma: any = {
      groundParticipant: {
        findFirst: jest.fn(async () => ({ id: 'p1', email: 'amina.otieno@x.test', moreTimeAskedAt: null, nameGiven: null })),
        update: jest.fn(async () => ({})),
      },
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Sales', status: 'STALLED', endsAt: new Date(), initiator: { firstName: 'Wairimu', email: 'w@x.test' } })) },
      user: { findUnique: jest.fn(async () => NOBODY) },
    };
    const s = new AskingForMoreTimeService(prisma, { sendMoreTimeAsked: jest.fn(async (...a: any[]) => { sent.push(a); }) } as any);
    await s.ask('g1', 'u1');
    expect(sent[0][2]).toBe('Someone');
  });
});

describe('who the lead meant, as the lead confirms it', () => {
  /* Changed on 7 October (review of 1678157c): "what you expect of Someone? ... Someone has not seen it yet" read as a name nobody has. */
  it('reads "this person" for a person with no name when the lead typed the address, never the address or the start of it', () => {
    const m = whoTheyMeant('amina.otieno@x.test', [{ id: 'p1', email: 'amina.otieno@x.test', name: null }]);
    expect(m).toEqual({ id: 'p1', label: 'this person', firstName: 'this person' });
    expect(leaks([m!.label, m!.firstName])).toBe(false);
  });
  it('and the word the lead used when she typed a name, which is hers', () => {
    expect(whoTheyMeant('amina', [{ id: 'p1', email: 'amina.otieno@x.test', name: null }])).toEqual({ id: 'p1', label: 'Amina', firstName: 'Amina' });
  });
  it('still reads the name when there is one', () => {
    expect(whoTheyMeant('amina', [{ id: 'p1', email: 'a@x.test', name: 'Amina Otieno' }])).toEqual({ id: 'p1', label: 'Amina Otieno', firstName: 'Amina' });
  });
});


/* Review of 1678157c: the mails themselves, as the admin and the lead read them. The address was still the name in the waiting mail's subject and first
   sentence, and in the "not added" mail; "by Someone" sat mid-sentence. The address is now said in a sentence of its own, and never where the name goes. */
import { EmailService } from '../email/email.service';
function mails() {
  const sent: { subject: string; html: string }[] = [];
  const email = new EmailService({ get: () => undefined } as any, {} as any, {} as any);
  jest.spyOn(email as any, 'sendEmail').mockImplementation(async (msg: any) => { sent.push({ subject: msg.subject, html: msg.html }); return undefined; });
  return { email, sent };
}
const theNamePlaces = (m: { subject: string; html: string }) => m.subject + ' ' + m.html.replace(/The address (they were|you) invited (them )?with is <strong>[^<]*<\/strong>\./g, '');

describe('the mails about somebody at the door, as they are read', () => {
  it('the admin reads "Someone is waiting", invited by somebody on the team, with the address in a sentence of its own', async () => {
    const { email, sent } = mails();
    await email.sendSomebodyIsWaiting('admin@x.test', 'Grace', 'amina.otieno@x.test', 'Someone', 'Sales', { name: '', organisationName: 'Kito' });
    expect(sent[0].subject).toBe('Someone is waiting to be let into Kito.');
    expect(sent[0].html).toContain('<strong>Someone</strong> was invited to check in on <strong>Sales</strong> by somebody on your team, and they are not in your organisation yet. The address they were invited with is <strong>amina.otieno@x.test</strong>.');
    expect(leaks(theNamePlaces(sent[0]))).toBe(false);
  });
  it('and the name when there is one, with no address at all', async () => {
    const { email, sent } = mails();
    await email.sendSomebodyIsWaiting('admin@x.test', 'Grace', 'amina.otieno@x.test', 'Wairimu Njoroge', 'Sales', { name: 'Amina Otieno', organisationName: 'Kito' });
    expect(sent[0].subject).toBe('Amina Otieno is waiting to be let into Kito.');
    expect(sent[0].html).toContain('<strong>Amina Otieno</strong> was invited to check in on <strong>Sales</strong> by Wairimu Njoroge');
    expect(sent[0].html).not.toContain('@');
  });
  it('the lead reads "the person you invited" when they are let in or not, never the address as a name', async () => {
    const { email, sent } = mails();
    await email.sendTheyAreInNow('w@x.test', 'Wairimu', 'Someone', 'Sales', 'amina.otieno@x.test');
    await email.sendTheyWereNotLetIn('w@x.test', 'Wairimu', 'Someone', null, 'amina.otieno@x.test');
    expect(sent[0].subject).toBe('The person you invited can check in now');
    expect(sent[0].html).toContain('An admin has let in the person you invited, so they can start <strong>Sales</strong>. They have been told. The address you invited them with is <strong>amina.otieno@x.test</strong>.');
    expect(sent[1].subject).toBe('The person you invited was not added to your organisation');
    for (const m of sent) expect(leaks(theNamePlaces(m))).toBe(false);
  });
  it('and by name when they have one', async () => {
    const { email, sent } = mails();
    await email.sendTheyAreInNow('w@x.test', 'Wairimu', 'Amina Otieno', 'Sales', 'amina.otieno@x.test');
    expect(sent[0].subject).toBe('Amina Otieno can check in now');
    expect(sent[0].html).not.toContain('@');
  });
});
