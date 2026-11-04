import { GroundsCron } from './grounds.cron';
import { EmailService } from '../email/email.service';

/**
 * "HAS BEEN READY FOR A FEW DAYS NOW" WHEN IT HAD BEEN READY FOR LESS THAN A DAY (messages test, 19 October, finding 1).
 *
 * Drop Access (test): the picture for Sales team, Q4 was released on Monday 12 October at 18:30 in Nairobi, and at noon on
 * Tuesday Mercy, Joseph, Amos and Kevin were each told it "has been ready for a few days now", and "You just need to confirm
 * you are ready to see it", though nothing is left to confirm: a released picture is open to the person it is for. The
 * reminder now says the day it became ready, in the organisation's own zone, from the report's own release time.
 */
async function theReminderAsKevinReadIt(releasedAt: Date) {
  const mails: { to: string; subject: string; html: string }[] = [];
  const mailer: any = { sendEmail: async (m: any) => { mails.push(m); }, layout: (h: string) => h };
  const prisma: any = {
    withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => (args.where.reportActivations ? [{
        id: 'kevin', email: 'kevin@dropaccess.test',
        ground: { id: 'g', label: 'Sales team, Q4', organizationId: 'drop', report: { releasedAt } },
        user: { emailNotifications: true },
      }] : [])),
      update: jest.fn(async () => ({})),
    },
    ground: { findMany: jest.fn(async () => []) },
    notification: { count: jest.fn(async () => 0) },
    organization: { findUnique: jest.fn(async () => ({ timeZone: 'Africa/Nairobi' })) },
  };
  const email: any = { sendActivationRevealReminder: (...a: any[]) => (EmailService.prototype as any).sendActivationRevealReminder.apply(mailer, a) };
  const service = new GroundsCron(prisma, email, { get: () => 'http://localhost:5196' } as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
  await service.sendReminders();
  return mails.map((m) => ({ ...m, text: m.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }))[0];
}

describe('the report-is-ready reminder says when it became ready', () => {
  it('reads the day of the release, Monday 12 October in Nairobi, never "a few days"', async () => {
    const mail = await theReminderAsKevinReadIt(new Date('2026-10-12T15:30:00Z'));
    expect(mail.subject).toBe('Your report for "Sales team, Q4" is ready to view');
    expect(mail.text).toContain('Your report for Sales team, Q4 has been ready since Monday 12 October.');
    expect(mail.text).not.toContain('a few days');
  });

  it('does not ask the person to confirm anything, since nothing is left to confirm', async () => {
    const mail = await theReminderAsKevinReadIt(new Date('2026-10-12T15:30:00Z'));
    expect(mail.text).not.toContain('confirm you are ready');
    expect(mail.text).not.toContain('accounts');
    /* Changed 4 November 2026 (release batch 1): the reminder says when it became ready, and the link, with nothing explaining the report. */
    expect(mail.text).toContain('Read the report');
  });
});
