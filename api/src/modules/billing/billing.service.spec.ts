import { BillingService } from './billing.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus } from '@prisma/client';

/**
 * Billing correctness invariants (GW-04). The participant fee must not
 * double-charge across period boundaries, and must stop for orgs that are
 * behind on their care fee.
 */
function baseConfig() {
  return { get: (k: string) => (k === 'stripe.scenarioFeeCents' ? 2500 : undefined) } as any;
}

function baseEmail() {
  return { sendPaymentFailed: jest.fn(), sendRecordPortabilityNotice: jest.fn(), sendBillingChangeNotification: jest.fn() } as any;
}

describe('BillingService.chargeParticipantFees — rolling periods & PAST_DUE (GW-04)', () => {
  function makePrisma(orgs: any[], lastEventByOrg: Record<string, any>, participants: any[] = []) {
    const created: any[] = [];
    return {
      created,
      prisma: {
        withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
        organization: { findMany: jest.fn(async () => orgs), findUnique: jest.fn(async (args: any) => orgs.find(o => o.id === args.where.id) ?? null) },
        ground: { findMany: jest.fn(async () => participants.length ? [{ participants }] : []) },
        billingEvent: {
          findFirst: jest.fn(async (args: any) => {
            if (args.orderBy) return lastEventByOrg[args.where.organizationId] ?? null;
            return null;
          }),
          create: jest.fn(async (args: any) => { created.push(args.data); return args.data; }),
        },
      } as any,
    };
  }

  it('charges the next period starting at the last period end — no calendar double-charge', async () => {
    const orgs = [{
      id: 'org1', stripeCustomerId: 'cus_1', careFeeStatus: CareFeeStatus.ACTIVE,
    }];
    const { prisma, created } = makePrisma(orgs, { org1: { periodEnd: new Date('2020-01-01') } }, [{ user: { email: 'a@x.com' } }]);
    const stripe: any = { chargeParticipantFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail(), { emit: () => Promise.resolve() } as any);

    await service.chargeParticipantFees();

    expect(created).toHaveLength(1);
    expect(created[0].periodStart).toEqual(new Date('2020-01-01'));
    expect(created[0].type).toBe(BillingEventType.PARTICIPANT_FEE);
    expect(created[0].groundId).toBeNull();
    expect(stripe.chargeParticipantFee).toHaveBeenCalledTimes(1);
  });

  it('skips an org whose care fee is PAST_DUE', async () => {
    const orgs = [{
      id: 'org2', stripeCustomerId: 'cus_2', careFeeStatus: CareFeeStatus.PAST_DUE,
    }];
    const { prisma, created } = makePrisma(orgs, {});
    const stripe: any = { chargeParticipantFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail(), { emit: () => Promise.resolve() } as any);

    await service.chargeParticipantFees();

    expect(created).toHaveLength(0);
    expect(stripe.chargeParticipantFee).not.toHaveBeenCalled();
  });

  it('does not charge while the current period is still running', async () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const orgs = [{
      id: 'org3', stripeCustomerId: 'cus_3', careFeeStatus: CareFeeStatus.ACTIVE,
    }];
    const { prisma, created } = makePrisma(orgs, { org3: { periodEnd: future } }, [{ user: { email: 'b@x.com' } }]);
    const stripe: any = { chargeParticipantFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail(), { emit: () => Promise.resolve() } as any);

    await service.chargeParticipantFees();
    expect(created).toHaveLength(0);
  });

  it('deduplicates participants across grounds — charges once per unique email', async () => {
    const orgs = [{ id: 'org4', stripeCustomerId: 'cus_4', careFeeStatus: CareFeeStatus.ACTIVE }];
    const { prisma, created } = makePrisma(
      orgs,
      { org4: { periodEnd: new Date('2020-01-01') } },
      // alice in two grounds, bob in one — should charge for 2 unique participants
      [{ user: { email: 'alice@x.com' } }, { user: { email: 'alice@x.com' } }, { user: { email: 'bob@x.com' } }],
    );
    const stripe: any = { chargeParticipantFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail(), { emit: () => Promise.resolve() } as any);

    await service.chargeParticipantFees();

    expect(created).toHaveLength(1);
    expect(created[0].amountCents).toBe(2500 * 2); // 2 unique participants
    expect(stripe.chargeParticipantFee).toHaveBeenCalledWith('cus_4', 2, expect.any(String));
  });

  it('allows sessions 1 and 2 free, blocks session 3 without billing', async () => {
    const prisma = {
      organization: { findUnique: jest.fn(async () => ({ careFeeStatus: CareFeeStatus.CANCELLED, stripeCustomerId: null })) },
    } as any;
    const service = new BillingService(prisma, {} as any, baseConfig(), baseEmail(), { emit: () => Promise.resolve() } as any);

    expect((await service.checkSessionGate('org1', 1)).allowed).toBe(true);
    expect((await service.checkSessionGate('org1', 2)).allowed).toBe(true);
    expect((await service.checkSessionGate('org1', 3)).allowed).toBe(false);
  });
});
