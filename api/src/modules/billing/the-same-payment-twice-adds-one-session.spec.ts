import { BillingService } from './billing.service';

/**
 * THE SAME PAYMENT TWICE ADDS ONE SESSION.
 *
 * The session-fee branch read findFirst then wrote, against a column uniquely indexed for exactly
 * this race. Two concurrent deliveries both found nothing, both wrote, and the loser's P2002 came out
 * of the webhook as a 500 - so Stripe retried a payment that had been processed, for ever. The
 * constraint decides now, inside the transaction, and a duplicate is a log line.
 */
const paid: any = {
  id: 'evt_fee',
  type: 'checkout.session.completed',
  data: { object: { metadata: { type: 'session_fee', organizationId: 'org', groundId: 'g', quantity: '2' }, payment_intent: 'pi_1' } },
};

const service = (transaction: () => Promise<any>) => {
  const s = Object.create(BillingService.prototype) as any;
  s.logger = { log: () => {}, warn: () => {}, error: () => {} };
  s.prisma = {
    $transaction: jest.fn(transaction),
    ground: { update: jest.fn((a: any) => a) },
    billingEvent: { create: jest.fn((a: any) => a), findFirst: jest.fn() },
  };
  return s;
};

describe('a session fee', () => {
  it('credits the balance and writes the row in one transaction, with no prior read', async () => {
    const s = service(async () => []);
    await s.handleStripeEvent(paid);
    expect(s.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(s.prisma.billingEvent.findFirst).not.toHaveBeenCalled();
    expect(s.prisma.ground.update).toHaveBeenCalledWith(expect.objectContaining({ data: { sessionsBalance: { increment: 2 } } }));
  });

  it('a redelivery is absorbed by the constraint and does not throw', async () => {
    const s = service(async () => { const e: any = new Error('dup'); e.code = 'P2002'; throw e; });
    await expect(s.handleStripeEvent(paid)).resolves.toBeUndefined();
  });

  it('any other failure still throws, so it is kept and retried rather than swallowed', async () => {
    const s = service(async () => { const e: any = new Error('connection reset'); e.code = 'P1001'; throw e; });
    await expect(s.handleStripeEvent(paid)).rejects.toThrow(/connection reset/);
  });
});
