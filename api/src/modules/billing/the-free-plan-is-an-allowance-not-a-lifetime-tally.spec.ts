import { BillingService } from './billing.service';

/**
 * THE FREE PLAN IS AN ALLOWANCE, NOT A LIFETIME TALLY.
 *
 * canCreateGround counted every check-in the organisation had ever made against the free limit, so
 * an organisation that opened forty while subscribed and then cancelled had "used all ten free
 * check-ins" without ever having had one. The pricing page is frozen and says "up to 10 check-ins
 * for free"; a check-in opened on a subscription is stamped isFreeGround=false at creation; so the
 * function counts free check-ins, and means what the page says.
 */
const service = (count: jest.Mock) => {
  const s = Object.create(BillingService.prototype) as any;
  s.prisma = {
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: 'cancelled', careFeeStatus: null })) },
    ground: { count },
  };
  s.pricing = { getFreeGroundLimit: jest.fn(async () => 10) };
  return s;
};

describe('the free allowance', () => {
  it('counts free check-ins, not every check-in ever made', async () => {
    const count = jest.fn(async () => 3);
    await service(count).canCreateGround('org');
    expect(count).toHaveBeenCalledWith({ where: { organizationId: 'org', isFreeGround: true } });
  });

  it('so forty paid check-ins and three free ones is three of ten, and the fourth is allowed', async () => {
    const res = await service(jest.fn(async () => 3)).canCreateGround('org');
    expect(res).toEqual({ allowed: true, freeReason: 'FREE_TIER', groundsUsed: 3 });
  });

  it('and ten free ones is the limit the page names', async () => {
    const res = await service(jest.fn(async () => 10)).canCreateGround('org');
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/free plan includes 10 check-ins/);
  });
});
