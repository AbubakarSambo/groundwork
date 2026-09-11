import { GroundsCron } from './grounds.cron';
import { CheckInStatus, TurnRole } from '@prisma/client';

/**
 * NOBODY'S WORDS ARE LEFT HANGING WITHOUT ANYBODY KNOWING.
 *
 * The person's turn is written, the model is called, the reply is written. A process that dies in
 * the middle leaves the first write with nothing after it, and the compensating delete never ran.
 * The two writes cannot be one transaction, so the fix is to be able to see it: a count, hourly,
 * of open sessions whose last word is the person's and an hour old. Ids only, never content.
 */
const hours = (n: number) => new Date(Date.now() - n * 3600_000);

const cronWith = (lastTurnByCheckIn: Record<string, { role: TurnRole; createdAt: Date } | null>) => {
  const warned: string[] = [];
  const prisma: any = {
    checkIn: { findMany: jest.fn(async () => Object.keys(lastTurnByCheckIn).map((id) => ({ id }))) },
    conversationTurn: { findFirst: jest.fn(async ({ where }: any) => lastTurnByCheckIn[where.checkInId]) },
  };
  const cron = new GroundsCron(prisma, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
  (cron as any).logger = { warn: (m: string) => warned.push(m), log: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { cron, prisma, warned };
};

describe('the orphaned-turn counter', () => {
  it('counts an open session whose last turn is the person, an hour or more old', async () => {
    const { cron, warned } = cronWith({
      hanging: { role: TurnRole.PERSON, createdAt: hours(2) },
      answered: { role: TurnRole.AI, createdAt: hours(2) },
      recent: { role: TurnRole.PERSON, createdAt: hours(0.2) },
    });
    await cron.countOrphanedTurns();
    expect(warned).toHaveLength(1);
    expect(warned[0]).toMatch(/^1 check-in\(s\) hold a person's turn with no reply after an hour: hanging$/);
  });

  it('says nothing when there is nothing to say', async () => {
    const { cron, warned } = cronWith({ answered: { role: TurnRole.AI, createdAt: hours(5) } });
    await cron.countOrphanedTurns();
    expect(warned).toHaveLength(0);
  });

  it('only looks at open sessions with an old person turn, and never selects content', async () => {
    const { cron, prisma } = cronWith({});
    await cron.countOrphanedTurns();
    const where = prisma.checkIn.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(CheckInStatus.IN_PROGRESS);
    expect(where.turns.some.role).toBe(TurnRole.PERSON);
    expect(prisma.checkIn.findMany.mock.calls[0][0].select).toEqual({ id: true });
  });
});
