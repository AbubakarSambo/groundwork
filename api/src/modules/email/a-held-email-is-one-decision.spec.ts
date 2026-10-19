import { HeldMailCron } from './held-mail.cron';
import { HeldForTheNightCron } from '../whatsapp/held-for-the-night.cron';

/**
 * ONE ROUTINE MESSAGE A DAY HOLDS FOR A HELD EMAIL TOO, AND ONE HELD EMAIL IS ONE DECISION (Hafsah, 19 October, point 7; messages
 * test of 19 October, finding 3).
 *
 * Drop Access, Thursday 15 October. Grace's WhatsApp summary went at 11:00 ("Good morning Grace. Here is today's summary of your
 * check-ins. ..."). The email "Three of four people have checked in for the third check-in on "Sales team, Q4", and here is what is
 * new", held at 05:00 to wait for her summary, reached her at 11:30 all the same, while a row for the same email said "suppressed".
 * Two runs of the held-mail job read the same row before either marked it: one sent it, and the other then found her day's one
 * message gone. Now the one run that takes the row asks the day's rules at the moment of sending; the other leaves it alone.
 */
const SUBJECT = 'Three of four people have checked in for the third check-in on "Sales team, Q4", and here is what is new';

function aBed() {
  const row = { id: 'held-1', toAddress: 'grace@dropaccess.test', subject: SUBJECT, html: '<p>Hello Grace.</p>', sender: 'sendHeresWhatIsNew', context: null, notBefore: new Date('2026-10-15T08:30:00Z'), sentAt: null as Date | null };
  const prisma: any = {
    scheduledEmail: {
      /* Both runs read the row while it is still unmarked. */
      findMany: jest.fn(async () => [{ ...row, sentAt: null }]),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.sentAt === null && row.sentAt !== null) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
      update: jest.fn(async ({ data }: any) => { Object.assign(row, data); return row; }),
    },
    withAdvisoryLock: jest.fn(async (_k: number, fn: () => Promise<void>) => { await fn(); return true; }),
  };
  const outcomes: string[] = [];
  /* The one door: the first decision sends it, and once it has gone, her day's one message is used, so a second is suppressed. */
  const email: any = { deliverHeld: jest.fn(async () => { outcomes.push(outcomes.length ? 'suppressed' : 'sent'); await new Promise((r) => setTimeout(r, 5)); }) };
  return { cron: new HeldMailCron(prisma, email), email, outcomes, row };
}

describe('a held email is one decision', () => {
  it("two runs at 11:30 on Thursday 15 October send Grace's held email at most once, and never both send it and suppress it", async () => {
    const { cron, email, outcomes } = aBed();
    await Promise.all([cron.sendWhatIsDue(), cron.sendWhatIsDue()]);
    expect(email.deliverHeld).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual(['sent']);
  });

  it('a held email that could not be sent is let go, so the next run tries it again', async () => {
    const { cron, email, row } = aBed();
    email.deliverHeld.mockRejectedValueOnce(new Error('Resend did not answer'));
    await cron.sendWhatIsDue();
    expect(row.sentAt).toBeNull();
  });

  it('a WhatsApp message held for the night is sent once by two runs as well', async () => {
    const row = { id: 'h-1', organizationId: 'org-drop', phone: '+254700300001', text: 'Good morning Grace.', context: { kind: 'lead-summary' }, notBefore: new Date('2026-10-15T04:00:00Z'), sentAt: null as Date | null };
    const prisma: any = {
      scheduledWhatsApp: {
        findMany: jest.fn(async () => [{ ...row, sentAt: null }]),
        updateMany: jest.fn(async ({ where, data }: any) => { if (where.sentAt === null && row.sentAt !== null) return { count: 0 }; Object.assign(row, data); return { count: 1 }; }),
      },
      withAdvisoryLock: jest.fn(async (_k: number, fn: () => Promise<void>) => { await fn(); return true; }),
    };
    const wa: any = { sendHeldForTheNight: jest.fn(async () => ({ sent: true })) };
    const cron = new HeldForTheNightCron(prisma, wa);
    await Promise.all([cron.sendWhatIsDue(new Date('2026-10-15T04:00:00Z')), cron.sendWhatIsDue(new Date('2026-10-15T04:00:00Z'))]);
    expect(wa.sendHeldForTheNight).toHaveBeenCalledTimes(1);
  });
});
