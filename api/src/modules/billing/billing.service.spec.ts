import { BillingService } from './billing.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus } from '@prisma/client';

/**
 * Billing correctness invariants for the v2 model:
 *   - Platform fee:    $25/mo per account.
 *   - Participant fee: $25/mo per UNIQUE active participant across all active grounds.
 *     Participants in multiple grounds are billed once.
 *   - Sessions 1–2 are free; session 3+ requires billing-ready status.
 */
function baseConfig() {
  return { get: (k: string) => (k === 'stripe.scenarioFeeCents' ? 2500 : undefined) } as any;
}

function baseEmail() {
  return { sendPaymentFailed: jest.fn(), sendRecordPortabilityNotice: jest.fn(), sendBillingChangeNotification: jest.fn() } as any;
}

describe('BillingService.checkSessionGate', () => {
  function makeReadyPrisma() {
    return {
      organization: {
        findUnique: jest.fn(async () => ({ careFeeStatus: CareFeeStatus.ACTIVE, stripeCustomerId: 'cus_1', contributorBypass: false })),
      },
    } as any;
  }

  function makeUnreadyPrisma() {
    return {
      organization: {
        findUnique: jest.fn(async () => ({ careFeeStatus: CareFeeStatus.NONE, stripeCustomerId: null, contributorBypass: false })),
      },
    } as any;
  }

  it('allows sessions 1 and 2 without billing', async () => {
    const service = new BillingService(makeUnreadyPrisma(), {} as any, baseConfig(), baseEmail());
    expect((await service.checkSessionGate('org1', 1)).allowed).toBe(true);
    expect((await service.checkSessionGate('org1', 2)).allowed).toBe(true);
  });

  it('blocks session 3 when billing is not ready', async () => {
    const service = new BillingService(makeUnreadyPrisma(), {} as any, baseConfig(), baseEmail());
    const result = await service.checkSessionGate('org1', 3);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Sessions 1–2 are free/);
  });

  it('allows session 3+ when billing is ready', async () => {
    const service = new BillingService(makeReadyPrisma(), {} as any, baseConfig(), baseEmail());
    expect((await service.checkSessionGate('org1', 3)).allowed).toBe(true);
    expect((await service.checkSessionGate('org1', 10)).allowed).toBe(true);
  });
});

describe('BillingService.chargeParticipantFees — deduplication and rolling periods', () => {
  function makePrisma(orgs: any[], grounds: any[], lastEventByOrg: Record<string, any>) {
    const created: any[] = [];
    return {
      created,
      prisma: {
        withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
        organization: { findMany: jest.fn(async () => orgs) },
        ground: { findMany: jest.fn(async ({ where }: any) => grounds.filter(g => g.organizationId === where?.organizationId)) },
        billingEvent: {
          findFirst: jest.fn(async (args: any) => {
            if (args.orderBy) return lastEventByOrg[args.where.organizationId] ?? null;
            return null; // idempotency: no existing event for this exact period
          }),
          create: jest.fn(async (args: any) => { created.push(args.data); return args.data; }),
        },
      } as any,
    };
  }

  it('charges once per org with deduplicated participant count across grounds', async () => {
    const orgs = [{
      id: 'org1',
      stripeCustomerId: 'cus_1',
      careFeeStatus: CareFeeStatus.ACTIVE,
    }];
    // Two active grounds; alice@x.com appears in both — should only count once.
    const grounds = [
      { id: 'g1', organizationId: 'org1', status: GroundStatus.ACTIVE, participants: [{ email: 'alice@x.com' }, { email: 'bob@x.com' }] },
      { id: 'g2', organizationId: 'org1', status: GroundStatus.ACTIVE, participants: [{ email: 'alice@x.com' }, { email: 'carol@x.com' }] },
    ];
    const { prisma, created } = makePrisma(orgs, grounds, { org1: { periodEnd: new Date('2020-01-01') } });
    const stripe: any = { chargeParticipantFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail());

    await service.chargeParticipantFees();

    expect(created).toHaveLength(1);
    // alice + bob + carol = 3 unique participants
    expect(created[0].amountCents).toBe(2500 * 3);
    expect(created[0].type).toBe(BillingEventType.PARTICIPANT_FEE);
    expect(created[0].groundId).toBeNull();
    expect(stripe.chargeParticipantFee).toHaveBeenCalledWith('cus_1', 3, expect.any(String));
  });

  it('skips org whose care fee is PAST_DUE', async () => {
    const orgs = [{ id: 'org2', stripeCustomerId: 'cus_2', careFeeStatus: CareFeeStatus.PAST_DUE }];
    const grounds = [{ id: 'g3', organizationId: 'org2', status: GroundStatus.ACTIVE, participants: [{ email: 'dave@x.com' }] }];
    const { prisma, created } = makePrisma(orgs, grounds, {});
    const stripe: any = { chargeParticipantFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail());

    await service.chargeParticipantFees();

    expect(created).toHaveLength(0);
    expect(stripe.chargeParticipantFee).not.toHaveBeenCalled();
  });

  it('does not charge while the current period is still running', async () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const orgs = [{ id: 'org3', stripeCustomerId: 'cus_3', careFeeStatus: CareFeeStatus.ACTIVE }];
    const grounds = [{ id: 'g4', organizationId: 'org3', status: GroundStatus.ACTIVE, participants: [{ email: 'eve@x.com' }] }];
    const { prisma, created } = makePrisma(orgs, grounds, { org3: { periodEnd: future } });
    const stripe: any = { chargeParticipantFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail());

    await service.chargeParticipantFees();
    expect(created).toHaveLength(0);
  });

  it('charges the next period anchored to the previous period end — no double-charge', async () => {
    const lastEnd = new Date('2026-01-31T00:00:00Z');
    const orgs = [{ id: 'org4', stripeCustomerId: 'cus_4', careFeeStatus: CareFeeStatus.ACTIVE }];
    const grounds = [{ id: 'g5', organizationId: 'org4', status: GroundStatus.ACTIVE, participants: [{ email: 'frank@x.com' }] }];
    const { prisma, created } = makePrisma(orgs, grounds, { org4: { periodEnd: lastEnd } });
    const stripe: any = { chargeParticipantFee: jest.fn(async () => ({})) };
    const service = new BillingService(prisma, stripe, baseConfig(), baseEmail());

    await service.chargeParticipantFees();

    expect(created).toHaveLength(1);
    expect(created[0].periodStart).toEqual(lastEnd);
  });
});
