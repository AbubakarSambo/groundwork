import { of } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';

/**
 * A RETRIED POST DOES NOT OPEN TWO CHECK-INS.
 *
 * Idempotency-Key was honoured on two of thirty-seven POST routes. A retried POST /grounds after a
 * timeout opened a second check-in, spent a free one and invited the same people twice (F14). One
 * interceptor now runs every POST on the published API that carries the header through the same
 * record-and-replay.
 */
function aStore() {
  const rows: any[] = [];
  const prisma: any = {
    idempotencyRecord: {
      findFirst: jest.fn(async ({ where }: any) => rows.find((r) => r.organizationId === where.organizationId && r.key === where.key && (where.endpoint?.not ? r.endpoint !== where.endpoint.not : r.endpoint === where.endpoint)) ?? null),
      create: jest.fn(async ({ data }: any) => { rows.push(data); return data; }),
    },
  };
  return { prisma, rows };
}
const call = (interceptor: IdempotencyInterceptor, req: any, handler: jest.Mock) =>
  new Promise((resolve, reject) => {
    interceptor.intercept({ switchToHttp: () => ({ getRequest: () => req }) } as any, { handle: () => of(handler()) } as any)
      .subscribe({ next: resolve, error: reject });
  });
const aRequest = (over: any = {}) => ({
  method: 'POST', originalUrl: '/api/org/v1/grounds', headers: { 'idempotency-key': 'k-1' },
  machine: { organizationId: 'org-1' }, body: { label: 'Q3' }, ...over,
});

describe('a POST on the published API with an Idempotency-Key', () => {
  it('runs once and replays the first answer on the retry', async () => {
    const { prisma } = aStore();
    const interceptor = new IdempotencyInterceptor(new IdempotencyService(prisma));
    const handler = jest.fn(() => ({ id: 'g1' }));
    expect(await call(interceptor, aRequest(), handler)).toEqual({ id: 'g1' });
    expect(await call(interceptor, aRequest(), handler)).toEqual({ id: 'g1' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('refuses the same key with a different body', async () => {
    const { prisma } = aStore();
    const interceptor = new IdempotencyInterceptor(new IdempotencyService(prisma));
    const handler = jest.fn(() => ({ id: 'g1' }));
    await call(interceptor, aRequest(), handler);
    await expect(call(interceptor, aRequest({ body: { label: 'Q4' } }), handler)).rejects.toThrow(/different request body/);
  });

  it('is scoped to the organisation and the route', async () => {
    const { prisma } = aStore();
    const interceptor = new IdempotencyInterceptor(new IdempotencyService(prisma));
    const handler = jest.fn(() => ({ ok: true }));
    await call(interceptor, aRequest(), handler);
    await call(interceptor, aRequest({ machine: { organizationId: 'org-2' } }), handler);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(prisma.idempotencyRecord.create.mock.calls[0][0].data.endpoint).toBe('POST /grounds');
  });

  it('does nothing without a key, on a GET, or on the two routes that derive their own key', async () => {
    const { prisma } = aStore();
    const interceptor = new IdempotencyInterceptor(new IdempotencyService(prisma));
    const handler = jest.fn(() => ({ ok: true }));
    await call(interceptor, aRequest({ headers: {} }), handler);
    await call(interceptor, aRequest({ method: 'GET' }), handler);
    await call(interceptor, aRequest({ originalUrl: '/api/org/v1/subjects' }), handler);
    await call(interceptor, aRequest({ originalUrl: '/api/org/v1/subjects/bulk?x=1' }), handler);
    expect(handler).toHaveBeenCalledTimes(4);
    expect(prisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });
});
