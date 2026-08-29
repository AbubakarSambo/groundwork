import { readFileSync } from 'fs';
import { join } from 'path';
import { mayUseTheApi, NOT_PAID } from './the-api-is-a-paid-thing';

describe('the integration API is a paid feature', () => {
  it('lets a paying organisation in', () => {
    expect(mayUseTheApi({ subscriptionPlan: 'team', subscriptionStatus: 'active' })).toBe(true);
  });

  it('and keeps everyone else out', () => {
    expect(mayUseTheApi({ subscriptionPlan: 'team', subscriptionStatus: 'cancelled' })).toBe(false);
    expect(mayUseTheApi({ subscriptionPlan: null, subscriptionStatus: 'active' })).toBe(false);
    expect(mayUseTheApi(null)).toBe(false);
    expect(mayUseTheApi(undefined)).toBe(false);
  });

  it('and does not define "paying" a second time', () => {
    /*
     * `common/subscription.ts` exists because six comparisons against a bare string had drifted, and
     * writing 'ACTIVE' instead of 'active' silently downgraded a paying customer to the free tier -
     * nothing thrown, no test failing. The first draft of this file did exactly that, with its own
     * uppercase set of live statuses. A second definition of paying is the bug, not the tidiness.
     */
    const SRC = readFileSync(join(__dirname, 'the-api-is-a-paid-thing.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(SRC).toMatch(/import \{ isSubscribed \}/);
    expect(SRC).not.toMatch(/'active'|'ACTIVE'|Set\(/);
  });

  it('and says what is wrong without implying the credential is bad', () => {
    /* A developer told "unauthorized" checks their client secret for an hour. */
    expect(NOT_PAID).toMatch(/paid plan/);
    expect(NOT_PAID).toMatch(/Nothing else about the credential is wrong/);
  });
});
