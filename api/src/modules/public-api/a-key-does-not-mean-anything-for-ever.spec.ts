/**
 * The replay lookup has a twenty-four hour window; the cross-endpoint conflict had none. So the
 * two halves of this service disagreed about how long a key means anything, and a key reused a
 * month later was a permanent 409 — refused on account of a row whose stored response had long
 * since stopped being replayable, with no expiry to wait for and nothing the caller could do.
 */
import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

const HOUR = 3_600_000;

function makeService(rows: any[]) {
  const asked: any[] = [];
  const prisma: any = {
    idempotencyRecord: {
      findFirst: jest.fn(async (args: any) => {
        asked.push(args);
        const w = args.where;
        return (
          rows.find((r) => {
            if (r.organizationId !== w.organizationId || r.key !== w.key) return false;
            if (w.endpoint?.not !== undefined) { if (r.endpoint === w.endpoint.not) return false; }
            else if (w.endpoint !== undefined && r.endpoint !== w.endpoint) return false;
            if (w.createdAt?.gte && r.createdAt < w.createdAt.gte) return false;
            return true;
          }) ?? null
        );
      }),
      create: jest.fn(async () => ({})),
    },
  };
  return { service: new IdempotencyService(prisma), asked, prisma };
}

const row = (over: any) => ({
  organizationId: 'o1', key: 'k1', endpoint: 'POST /subjects',
  requestFingerprint: 'f', responseBody: { ok: true },
  createdAt: new Date(Date.now() - 1 * HOUR), ...over,
});

describe('a key does not mean anything for ever', () => {
  it('still refuses a key reused on another endpoint inside the window', async () => {
    const { service } = makeService([row({})]);
    await expect(
      service.run('o1', 'k1', 'POST /objectives', { a: 1 }, async () => 'did the work'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('and says what to do about it rather than only that it happened', async () => {
    const { service } = makeService([row({})]);
    await service.run('o1', 'k1', 'POST /objectives', { a: 1 }, async () => 'x').catch((e) => {
      expect(e.message).toMatch(/one key per operation/i);
      expect(e.message).toMatch(/last 24 hours/);
    });
  });

  it('does NOT refuse a key whose other use is older than the window', async () => {
    const { service } = makeService([row({ createdAt: new Date(Date.now() - 30 * 24 * HOUR) })]);
    await expect(
      service.run('o1', 'k1', 'POST /objectives', { a: 1 }, async () => 'did the work'),
    ).resolves.toBe('did the work');
  });

  it('asks both questions inside the same window, so the two halves cannot disagree', async () => {
    const { service, asked } = makeService([]);
    await service.run('o1', 'k1', 'POST /objectives', { a: 1 }, async () => 'x');
    expect(asked).toHaveLength(2);
    const [crossEndpoint, replay] = asked;
    expect(crossEndpoint.where.createdAt?.gte).toBeInstanceOf(Date);
    expect(replay.where.createdAt?.gte).toBeInstanceOf(Date);
    /* Same window, to the second. */
    expect(+crossEndpoint.where.createdAt.gte).toBe(+replay.where.createdAt.gte);
  });

  it('leaves the same-endpoint rules alone: a retry replays', async () => {
    const { service } = makeService([]);
    /* No prior row, so it runs; the replay path has its own tests where they exist. */
    await expect(service.run('o1', 'k1', 'POST /subjects', { a: 1 }, async () => 'ran')).resolves.toBe('ran');
  });

  it('and no key at all means no promise was asked for', async () => {
    const { service, asked } = makeService([row({})]);
    await expect(service.run('o1', undefined as any, 'POST /objectives', {}, async () => 'ran')).resolves.toBe('ran');
    expect(asked).toHaveLength(0);
  });
});
