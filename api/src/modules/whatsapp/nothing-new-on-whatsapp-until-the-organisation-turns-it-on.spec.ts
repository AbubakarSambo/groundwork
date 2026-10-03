import { GroundsCron } from '../grounds/grounds.cron';
import { sendTheLeadsDailySummaries } from './the-leads-daily-summary';
import { organisationsThatTurnedWhatsAppOn } from './only-where-whatsapp-is-turned-on';

/*
 * Decision 88: nothing new on WhatsApp reaches an existing client until that organisation turns
 * WhatsApp on. The 08:30 reminder, the reminder before a check-in opens and the lead's daily summary
 * are new, so each reads the organisation's switch first and sends, records and counts nothing without it.
 */
const DAY = 86_400_000;

function aCron(turnedOn: string[], platformOn = true) {
  const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
  const row = {
    id: 'ci-1', groundId: 'g-1', sessionNumber: 1, createdAt: new Date(Date.now() - 2 * DAY), availableFrom: null, participantId: 'p-1',
    ground: { label: 'the sales team', scenario: 'PULSE_CHECK', organizationId: 'org-old', overWhatsApp: null, cadence: 'DAILY', chaseAfterDays: [3], chasingStopped: false, tellTheLead: true, initiator: { firstName: 'Wairimu' } },
    participant: { id: 'p-1', email: 'm@x.test', userId: 'u-1', user: { firstName: 'Miriam', email: 'm@x.test', phoneNumber: '+254712345678', isActive: true, deletedAt: null } },
  };
  const prisma: any = {
    checkIn: { findMany: jest.fn(async () => [row]) },
    organization: { findMany: jest.fn(async ({ where }: any) => turnedOn.filter((id) => where.id.in.includes(id)).map((id) => ({ id }))) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    whatsAppSend: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254712345678' })) },
  };
  const cron = new GroundsCron(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, { sendFor, isEnabled: async () => platformOn } as any, {} as any);
  (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { cron, sendFor };
}

describe('nothing new on WhatsApp reaches an organisation that has not turned it on', () => {
  it('sends no morning reminder to a person in an organisation that has not turned WhatsApp on', async () => {
    const { cron, sendFor } = aCron([]);
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).not.toHaveBeenCalled();
  });
  it('does send it once that organisation has turned WhatsApp on', async () => {
    const { cron, sendFor } = aCron(['org-old']);
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).toHaveBeenCalledTimes(1);
  });
  it('sends nothing to anybody while the platform switch is off, even for an organisation that turned it on', async () => {
    const { cron, sendFor } = aCron(['org-old'], false);
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).not.toHaveBeenCalled();
  });
  it('sends no daily summary to a lead in an organisation that has not turned WhatsApp on', async () => {
    const sendFor = jest.fn();
    const prisma: any = {
      ground: { findMany: jest.fn(async () => [{ id: 'g-1', label: 'Sales', organizationId: 'org-old', overWhatsApp: null, initiatorId: 'u-1' }]) },
      organization: { findMany: jest.fn(async () => []) },
    };
    const r = await sendTheLeadsDailySummaries({ prisma, whatsapp: { isEnabled: async () => true, sendFor } as any, boards: {} as any, frontendUrl: '' });
    expect(r.tried).toBe(0);
    expect(sendFor).not.toHaveBeenCalled();
  });
  it('knows which organisations turned it on, and none while the platform switch is off', async () => {
    const prisma: any = { organization: { findMany: jest.fn(async () => [{ id: 'a' }]) } };
    expect([...(await organisationsThatTurnedWhatsAppOn(prisma, { isEnabled: async () => true }, ['a', 'b']))]).toEqual(['a']);
    expect((await organisationsThatTurnedWhatsAppOn(prisma, { isEnabled: async () => false }, ['a'])).size).toBe(0);
  });
});
