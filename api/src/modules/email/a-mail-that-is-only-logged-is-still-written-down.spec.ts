import { EmailService } from './email.service';

/**
 * A MAIL THAT IS ONLY LOGGED IS STILL WRITTEN DOWN AS SENT. The once-only and one-a-day rules read the
 * record of what was sent. On a computer that sends nothing for real, no record was made, so the lead on the
 * test bed was sent the same "what is new" mail every weekday, which production never does.
 */
it('writes a logged routine mail into the record, as a real send would', async () => {
  const notes: any[] = [];
  const prisma: any = new Proxy({
    notification: { create: jest.fn(async ({ data }: any) => { notes.push(data); return {}; }) },
  }, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: () => async () => null }) });
  const email = new EmailService({ get: () => undefined } as any, { recordSend: async () => undefined } as any, prisma);
  await (email as any).deliverNow({ to: 'lead@x.test', subject: 'Here is where your two check-ins stand, and what is new', html: '<p>Hello</p>' }, undefined, 'sendHeresWhatIsNew');
  expect(notes).toEqual([expect.objectContaining({ channel: 'email', toAddress: 'lead@x.test', sender: 'sendHeresWhatIsNew', outcome: 'sent' })]);
});
