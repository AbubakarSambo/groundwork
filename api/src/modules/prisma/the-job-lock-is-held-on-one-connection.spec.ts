import { PrismaClient } from '@prisma/client';
import { PrismaService, A_JOB_MAY_HOLD_ITS_LOCK_FOR_MS } from './prisma.service';

/**
 * THE JOB LOCK IS HELD ON ONE CONNECTION FOR THE WHOLE JOB.
 *
 * The lock and the unlock used to be two queries on whichever pooled connection was free, so an
 * unlock on another connection released nothing and later runs skipped silently. These tests run
 * the helper against the real local database: two copies of the client stand for two copies of the
 * API, each with its own pool.
 */
const LOCAL = process.env.DATABASE_URL ?? '';
const onThisComputer = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(LOCAL);
const describeLocal = onThisComputer ? describe : describe.skip;

describeLocal('the job lock is held on one connection for the whole job', () => {
  const KEY = 919_999;
  let a: PrismaService;
  let b: PrismaService;

  beforeAll(async () => {
    a = new PrismaService();
    b = new PrismaService();
    await a.$connect();
    await b.$connect();
  });
  afterAll(async () => {
    await a.$disconnect();
    await b.$disconnect();
  });

  it('runs the job, and a second copy skips while the first is running', async () => {
    let secondRan: boolean | null = null;
    const firstRan = await a.withAdvisoryLock(KEY, async () => {
      secondRan = await b.withAdvisoryLock(KEY, async () => undefined);
    });
    expect(firstRan).toBe(true);
    expect(secondRan).toBe(false);
  });

  it('leaves no lock behind: every later run, on any connection, runs', async () => {
    for (let i = 0; i < 20; i++) {
      await expect(a.withAdvisoryLock(KEY, async () => undefined)).resolves.toBe(true);
      await expect(b.withAdvisoryLock(KEY, async () => undefined)).resolves.toBe(true);
    }
    const held = await a.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_locks WHERE locktype = 'advisory' AND objid = ${KEY}`;
    expect(Number(held[0].n)).toBe(0);
  });

  it('releases the lock when the job throws, and the error still reaches the caller', async () => {
    await expect(a.withAdvisoryLock(KEY, async () => { throw new Error('the job failed'); })).rejects.toThrow('the job failed');
    await expect(b.withAdvisoryLock(KEY, async () => undefined)).resolves.toBe(true);
  });

  it('gives a job an hour before Postgres takes the lock back', () => {
    expect(A_JOB_MAY_HOLD_ITS_LOCK_FOR_MS).toBe(60 * 60 * 1000);
  });
});

const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the job lock, as written', () => {
  const src = withoutComments(require('fs').readFileSync(require('path').join(__dirname, 'prisma.service.ts'), 'utf8')) as string;

  it('takes a transaction lock inside one transaction, and never a session lock with a separate unlock', () => {
    expect(src).toContain('pg_try_advisory_xact_lock');
    expect(src).not.toMatch(/pg_try_advisory_lock\(/);
    expect(src).not.toMatch(/pg_advisory_unlock\(/);
  });

  it('is still the method every scheduled job calls', () => {
    expect(typeof (PrismaService.prototype as any).withAdvisoryLock).toBe('function');
    expect(PrismaService.prototype).toBeInstanceOf(PrismaClient);
  });
});
