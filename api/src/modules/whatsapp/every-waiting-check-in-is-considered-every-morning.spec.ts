import { GroundsCron } from '../grounds/grounds.cron';
import { everyRowAPageAtATime } from './every-row-a-page-at-a-time';
import { itIsOverdue } from './what-goes-to-a-phone';

/**
 * THE MORNING REMINDER READ "TAKE 500" AND STOPPED. With more than 500 check-ins waiting (across every
 * organisation), the same first 500 were read every morning, in the order the database happened to
 * return them, and everybody else was never reminded, with no error and nothing in the log. Found by
 * driving the journeys against a database with 1,300 check-ins waiting. The sweep now reads every page.
 */
const DAY = 86_400_000;
const MIRIAM = { firstName: 'Miriam', label: 'the sales team' };

function manyWaiting(n: number) {
  const rows = Array.from({ length: n }, (_, i) => ({
    id: `ci-${String(i).padStart(5, '0')}`, groundId: `g-${i}`, sessionNumber: 2, participantId: `gp-${i}`, createdAt: new Date(Date.now() - 2 * DAY), availableFrom: null,
    ground: { label: 'the sales team', scenario: 'PULSE_CHECK', organizationId: 'org-1', overWhatsApp: null, cadence: 'DAILY', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: { firstName: 'Wairimu' } },
    participant: { id: `gp-${i}`, email: `p${i}@example.com`, userId: `u-${i}`, user: { firstName: 'Miriam', email: `p${i}@example.com`, phoneNumber: null, isActive: true, deletedAt: null } },
  }));
  const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
  const asked: any[] = [];
  const prisma: any = {
    checkIn: {
      findMany: jest.fn(async (q: any) => {
        asked.push({ take: q.take, cursor: q.cursor });
        const from = q.cursor ? rows.findIndex((r) => r.id === q.cursor.id) + (q.skip ?? 0) : 0;
        return rows.slice(from, from + (q.take ?? rows.length));
      }),
    },
    groundParticipant: { findMany: jest.fn(async () => rows.map((r) => ({ id: r.participantId, userId: r.participant.userId, ground: { organizationId: 'org-1' } }))) },
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    whatsAppSend: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254712345678' })) },
  };
  const cron = new GroundsCron(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, { sendFor, isEnabled: async () => true } as any, {} as any);
  (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { cron, sendFor, asked };
}

describe('the morning reminder, with more people waiting than one page holds', () => {
  it('reminds every one of 1,203 people, not the first 500', async () => {
    const { cron, sendFor, asked } = manyWaiting(1203);
    const r = await cron.sendWhatsAppRemindersInner();
    expect(r.sent).toBe(1203);
    expect(sendFor).toHaveBeenCalledTimes(1203);
    expect(sendFor.mock.calls[1202][2]).toBe(itIsOverdue(MIRIAM).text);
    expect(asked.length).toBeGreaterThan(1);
  });
});

describe('reading every row a page at a time', () => {
  it('returns every row once, in pages, and stops on a short page', async () => {
    const all = Array.from({ length: 25 }, (_, i) => ({ id: `r-${String(i).padStart(2, '0')}` }));
    const pages: number[] = [];
    const got = await everyRowAPageAtATime(async (p) => {
      const from = p.cursor ? all.findIndex((r) => r.id === p.cursor!.id) + (p.skip ?? 0) : 0;
      const rows = all.slice(from, from + p.take);
      pages.push(rows.length);
      return rows;
    }, 10);
    expect(got.map((r) => r.id)).toEqual(all.map((r) => r.id));
    expect(pages).toEqual([10, 10, 5]);
  });
  it('asks once more when the last page is exactly full, and stops on the empty one', async () => {
    const all = Array.from({ length: 20 }, (_, i) => ({ id: `r-${i}` }));
    let calls = 0;
    const got = await everyRowAPageAtATime(async (p) => {
      calls++;
      const from = p.cursor ? all.findIndex((r) => r.id === p.cursor!.id) + (p.skip ?? 0) : 0;
      return all.slice(from, from + p.take);
    }, 10);
    expect(got).toHaveLength(20);
    expect(calls).toBe(3);
  });
});
