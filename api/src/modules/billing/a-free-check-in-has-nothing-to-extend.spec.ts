import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillingEventType } from '@prisma/client';
import { BillingService } from './billing.service';

/**
 * A FREE CHECK-IN HAS NOTHING TO EXTEND, AND A SESSION CAN BE GIVEN BACK.
 *
 * claimFreeExtension had no free-ground guard - purchaseSession, in the same file, did - so the
 * organisation's one extension was spent on a check-in with unlimited sessions, the person was told
 * "Free session added", and the flag never reset. And there was no refund, reversal or credit
 * anywhere, so "I was charged and got nothing" had no answer. Now there is one, for a platform admin,
 * with the reason on the ledger.
 */
const service = (ground: any, org = { freeExtensionUsed: false }) => {
  const writes: any[] = [];
  const s = Object.create(BillingService.prototype) as any;
  s.logger = { log: () => {}, warn: () => {} };
  s.prisma = {
    ground: { findFirst: jest.fn(async () => ground), findUnique: jest.fn(async () => ground), update: jest.fn((a: any) => ({ ...a, sessionsBalance: 1 })) },
    organization: { findUnique: jest.fn(async () => org), update: jest.fn((a: any) => a) },
    billingEvent: { create: jest.fn((a: any) => a) },
    $transaction: jest.fn(async (ops: any[]) => { writes.push(...ops); return ops.map((o) => (o?.data?.sessionsBalance ? { sessionsBalance: 1 } : o)); }),
  };
  return { s, writes };
};

describe('the free extension', () => {
  it('is refused on a free check-in, with purchaseSession’s reason, before anything is spent', async () => {
    const { s } = service({ id: 'g', isFreeGround: true });
    await expect(s.claimFreeExtension('org', 'g')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(s.claimFreeExtension('org', 'g')).rejects.toThrow(/already has unlimited free sessions, so there is nothing to extend/);
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('says that "already used" is permanent, rather than "try again"', async () => {
    const { s } = service({ id: 'g', isFreeGround: false }, { freeExtensionUsed: true });
    await expect(s.claimFreeExtension('org', 'g')).rejects.toThrow(/already used its one free extension.*does not reset/);
  });

  it('is granted once on a metered check-in', async () => {
    const { s } = service({ id: 'g', isFreeGround: false });
    await s.claimFreeExtension('org', 'g');
    expect(s.prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe('a credit', () => {
  it('adds one session and writes a ledger row of its own type, with who and when in the unique column', async () => {
    const { s, writes } = service({ id: 'g', organizationId: 'org' });
    const res = await s.creditSession('g', 'charged twice on 3 September, see ticket 41', 'admin-user-1');
    expect(res).toEqual({ groundId: 'g', sessionsBalance: 1 });
    const row = writes.find((w) => w?.data?.type)?.data;
    expect(row).toMatchObject({ type: BillingEventType.CREDIT, amountCents: 0, groundId: 'g', organizationId: 'org' });
    expect(row.stripeInvoiceId).toMatch(/^credit_g_\d+_admin-us/);
  });

  it('needs a reason, because the ledger is the point', async () => {
    const { s } = service({ id: 'g', organizationId: 'org' });
    await expect(s.creditSession('g', '   ', 'admin')).rejects.toBeInstanceOf(BadRequestException);
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('and a check-in that is not there is not credited', async () => {
    const { s } = service(null);
    await expect(s.creditSession('nope', 'reason', 'admin')).rejects.toBeInstanceOf(NotFoundException);
  });
});
