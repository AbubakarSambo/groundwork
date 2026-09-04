/**
 * A key result whose source is broken must say so, not sit there looking fine.
 *
 * The quiet failure: somebody types `sales.new_leads` instead of
 * `sales.new_leads_contacted`. There is no error, because a sensible-looking
 * fallback returns the stored value — so the board shows a sourced key result
 * that never moves, for a whole quarter, and the first person to notice is
 * whoever is asked why the objective was missed.
 *
 * A number that is not being measured is a different fact from a number that is
 * zero, and this is the seam where the two get confused.
 */
import { resolveNumber, MANUAL, progressToward } from './where-this-number-comes-from';

const WINDOW = { from: new Date('2026-10-01'), to: new Date('2026-12-31') };
const prisma = {
  opsSalesOpportunity: { findMany: async () => [{ company: { name: 'A' }, convertedAt: new Date('2026-11-01'), estimatedValue: null }] },
  opsActivity: { findMany: async () => [] },
  opsDeployment: { findMany: async () => [] },
} as never;

describe('a number sourced from a metric', () => {
  it('is computed rather than read, so nobody has to type it', async () => {
    const n = await resolveNumber(prisma, 'sales.conversions', 999, WINDOW);
    expect(n.value).toBe(1);
    expect(n.typedByHand).toBe(false);
  });

  it('and brings its rows with it', async () => {
    const n = await resolveNumber(prisma, 'sales.conversions', 0, WINDOW);
    expect(n.rows?.length).toBe(1);
  });

  it('and ignores whatever was stored, which is the point', async () => {
    const n = await resolveNumber(prisma, 'sales.conversions', 999, WINDOW);
    expect(n.value).not.toBe(999);
  });
});

describe('a number somebody typed', () => {
  it('is returned as given', async () => {
    const n = await resolveNumber(prisma, MANUAL, 7, WINDOW);
    expect(n.value).toBe(7);
  });

  it('and is labelled, so it cannot hide among the computed ones', async () => {
    const n = await resolveNumber(prisma, MANUAL, 7, WINDOW);
    expect(n.typedByHand).toBe(true);
    expect(n.says).toMatch(/by hand/);
  });
});

describe('a number whose source does not exist', () => {
  it('says out loud that nothing is measuring it', async () => {
    const n = await resolveNumber(prisma, 'sales.new_leads', 4, WINDOW);
    expect(n.problem).toMatch(/not a metric this system has/);
  });

  it('and does not pretend to be sourced', async () => {
    const n = await resolveNumber(prisma, 'sales.new_leads', 4, WINDOW);
    expect(n.typedByHand).toBe(true);
  });

  it('and its sentence warns rather than reassures', async () => {
    const n = await resolveNumber(prisma, 'sales.new_leads', 4, WINDOW);
    expect(n.says).toMatch(/not being measured/);
  });

  it('and names the source it could not find, so the typo is findable', async () => {
    const n = await resolveNumber(prisma, 'sales.new_leads', 4, WINDOW);
    expect(n.problem).toContain('sales.new_leads');
  });
});

describe('progress toward a target', () => {
  it('is a share of the distance, not of the target', () => {
    expect(progressToward(6, 10, 2)).toBe(50);
  });

  it('and a climb that has gone backwards reads as nothing, not as a negative', () => {
    expect(progressToward(-2, 10)).toBe(0);
  });

  it('and reads as a plain percentage from zero', () => {
    expect(progressToward(3, 5)).toBe(60);
  });
});

describe('a target of holding a number at zero', () => {
  /**
   * "No technical item is blocking a client" starts at zero and ends at zero.
   * There is no distance to cover, so a distance-only calculation renders it as
   * blank on the board every day — including every day it is being met. Found
   * by reading the live objectives page rather than the code: the row said
   * "0/0 items, None%", which is the shape of a number nobody will trust.
   */
  it('is met while the number is at the line', () => {
    expect(progressToward(0, 0)).toBe(100);
  });

  it('and stops being met the moment it is not', () => {
    expect(progressToward(1, 0)).toBe(0);
  });

  it('and gives no partial credit, because one blocker is not half of none', () => {
    expect(progressToward(3, 0)).toBe(0);
  });

  it('and holding at a number other than zero works the same way', () => {
    expect(progressToward(5, 5, 5)).toBe(100);
    expect(progressToward(6, 5, 5)).toBe(0);
  });
});
