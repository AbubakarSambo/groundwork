import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { isSubscribed, isKnownStatus, SUBSCRIPTION_STATUSES } from './subscription';

/**
 * A WRONG-CASE STATUS MUST NOT COST SOMEBODY THEIR SUBSCRIPTION.
 *
 * `subscriptionStatus` was a bare String compared to the literal 'active' in six places. Setting it
 * to 'ACTIVE' on a real organisation - a plausible slip for a human, a migration or a future
 * integration - made every one of those comparisons say no, so `canCreateGround` fell through to the
 * free-tier check and metered a paying customer as if they had never paid. Nothing threw and no test
 * failed. It was found by hand, on a dev org, by noticing a paid account still showing its free-tier
 * banner.
 *
 * These tests pin both halves of the fix: the predicate is strict and fails toward the free tier, and
 * nothing bypasses it by comparing the raw string again.
 */
describe('what paying means', () => {
  const paid = { subscriptionPlan: 'GROWTH', subscriptionStatus: 'active' };

  it('is true only for a plan and a lowercase active status', () => {
    expect(isSubscribed(paid)).toBe(true);
  });

  it.each(['ACTIVE', 'Active', ' active', 'active ', 'ACTIVE ', ''])(
    'is false for %p, rather than silently granting it',
    (status) => {
      expect(isSubscribed({ ...paid, subscriptionStatus: status })).toBe(false);
    },
  );

  it('is false without a plan, however active the status says it is', () => {
    // A cancelled org keeps its status history while the plan is nulled.
    expect(isSubscribed({ subscriptionPlan: null, subscriptionStatus: 'active' })).toBe(false);
  });

  it('is false for every non-active status this product writes', () => {
    for (const s of SUBSCRIPTION_STATUSES.filter((x) => x !== 'active')) {
      expect(isSubscribed({ ...paid, subscriptionStatus: s })).toBe(false);
    }
  });

  it('treats a status it has never heard of as not paying', () => {
    // Stripe can add statuses. Failing toward the free tier is the safe direction: it can
    // over-charge nobody, it can only ever under-serve, which a person will tell us about.
    expect(isKnownStatus('trialing')).toBe(false);
    expect(isSubscribed({ ...paid, subscriptionStatus: 'trialing' })).toBe(false);
  });
});

describe('and nothing decides it a second way', () => {
  /**
   * THE RATCHET. Six call sites were consolidated into one predicate; this is what stops the seventh
   * being written as a raw comparison, which is how the first six happened.
   */
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name === 'node_modules' || name === 'dist') continue;
        walk(full, out);
      } else if (full.endsWith('.ts') && !full.endsWith('.spec.ts')) {
        out.push(full);
      }
    }
    return out;
  };

  it('compares the raw status to a literal nowhere but its own module', () => {
    const offenders: string[] = [];
    for (const file of walk(join(__dirname, '..'))) {
      if (file.endsWith(join('common', 'subscription.ts'))) continue;
      const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      // `!== ACTIVE` against the exported constant is fine; a quoted literal is not.
      for (const m of src.matchAll(/subscriptionStatus\s*[!=]==?\s*'[^']*'/g)) {
        offenders.push(`${file.split('/src/')[1]}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
