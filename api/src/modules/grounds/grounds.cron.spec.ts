import { GroundsCron } from './grounds.cron';
import { GroundStatus, CheckInStatus } from '@prisma/client';
import { GroundworkEvents } from '../../common';

/**
 * GW-06: the synthesis backstop re-emits CHECK_IN_COMPLETED for any round that closed and was never
 * recorded or released - the event was lost. It used to look only at session 1 of an ACTIVE ground
 * with no report; now every live ground, every answered round, and a decline is an answer.
 */
describe('GroundsCron.synthesisBackstop - GW-06', () => {
  function makeService(o: { parties: string[]; checkIns: any[]; recorded?: number[]; taken?: number[] }) {
    const emitted: any[] = [];
    const prisma: any = {
      withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
      ground: { findMany: jest.fn(async () => [{ id: 'g1' }]) },
      groundParticipant: { findMany: jest.fn(async () => o.parties.map((id) => ({ id }))) },
      checkIn: {
        findMany: jest.fn(async ({ where }: any) => o.checkIns.filter((c) => where.status.in.includes(c.status))),
        count: jest.fn(async ({ where }: any) => o.checkIns.filter((c) => c.sessionNumber === where.sessionNumber && (where.status.in ? where.status.in.includes(c.status) : c.status === where.status)).length),
      },
      roundCompletion: {
        findUnique: jest.fn(async ({ where }: any) => ((o.recorded ?? []).includes(where.groundId_sessionNumber.sessionNumber) ? { id: 'rc' } : null)),
        create: jest.fn(async (a: any) => a.data),
      },
      reportRound: { findUnique: jest.fn(async ({ where }: any) => ((o.taken ?? []).includes(where.groundId_sessionNumber.sessionNumber) ? { id: 'rr' } : null)) },
    };
    const events: any = { emit: jest.fn((...args: any[]) => { emitted.push(args); }) };
    const service = new GroundsCron(prisma, {} as any, {} as any, events, {} as any, {} as any, {} as any);
    return { service, emitted, prisma };
  }
  const done = (participantId: string, sessionNumber: number, status: CheckInStatus = CheckInStatus.COMPLETED) => ({ id: `ci-${participantId}-${sessionNumber}`, participantId, sessionNumber, status });
  const repairs = (emitted: any[]) => emitted.filter((e) => e[0] === GroundworkEvents.CHECK_IN_COMPLETED);

  it('re-emits, as a repair, for a round everybody answered that was never recorded', async () => {
    const { service, emitted } = makeService({ parties: ['p1', 'p2'], checkIns: [done('p1', 1), done('p2', 1)] });
    await service.synthesisBackstop();
    expect(repairs(emitted)).toHaveLength(1);
    expect(repairs(emitted)[0][1]).toMatchObject({ groundId: 'g1', sessionNumber: 1, source: 'repair' });
  });

  it('reaches session 5 on a ground that already has a session-1 report', async () => {
    const { service, emitted } = makeService({
      parties: ['p1', 'p2'],
      checkIns: [done('p1', 1), done('p2', 1), done('p1', 5), done('p2', 5)],
      recorded: [1], taken: [1],
    });
    await service.synthesisBackstop();
    expect(repairs(emitted).map((e) => e[1].sessionNumber)).toEqual([5]);
  });

  it('a decline is an answer: one completed and one declined is a closed round', async () => {
    const { service, emitted } = makeService({ parties: ['p1', 'p2'], checkIns: [done('p1', 1), done('p2', 1, CheckInStatus.DECLINED)] });
    await service.synthesisBackstop();
    expect(repairs(emitted)).toHaveLength(1);
  });

  it('but everybody declining is not a report, and is left alone', async () => {
    const { service, emitted } = makeService({ parties: ['p1', 'p2'], checkIns: [done('p1', 1, CheckInStatus.DECLINED), done('p2', 1, CheckInStatus.DECLINED)] });
    await service.synthesisBackstop();
    expect(repairs(emitted)).toHaveLength(0);
  });

  it('skips a round where one party has not answered', async () => {
    const { service, emitted } = makeService({ parties: ['p1', 'p2'], checkIns: [done('p1', 1)] });
    await service.synthesisBackstop();
    expect(repairs(emitted)).toHaveLength(0);
  });

  it('and a round recorded and taken is nothing to repair', async () => {
    const { service, emitted } = makeService({ parties: ['p1', 'p2'], checkIns: [done('p1', 1), done('p2', 1)], recorded: [1], taken: [1] });
    await service.synthesisBackstop();
    expect(repairs(emitted)).toHaveLength(0);
  });

  it('looks at every live ground, not only ACTIVE ones with no report', async () => {
    const { service, prisma } = makeService({ parties: [], checkIns: [] });
    await service.synthesisBackstop();
    const where = prisma.ground.findMany.mock.calls[0][0].where;
    expect(where.status.notIn).toEqual(expect.arrayContaining([GroundStatus.CLOSED, GroundStatus.PAUSED]));
    expect(where).not.toHaveProperty('report');
  });
});
