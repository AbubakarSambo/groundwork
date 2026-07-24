import { GroundsCron } from './grounds.cron';

/**
 * #4: a participant can sit on ReportActivation: PENDING forever after their
 * report is released, with nothing nudging them - their report is ready and
 * they don't know. This locks the new reveal-reminder sweep in
 * sendRemindersInner: fires sendActivationRevealReminder for a participant
 * with a released report and no ACTIVATED row, throttled the same way as
 * every other reminder here (lastNudgedAt / NUDGE_THROTTLE_DAYS), and
 * respects the same emailNotifications opt-out.
 */

function makeService(pendingRevealRows: any[]) {
  const updated: any[] = [];
  const sentTo: string[] = [];
  const prisma: any = {
    withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => {
        // Distinguish the reveal-reminder query (has reportActivations in
        // its where clause) from the return-nudge query (idle open sessions).
        if (args.where.reportActivations) return pendingRevealRows;
        return [];
      }),
      update: jest.fn(async (args: any) => { updated.push(args); return {}; }),
    },
    ground: {
      findMany: jest.fn(async () => []), // legacy REPORT_READY activation-reminder query - none in this test
    },
  };
  const email: any = {
    sendActivationRevealReminder: jest.fn(async (to: string) => { sentTo.push(to); }),
  };
  const config: any = { get: () => 'http://localhost:5173' };
  const events: any = { emit: jest.fn() };
  const service = new GroundsCron(prisma, email, config, events, {} as any, {} as any);
  return { service, updated, sentTo, email };
}

describe('#4 reveal reminder: nudges a participant sitting on PENDING activation', () => {
  it('sends the reveal reminder and stamps lastNudgedAt for an eligible participant', async () => {
    const { service, updated, sentTo } = makeService([
      { id: 'p1', email: 'p1@test.com', ground: { id: 'g1', label: 'Test Ground' }, user: { emailNotifications: true } },
    ]);
    await service.sendReminders();
    expect(sentTo).toEqual(['p1@test.com']);
    expect(updated).toHaveLength(1);
    expect(updated[0].where.id).toBe('p1');
  });

  it('does not send when the participant has opted out of email notifications', async () => {
    const { service, updated, sentTo } = makeService([
      { id: 'p1', email: 'p1@test.com', ground: { id: 'g1', label: 'Test Ground' }, user: { emailNotifications: false } },
    ]);
    await service.sendReminders();
    expect(sentTo).toEqual([]);
    expect(updated).toHaveLength(0);
  });
});
