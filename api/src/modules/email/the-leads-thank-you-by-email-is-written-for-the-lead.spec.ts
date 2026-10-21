import { EmailService } from './email.service';

/**
 * THE THANK-YOU THAT GOES BY EMAIL INSTEAD OF WHATSAPP IS WRITTEN FOR THE LEAD WHEN THE LEAD READS IT (messages test, third run).
 *
 * Drop Access (test), Monday 12 October 12:15. Grace Achieng runs "Sales team, Q4". She finished her own check-in, WhatsApp could
 * not take her thank-you, and the email she got said underneath "The people in this check-in, including your manager, can see what
 * you say in it." Grace is the manager. Wanjiru Muchemi at Muchemi & Co read the same on Monday at 11:32 and 11:34. The shared-picture
 * mails already say what is true for the lead. Read here as Grace reads her mailbox, and as Mercy reads hers.
 */
function door() {
  const sent: any[] = [];
  const places: Record<string, any> = {
    'p-grace': { groundId: 'g-sales', partyType: 'INITIATOR' },
    'p-mercy': { groundId: 'g-sales', partyType: 'PARTICIPANT' },
  };
  const prisma: any = {
    notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) }, whatsAppSend: { findMany: jest.fn(async () => []) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) }, user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    emailPreference: { findMany: jest.fn(async () => []) }, emailAddressPreference: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({ unsubscribeToken: 't' })) },
    emailDelivery: { findFirst: jest.fn(async () => null) },
    groundParticipant: { findUnique: jest.fn(async (q: any) => places[q?.where?.id] ?? null) },
    ground: { findUnique: jest.fn(async () => ({ scenario: 'sales', peersVisibleToEachOther: true, organization: { name: 'Drop Access (test)' }, initiator: { email: 'grace.achieng@dropaccess.test' } })) },
    scheduledEmail: { create: jest.fn() },
  };
  const email: any = new EmailService({ get: (k: string) => (k === 'resend.frontendUrl' ? 'https://app.test' : undefined) } as any, {} as any, prisma);
  email.isDev = () => false;
  email.theResendClient = () => ({ emails: { send: jest.fn(async (m: any) => { sent.push(m); return { data: { id: 'x' }, error: null }; }) } });
  email.delivery = { recordSend: jest.fn(async () => undefined) };
  email.holdForTheMorning = jest.fn(async () => false);
  email.writeItDown = jest.fn(async () => undefined);
  return { email, sent };
}
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const THANKS = 'Thank you, your answer for Sales team, Q4 is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read.';

describe("the thank-you by email, as the lead and as a team member read it", () => {
  it('Grace, who runs the check-in, is not told that her manager can see what she says', async () => {
    const d = door();
    /* Her address on the email is the one she signed in with, not the one on the check-in's initiator row. */
    await d.email.sendTheAnswerByEmail('grace@dropaccess.test', 'Thank you, your answer for Sales team, Q4 is in', THANKS, 'Open Groundwork', 'https://app.test/c', 'p-grace');
    expect(d.sent).toHaveLength(1);
    const read = text(d.sent[0].html);
    expect(read).toContain(THANKS);
    expect(read).not.toContain('including your manager');
    expect(read).toContain('The people in this check-in can see what you say in it, and you can see what they say. Your questions to Ask Drop Access (test) stay private.');
  });

  it('Mercy, who takes part, still reads the invitation\'s own sentence', async () => {
    const d = door();
    await d.email.sendTheAnswerByEmail('mercy@dropaccess.test', 'Thank you, your answer for Sales team, Q4 is in', THANKS, 'Open Groundwork', 'https://app.test/c', 'p-mercy');
    expect(text(d.sent[0].html)).toContain('The people in this check-in, including your manager, can see what you say in it. Your questions to Ask Drop Access (test) stay private.');
  });
});
