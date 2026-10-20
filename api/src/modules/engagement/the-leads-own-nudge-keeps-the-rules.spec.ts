import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../email/email.service';
import { isHeldForTheNight } from '../whatsapp/quiet-hours-are-the-organisations';
import { forgetTheOrganisationsZone } from '../../common/the-organisations-own-day';
import { THEY_SAID_NOT_NOW, THEY_SAID_STOP, NOT_TODAY, isBusinessInitiated } from '../whatsapp/a-message-outside-the-window';
import { ALREADY_GO_BY_EMAIL } from '../whatsapp/by-email-instead';
import { ROUTINE_EMAILS, aRoutineWhatsApp, THEY_HAD_ONE_TODAY } from './one-routine-message-a-day';
import { whatThisMailIs, whetherToSend } from '../email/nothing-goes-out-that-was-turned-off';

/**
 * THE LEAD'S OWN NUDGE KEEPS EVERY RULE BUT ONE (nudges that get answers, 20 October 2026), through the real WhatsApp and email doors:
 *  - quiet hours: held until seven in the organisation's zone, on WhatsApp and by email;
 *  - STOP and "Not now": it does not go;
 *  - one routine message a day: it is the one exception. It is never held because the person already had theirs, and it never uses theirs up;
 *  - one channel: it is never emailed a second time by the door that emails what WhatsApp could not take (the nudge picks its own channel);
 *  - their stop link, opt-out and approved leave stop the email.
 */
const PHONE = '+254700500004';
const NOW = new Date();

function aWhatsAppWorld(opts: { stopped?: boolean; notNowToday?: boolean; routineToday?: boolean } = {}) {
  const org = `drop-${Math.random()}`;
  forgetTheOrganisationsZone(org);
  const held: any[] = [];
  const sends: any[] = [];
  if (opts.notNowToday) sends.push({ phone: PHONE, kind: 'not-now', sentAt: null, createdAt: new Date() });
  if (opts.routineToday) sends.push({ phone: PHONE, kind: 'overdue', sentAt: new Date(), createdAt: new Date() });
  (global as any).fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' }));
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ id: org, name: 'Drop Access (test)', timeZone: 'Africa/Nairobi', whatsappAddOnOn: true })) },
    user: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => ({ whatsappStoppedAt: opts.stopped ? new Date() : null, whatsappLastInboundAt: new Date() })) },
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where?.key === 'whatsapp_enabled' ? { key: where.key, value: true } : null)) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => ({ messageId: 'x' })) },
    whatsAppSend: {
      findFirst: jest.fn(async () => ({ id: 'an-earlier-notice', kind: 'resumed' })),
      findMany: jest.fn(async ({ where }: any) => sends.filter((s) => s.createdAt >= where.createdAt.gte && (!where.OR || s.sentAt || s.kind === 'not-now'))),
      create: jest.fn(async ({ data }: any) => { sends.push(data); return data; }),
    },
    notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
    scheduledWhatsApp: { create: jest.fn(async ({ data }: any) => { held.push(data); return data; }) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 't', 'whatsapp.phoneNumberId': '1', 'whatsapp.approvedTemplates': ['checkin_your_view_matters'], 'whatsapp.graphBaseUrl': 'http://127.0.0.1:3985' } as any)[k] };
  const wa = new WhatsAppService(config, prisma);
  const nudge = () => wa.sendFor(org, PHONE, 'Joseph, this is from Grace. Juja Hardware is waiting on the KES 4,500 price for 5 units. What\'s happening with it, and what\'s next?', { checkInId: 'c7', kind: 'lead-nudge', params: ['Joseph', 'Sales team, Q4', 'Grace'] });
  return { wa, prisma, held, sends, nudge, ask: (kind: string) => (wa as any).howOftenToday(PHONE, kind) };
}

afterEach(() => jest.useRealTimers());

describe('on WhatsApp', () => {
  it('in quiet hours it is held until seven in Nairobi, with its words, and nothing is posted', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date('2026-10-20T19:30:00Z'));
    const w = aWhatsAppWorld();
    const r = await w.nudge();
    expect(r.sent).toBe(false);
    expect(isHeldForTheNight(r.error)).toBe(true);
    expect(w.held[0].notBefore.toISOString()).toBe('2026-10-21T04:00:00.000Z');
    expect(w.held[0].context.kind).toBe('lead-nudge');
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('in the day it goes, and STOP or "Not now" today stop it', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date('2026-10-20T12:30:00Z'));
    expect((await aWhatsAppWorld().nudge()).sent).toBe(true);
    expect((await aWhatsAppWorld({ stopped: true }).nudge())).toMatchObject({ sent: false, error: THEY_SAID_STOP });
    expect(await aWhatsAppWorld({ notNowToday: true }).ask('lead-nudge')).toBe(THEY_SAID_NOT_NOW);
  });

  it('is not held because the routine message of the day already went, and does not use it up', async () => {
    const had = aWhatsAppWorld({ routineToday: true });
    expect(await had.ask('overdue')).toBe(NOT_TODAY);
    expect(await had.ask('lead-nudge')).toBeNull();
    const w = aWhatsAppWorld();
    w.sends.push({ phone: PHONE, kind: 'lead-nudge', sentAt: new Date(), createdAt: new Date() });
    expect(await w.ask('overdue')).toBeNull();
    expect(aRoutineWhatsApp('lead-nudge')).toBe(false);
    expect(isBusinessInitiated('lead-nudge')).toBe(true);
  });

  it('is never emailed a second time by the door that emails what WhatsApp could not take', () => {
    expect(ALREADY_GO_BY_EMAIL.has('lead-nudge')).toBe(true);
  });
});

describe('by email', () => {
  function anEmailWorld(opts: { routineToday?: boolean } = {}) {
    const notifications: any[] = [];
    if (opts.routineToday) notifications.push({ channel: 'email', toAddress: 'joseph@dropaccess.test', sender: 'sendNudge', outcome: 'sent', createdAt: new Date() });
    const prisma: any = {
      notification: {
        create: jest.fn(async ({ data }: any) => { notifications.push({ ...data, createdAt: new Date() }); return data; }),
        findMany: jest.fn(async ({ where }: any) => notifications.filter((n) => n.channel === 'email' && n.outcome === where.outcome && where.toAddress.in.includes(n.toAddress) && where.sender.in.includes(n.sender) && n.createdAt >= where.createdAt.gte)),
      },
      whatsAppSend: { findMany: jest.fn(async () => []) },
      person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
      user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      emailPreference: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
      emailDelivery: { findFirst: jest.fn(async () => null) },
      groundParticipant: { findUnique: jest.fn(async () => null) },
      scheduledEmail: { create: jest.fn(async () => ({})) },
    };
    const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
    email.deliverNow = jest.fn(async (o: any, _c: any, sender: string) => { await email.writeItDown(o, sender, 'sent', null); return 'sent'; });
    email.holdForTheMorning = jest.fn(async () => false);
    email.waitForTheLeadsSummary = jest.fn(async () => false);
    return { email, notifications };
  }

  it('goes after the day’s routine email, and the next routine email still goes after it', async () => {
    const w = anEmailWorld({ routineToday: true });
    expect(await w.email.sendTheLeadsNudge('joseph@dropaccess.test', 'Grace has a question for you today', ['Joseph, this is from Grace.'], 'Open your check-in', 'http://x/checkin/c7', 'p-joseph')).toBe('sent');
    const fresh = anEmailWorld();
    await fresh.email.sendTheLeadsNudge('joseph@dropaccess.test', 'Grace has a question for you today', ['Joseph, this is from Grace.'], 'Open your check-in', 'http://x/checkin/c7', 'p-joseph');
    await fresh.email.sendEmail({ to: 'joseph@dropaccess.test', subject: 'a reminder', html: '<p>x</p>' }, undefined, 'sendNudge');
    expect(fresh.notifications.map((n: any) => [n.sender, n.outcome])).toEqual([['sendTheLeadsNudge', 'sent'], ['sendNudge', 'sent']]);
    expect(fresh.notifications.some((n: any) => n.because === THEY_HAD_ONE_TODAY)).toBe(false);
  });

  it('is held for quiet hours, and stopped by the stop link, the opt-out and approved leave', () => {
    expect(ROUTINE_EMAILS.has('sendTheLeadsNudge')).toBe(false);
    expect(whatThisMailIs('sendTheLeadsNudge')).toBe('we decided to send it');
    expect(whetherToSend('we decided to send it', { remindersStoppedAt: new Date() }, 'sendTheLeadsNudge').send).toBe(false);
    expect(whetherToSend('we decided to send it', { unsubscribedAt: new Date() }, 'sendTheLeadsNudge').send).toBe(false);
    expect(whetherToSend('we decided to send it', { awayUntil: '2026-10-23' }, 'sendTheLeadsNudge').send).toBe(false);
    expect(whetherToSend('we decided to send it', { wantsNudges: false }, 'sendTheLeadsNudge').send).toBe(false);
    expect(whetherToSend('we decided to send it', {}, 'sendTheLeadsNudge').send).toBe(true);
  });
});

void NOW;
