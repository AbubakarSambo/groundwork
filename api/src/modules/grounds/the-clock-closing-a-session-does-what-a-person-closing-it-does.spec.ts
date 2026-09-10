import { readFileSync } from 'fs';
import { join } from 'path';
import { GroundsCron } from './grounds.cron';
import { CheckInStatus } from '@prisma/client';

/**
 * THE CLOCK CLOSING A SESSION DOES WHAT A PERSON CLOSING IT DOES.
 *
 * The sweep decides which sessions are stale and nothing else. It used to write COMPLETED itself,
 * emit, close the round, and skip the record, the artifact, the usage event and the next session -
 * a second definition of "finished" that left the person who walked away with nothing and the next
 * round unable to complete. Pinned as source because the failure was a write existing here at all.
 */
const CODE = readFileSync(join(__dirname, 'grounds.cron.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the auto-close sweep', () => {
  it('writes no COMPLETED of its own and closes no round of its own', () => {
    /* Writes, not reads: the backstop still QUERIES for COMPLETED, which is fine. A `data:` block is a write. */
    const writes = [...CODE.matchAll(/status:\s*CheckInStatus\.COMPLETED/g)].filter((m) =>
      /\bdata:\s*\{/.test(CODE.slice(Math.max(0, m.index! - 200), m.index!)),
    );
    expect(writes).toHaveLength(0);
    expect(CODE).not.toMatch(/recordRoundCompletion\(/);
  });

  it('hands each stale session to the conversation service', () => {
    const at = CODE.indexOf('async autoCloseStaleCheckIns(');
    const body = CODE.slice(at, CODE.indexOf('async fireSessionClosingWarnings('));
    expect(body).toMatch(/await this\.conversation\.closeByTheClock\(checkIn\.id\)/);
  });

  it('behaviourally: a stale session is closed by the clock, a fresh one is left alone', async () => {
    const twoDaysAgo = new Date(Date.now() - 49 * 3600 * 1000);
    const prisma: any = {
      withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
      checkIn: {
        findMany: jest.fn(async () => [
          { id: 'stale', groundId: 'g', participantId: 'p1', sessionNumber: 1, startedAt: twoDaysAgo, createdAt: twoDaysAgo },
          { id: 'fresh', groundId: 'g', participantId: 'p2', sessionNumber: 1, startedAt: new Date(), createdAt: new Date() },
        ]),
        update: jest.fn(),
      },
      conversationTurn: { findFirst: jest.fn(async () => ({ createdAt: new Date() })) },
    };
    const conversation: any = { closeByTheClock: jest.fn(async () => ({ status: 'completed', groundId: 'g' })) };
    const cron = new GroundsCron(prisma, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, conversation);
    await cron.autoCloseStaleCheckIns();
    expect(conversation.closeByTheClock).toHaveBeenCalledTimes(1);
    expect(conversation.closeByTheClock).toHaveBeenCalledWith('stale');
    expect(prisma.checkIn.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: CheckInStatus.COMPLETED }) }));
  });
});
