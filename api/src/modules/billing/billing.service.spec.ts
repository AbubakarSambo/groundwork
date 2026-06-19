import { BillingService } from './billing.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus } from '@prisma/client';

/**
 * Billing correctness invariants (GW-04). The scenario fee must not
 * double-charge across period boundaries, and must stop for orgs that are
 * behind on their care fee.
 */
function baseConfig() {
  return { get: (k: string) => (k === 'stripe.scenarioFeeCents' ? 5000 : undefined) } as any;
}

function baseEmail() {
  return { sendPaymentFailed: jest.fn(), sendRecordPortabilityNotice: jest.fn(), sendBillingChangeNotification: jest.fn() } as any;
}

describe('BillingService.chargeScenarioFees — rolling periods & PAST_DUE (GW-04)', () => {
  function makePrisma(grounds: any[], lastEventByGround: Record<string, any>) {
    const created: any[] = [];
    return {
      created,
      prisma: {
        withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
        ground: { findMany: jest.fn(async () => grounds) },
        billingEvent: {
          findFirst: jest.fn(async (args: any) => {
            // ordering query for "last period" vs idempotency check
            if (args.orderBy) return lastEventByGround[args.where.groundId] ?? null;
            return null; // idempotency: no existing event for this exact period
          }),
          create: jest.fn(async (args: any) => { created.push(args.data); return args.data; }),
        },
      } as any,
    };
  }

  it('charges the next period starting at the last period end — no calendar double-charge', async () => {
    const activatedAt = new Date('2026-01-28T00:00:00Z');
    const lastEnd = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 2026-02-27
    // Pretend "now" is after the last period ended.
    const grounds = [{
      id: 'g1', organizationId: 'org1', label: 'X', billingActivatedAt: activatedAt,
      organization: { stripeCustomerId: 'cus_1', careFeeStatus: CareFeeStatus.ACTIVE },
      participants: [{ id: 'p1' }, { id: 'p2' }],
    }];
    const { prisma, created } = makePrisma(grounds, { g1: { periodEnd: new Date('2020-01-01') } });
    const stripe: any = { chargeScenarioFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail(), { emit: () => Promise.resolve() } as any);

    await service.chargeScenarioFees();

    expect(created).toHaveLength(1);
    // The new period must START at the previous period's END (rolling), proving
    // we never re-charge an already-billed window.
    expect(created[0].periodStart).toEqual(new Date('2020-01-01'));
    expect(created[0].type).toBe(BillingEventType.SCENARIO_FEE);
    expect(created[0].amountCents).toBe(5000 * 2);
    expect(stripe.chargeScenarioFee).toHaveBeenCalledTimes(1);
  });

  it('skips a ground whose org care fee is not ACTIVE (PAST_DUE)', async () => {
    const grounds = [{
      id: 'g2', organizationId: 'org2', label: 'Y', billingActivatedAt: new Date('2020-01-01'),
      organization: { stripeCustomerId: 'cus_2', careFeeStatus: CareFeeStatus.PAST_DUE },
      participants: [{ id: 'p1' }],
    }];
    const { prisma, created } = makePrisma(grounds, {});
    const stripe: any = { chargeScenarioFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail(), { emit: () => Promise.resolve() } as any);

    await service.chargeScenarioFees();

    expect(created).toHaveLength(0);
    expect(stripe.chargeScenarioFee).not.toHaveBeenCalled();
  });

  it('does not charge while the current period is still running', async () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const grounds = [{
      id: 'g3', organizationId: 'org3', label: 'Z', billingActivatedAt: new Date(),
      organization: { stripeCustomerId: 'cus_3', careFeeStatus: CareFeeStatus.ACTIVE },
      participants: [{ id: 'p1' }],
    }];
    const { prisma, created } = makePrisma(grounds, { g3: { periodEnd: future } });
    const stripe: any = { chargeScenarioFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail(), { emit: () => Promise.resolve() } as any);

    await service.chargeScenarioFees();
    expect(created).toHaveLength(0);
  });
});
