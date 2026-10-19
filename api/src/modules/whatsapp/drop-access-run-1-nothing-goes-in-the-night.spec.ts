import { WhatsAppService } from './whatsapp.service';
import { HeldForTheNightCron } from './held-for-the-night.cron';
import { heldUntilTheMorning, isHeldForTheNight } from './quiet-hours-are-the-organisations';
import { withinTheDay } from './a-check-in-left-halfway';
import { itIsQuietNow } from '../suites/the-approvals-summary';
import { theOrganisationsZone, forgetTheOrganisationsZone } from '../../common/the-organisations-own-day';
import { EmailService } from '../email/email.service';
import { ReportsListener } from '../reports/reports.listener';

/**
 * DROP ACCESS RUN 1, ITEM 12: NOTHING GOES IN THE NIGHT, WHERE THE ORGANISATION IS (gw_sweep_drop10, 18 October 2026).
 *
 * Drop Access is in Nairobi. Joseph's day 5 check-in (session 5, 16 October) was closed by the clock at 23:30 UTC, half past two in the
 * morning in Nairobi, after he had said only "I do not know". Two things went in the night:
 *   - Grace was emailed "Joseph Kariuki has checked in on Sales team, Q4" with "Everyone has now checked in." at 23:30 UTC;
 *   - Joseph's report notice went on WhatsApp at 00:00 UTC on Saturday (three in the morning in Nairobi):
 *     "Your report for Sales team, Q4 is ready. 5 settled, 1 still open. Open Groundwork to read it."
 * Release plan Part 0: quiet hours end at 7am in the organisation's time zone. These are the run's own rows and words.
 */
const JOSEPH_PHONE = '+254700300004';
const JOSEPHS_REPORT = 'Your report for Sales team, Q4 is ready. 5 settled, 1 still open. Open Groundwork to read it.';
const AT_MIDNIGHT_UTC = new Date('2026-10-17T00:00:00.003Z');
const SEVEN_IN_NAIROBI = '2026-10-17T04:00:00.000Z';

let orgN = 0;
function aWorld(orgZone: string | null, phones: string[] = [JOSEPH_PHONE]) {
  const org = `drop-access-${orgZone ?? 'unnamed'}-${(orgN += 1)}`;
  forgetTheOrganisationsZone(org);
  const held: any[] = [];
  const sendRows: any[] = [];
  const posted: any[] = [];
  (global as any).fetch = jest.fn(async (_url: string, init: any) => { posted.push(JSON.parse(init.body)); return { ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}', json: async () => ({ messages: [{ id: 'wamid.1' }] }) }; });
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ id: org, name: 'Drop Access (test)', timeZone: orgZone, whatsappAddOnOn: true, country: null })) },
    user: { findMany: jest.fn(async () => phones.map((phoneNumber) => ({ phoneNumber }))), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: null })) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: {
      /* Joseph has been written to before (his opening notices), and never said STOP. */
      findFirst: jest.fn(async ({ where }: any) => (where?.kind?.in ? null : { id: 'an-earlier-notice' })),
      findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }: any) => { sendRows.push(data); return data; }),
    },
    notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
    checkIn: { findUnique: jest.fn(async () => ({ ground: { organizationId: org } })) },
    scheduledWhatsApp: {
      create: jest.fn(async ({ data }: any) => { const row = { id: `h-${held.length + 1}`, sentAt: null, ...data }; held.push(row); return row; }),
      findMany: jest.fn(async ({ where }: any) => held.filter((r) => !r.sentAt && r.notBefore <= where.notBefore.lte)),
      update: jest.fn(async ({ where, data }: any) => Object.assign(held.find((r) => r.id === where.id), data)),
    },
    withAdvisoryLock: jest.fn(async (_k: number, fn: () => Promise<void>) => { await fn(); return true; }),
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': ['groundwork_report_ready', 'groundwork_first_contact', 'checkin_open'], 'whatsapp.graphBaseUrl': 'http://127.0.0.1:3985' } as any)[k] };
  const wa = new WhatsAppService(config, prisma);
  return { org, prisma, wa, held, sendRows, posted, cron: new HeldForTheNightCron(prisma, wa) };
}
const theReport = (wa: WhatsAppService, org: string) =>
  wa.sendFor(org, JOSEPH_PHONE, JOSEPHS_REPORT, { checkInId: '56f857ae-e8b9-4997-b078-a1f1a0251905', kind: 'report', params: ['Sales team, Q4', '5 settled, 1 still open.'] });

afterEach(() => jest.useRealTimers());

describe("the organisation's zone is Nairobi", () => {
  it('named by its admin, as the run now does', async () => {
    const w = aWorld('Africa/Nairobi');
    expect(await theOrganisationsZone(w.prisma, w.org)).toBe('Africa/Nairobi');
  });
  it('and read from its people\'s numbers (+254) where nobody has named one, never Lagos', async () => {
    const w = aWorld(null, ['+254700300001', '+254700300002', '+254700300003', '+254700300004']);
    expect(await theOrganisationsZone(w.prisma, w.org)).toBe('Africa/Nairobi');
  });
});

describe("Joseph's report notice at midnight UTC (three in the morning in Nairobi)", () => {
  it('before: it went at once. Now it is held, with its words, until seven in Nairobi, and nothing is posted', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(AT_MIDNIGHT_UTC);
    const w = aWorld('Africa/Nairobi');
    const result = await theReport(w.wa, w.org);
    expect(result.sent).toBe(false);
    expect(isHeldForTheNight(result.error)).toBe(true);
    expect(w.posted).toHaveLength(0);
    expect(w.held).toHaveLength(1);
    expect(w.held[0].text).toBe(JOSEPHS_REPORT);
    expect(w.held[0].notBefore.toISOString()).toBe(SEVEN_IN_NAIROBI);
    expect(w.sendRows.map((r) => r.kind)).toEqual(['report:quiet-hours']);
  });

  it('at seven in Nairobi the held notice goes, as the approved template with the same words', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(AT_MIDNIGHT_UTC);
    const w = aWorld('Africa/Nairobi');
    await theReport(w.wa, w.org);
    /* At a quarter to seven nothing is due yet. */
    jest.setSystemTime(new Date('2026-10-17T03:45:00Z'));
    expect(await w.cron.sendWhatIsDue(new Date())).toBe(0);
    expect(w.posted).toHaveLength(0);
    jest.setSystemTime(new Date(SEVEN_IN_NAIROBI));
    expect(await w.cron.sendWhatIsDue(new Date())).toBe(1);
    expect(w.posted).toHaveLength(1);
    expect(w.posted[0].template.name).toBe('groundwork_report_ready');
    expect(w.posted[0].template.components[0].parameters.map((p: any) => p.text)).toEqual(['Sales team, Q4', '5 settled, 1 still open.']);
    /* Tried once: the next pass sends nothing more. */
    expect(await w.cron.sendWhatIsDue(new Date())).toBe(0);
  });

  it('the opening notice at 05:00 UTC (eight in Nairobi) is not held', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date('2026-10-19T05:00:00.018Z'));
    const w = aWorld('Africa/Nairobi');
    await w.wa.sendFor(w.org, JOSEPH_PHONE, 'Hi Joseph, your check-in for Sales team, Q4 is open.', { checkInId: 'f1069196-1d06-4acd-bee9-5d45a40bbfd4', kind: 'checkin-open', params: ['Joseph', 'Sales team, Q4'] });
    expect(w.held).toHaveLength(0);
    expect(w.posted).toHaveLength(1);
  });

  it('a reply to something Joseph just wrote is never held: he is awake', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(AT_MIDNIGHT_UTC);
    expect(await heldUntilTheMorning(aWorld('Africa/Nairobi').prisma, null)).toBeNull();
    const w = aWorld('Africa/Nairobi');
    await w.wa.sendFor(w.org, JOSEPH_PHONE, 'Thank you, that is kept.', { kind: 'reply' });
    expect(w.held).toHaveLength(0);
  });
});

describe('the other clocks read the organisation\'s zone, not Lagos', () => {
  it('the reminder to carry on: 18:30 UTC is 21:30 in Nairobi, outside the day (it was inside, read in Lagos)', () => {
    const at = new Date('2026-10-16T18:30:00Z');
    expect(withinTheDay(at, 'Africa/Lagos')).toBe(true);
    expect(withinTheDay(at, 'Africa/Nairobi')).toBe(false);
  });
  it('the approvals summary: 04:30 UTC is 7:30 in Nairobi, not quiet (it was quiet, read in Lagos)', () => {
    const at = new Date('2026-10-19T04:30:00Z');
    expect(itIsQuietNow(at, null)).toBe(true);
    expect(itIsQuietNow(at, 'Africa/Nairobi')).toBe(false);
  });
});

describe('Grace is not emailed "Joseph Kariuki has checked in" for a session the clock closed', () => {
  function aListener(closedReason: string | null) {
    const sent: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({
        label: 'Sales team, Q4', initiator: { email: 'grace@dropaccess.test' },
        participants: [
          { id: 'p-grace', managingOnly: false, partyType: 'INITIATOR', user: { email: 'grace@dropaccess.test', firstName: 'Grace', lastName: 'Achieng', isActive: true }, checkIns: [] },
          { id: 'p-kevin', managingOnly: false, partyType: 'PARTICIPANT', user: { email: 'kevin@dropaccess.test', firstName: 'Kevin', lastName: 'Omondi', isActive: true }, checkIns: [{ id: 'k5' }] },
          { id: 'p-mercy', managingOnly: false, partyType: 'PARTICIPANT', user: { email: 'mercy@dropaccess.test', firstName: 'Mercy', lastName: 'Wairimu', isActive: true }, checkIns: [{ id: 'm5' }] },
          /* "I do not know", said twelve times: there are turns, and the clock closed it. */
          { id: 'p-joseph', managingOnly: false, partyType: 'PARTICIPANT', user: { email: 'joseph@dropaccess.test', firstName: 'Joseph', lastName: 'Kariuki', isActive: true }, checkIns: [{ id: '56f857ae-e8b9-4997-b078-a1f1a0251905' }] },
        ],
      })) },
      checkIn: { findUnique: jest.fn(async () => ({ closedReason })) },
    };
    const email: any = { sendParticipantCheckedIn: jest.fn(async (...a: any[]) => { sent.push(a); }) };
    const listener: any = Object.create(ReportsListener.prototype);
    Object.assign(listener, { prisma, email, config: { get: () => 'http://localhost:5195' }, logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() } });
    return { listener, sent };
  }
  const JOSEPHS_DAY_5 = { checkInId: '56f857ae-e8b9-4997-b078-a1f1a0251905', groundId: 'ffa3b4b1-5ce0-4651-b35b-bf5ecc42d5be', participantId: 'p-joseph', sessionNumber: 5 };
  it('closed by the clock at 23:30: nothing is sent', async () => {
    const { listener, sent } = aListener('auto_closed');
    await listener.notifyAdminOnCheckIn(JOSEPHS_DAY_5);
    expect(sent).toHaveLength(0);
  });
  it('finished by Joseph himself: she is told, as before', async () => {
    const { listener, sent } = aListener(null);
    await listener.notifyAdminOnCheckIn(JOSEPHS_DAY_5);
    expect(sent).toHaveLength(1);
    expect(sent[0][1]).toBe('Joseph Kariuki');
  });
});

describe('a mail somebody asked for is held in the night too, until seven in Nairobi', () => {
  it('"Joseph Kariuki has checked in" at 23:30 UTC is held to 04:00 UTC', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-16T23:30:00.002Z'));
    const scheduled: any[] = [];
    const prisma: any = {
      person: { findFirst: jest.fn(async () => ({ organizationId: 'org-drop-access-mail', externalId: 'grace', timezone: null })), findMany: jest.fn(async () => []) },
      emailPreference: { findUnique: jest.fn(async () => null) },
      organization: { findUnique: jest.fn(async () => ({ timeZone: 'Africa/Nairobi' })) },
      user: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) },
      scheduledEmail: { create: jest.fn(async ({ data }: any) => { scheduled.push(data); return data; }) },
      notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
      whatsAppSend: { findMany: jest.fn(async () => []) },
      emailAddressPreference: { findUnique: jest.fn(async () => null) },
      emailDelivery: { findFirst: jest.fn(async () => null) },
      groundParticipant: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    };
    const svc: any = new EmailService({ get: () => undefined } as any, { send: jest.fn() } as any, prisma);
    svc.writeItDown = jest.fn();
    svc.deliverNow = jest.fn();
    await svc.sendParticipantCheckedIn('grace@dropaccess.test', 'Joseph Kariuki', 'Sales team, Q4', 'http://localhost:5195/grounds/ffa3b4b1', 0);
    expect(svc.deliverNow).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].notBefore.toISOString()).toBe(SEVEN_IN_NAIROBI);
  });
});
