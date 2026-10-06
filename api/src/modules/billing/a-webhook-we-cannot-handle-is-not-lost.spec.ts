import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

/**
 * A WEBHOOK WE CANNOT HANDLE IS NOT LOST.
 *
 * The controller called the handler with no try/catch, so any throw became a non-2xx. A
 * deterministic failure then stuck for ever: Stripe retried on its own schedule, every retry failed
 * the same way, and nobody was told. Now the event is kept with what went wrong, Stripe is answered
 * 200, and the retry runs from our record - where a platform admin can also see it.
 */
const event: any = { id: 'evt_1', type: 'invoice.payment_succeeded', data: { object: {} } };

describe('the webhook', () => {
  const controller = (handle: () => Promise<void>) => {
    const billing: any = { handleStripeEvent: jest.fn(handle), recordStripeEventFailure: jest.fn(async () => undefined) };
    const stripe: any = { constructEvent: jest.fn(() => event) };
    return { c: new BillingController(billing, stripe, {} as any, { whatIsWaitingFor: async () => null } as any, {} as any), billing };
  };

  it('answers 200 and keeps the event when the handler throws', async () => {
    const { c, billing } = controller(async () => { throw new Error('column does not exist'); });
    const res = await c.webhook({ rawBody: Buffer.from('{}') }, 'sig');
    expect(res).toEqual({ received: true, type: event.type, held: true });
    expect(billing.recordStripeEventFailure).toHaveBeenCalledWith(event, expect.any(Error));
  });

  it('keeps nothing when the handler succeeds', async () => {
    const { c, billing } = controller(async () => undefined);
    const res = await c.webhook({ rawBody: Buffer.from('{}') }, 'sig');
    expect(res).toEqual({ received: true, type: event.type });
    expect(billing.recordStripeEventFailure).not.toHaveBeenCalled();
  });

  it('still refuses an event whose signature does not verify - that one is not kept', async () => {
    const billing: any = { handleStripeEvent: jest.fn(), recordStripeEventFailure: jest.fn() };
    const stripe: any = { constructEvent: jest.fn(() => { throw new Error('No signatures found'); }) };
    const c = new BillingController(billing, stripe, {} as any, { whatIsWaitingFor: async () => null } as any, {} as any);
    await expect(c.webhook({ rawBody: Buffer.from('{}') }, 'bad')).rejects.toThrow(/signatures/);
    expect(billing.recordStripeEventFailure).not.toHaveBeenCalled();
  });
});

describe('the record and the retry', () => {
  const service = (rows: any[]) => {
    const writes: any[] = [];
    const s = Object.create(BillingService.prototype) as any;
    s.logger = { log: () => {}, warn: () => {}, error: () => {} };
    s.prisma = {
      stripeEventFailure: {
        upsert: jest.fn(async (a: any) => { writes.push({ upsert: a }); return {}; }),
        findMany: jest.fn(async () => rows),
        update: jest.fn(async (a: any) => { writes.push({ update: a }); return {}; }),
      },
    };
    return { s, writes };
  };

  it('writes the event, its type and the error, and counts a repeat as another attempt', async () => {
    const { s, writes } = service([]);
    await s.recordStripeEventFailure(event, new Error('boom'));
    expect(writes[0].upsert).toMatchObject({
      where: { eventId: 'evt_1' },
      create: { eventId: 'evt_1', eventType: event.type, error: 'boom', payload: event },
      update: { error: 'boom', attempts: { increment: 1 } },
    });
  });

  it('retries from our record and marks a success resolved', async () => {
    const { s, writes } = service([{ id: 'f1', eventId: 'evt_1', eventType: event.type, payload: event, attempts: 1 }]);
    s.handleStripeEvent = jest.fn(async () => undefined);
    await s.retryStripeEventsWeCouldNotHandle();
    expect(s.handleStripeEvent).toHaveBeenCalledWith(event);
    expect(writes[0].update).toMatchObject({ where: { id: 'f1' }, data: { resolvedAt: expect.any(Date) } });
  });

  it('a retry that fails again counts the attempt and keeps the newest error', async () => {
    const { s, writes } = service([{ id: 'f1', eventId: 'evt_1', eventType: event.type, payload: event, attempts: 2 }]);
    s.handleStripeEvent = jest.fn(async () => { throw new Error('still broken'); });
    await s.retryStripeEventsWeCouldNotHandle();
    expect(writes[0].update).toMatchObject({ where: { id: 'f1' }, data: { attempts: { increment: 1 }, error: 'still broken' } });
  });

  it('asks only for unresolved failures under the attempt limit', async () => {
    const { s } = service([]);
    await s.retryStripeEventsWeCouldNotHandle();
    expect(s.prisma.stripeEventFailure.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { resolvedAt: null, attempts: { lt: BillingService.STRIPE_RETRY_ATTEMPTS } },
    }));
  });
});
