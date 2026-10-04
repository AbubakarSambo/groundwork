import { GroundsCron } from '../grounds/grounds.cron';
import { itIsOverdue } from './what-goes-to-a-phone';

/**
 * Chidi said STOP on the morning his Renewals check-in went overdue. The morning job tried, was refused
 * ("This person said STOP on WhatsApp; not sent") and wrote that down as a send of the kind `overdue`.
 * The next morning, after he had written START, the job read that row as "he has had the overdue
 * message" and never sent it. Found by driving STOP and START through the signed webhook. The same
 * happened to a message refused only because its template was not approved yet.
 */
const DAY = 86_400_000;
const CHIDI = { firstName: 'Chidi', label: 'the sales team' };

function aMorning(sends: any[]) {
  const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
  const row = {
    id: 'ci-1', groundId: 'g-1', sessionNumber: 1, participantId: 'gp-1', createdAt: new Date(Date.now() - 8 * DAY), availableFrom: null,
    ground: { label: 'the sales team', scenario: 'PULSE_CHECK', organizationId: 'org-1', overWhatsApp: null, cadence: 'WEEKLY', chaseAfterDays: [30], chasingStopped: false, tellTheLead: true, initiator: { firstName: 'Wairimu' } },
    participant: { id: 'gp-1', email: 'chidi@example.com', userId: 'u-1', user: { firstName: 'Chidi', email: 'chidi@example.com', phoneNumber: null, isActive: true, deletedAt: null } },
  };
  const prisma: any = {
    checkIn: { findMany: jest.fn(async () => [row]) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    whatsAppSend: {
      /* Honours the filter the sweep asks with: a row without `sentAt` is returned only if the question allows it. */
      findMany: jest.fn(async (q: any) => sends.filter((s) => {
        const ok = (q.where.OR ?? [{}]).some((c: any) => (c.sentAt ? s.sentAt != null : c.kind?.endsWith ? String(s.kind).endsWith(c.kind.endsWith) : true));
        return q.where.kind.in.includes(s.kind) && ok;
      })),
      findFirst: jest.fn(async () => null),
    },
    person: { findFirst: jest.fn(async () => ({ phone: '+254712345678' })) },
  };
  const cron = new GroundsCron(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, { sendFor, isEnabled: async () => true } as any, {} as any);
  (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { cron, sendFor };
}

describe('the overdue message, after an earlier attempt that reached nobody', () => {
  it('is sent once the person has written START: the refused attempt does not count', async () => {
    const { cron, sendFor } = aMorning([{ kind: 'overdue', sentAt: null, createdAt: new Date(Date.now() - DAY) }]);
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).toHaveBeenCalledTimes(1);
    expect(sendFor.mock.calls[0][2]).toBe(itIsOverdue(CHIDI).text);
  });
  it('is also sent when the earlier attempt was only waiting for its template to be approved', async () => {
    const { cron, sendFor } = aMorning([{ kind: 'overdue:template', sentAt: null, createdAt: new Date(Date.now() - DAY) }]);
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).toHaveBeenCalledTimes(1);
  });
  it('is not sent a second time once it went', async () => {
    const { cron, sendFor } = aMorning([{ kind: 'overdue', sentAt: new Date(Date.now() - DAY), createdAt: new Date(Date.now() - DAY) }]);
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).not.toHaveBeenCalled();
  });
  it('is not tried again when the add-on or the limit held it', async () => {
    const { cron, sendFor } = aMorning([{ kind: 'overdue:held', sentAt: null, createdAt: new Date(Date.now() - DAY) }]);
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).not.toHaveBeenCalled();
  });
});
