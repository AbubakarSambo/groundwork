import { BillingService } from './billing.service';
import { whilePayingIsPossible } from './paying-is-possible-for-specs';

/* Paying is possible in this file, so the pause and the no-plan refusals apply as built (23 November 2026). */
whilePayingIsPossible();

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
  return new BillingService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
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
    // The INTENT here is that a non-free ground with no cover is still blocked - that has not changed. What it says has
    // (23 November 2026): there are no free check-ins to have used, so it says the check-in is paused until the team
    // subscribes, and that their answers are kept, because the person who hits this usually chose neither to pay nor to cancel.
    expect(res.reason).toBe('This check-in is paused until your team subscribes. Only an admin can do that, and your answers so far are kept.');
    expect(res.reason).not.toMatch(/\$5|add a check-in|free check-ins/i);
  });

  it('an active subscription is still unlimited (-1) on a non-free ground (paid path intact)', async () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ isFreeGround: false, sessionsBalance: 0, organizationId: 'org1' })) },
      organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: 'STARTER', subscriptionStatus: 'active', freeSessionsUsed: 0, freeExtensionUsed: false })) },
    };
    const svc = new BillingService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
    const res = await svc.canStartSession('g1');
    expect(res).toMatchObject({ allowed: true, sessionsBalance: -1 });
  });
});
