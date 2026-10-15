import { EmailService } from './email.service';

/**
 * HAFSAH, 14 OCTOBER: EMAIL QUIET HOURS END AT 7 IN THE MORNING IN THE ORGANISATION'S TIME ZONE. Mercy's morning mails
 * were held to 08:00 UTC, which is 11 in Nairobi, because nobody on the roster had a zone of their own.
 */
function aSender(orgZone: string | null, personZone: string | null = null) {
  const scheduled: any[] = [];
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ organizationId: `org-${orgZone}-${personZone}`, externalId: 'mercy', timezone: personZone })) },
    emailPreference: { findUnique: jest.fn(async () => null) },
    organization: { findUnique: jest.fn(async () => ({ timeZone: orgZone })) },
    user: { findMany: jest.fn(async () => []) },
    scheduledEmail: { create: jest.fn(async ({ data }: any) => { scheduled.push(data); return data; }) },
    notification: { create: jest.fn(async () => ({})) },
  };
  const svc: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  svc.writeItDown = jest.fn();
  return { svc, scheduled };
}
const MAIL = { to: 'mercy@kilima.test', subject: 'Your next check-in is open: Sales daily', html: '<p>Hi</p>' };

describe('quiet hours end at 7 where the team is', () => {
  afterEach(() => jest.useRealTimers());
  it('at 06:30 in Nairobi a mail is held, and goes at 07:00 Nairobi time (04:00 UTC)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T03:30:00Z'));
    const { svc, scheduled } = aSender('Africa/Nairobi');
    expect(await svc.holdForTheMorning(MAIL, undefined, 'sendSessionReady')).toBe(true);
    expect(scheduled[0].notBefore.toISOString()).toBe('2026-10-17T04:00:00.000Z');
  });
  it('at 07:10 in Nairobi it goes at once', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T04:10:00Z'));
    const { svc } = aSender('Africa/Nairobi');
    expect(await svc.holdForTheMorning(MAIL, undefined, 'sendSessionReady')).toBe(false);
  });
  it('a person\'s own zone still comes first', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T05:30:00Z'));
    const { svc } = aSender('Africa/Nairobi', 'Africa/Lagos');
    expect(await svc.holdForTheMorning(MAIL, undefined, 'sendSessionReady')).toBe(true);
  });
});
