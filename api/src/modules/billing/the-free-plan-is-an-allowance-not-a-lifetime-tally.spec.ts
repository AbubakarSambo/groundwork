import { BillingService, NO_PLAN_TO_OPEN } from './billing.service';
import { whilePayingIsPossible } from './paying-is-possible-for-specs';

/* Paying is possible in this file, so the pause and the no-plan refusals apply as built (23 November 2026). */
whilePayingIsPossible();

/**
 * THERE IS NO ALLOWANCE OF FREE CHECK-INS (rewritten 23 November 2026: Hafsah, 22 November, "there's nothing like 10 free
 * checkins"; the free plan is the free trial).
 *
 * This file used to prove that canCreateGround counted only free check-ins against a limit of ten. There is no limit now, so
 * nothing is counted: an organisation with no cover and no trial left is told it has no plan, however many check-ins it made.
 */
const service = (count: jest.Mock) => {
  const s = Object.create(BillingService.prototype) as any;
  s.prisma = {
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: 'cancelled', careFeeStatus: null, freeTrialStartedAt: new Date('2026-06-01'), freeUntil: new Date('2026-07-01'), freePlan: 'SMALL_TEAM' })) },
    ground: { count },
    platformSetting: { findUnique: jest.fn(async () => null) },
  };
  s.pricing = { getFreeTrial: jest.fn(async () => ({ on: true, teamsUnder: 20, months: 1 })) };
  return s;
};

describe('no free allowance', () => {
  it('never counts check-ins to decide whether another may be opened', async () => {
    const count = jest.fn(async () => 3);
    await service(count).canCreateGround('org');
    expect(count).not.toHaveBeenCalled();
  });

  it('three check-ins or forty, an organisation whose trial is over is told it has no plan, not a count', async () => {
    for (const n of [3, 40]) {
      const res = await service(jest.fn(async () => n)).canCreateGround('org');
      expect(res).toEqual({ allowed: false, reason: NO_PLAN_TO_OPEN, noPlan: true });
    }
  });
});
