import { EmailService } from './email.service';

const sendMail = jest.fn(async () => ({}));
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: (...a: any[]) => (sendMail as any)(...a) }) }));

/**
 * REPLYING TO A REMINDER OR AN INVITATION REACHES THE ASSISTANT. What the recipient's mail program is told to reply to, for each kind of mail,
 * read where every mail passes (the one door), so a held mail and a mail sent now carry the same address.
 */
function aMailService() {
  const prisma: any = new Proxy({
    groundParticipant: { findUnique: jest.fn(async ({ where }: any) => (where.id === 'part-1' ? { ground: { organization: { slug: 'acme' } } } : null)) },
    ground: { findUnique: jest.fn(async ({ where }: any) => (where.id === 'g-1' ? { organization: { slug: 'acme' } } : null)) },
    notification: { create: async () => ({}) },
  }, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: () => async () => null }) });
  return new EmailService({ get: () => undefined } as any, { recordSend: async () => undefined } as any, prisma);
}
const replyToOf = () => (sendMail.mock.calls[sendMail.mock.calls.length - 1] as any[])[0].replyTo;
const go = (e: EmailService, context: any, sender: string) => (e as any).deliverNow({ to: 'amina@example.com', subject: 'Your check-in', html: '<p>Hello</p>' }, context, sender);

beforeEach(() => sendMail.mockClear());

describe('who a reply goes to', () => {
  it('a check-in reminder goes to the assistant of the organisation the check-in belongs to', async () => {
    const e = aMailService();
    await go(e, { kind: 'REMINDER', participantId: 'part-1' }, 'sendNudge');
    expect(replyToOf()).toBe('assistant+acme@myground.work');
  });
  it('an invitation to a check-in does too, found from the check-in when there is no participant yet', async () => {
    const e = aMailService();
    await go(e, { kind: 'PARTICIPANT_INVITE', participantId: 'part-1' }, 'sendParticipantInvite');
    expect(replyToOf()).toBe('assistant+acme@myground.work');
    await go(e, { kind: 'REMINDER', groundId: 'g-1' }, 'sendNudge');
    expect(replyToOf()).toBe('assistant+acme@myground.work');
  });
  it('a sign-in link, a lead invitation and a mail with no check-in behind it have no Reply-To of ours', async () => {
    const e = aMailService();
    await go(e, { kind: 'MAGIC_LINK' }, 'sendMagicLinkEmail');
    expect(replyToOf()).toBeUndefined();
    await go(e, { kind: 'LEAD_INVITE', participantId: 'part-1' }, 'sendLeadInvite');
    expect(replyToOf()).toBeUndefined();
    await go(e, { kind: 'REMINDER', participantId: 'unknown' }, 'sendNudge');
    expect(replyToOf()).toBeUndefined();
    await go(e, undefined, 'sendTheDailyUsageSummary');
    expect(replyToOf()).toBeUndefined();
  });
  it('is never the company inbox', async () => {
    const e = aMailService();
    await go(e, { kind: 'REMINDER', participantId: 'part-1' }, 'sendNudge');
    expect(String(replyToOf())).not.toMatch(/^hello@/);
  });
});
