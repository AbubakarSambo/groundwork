import { BadRequestException } from '@nestjs/common';
import {
  PricingService,
  FREE_GROUND_LIMIT_KEY,
  DEFAULT_FREE_GROUND_LIMIT,
  MAX_FREE_GROUND_LIMIT,
} from './pricing.service';

/**
 * THE FREE TIER IS NOW A DATABASE ROW, SO IT CAN BE LOST.
 *
 * Making the free-ground limit editable removed two hardcoded tens and introduced one new failure
 * mode worth more care than the feature itself: if a missing or nonsense row read as zero, every
 * organisation on the platform would be paywalled at once, silently, with nothing in the product
 * saying why. That is the single worst outcome available here - worse than the limit being wrong,
 * because it converts a bad row into an outage for everybody who has not paid.
 *
 * So these tests are mostly about what a bad row must NOT do.
 */
function makeService(storedValue?: unknown, opts: { throws?: boolean } = {}) {
  const upsert = jest.fn(async (_args: any) => ({}));
  const findUnique = jest.fn(async () => {
    if (opts.throws) throw new Error('database is down');
    return storedValue === undefined ? null : { key: FREE_GROUND_LIMIT_KEY, value: storedValue };
  });
  const prisma: any = { platformSetting: { findUnique, upsert } };
  return { svc: new PricingService(prisma, {} as any), upsert };
}

describe('a limit that cannot be read falls back to the one we shipped', () => {
  it('no row at all', async () => {
    const { svc } = makeService();
    expect(await svc.getFreeGroundLimit()).toBe(DEFAULT_FREE_GROUND_LIMIT);
  });

  it('a database that will not answer', async () => {
    /** A Postgres blip must not paywall the platform, and must not throw out of the gate either. */
    const { svc } = makeService(undefined, { throws: true });
    expect(await svc.getFreeGroundLimit()).toBe(DEFAULT_FREE_GROUND_LIMIT);
  });

  it.each([
    ['a string', '10'],
    ['null', null],
    ['a fraction', 2.5],
    ['negative', -1],
    ['absurd', MAX_FREE_GROUND_LIMIT + 1],
    ['not a number', Number.NaN],
    ['an object', { limit: 10 }],
  ])('%s', async (_label, bad) => {
    const { svc } = makeService(bad);
    expect(await svc.getFreeGroundLimit()).toBe(DEFAULT_FREE_GROUND_LIMIT);
  });
});

describe('a limit that CAN be read is honoured, including the awkward values', () => {
  it('a smaller number than we shipped', async () => {
    const { svc } = makeService(3);
    expect(await svc.getFreeGroundLimit()).toBe(3);
  });

  it('zero, which is a real decision and not a bad row', async () => {
    /**
     * The one case the fallback must NOT swallow. "No free tier" is a choice a founder is allowed
     * to make, and reading it as 10 would quietly give away ten grounds per org against their
     * explicit instruction. A stored zero is honoured; only a zero we never stored is replaced.
     */
    const { svc } = makeService(0);
    expect(await svc.getFreeGroundLimit()).toBe(0);
  });

  it('and the ceiling itself', async () => {
    const { svc } = makeService(MAX_FREE_GROUND_LIMIT);
    expect(await svc.getFreeGroundLimit()).toBe(MAX_FREE_GROUND_LIMIT);
  });
});

describe('writing the limit', () => {
  it('stores a valid number and records who set it', async () => {
    const { svc, upsert } = makeService();
    expect(await svc.setFreeGroundLimit(5, 'admin-1')).toBe(5);
    expect(upsert.mock.calls[0]?.[0]?.update?.updatedBy).toBe('admin-1');
  });

  it('accepts zero', async () => {
    const { svc } = makeService();
    expect(await svc.setFreeGroundLimit(0, 'admin-1')).toBe(0);
  });

  it.each([
    ['negative', -1],
    ['a fraction', 1.5],
    ['over the ceiling', MAX_FREE_GROUND_LIMIT + 1],
    ['undefined', undefined],
    ['a string', '5'],
  ])('refuses %s and writes nothing', async (_label, bad) => {
    const { svc, upsert } = makeService();
    await expect(svc.setFreeGroundLimit(bad as unknown as number, 'admin-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(upsert).not.toHaveBeenCalled();
  });
});
