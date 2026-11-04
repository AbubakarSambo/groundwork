import { EmailService } from '../email/email.service';
import { anAppealWaitsForYou, pleaseAddASecondAdmin, theAppealWasDecided } from '../suites/a-review-appeal';

/**
 * THE "WHO CAN SEE WHAT YOU SAY" FOOTER SAYS ONLY WHAT IS TRUE FOR THE MESSAGE IT IS UNDER (engagement review, 8 October), AS EACH PERSON READS THE MAIL.
 *
 * Every review-appeal message goes out through the shared team-alert sender, which was not on the list of mail that leaves the footer off, so an admin told
 * "Imani has appealed a review" and Imani told "your appeal was decided" both read, underneath, "The people in this check-in, including your manager, can see
 * what you say in it." There is no check-in in an appeal, and neither of them is the person who said anything.
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
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

describe('a review appeal, as the admin, the reviewer and the person each read it', () => {
  it.each([
    ['the admin it waits for', () => anAppealWaitsForYou('Grace', 'Imani', 'Baraka')],
    ['the reviewer asked to add a second admin', () => pleaseAddASecondAdmin('Baraka', 'Imani', false)],
    ['the person, told it was decided', () => theAppealWasDecided('Imani', 'Grace', true, 'Imani', 'stands')],
    ['the reviewer, told it was decided', () => theAppealWasDecided('Baraka', 'Grace', false, 'Imani', 'changed')],
  ])('%s does not read that the people in a check-in can see what they say', async (_who, message) => {
    const d = door();
    const m = message();
    await d.email.sendTeamAlert('reader@x.test', m.subject, m.lines.map(esc), m.linkLabel, 'https://app.test/suite/reviews');
    expect(d.sent).toHaveLength(1);
    expect(d.sent[0].html).not.toMatch(THE_PARAGRAPH);
    expect(text(d.sent[0].html)).toContain(m.lines[0].replace(/\s+/g, ' ').slice(0, 20));
  });
});

describe('other mail that is not written to the person who said something', () => {
  it('a bill, an API decision and a lead\'s notice that somebody checked in leave it off', async () => {
    const d = door();
    await d.email.sendPaymentFailed('grace@x.test', 'Mara Traders');
    await d.email.sendApiAccessApproved('grace@x.test', 'Grace', 'https://app.test/connect');
    await d.email.sendParticipantCheckedIn('wairimu@x.test', 'Abigail', 'Kenya launch', 'https://app.test/grounds/g1', 1);
    expect(d.sent).toHaveLength(3);
    for (const m of d.sent) expect({ subject: m.subject, footer: THE_PARAGRAPH.test(m.html) }).toEqual({ subject: m.subject, footer: false });
  });
});

/* Changed 4 November 2026 (release batch 1, Hafsah: no explainer lines and no privacy notes in messages): no mail carries the paragraph now. */
describe('mail to the person who answered no longer carries it', () => {
  it('the reminder and the report notice do not', async () => {
    const d = door();
    await d.email.sendNudge('omar@x.test', 'Kenya launch', 'https://app.test/c', undefined, undefined, null, 'p1');
    await d.email.sendReportReady('omar@x.test', 'Kenya launch', 'https://app.test/r');
    expect(d.sent).toHaveLength(2);
    for (const m of d.sent) expect(m.html).not.toMatch(/Groundwork is where the people involved/);
  });
});
