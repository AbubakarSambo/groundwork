import { PricingService, FREE_TRIAL_KEY, DEFAULT_FREE_TRIAL } from './pricing.service';

/**
 * THE FREE PLAN CANNOT BE LOST TO A BAD ROW (rewritten 23 November 2026).
 *
 * This file used to guard the free check-in limit, a `platform_settings` row that read as zero would have paywalled every
 * organisation at once. That limit is gone (Hafsah, 22 November: "there's nothing like 10 free checkins"); the only free plan
 * is the free trial, read from `pricing.freeTrial`. The same danger now sits there, so the same guard does: a row that is
 * missing, nonsense or unreadable must read as the trial ON, never as no free plan for anybody.
 */
function makeService(storedValue?: unknown, opts: { throws?: boolean } = {}) {
  const findUnique = jest.fn(async () => {
    if (opts.throws) throw new Error('database is down');
    return storedValue === undefined ? null : { key: FREE_TRIAL_KEY, value: storedValue };
  });
  const prisma: any = { platformSetting: { findUnique, upsert: jest.fn(async () => ({})) } };
  return new PricingService(prisma, {} as any);
}

describe('a trial row that cannot be read is the trial we shipped, which is on', () => {
  it.each([
    ['no row at all', undefined],
    ['null', null],
    ['a string', 'twenty'],
    ['a number', 10],
    ['an object with nonsense numbers', { on: true, teamsUnder: -3, months: 1.5 }],
    ['an object with no switch', { teamsUnder: 20, months: 1 }],
  ])('%s', async (_label, value) => {
    expect(await makeService(value).getFreeTrial()).toEqual(DEFAULT_FREE_TRIAL);
    expect(DEFAULT_FREE_TRIAL.on).toBe(true);
  });

  it('a database that will not answer', async () => {
    expect(await makeService(undefined, { throws: true }).getFreeTrial()).toEqual(DEFAULT_FREE_TRIAL);
  });
});

describe('a trial row that can be read is honoured, including switched off', () => {
  it('a different size and length', async () => {
    expect(await makeService({ on: true, teamsUnder: 30, months: 2 }).getFreeTrial()).toEqual({ on: true, teamsUnder: 30, months: 2 });
  });
  it('off, which is a real decision and not a bad row', async () => {
    expect((await makeService({ on: false, teamsUnder: 20, months: 1 }).getFreeTrial()).on).toBe(false);
  });
});
