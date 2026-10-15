import { GroundsCron } from '../grounds/grounds.cron';
import { theOpeningNeverReachedThem, itHasBeenOpenLongEnough, CATCH_UP_KIND } from './a-person-the-opening-never-reached';
import { theCheckInIsOpen, theCheckInIsStillOpen } from '../whatsapp/what-goes-to-a-phone';
import { TEMPLATES, templateFor, FIRST_MESSAGES, OPENING_OR_CLOSING } from '../whatsapp/a-message-outside-the-window';
import { aRoutineWhatsApp } from './one-routine-message-a-day';

/**
 * A NUMBER ON RECORD IS NOT A PERSON REACHED (participant activation spec, section 3 B; section 5, channel readiness). Read as Chidi reads it on his phone.
 *
 * Msingi Foods turned WhatsApp on after Chidi's session of "Sales team, Q4" opened, eight days ago. The opening notice went when the session opened, which was before
 * WhatsApp was on, so nobody has ever written to him there. The lead's chase days are thirty days out, so nothing was due. This morning he is written to once, in the
 * opening notice's own words and its own template, and never again for that session, however often the integration or the server restarts.
 */
const DAY = 86_400_000;
const NOW = new Date('2026-10-12T08:30:00Z');
const PHONES = ['+254712345678', '254712345678', '0712345678'];

function theRecord(opts: { sends?: any[]; engaged?: boolean } = {}) {
  return {
    whatsAppSend: {
      findFirst: jest.fn(async (q: any) => (opts.sends ?? []).find((s) => q.where.phone.in.includes(s.phone) && s.sentAt != null && !String(s.kind).startsWith('admin-test')) ?? null),
      findMany: jest.fn(async () => []),
    },
    checkIn: { findFirst: jest.fn(async () => (opts.engaged ? { id: 'other' } : null)) },
  };
}
const aSession = (over: any = {}) => ({ id: 'ci-1', availableFrom: null, createdAt: new Date(NOW.getTime() - 8 * DAY), participant: { userId: 'u-1', remindersStoppedAt: null }, ...over });

describe('who the opening never reached', () => {
  it('somebody nobody has ever written to on this number, with a session open eight days, is reached', async () => {
    expect(await theOpeningNeverReachedThem(theRecord(), aSession(), PHONES, NOW)).toBe(true);
  });
  it('is not, once any message from Groundwork went to the number: an opening notice, this, a reminder, the lead\'s summary', async () => {
    for (const kind of ['checkin-open', 'checkin-open:template', CATCH_UP_KIND, `${CATCH_UP_KIND}:template`, 'overdue', 'lead-summary:template']) {
      expect({ kind, again: await theOpeningNeverReachedThem(theRecord({ sends: [{ checkInId: 'ci-1', phone: '+254712345678', kind, sentAt: new Date() }] }), aSession(), PHONES, NOW) }).toEqual({ kind, again: false });
    }
  });
  it('is, when the earlier message never went (refused, or waiting for its template)', async () => {
    expect(await theOpeningNeverReachedThem(theRecord({ sends: [{ checkInId: 'ci-1', phone: '+254712345678', kind: 'checkin-open:template', sentAt: null }] }), aSession(), PHONES, NOW)).toBe(true);
  });
  it('is, on a number nothing has gone to, even for a session whose notice went to the person\'s old number', async () => {
    expect(await theOpeningNeverReachedThem(theRecord({ sends: [{ checkInId: 'ci-1', phone: '+254799999999', kind: 'checkin-open', sentAt: new Date() }] }), aSession(), PHONES, NOW)).toBe(true);
  });
  it('is not for a session that opened today, or that has been open for months', async () => {
    expect(itHasBeenOpenLongEnough(new Date(NOW.getTime() - 3 * 3600_000), NOW)).toBe(false);
    expect(itHasBeenOpenLongEnough(new Date(NOW.getTime() - 40 * DAY), NOW)).toBe(false);
    expect(itHasBeenOpenLongEnough(new Date(NOW.getTime() - 8 * DAY), NOW)).toBe(true);
  });
  it('is not for somebody who stopped the reminders, or who is already engaged some other way', async () => {
    expect(await theOpeningNeverReachedThem(theRecord(), aSession({ participant: { userId: 'u-1', remindersStoppedAt: new Date() } }), PHONES, NOW)).toBe(false);
    expect(await theOpeningNeverReachedThem(theRecord({ engaged: true }), aSession(), PHONES, NOW)).toBe(false);
  });
});

describe('the catch-up is the opening notice\'s own words and its own template, and it is the day\'s routine message', () => {
  it('reads the same as the opening notice, and goes as checkin_open', () => {
    const w = { firstName: 'Chidi', label: 'Sales team, Q4' };
    expect(theCheckInIsStillOpen(w).text).toBe(theCheckInIsOpen(w).text);
    expect(theCheckInIsStillOpen(w).text).toBe('Hi Chidi, your check-in for Sales team, Q4 is open. It takes about ten minutes, and you can answer right here. Reply START to begin.');
    expect(TEMPLATES[CATCH_UP_KIND].name).toBe('checkin_open');
    expect(templateFor(CATCH_UP_KIND, ['checkin_open'])?.name).toBe('checkin_open');
    expect(templateFor(CATCH_UP_KIND, [])).toBeNull();
  });
  it('is counted as a routine message, and is not an opening, so it never makes a second message in a day', () => {
    expect(FIRST_MESSAGES.has(CATCH_UP_KIND)).toBe(true);
    expect(OPENING_OR_CLOSING.has(CATCH_UP_KIND)).toBe(false);
    expect(aRoutineWhatsApp(`${CATCH_UP_KIND}:template`)).toBe(true);
    expect(aRoutineWhatsApp('checkin-open')).toBe(false);
  });
});

describe('the morning job', () => {
  function aMorning(opts: { sends?: any[]; engaged?: boolean; chasingStopped?: boolean; chaseAfterDays?: number[]; opened?: Date } = {}) {
    const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
    const row = {
      id: 'ci-1', groundId: 'g-1', sessionNumber: 1, participantId: 'gp-1', createdAt: opts.opened ?? new Date(Date.now() - 8 * DAY), availableFrom: null,
      ground: { label: 'Sales team, Q4', scenario: 'PULSE_CHECK', organizationId: 'org-1', overWhatsApp: null, cadence: 'MONTHLY', chaseAfterDays: opts.chaseAfterDays ?? [30], chasingStopped: !!opts.chasingStopped, tellTheLead: true, initiator: { firstName: 'Wairimu' } },
      participant: { id: 'gp-1', email: 'chidi@example.com', userId: 'u-1', remindersStoppedAt: null, user: { firstName: 'Chidi', email: 'chidi@example.com', phoneNumber: null, isActive: true, deletedAt: null } },
    };
    const record = theRecord(opts);
    const prisma: any = {
      checkIn: { findMany: jest.fn(async () => [row]), findFirst: record.checkIn.findFirst },
      groundParticipant: { findMany: jest.fn(async () => []) },
      organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
      leaveRequest: { findMany: jest.fn(async () => []) },
      whatsAppSend: { findMany: jest.fn(async () => []), findFirst: record.whatsAppSend.findFirst },
      person: { findFirst: jest.fn(async () => ({ phone: '+254712345678' })) },
    };
    const cron = new GroundsCron(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, { sendFor, isEnabled: async () => true } as any, {} as any);
    (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    return { cron, sendFor };
  }

  it('writes to Chidi once, in the opening notice\'s words, as a catch-up', async () => {
    const { cron, sendFor } = aMorning();
    await cron.sendWhatsAppRemindersInner(new Date());
    expect(sendFor).toHaveBeenCalledTimes(1);
    const [org, phone, text, ctx] = sendFor.mock.calls[0];
    expect([org, phone]).toEqual(['org-1', '+254712345678']);
    expect(text).toBe('Hi Chidi, your check-in for Sales team, Q4 is open. It takes about ten minutes, and you can answer right here. Reply START to begin.');
    expect(ctx).toEqual({ checkInId: 'ci-1', kind: CATCH_UP_KIND, params: ['Chidi', 'Sales team, Q4'] });
  });

  it('and not a second time, once it went, however often the job or the server runs again', async () => {
    const { cron, sendFor } = aMorning({ sends: [{ checkInId: 'ci-1', phone: '+254712345678', kind: `${CATCH_UP_KIND}:template`, sentAt: new Date() }] });
    await cron.sendWhatsAppRemindersInner(new Date());
    await cron.sendWhatsAppRemindersInner(new Date());
    expect(sendFor).not.toHaveBeenCalled();
  });

  it('a person with two sessions open is welcomed once: the second session finds the number already reached', async () => {
    const first = aMorning();
    await first.cron.sendWhatsAppRemindersInner(new Date());
    expect(first.sendFor).toHaveBeenCalledTimes(1);
    const second = aMorning({ sends: [{ checkInId: 'ci-0', phone: '+254712345678', kind: `${CATCH_UP_KIND}:template`, sentAt: new Date() }] });
    await second.cron.sendWhatsAppRemindersInner(new Date());
    expect(second.sendFor).not.toHaveBeenCalled();
  });

  it('not when the lead has stopped the chasing, when the session opened today, or when he is already answering some other check-in', async () => {
    for (const opts of [{ chasingStopped: true }, { opened: new Date() }, { engaged: true }]) {
      const { cron, sendFor } = aMorning(opts);
      await cron.sendWhatsAppRemindersInner(new Date());
      expect({ opts, sent: sendFor.mock.calls.length }).toEqual({ opts, sent: 0 });
    }
  });

  it('and when the chase has something to say that morning, the chase goes and the catch-up waits: one message', async () => {
    const { cron, sendFor } = aMorning({ chaseAfterDays: [7, 14] });
    await cron.sendWhatsAppRemindersInner(new Date());
    expect(sendFor).toHaveBeenCalledTimes(1);
    expect(sendFor.mock.calls[0][3].kind).not.toBe(CATCH_UP_KIND);
  });
});
