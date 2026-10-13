import { EmailService } from '../email/email.service';
import { theirRoutineMessagesToday } from './one-routine-message-a-day';

/**
 * THE DAY'S COUNT AND THE RECORD IT COUNTS USE ONE CLOCK (decision 109 item 6; found on the test bed, 8 October).
 *
 * "Has this person had their one today" asks the application what today is and counts the records of mail sent since the start of it. Each record was stamped by
 * the database's own clock. They are the same moment in production, so nothing showed; with the test bed's clock moved on, every record was days behind "today"
 * and nobody was ever counted, so Kito was chased about two check-ins on the same morning. The record is now stamped by the application.
 */
describe('the record of a message sent', () => {
  it('carries the time the application thinks it is', async () => {
    const created: any[] = [];
    const prisma: any = { notification: { create: jest.fn(async (a: any) => { created.push(a.data); return a.data; }) } };
    const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
    jest.useFakeTimers({ now: new Date('2026-10-12T16:22:00Z') });
    try {
      await email.writeItDown({ to: 'kito@msingi.test', subject: 'Your check-in for Distributor review is waiting' }, 'sendNudge', 'sent', null);
    } finally {
      jest.useRealTimers();
    }
    expect(created[0].createdAt).toEqual(new Date('2026-10-12T16:22:00Z'));
  });

  it('so a second routine message the same application day is counted, however the database clock reads', async () => {
    const rows = [{ createdAt: new Date('2026-10-12T16:22:00Z'), outcome: 'sent', sender: 'sendNudge', toAddress: 'kito@msingi.test' }];
    const prisma: any = {
      notification: { findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.createdAt >= where.createdAt.gte)) },
      whatsAppSend: { findMany: jest.fn(async () => []) }, person: { findMany: jest.fn(async () => []) }, user: { findMany: jest.fn(async () => []) },
    };
    jest.useFakeTimers({ now: new Date('2026-10-12T16:30:00Z') });
    try {
      const had = await theirRoutineMessagesToday(prisma, { email: 'kito@msingi.test' });
      expect(had.email + had.whatsapp).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
