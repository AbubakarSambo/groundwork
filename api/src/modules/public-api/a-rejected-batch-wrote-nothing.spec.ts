import { BadRequestException } from '@nestjs/common';
import { GroundsByApiService } from './grounds-by-api.service';

/**
 * A REJECTED BATCH WROTE NOTHING.
 *
 * seedObjectives threw on the first bad item with every earlier item already upserted, so a caller
 * with a 400 could not tell whether nothing, some or nearly all of their objectives had landed (F14).
 * The whole batch is checked first; the writes run inside one transaction.
 */
function aService() {
  const upserts: any[] = [];
  const tx = { personObjective: { upsert: jest.fn(async ({ create }: any) => { upserts.push(create); return { id: `o${upserts.length}`, kind: create.kind ?? 'GOAL' }; }) } };
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ({ id: 'g1' })) },
    person: { findFirst: jest.fn(async ({ where }: any) => (where.externalId === 'nobody' ? null : { email: `${where.externalId}@x.example` })) },
    groundParticipant: { findFirst: jest.fn(async ({ where }: any) => ({ id: `p-${where.email}` })) },
    personObjective: { upsert: jest.fn(async () => { throw new Error('a write outside the transaction'); }) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const service = new GroundsByApiService(prisma, {} as any, {} as any, {} as any, {} as any);
  return { service, prisma, upserts };
}
const good = (externalId: string) => ({ externalId, text: 'Ship the thing', kind: 'GOAL', personExternalId: 'ada' });

describe('seeding objectives', () => {
  it('writes nothing when any item is bad, whatever its position', async () => {
    const { service, upserts, prisma } = aService();
    await expect(service.seedObjectives('org-1', 'g1', [good('a'), good('b'), { ...good('c'), text: '' }] as any)).rejects.toThrow(BadRequestException);
    expect(upserts).toEqual([]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('nor when a person in it is unknown', async () => {
    const { service, upserts } = aService();
    await expect(service.seedObjectives('org-1', 'g1', [good('a'), { ...good('b'), personExternalId: 'nobody' }] as any)).rejects.toThrow(/No person/);
    expect(upserts).toEqual([]);
  });

  it('and writes all of a good batch inside one transaction', async () => {
    const { service, upserts, prisma } = aService();
    const out = await service.seedObjectives('org-1', 'g1', [good('a'), good('b')] as any);
    expect(out.seeded.map((s) => s.externalId)).toEqual(['a', 'b']);
    expect(upserts).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.personObjective.upsert).not.toHaveBeenCalled();
  });
});
