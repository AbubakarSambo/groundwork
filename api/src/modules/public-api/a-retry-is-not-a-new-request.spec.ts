import { IdempotencyService } from './idempotency.service';
import { ConflictException } from '@nestjs/common';

/**
 * THE KEY IDENTIFIES A RETRY. THE KEY PLUS THE BODY IDENTIFIES THE OPERATION.
 *
 * The first version keyed on (org, key, endpoint) alone, which is enough to make a genuine retry
 * safe and is quietly catastrophic for the commonest client mistake: one Idempotency-Key generated
 * per retry LOOP rather than per operation. Push five hundred subjects that way and every one after
 * the first replays the first response - five hundred cheerful 200s, one row stored, no error
 * anywhere. Their write is not refused, it is answered with somebody else's answer.
 *
 * Found by sending two different bodies under one key against the running server and watching the
 * second come back as the first. It typechecked, it had tests, and it was wrong.
 */
function svc() {
  const rows: any[] = [];
  const prisma: any = {
    idempotencyRecord: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.endpoint?.not !== undefined) {
          /* `where.endpoint` is `{ not: '...' }` here, so compare against `.not` - comparing
             against the object itself is always unequal and makes every same-endpoint retry look
             like a cross-endpoint reuse. */
          return rows.find((r) => r.organizationId === where.organizationId && r.key === where.key && r.endpoint !== where.endpoint.not) ?? null;
        }
        return rows.find((r) => r.organizationId === where.organizationId && r.key === where.key && r.endpoint === where.endpoint) ?? null;
      }),
      create: jest.fn(async ({ data }: any) => { rows.push(data); return data; }),
    },
  };
  return { service: new IdempotencyService(prisma), rows };
}

describe('a retry is not a new request', () => {
  it('runs the work when there is no prior record', async () => {
    const { service } = svc();
    const work = jest.fn(async () => ({ title: 'first' }));
    await expect(service.run('org1', 'K', 'POST /subjects', { a: 1 }, work)).resolves.toEqual({ title: 'first' });
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('replays the stored response for the same key AND the same body, without rerunning', async () => {
    /* Replayed verbatim rather than recomputed: recomputing returns the state as it is NOW, so a
       client that retried once would see its own later update inside what looks like an older
       response. */
    const { service } = svc();
    const work = jest.fn(async () => ({ title: 'first' }));
    await service.run('org1', 'K', 'POST /subjects', { a: 1 }, work);
    await expect(service.run('org1', 'K', 'POST /subjects', { a: 1 }, work)).resolves.toEqual({ title: 'first' });
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('REFUSES the same key with a different body rather than replaying', async () => {
    const { service } = svc();
    await service.run('org1', 'K', 'POST /subjects', { a: 1 }, async () => ({ title: 'first' }));
    await expect(
      service.run('org1', 'K', 'POST /subjects', { a: 2 }, async () => ({ title: 'second' })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses the same key on a different endpoint', async () => {
    const { service } = svc();
    await service.run('org1', 'K', 'POST /subjects', { a: 1 }, async () => ({ ok: true }));
    await expect(
      service.run('org1', 'K', 'DELETE /subjects', { a: 1 }, async () => ({ ok: true })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('another org may use the same key for its own unrelated call', async () => {
    /* Keys are the customer's own strings. Two customers picking "1" is not a collision, and
       treating it as one would make one tenant's retries visible in another's failures. */
    const { service } = svc();
    await service.run('org1', 'K', 'POST /subjects', { a: 1 }, async () => ({ who: 'a' }));
    await expect(service.run('org2', 'K', 'POST /subjects', { a: 2 }, async () => ({ who: 'b' })))
      .resolves.toEqual({ who: 'b' });
  });

  it('no key means no guarantee, and none is invented', async () => {
    /* Inventing one would be a promise the caller did not make and cannot rely on. */
    const { service } = svc();
    const work = jest.fn(async () => ({ n: 1 }));
    await service.run('org1', undefined, 'POST /subjects', { a: 1 }, work);
    await service.run('org1', '  ', 'POST /subjects', { a: 1 }, work);
    expect(work).toHaveBeenCalledTimes(2);
  });
});
