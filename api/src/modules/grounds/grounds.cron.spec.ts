import { GroundsCron } from './grounds.cron';
import { GroundStatus, CheckInStatus } from '@prisma/client';
import { GroundworkEvents } from '../../common';

/**
 * GW-06: the synthesis backstop must re-emit CHECK_IN_COMPLETED for any
 * ACTIVE ground where both parties finished session 2 but the event was lost.
 */
describe('GroundsCron.synthesisBackstop - GW-06', () => {
  function makeService(grounds: any[], reportByGround: Record<string, any>, session2ByParticipant: Record<string, any>) {
    const emitted: any[] = [];
    const prisma: any = {
      withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
      ground: {
        findMany: jest.fn(async () => grounds),
      },
      groundParticipant: {
        findMany: jest.fn(async (args: any) => {
          const gId = args.where.groundId;
          return grounds.find((g) => g.id === gId)?.participants ?? [];
        }),
      },
      checkIn: {
        findFirst: jest.fn(async (args: any) => {
          const pId = args.where.participantId;
          return session2ByParticipant[pId] ?? null;
        }),
      },
    };
    const events: any = { emit: jest.fn((...args: any[]) => { emitted.push(args); }) };
    const service = new GroundsCron(prisma, {} as any, {} as any, events, {} as any, {} as any);
    return { service, emitted };
  }

  it('emits CHECK_IN_COMPLETED for a stuck ground with both parties done session 1 (#36: trigger is session 1, not session 2)', async () => {
    const grounds = [
      {
        id: 'g1',
        participants: [
          { id: 'p1', userId: 'u1' },
          { id: 'p2', userId: 'u2' },
        ],
      },
    ];
    const session1ByParticipant = {
      p1: { id: 'ci1' },
      p2: { id: 'ci2' },
    };

    const { service, emitted } = makeService(grounds, {}, session1ByParticipant);
    await service.synthesisBackstop();

    expect(emitted).toHaveLength(1);
    expect(emitted[0][0]).toBe(GroundworkEvents.CHECK_IN_COMPLETED);
    expect(emitted[0][1]).toMatchObject({ groundId: 'g1', sessionNumber: 1 });
  });

  it('skips a ground where one party has not completed session 1', async () => {
    const grounds = [
      {
        id: 'g2',
        participants: [
          { id: 'p3', userId: 'u3' },
          { id: 'p4', userId: 'u4' },
        ],
      },
    ];
    const session1ByParticipant = {
      p3: { id: 'ci3' },
      p4: null, // not done
    };

    const { service, emitted } = makeService(grounds, {}, session1ByParticipant);
    await service.synthesisBackstop();

    expect(emitted).toHaveLength(0);
  });
});
