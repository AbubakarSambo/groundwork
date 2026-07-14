import { BillingService } from './billing.service';

/**
 * GW-FREE-TIER-UNLIMITED tripwire.
 *
 * The advertised model is 10 free Grounds per org with UNLIMITED sessions and
 * reports on each. canStartSession must therefore return the unlimited signal
 * (sessionsBalance: -1) for any free-tier ground (isFreeGround), regardless of
 * its balance - never the "$5 / No sessions remaining" paywall.
 *
 * The -1 signal is load-bearing: conversation.service.ts skips its
 * decrement/metering block when the gate is -1, which is the SECOND gate that
 * would otherwise still throw on a returning session-2. If this regresses to a
 * balance-based result, both gates come back and the paywall returns.
 */
function makeService(ground: any) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null, freeSessionsUsed: 0, freeExtensionUsed: false })) },
  };
  return new BillingService(prisma, {} as any, {} as any, {} as any, {} as any);
}

describe('GW-FREE-TIER-UNLIMITED: free-tier grounds are never session-paywalled', () => {
  it('returns unlimited (-1) for a free-tier ground with ZERO balance (the returning-session case)', async () => {
    const svc = makeService({ isFreeGround: true, sessionsBalance: 0, organizationId: 'org1' });
    const res = await svc.canStartSession('g1');
    expect(res.allowed).toBe(true);
    expect(res.sessionsBalance).toBe(-1); // unlimited signal, NOT a paywall
    expect(res.reason).toBeUndefined();
  });

  it('returns unlimited (-1) for a free-tier ground regardless of balance', async () => {
    const svc = makeService({ isFreeGround: true, sessionsBalance: 1, organizationId: 'org1' });
    const res = await svc.canStartSession('g1');
    expect(res).toMatchObject({ allowed: true, sessionsBalance: -1 });
  });

  it('a NON-free ground with zero balance is still metered/blocked (paid path intact)', async () => {
    const svc = makeService({ isFreeGround: false, sessionsBalance: 0, organizationId: 'org1' });
    const res = await svc.canStartSession('g1');
    expect(res.allowed).toBe(false);
    expect(res.sessionsBalance).toBe(0);
    expect(res.reason).toMatch(/No sessions remaining|3 free sessions/);
  });

  it('an active subscription is still unlimited (-1) on a non-free ground (paid path intact)', async () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ isFreeGround: false, sessionsBalance: 0, organizationId: 'org1' })) },
      organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: 'STARTER', subscriptionStatus: 'active', freeSessionsUsed: 0, freeExtensionUsed: false })) },
    };
    const svc = new BillingService(prisma, {} as any, {} as any, {} as any, {} as any);
    const res = await svc.canStartSession('g1');
    expect(res).toMatchObject({ allowed: true, sessionsBalance: -1 });
  });
});
