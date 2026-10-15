import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isCovered, isSubscribed, whatCoversThem } from './subscription';

/**
 * A MONTH GIVEN AWAY IS COVER, AND EVERY GATE ASKED THE WRONG QUESTION.
 *
 * Hafsah, 23 September 2026: "We gave them an updated free trial where they can use this for 1
 * month for free for all their team but they still only have the 5 people, the tool is refusing to
 * click send the invite to the rest of the team."
 *
 * `isCovered` reads `freeUntil` and `freePlan` alongside the paid pair, and its own comment calls it
 * "the read most gates want". It was used in one file - billing - and every gate that actually stops
 * a person asked `isSubscribed`, which only sees a paid plan. So the month lifted nothing and the
 * customer was told to subscribe to something we had already given them.
 */
const SRC = join(__dirname, '..');
const onTheHouse = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: new Date(Date.now() + 86400_000 * 20), freePlan: 'TEAM' };
const nobody = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: null, freePlan: null };
const lapsed = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: new Date(Date.now() - 86400_000), freePlan: 'TEAM' };

describe('a free run', () => {
  it('is cover, and is not paying', () => {
    expect(isCovered(onTheHouse)).toBe(true);
    expect(isSubscribed(onTheHouse)).toBe(false);
    expect(whatCoversThem(onTheHouse).covers).toBe('on the house');
  });

  it('and runs out by arithmetic', () => {
    expect(isCovered(lapsed)).toBe(false);
    expect(isCovered(nobody)).toBe(false);
  });
});

/**
 * AND NO GATE ASKS THE PAID QUESTION AGAIN.
 *
 * The two reads look alike and one of them silently ignores a month somebody has been given. Billing
 * is the one place the paid question is the right one - it must not charge somebody twice - so it
 * keeps `isSubscribed` and everywhere else may not have it.
 */
describe('every gate that stops somebody', () => {
  /*
   * The WhatsApp add-on's `theMonthStarted` is billing too, not a gate: it asks whether there is a paid
   * Stripe billing month to count WhatsApp users from (`subscriptionPeriodEnd`). A free month has no
   * billing month, so it counts from the calendar month, and whether WhatsApp may send at all is
   * decided by `whatCoversThem` in the same file. Nobody is stopped by this read.
   */
  const MAY_ASK_WHO_IS_PAYING = ['common/subscription.ts', 'modules/billing/billing.service.ts', 'modules/billing/whatsapp-add-on.service.ts'];

  const walk = (at: string, out: string[] = []): string[] => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, e.name);
      if (e.isDirectory()) { walk(full, out); continue; }
      if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(full);
    }
    return out;
  };

  it('asks whether they are covered, not whether they are paying', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = file.slice(SRC.length + 1);
      if (MAY_ASK_WHO_IS_PAYING.includes(rel)) continue;
      const src = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (/\bisSubscribed\s*\(/.test(src)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  /* And the four fields have to be selected, or the read is true-looking and wrong. */
  it('and selects the fields the read needs', () => {
    for (const rel of ['modules/grounds/grounds.service.ts', 'modules/entry/entry.service.ts', 'modules/users/users.service.ts']) {
      const src = readFileSync(join(SRC, rel), 'utf8');
      const at = src.indexOf('isCovered(');
      expect(at).toBeGreaterThan(-1);
      /* The nearest organisation select above it carries freeUntil and freePlan. */
      const before = src.slice(Math.max(0, at - 1200), at);
      expect(before).toMatch(/freeUntil: true, freePlan: true/);
    }
  });
});
