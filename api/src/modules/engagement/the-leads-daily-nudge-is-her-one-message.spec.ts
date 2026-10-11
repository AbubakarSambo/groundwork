import { EmailService } from '../email/email.service';
import { whatThisMailIs } from '../email/nothing-goes-out-that-was-turned-off';
import { ROUTINE_EMAILS } from './one-routine-message-a-day';

/**
 * THE LEAD'S DAILY NUDGE IS HER ONE ROUTINE MESSAGE OF THE DAY (decision 120, with decision 109 item 6), through the real email door.
 *
 * Wairimu has an address and a number. The nudge is one routine message: after it, the "has not started" email and the "what is new" email are held for another day.
 * If a WhatsApp message already went to her today, the nudge by email is not sent. And the nudge is a message we decide to send, so the stop link turns it off.
 */
const PARTS = { needsYou: ['Amina\'s leave from Wednesday 14 October to Friday 16 October is waiting for you to approve or decline.'], overdueOnYourTeam: ['Omar committed to “send the price list”. That was due by Tuesday 6 October and is six days late.'], risks: [] as string[] };

function world(opts: { whatsAppToday?: boolean } = {}) {
  const notifications: any[] = [];
  const sent: any[] = [];
  const sends: any[] = opts.whatsAppToday ? [{ phone: '+254700000001', kind: 'lead-summary', sentAt: new Date(), createdAt: new Date() }] : [];
  const people = [{ email: 'wairimu@x.test', phone: '+254700000001', organizationId: 'o1', externalId: 'wairimu', timezone: null }];
  const prisma: any = {
    notification: {
      create: jest.fn(async ({ data }: any) => { notifications.push({ ...data, createdAt: new Date() }); return data; }),
      findMany: jest.fn(async ({ where }: any) => notifications.filter((n) => n.channel === 'email' && n.outcome === where.outcome && where.toAddress.in.includes(n.toAddress) && where.sender.in.includes(n.sender) && n.createdAt >= where.createdAt.gte)),
    },
    whatsAppSend: {
      findMany: jest.fn(async ({ where }: any) => sends.filter((s) => where.phone.in.includes(s.phone) && s.createdAt >= where.createdAt.gte && s.sentAt != null)),
      create: jest.fn(async () => ({})),
    },
    person: {
      findMany: jest.fn(async ({ where }: any) => people.filter((p) => where.OR.some((c: any) => (c.email ? p.email === c.email.equals : c.phone ? c.phone.in.includes(p.phone) : false)))),
      findFirst: jest.fn(async () => ({ organizationId: 'o1', externalId: 'wairimu', timezone: null })),
    },
    user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    emailPreference: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    emailDelivery: { findFirst: jest.fn(async () => null) },
    groundParticipant: { findUnique: jest.fn(async () => null) },
    scheduledEmail: { create: jest.fn(async () => ({})) },
  };
  const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  email.deliverNow = jest.fn(async (o: any, _c: any, sender: string) => { sent.push(o); await email.writeItDown(o, sender, 'sent', null); return 'sent'; });
  email.holdForTheMorning = jest.fn(async () => false);
  return { email, notifications, sent };
}

describe('the nudge by email, as Wairimu reads it', () => {
  it('has the three parts as headings, each line a sentence, and the link', async () => {
    const w = world();
    const went = await w.email.sendTheLeadsDailyNudge('wairimu@x.test', 'One thing needs you and one is overdue on your team', PARTS, 'Wairimu', 'See everything', 'https://myground.work/today');
    expect(went).toBe('sent');
    const html: string = w.sent[0].html;
    const text = html.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n');
    expect(text).toContain('Good morning Wairimu. Here is what is outstanding today.');
    expect(text.indexOf('Needs you')).toBeLessThan(text.indexOf('Overdue on your team'));
    expect(text).not.toContain('Risks');
    expect(html).toContain('href="https://myground.work/today"');
    expect(text).not.toMatch(/people in this check-in/i);
  });
});

describe('the nudge is her one routine message', () => {
  it('after it, the "has not started" email and the "what is new" email wait for another day', async () => {
    const w = world();
    expect(await w.email.sendTheLeadsDailyNudge('wairimu@x.test', 's', PARTS, 'Wairimu', 'See everything', 'https://x.test/today')).toBe('sent');
    expect(await w.email.sendWhoHasNotStarted('wairimu@x.test', 'Not started', 'Omar has not started.')).toBe('suppressed');
    await w.email.sendHeresWhatIsNew('wairimu@x.test', 'New', ['Hello.'], 'Go', 'https://x.test');
    expect(w.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendTheLeadsDailyNudge', 'sent'], ['sendWhoHasNotStarted', 'suppressed'], ['sendHeresWhatIsNew', 'suppressed']]);
  });

  it('if a WhatsApp message already went to her today, the nudge is not sent by email as a second', async () => {
    const w = world({ whatsAppToday: true });
    expect(await w.email.sendTheLeadsDailyNudge('wairimu@x.test', 's', PARTS, 'Wairimu', 'See everything', 'https://x.test/today')).toBe('suppressed');
    expect(w.sent).toEqual([]);
  });
});

describe('and the ways to stop mail still work on it', () => {
  it('it is mail we decide to send, so the stop link and the opt-out in Settings turn it off, and it is counted as a routine message', () => {
    expect(whatThisMailIs('sendTheLeadsDailyNudge')).toBe('we decided to send it');
    expect(ROUTINE_EMAILS.has('sendTheLeadsDailyNudge')).toBe(true);
  });
});
