import { BillingService } from './billing.service';

/**
 * FOUND IN THE USER JOURNEYS (F-24 re-run). With the free trial switched on, an organisation on its free run holds no plan of its own, only the one it was
 * given, and inviting a colleague asked for the seat cap of "no plan" and failed ('Argument plan must not be null'). It asks for the plan that covers it.
 */
function svc(memberCapFor: jest.Mock) {
  const prisma = {
    user: { count: async () => 3 },
    organization: { findUnique: async () => ({ subscriptionPlan: null, subscriptionStatus: null, freeUntil: new Date(Date.now() + 20 * 86_400_000), freePlan: 'SMALL_TEAM', createdAt: new Date() }) },
  } as any;
  const pricing = { getFreeMemberLimit: async () => 5, memberCapFor } as any;
  return new BillingService(prisma, { stripe: {} } as any, pricing, {} as any, { sendMemberCapWarning: async () => undefined } as any, {} as any);
}

describe('an organisation on a free run, inviting a colleague', () => {
  it('is let in, by the cap of the plan it was given', async () => {
    const cap = jest.fn(async () => 20);
    expect((await svc(cap).canInviteMember('org1')).allowed).toBe(true);
    expect(cap).toHaveBeenCalledWith('SMALL_TEAM');
  });
  it('and refused at that plan\'s cap, not at nothing', async () => {
    const cap = jest.fn(async () => 3);
    expect((await svc(cap).canInviteMember('org1')).allowed).toBe(false);
  });
});
