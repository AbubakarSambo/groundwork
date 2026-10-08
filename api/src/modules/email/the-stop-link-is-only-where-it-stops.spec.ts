import { EmailService } from './email.service';
import { anAppealWaitsForYou } from '../suites/a-review-appeal';

/**
 * "STOP THEM HERE" IS ONLY UNDER MAIL THE STOP STOPS (after-piece check, 8 October). A person who stopped our emails is still sent a report they took part in,
 * a review appeal, a notice that somebody is waiting and so on, because they are not what the stop is about. Those carried the same footer, which promised
 * what it could not do. Read as each person receives it.
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
const STOP = /stop them here/;
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

describe('the stop link', () => {
  it('is not under a report-ready mail, an appeal mail, or a lead\'s notice that somebody checked in, and those carry no one-click header either', async () => {
    const d = door();
    await d.email.sendReportReady('imani@x.test', 'Q4', 'https://app.test/r');
    const m = anAppealWaitsForYou('Grace', 'Imani', 'Baraka');
    await d.email.sendTeamAlert('grace@x.test', m.subject, m.lines.map(esc), m.linkLabel, 'https://app.test/suite/reviews');
    await d.email.sendParticipantCheckedIn('wairimu@x.test', 'Abigail', 'Kenya launch', 'https://app.test/grounds/g1', 1);
    expect(d.sent).toHaveLength(3);
    for (const s of d.sent) {
      expect({ subject: s.subject, stop: STOP.test(s.html) }).toEqual({ subject: s.subject, stop: false });
      expect(s.headers?.['List-Unsubscribe']).toBeUndefined();
    }
  });

  it('is under the mail we decide to send: the not-started notice to a lead, and the reminder', async () => {
    const d = door();
    await d.email.sendWhoHasNotStarted('mira@x.test', 'Ines has not started "X"', 'Hi Mira, Ines has not started the check-in on "X".');
    await d.email.sendNudge('ines@x.test', 'X', 'https://app.test/c', undefined, false, null, 'p1');
    expect(d.sent).toHaveLength(2);
    for (const s of d.sent) expect({ subject: s.subject, stop: STOP.test(s.html) }).toEqual({ subject: s.subject, stop: true });
  });
});
