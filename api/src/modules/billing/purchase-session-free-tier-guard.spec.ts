import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';

/**
 * GW-PURCHASE-SESSION-FREE-TIER-GUARD tripwire.
 *
 * purchaseSession() creates a real Stripe Checkout session at $5/unit
 * (unit_amount: 500). The advertised model is unlimited free sessions on
 * every free-tier ground - a charge against one is a live billing-correctness
 * bug, not a cosmetic issue. The paywall TRIGGERS (the UI buttons) were
 * already hidden for free-tier grounds (fix/free-tier-unlimited-sessions),
 * but the endpoint itself had no isFreeGround check - reachable directly via
 * POST /billing/purchase-session or the /billing/checkout?groundId= deep
 * link regardless of what the UI shows. This guards the mechanism itself:
 * no Stripe session may ever be created for a free-tier ground, from any
 * caller.
 */
function makeService(ground: any, stripeCreate: jest.Mock = jest.fn()) {
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ id: 'org1', email: 'a@b.com', stripeCustomerId: 'cus_1' })), update: jest.fn() },
    ground: { findFirst: jest.fn(async () => ground) },
  };
  const stripe: any = {
    ensureCustomer: jest.fn(async () => 'cus_1'),
    stripe: { checkout: { sessions: { create: stripeCreate } } },
  };
  const config: any = { get: jest.fn(() => 'http://localhost:5173/billing/callback') };
  return { svc: new BillingService(prisma, stripe, config, {} as any, {} as any), prisma, stripeCreate };
}

describe('GW-PURCHASE-SESSION-FREE-TIER-GUARD: the charge mechanism itself refuses free-tier grounds', () => {
  it('refuses a free-tier ground - no Stripe session created', async () => {
    const { svc, stripeCreate } = makeService({ id: 'g1', isFreeGround: true, organizationId: 'org1' });
    await expect(svc.purchaseSession('org1', 'g1', 1)).rejects.toThrow(ForbiddenException);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it('allows a genuinely paid (non-free) ground - Stripe session is created', async () => {
    const stripeCreate = jest.fn(async () => ({ url: 'https://checkout.stripe.com/xyz' }));
    const { svc } = makeService({ id: 'g1', isFreeGround: false, organizationId: 'org1' }, stripeCreate);
    const res = await svc.purchaseSession('org1', 'g1', 1);
    expect(res.checkoutUrl).toBe('https://checkout.stripe.com/xyz');
    expect(stripeCreate).toHaveBeenCalledTimes(1);
    const callArg: any = (stripeCreate.mock.calls as any)[0][0];
    expect(callArg.line_items[0].price_data.unit_amount).toBe(500);
  });

  it('404s on a ground that does not belong to the calling org (no cross-org purchase)', async () => {
    const { svc, stripeCreate } = makeService(null);
    await expect(svc.purchaseSession('org1', 'not-mine', 1)).rejects.toThrow(NotFoundException);
    expect(stripeCreate).not.toHaveBeenCalled();
  });
});
