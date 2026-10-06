import { EmailService } from '../email/email.service';

/**
 * THE "WHO CAN SEE WHAT YOU SAY" FOOTER IS ONLY WHERE IT IS TRUE (existing-users check, section 15), AS EACH PERSON READS THE MAIL.
 *
 * Vera's week says "Only you can read this." and used to end with "The people in this check-in, including your manager, can see what you say in it."
 * Both cannot be the last word. That paragraph belongs on mail about a check-in's answers, and not on the participant's week, nor on a lead's message about
 * how many have answered, what is new, or what to do next.
 */
function door() {
  const sent: any[] = [];
  const prisma: any = {
    notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) }, whatsAppSend: { findMany: jest.fn(async () => []) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) }, user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    emailPreference: { findMany: jest.fn(async () => []) }, emailAddressPreference: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({ unsubscribeToken: 't' })) },
    emailDelivery: { findFirst: jest.fn(async () => null) }, groundParticipant: { findUnique: jest.fn(async () => null) }, scheduledEmail: { create: jest.fn() },
  };
  const email: any = new EmailService({ get: (k: string) => (k === 'resend.frontendUrl' ? 'https://app.test' : undefined) } as any, {} as any, prisma);
  email.isDev = () => false;
  email.theResendClient = () => ({ emails: { send: jest.fn(async (m: any) => { sent.push(m); return { data: { id: 'x' }, error: null }; }) } });
  email.delivery = { recordSend: jest.fn(async () => undefined) };
  email.holdForTheMorning = jest.fn(async () => false);
  email.writeItDown = jest.fn(async () => undefined);
  return { email, sent };
}
const THE_PARAGRAPH = /can see what you say|Groundwork is where the people involved/;
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('the participant\'s week', () => {
  it('says only she can read it, and does not then say her manager can read what she says', async () => {
    const d = door();
    await d.email.sendYourWeek('vera@x.test', 'You kept three of the four things you said you would do', ['Hello Vera. Here is your week in Groundwork. Only you can read this.'], 'Open your page', 'https://app.test/you');
    expect(text(d.sent[0].html)).toContain('Only you can read this.');
    expect(d.sent[0].html).not.toMatch(THE_PARAGRAPH);
  });
});

describe('a lead\'s messages about the work', () => {
  it.each([
    ['sendHeresWhatIsNew'], ['sendTestCheckInMovesOn'], ['sendLeadFirstCheckIn'], ['sendTheReportFollowUp'], ['sendWhoHasGoneQuiet'],
  ])('%s does not carry it', async (sender) => {
    const d = door();
    const send: any = (d.email as any)[sender].bind(d.email);
    if (sender === 'sendLeadFirstCheckIn') await send('w@x.test', 's', ['Hello.'], 'Go', 'https://app.test', 'p1');
    else await send('w@x.test', 's', ['Hello.'], 'Go', 'https://app.test');
    expect(d.sent[0].html).not.toMatch(THE_PARAGRAPH);
  });
});

describe('mail that is about what somebody said still carries it', () => {
  it('the reminder and the report notice do', async () => {
    const d = door();
    await d.email.sendNudge('omar@x.test', 'Kenya launch', 'https://app.test/c', undefined, undefined, null, 'p1');
    expect(d.sent[0].html).toMatch(/Groundwork is where the people involved/);
  });
});
