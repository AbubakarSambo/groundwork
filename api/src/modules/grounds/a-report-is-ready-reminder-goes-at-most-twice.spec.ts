import { GroundsCron } from './grounds.cron';

/**
 * DECISION 117, D14 (Hafsah, 8 October): "YOUR REPORT IS READY" GOES AT MOST TWICE FOR A PERSON AND A REPORT.
 *
 * It repeated every three days for as long as the person had not activated their report, and nothing activates one any more. Here the
 * clock runs thirty days, the job runs every day, and the record of messages is the one the mailer writes. The person is sent it on the
 * first day and on the fourth, and never again; a second report is a second count; a person who opted out is sent none.
 */
const DAY = 86_400_000;
const START = new Date('2026-10-01T09:00:00Z');

function world(rows: { id: string; email: string; label: string; groundId: string; optedOut?: boolean }[]) {
  const nudged = new Map<string, Date | null>(rows.map((r) => [r.id, null]));
  const log: { toAddress: string; subject: string; sender: string; outcome: string; channel: string }[] = [];
  const prisma: any = {
    withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => {
        if (!args.where.reportActivations) return [];
        const before: Date | undefined = args.where.OR?.[1]?.lastNudgedAt?.lt;
        return rows.filter((r) => { const at = nudged.get(r.id); return !at || (before && at < before); })
          .map((r) => ({ id: r.id, email: r.email, ground: { id: r.groundId, label: r.label }, user: { emailNotifications: !r.optedOut } }));
      }),
      update: jest.fn(async (args: any) => { nudged.set(args.where.id, args.data.lastNudgedAt); return {}; }),
    },
    ground: { findMany: jest.fn(async () => []) },
    notification: {
      count: jest.fn(async ({ where }: any) => log.filter((n) => n.channel === where.channel && n.sender === where.sender && n.outcome === where.outcome
        && n.toAddress.toLowerCase() === where.toAddress.equals.toLowerCase() && n.subject === where.subject).length),
    },
  };
  const email: any = {
    sendActivationRevealReminder: jest.fn(async (to: string, label: string) => {
      log.push({ toAddress: to, subject: `Your report for "${label}" is ready to view`, sender: 'sendActivationRevealReminder', outcome: 'sent', channel: 'email' });
    }),
  };
  const service = new GroundsCron(prisma, email, { get: () => 'http://localhost:5173' } as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
  return { service, log };
}

async function thirtyDays(service: GroundsCron) {
  jest.useFakeTimers({ now: START });
  try {
    for (let d = 0; d < 30; d++) {
      jest.setSystemTime(new Date(START.getTime() + d * DAY));
      await service.sendReminders();
    }
  } finally { jest.useRealTimers(); }
}

describe('the "your report is ready" reminder, over thirty days', () => {
  it('goes twice to a person for a report, on the first day and the fourth, and then never', async () => {
    const { service, log } = world([{ id: 'p1', email: 'luis@x.test', label: 'Okr alignment', groundId: 'g1' }]);
    await thirtyDays(service);
    expect(log).toHaveLength(2);
  });

  it('counts each report on its own, and each person on their own', async () => {
    const { service, log } = world([
      { id: 'p1', email: 'luis@x.test', label: 'Okr alignment', groundId: 'g1' },
      { id: 'p2', email: 'luis@x.test', label: 'Sales team, Q3', groundId: 'g2' },
      { id: 'p3', email: 'rukia@x.test', label: 'Okr alignment', groundId: 'g1' },
    ]);
    await thirtyDays(service);
    expect(log).toHaveLength(6);
    for (const to of ['luis@x.test', 'rukia@x.test']) expect(log.filter((n) => n.toAddress === to && n.subject.includes('Okr alignment'))).toHaveLength(2);
  });

  it('sends none to a person who turned the mail off', async () => {
    const { service, log } = world([{ id: 'p1', email: 'luis@x.test', label: 'Okr alignment', groundId: 'g1', optedOut: true }]);
    await thirtyDays(service);
    expect(log).toHaveLength(0);
  });
});
