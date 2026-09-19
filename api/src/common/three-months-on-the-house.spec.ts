import { whatCoversThem, isCovered, aFreeRunEndsOn } from './subscription';

/**
 * "WE PUT IN SOMEONE'S EMAIL AND THEIR ORG GETS FREE USE FOR THREE MONTHS."
 *
 * The thing this file is really guarding is the shortcut nobody should take: writing `active` and a
 * plan onto the organisation. That pair has no end in it, so a free run written that way never ends,
 * and nothing fails - we simply serve somebody for years and never find out.
 */
const paid = { subscriptionPlan: 'GROWTH', subscriptionStatus: 'active' } as const;
const now = new Date('2026-09-19T12:00:00Z');

describe('what covers them today', () => {
  it('is the free tier when nothing else does', () => {
    expect(whatCoversThem({ subscriptionPlan: null, subscriptionStatus: null }, now).covers).toBe('free tier');
  });

  it('is the house while the run has time left, with the plan we gave them', () => {
    const r = whatCoversThem({ subscriptionPlan: null, subscriptionStatus: null, freeUntil: new Date('2026-12-19T12:00:00Z'), freePlan: 'GROWTH' }, now);
    expect(r.covers).toBe('on the house');
    expect(r.plan).toBe('GROWTH');
    expect(r.until?.toISOString()).toContain('2026-12-19');
  });

  /* The whole reason it is a date: yesterday's free run covers nobody today. */
  it('and stops on its own the day it runs out', () => {
    const over = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: new Date('2026-09-18T12:00:00Z'), freePlan: 'GROWTH' };
    expect(whatCoversThem(over, now).covers).toBe('free tier');
    expect(isCovered(over, now)).toBe(false);
  });

  /* Somebody who started paying during a run is a customer, on the plan they chose. */
  it('and paying wins over the house', () => {
    const r = whatCoversThem({ ...paid, subscriptionPlan: 'SMALL_TEAM', freeUntil: new Date('2026-12-19T12:00:00Z'), freePlan: 'GROWTH' }, now);
    expect(r.covers).toBe('paid');
    expect(r.plan).toBe('SMALL_TEAM');
  });

  /* A promise made in September and taken up in November is still three whole months. */
  it('counts the three months from the day it is taken up', () => {
    expect(aFreeRunEndsOn(new Date('2026-11-04T09:00:00Z'), 3).toISOString().slice(0, 10)).toBe('2027-02-04');
    expect(aFreeRunEndsOn(new Date('2026-09-19T09:00:00Z'), 3).toISOString().slice(0, 10)).toBe('2026-12-19');
  });
});
