import { EmailService } from './email.service';
import { aRichTable } from '../year-end/a-world-for-the-year-end';

const sendMail = jest.fn(async (_m: any) => ({}));
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: (m: any) => (sendMail as any)(m) }) }));

/**
 * Fatima round 1, I-03 and H5, at the one mail door. A different mail with the same subject goes (the picture of her first real forward was dropped
 * because a short thank-you with the same subject had gone that day), the very same mail twice goes once, and a mail that asks a person a question
 * carries the assistant's address as its Reply-To.
 */
function aMailService() {
  const outbox = aRichTable([['key']], 'ob');
  const prisma: any = new Proxy({ outboxClaim: outbox, scheduledEmail: aRichTable([], 'se'), yearEndLog: aRichTable([], 'yl'), notification: { create: async ({ data }: any) => data, findMany: async () => [] }, person: { findMany: async () => [], findFirst: async () => null }, emailPreference: { findUnique: async () => null } },
    { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: () => async () => null }) });
  return new EmailService({ get: () => undefined } as any, { recordSend: async () => undefined } as any, prisma);
}
beforeEach(() => sendMail.mockClear());

describe('the one mail door and a reply that shares a subject', () => {
  it('sends a second, different mail with the same subject, and sends the very same mail once', async () => {
    const mail = aMailService();
    const subject = 'What I have found so far';
    expect(await mail.sendTheAssistantsReply('fatima@example.com', subject, 'Thank you. I have your note.', 'assistant+x@myground.work')).toBe('sent');
    expect(await mail.sendTheAssistantsReply('fatima@example.com', subject, 'I have everything you sent. The payments sheet lists five payments.', 'assistant+x@myground.work')).toBe('sent');
    expect(await mail.sendTheAssistantsReply('fatima@example.com', subject, 'I have everything you sent. The payments sheet lists five payments.', 'assistant+x@myground.work')).toBe('suppressed');
    expect(sendMail).toHaveBeenCalledTimes(2);
    console.log(`WHAT FATIMA READS\n${sendMail.mock.calls.map((c) => c[0].text).join('\n---\n')}`);
  });

  it('a mail that asks the team for their update carries the Reply-To it was given', async () => {
    const mail = aMailService();
    await mail.sendTheRoutineMessageByEmail('hauwa@example.com', 'Your update for Fatima', 'Hello Hauwa, Fatima asked me to collect the team’s updates.', null, null, undefined, 'assistant+dangote-abuja@myground.work');
    expect(sendMail.mock.calls[0][0].replyTo).toBe('assistant+dangote-abuja@myground.work');
  });
});
