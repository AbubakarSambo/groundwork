import { GroundsCron } from '../grounds/grounds.cron';
import { itIsDueTomorrow } from './what-goes-to-a-phone';

/**
 * NO "DUE TOMORROW" ON WHATSAPP FOR A SESSION ALREADY OPENED BY EMAIL (Hafsah, 19 October, point 8; messages test, finding 4).
 *
 * Drop Access, Monday 12 October. Amos was let in at 09:15 and emailed "You can start your check-in now". At 11:30 the morning
 * reminders sent him, as his first WhatsApp message ever, "This is Groundwork, writing for Drop Access (test). Hi Amos, your
 * check-in for Sales team, Q4 is due tomorrow, Tuesday 13 October. You can answer here whenever suits you before then. Not you?
 * Reply STOP." for the same session. David at Muchemi & Co. was sent the same.
 */
const OPENED = new Date('2026-10-12T06:15:00.000Z');
const MORNING = new Date('2026-10-12T08:30:00.000Z');

function amosMorning(o: { openedByEmail: boolean; openedOnWhatsApp?: boolean }) {
  const ci = {
    id: 'ci-amos-1', groundId: 'g-drop', sessionNumber: 1, participantId: 'gp-amos', createdAt: OPENED, availableFrom: OPENED,
    ground: { label: 'Sales team, Q4', scenario: 'PULSE_CHECK', organizationId: 'org-drop', overWhatsApp: null, cadence: 'DAILY', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: { firstName: 'Grace' } },
    participant: { id: 'gp-amos', email: 'amos@dropaccess.test', userId: 'u-amos', user: { firstName: 'Amos', email: 'amos@dropaccess.test', phoneNumber: null, isActive: true, deletedAt: null } },
  };
  const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
  const prisma: any = {
    checkIn: { findMany: jest.fn(async (q: any) => (q.cursor ? [] : [ci])) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'gp-amos', userId: 'u-amos', ground: { organizationId: 'org-drop' } }]) },
    organization: { findMany: jest.fn(async () => [{ id: 'org-drop' }]) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    whatsAppSend: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => (o.openedOnWhatsApp ? { id: 'the-opening' } : null)) },
    notification: { findFirst: jest.fn(async (q: any) => (o.openedByEmail && q?.where?.sender?.in?.includes('sendYouAreInNow') ? { id: 'you-can-start-your-check-in-now' } : null)) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254700300007' })) },
  };
  const cron = new GroundsCron(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, { sendFor, isEnabled: async () => true } as any, {} as any);
  (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { cron, sendFor };
}

describe('a session opened by email is not reminded "due tomorrow" on WhatsApp', () => {
  it('Amos, emailed "You can start your check-in now" at 09:15, is sent nothing on WhatsApp at 11:30', async () => {
    const { cron, sendFor } = amosMorning({ openedByEmail: true });
    await cron.sendWhatsAppRemindersInner(MORNING);
    expect(sendFor).not.toHaveBeenCalled();
  });

  it('a session that was opened on WhatsApp is reminded there as before', async () => {
    const { cron, sendFor } = amosMorning({ openedByEmail: true, openedOnWhatsApp: true });
    await cron.sendWhatsAppRemindersInner(MORNING);
    expect(sendFor).toHaveBeenCalledTimes(1);
    expect(sendFor.mock.calls[0][2]).toBe(itIsDueTomorrow({ firstName: 'Amos', label: 'Sales team, Q4' }, new Date(OPENED.getTime() + 86_400_000)).text);
    expect(sendFor.mock.calls[0][2]).toBe('Hi Amos, your check-in for Sales team, Q4 is due tomorrow, Tuesday 13 October. You can answer here whenever suits you before then.');
  });

  it('and so is one no email opened', async () => {
    const { cron, sendFor } = amosMorning({ openedByEmail: false });
    await cron.sendWhatsAppRemindersInner(MORNING);
    expect(sendFor).toHaveBeenCalledTimes(1);
  });
});
