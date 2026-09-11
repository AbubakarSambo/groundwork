/**
 * Taking away the last approval capability strands everything of that kind.
 *
 * We have already watched this from the other direction: the CEO submitted a
 * claim, was correctly refused her own approval, and it sat at REQUESTED with
 * no possible route out because she was the only holder of spend:approve. That
 * was fixed by letting her record rather than request.
 *
 * The same hole opens the other way. Revoke spend:approve from the last person
 * who has it and every future claim from anybody strands — silently, looking
 * exactly like a claim somebody has not got round to. The revoke would be one
 * click, done for a good reason, on a screen showing no consequence.
 *
 * So the removal is refused and says what to do first.
 */
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { OpsPeopleService } from './ops-people.service';

const person = { id: 'p1', key: 'hafsah', displayName: 'Hafsah Jumare' };

function serviceWith(holders: number) {
  const deleted: unknown[] = [];
  const prisma = {
    opsPerson: { findUnique: async () => person },
    opsGrant: {
      count: async () => holders,
      deleteMany: async (args: unknown) => {
        deleted.push(args);
        return { count: 1 };
      },
      upsert: async ({ create }: never) => create,
    },
  } as never;
  return { service: new OpsPeopleService(prisma), deleted };
}

describe('revoking an approval capability', () => {
  it('is refused when they are the last person holding it', async () => {
    const { service } = serviceWith(1);
    await expect(service.revoke('hafsah', 'spend:approve')).rejects.toThrow(ConflictException);
  });

  it('and says what would happen, not just that it is refused', async () => {
    const { service } = serviceWith(1);
    await expect(service.revoke('hafsah', 'spend:approve')).rejects.toThrow(
      /nothing of that kind can ever be decided again/,
    );
  });

  it('and nothing is deleted when it is refused', async () => {
    const { service, deleted } = serviceWith(1);
    await service.revoke('hafsah', 'spend:approve').catch(() => undefined);
    expect(deleted).toEqual([]);
  });

  it('is allowed once somebody else holds it too', async () => {
    const { service, deleted } = serviceWith(2);
    await expect(service.revoke('hafsah', 'spend:approve')).resolves.toMatchObject({
      revoked: 'spend:approve',
    });
    expect(deleted).toHaveLength(1);
  });

  it('and covers every approval, not just spend', async () => {
    for (const capability of ['roadmap:approve', 'resourcing:approve', 'commercial:approve']) {
      const { service } = serviceWith(1);
      await expect(service.revoke('hafsah', capability)).rejects.toThrow(ConflictException);
    }
  });

  it('but an ordinary capability is not protected, because nothing strands', async () => {
    const { service, deleted } = serviceWith(1);
    await expect(service.revoke('hafsah', 'sales:write')).resolves.toBeDefined();
    expect(deleted).toHaveLength(1);
  });
});

describe('granting a capability', () => {
  it('refuses one this system does not have, so a typo is not a silent no-op', async () => {
    const { service } = serviceWith(2);
    await expect(service.grant('hafsah', 'sales:wrtie', 'hafsah')).rejects.toThrow(BadRequestException);
  });

  it('and accepts a real one', async () => {
    const { service } = serviceWith(2);
    await expect(service.grant('hafsah', 'sales:write', 'hafsah')).resolves.toMatchObject({
      capability: 'sales:write',
    });
  });
});

describe('somebody leaving', () => {
  /**
   * The record stays and the grants go. Deleting the person would take their
   * attributions, their commitments and their name off every timeline they
   * appear in — which is the history somebody asks about after they leave.
   */
  const leaving = () => {
    const updates: unknown[] = [];
    const grantDeletions: unknown[] = [];
    const prisma = {
      opsPerson: {
        findUnique: async () => person,
        /* Nobody else active, so nothing they owned can be handed on. See handWhatTheyOwnedToWhoeverHoldsTheRole. */
        findMany: async () => [],
        update: async ({ data }: never) => {
          updates.push(data);
          return { ...person, ...(data as object) };
        },
      },
      opsGrant: {
        deleteMany: async (args: unknown) => {
          grantDeletions.push(args);
          return { count: 5 };
        },
      },
    } as never;
    return { service: new OpsPeopleService(prisma), updates, grantDeletions };
  };

  it('is marked inactive and unlinked from their account', async () => {
    const { service, updates } = leaving();
    await service.setActive('hafsah', false);
    expect(updates[0]).toMatchObject({ active: false, userId: null });
  });

  it('and their grants are actually deleted, not just their flag flipped', async () => {
    /*
     * The first version of this test asserted only the update, so removing the
     * deletion entirely left it green — somebody marked "left" who still held
     * every capability, and an inactive record that identify() refuses is not
     * the same as a revoked grant if anything ever reads grants directly.
     * Found by biting it.
     */
    const { service, grantDeletions } = leaving();
    await service.setActive('hafsah', false);
    expect(grantDeletions).toEqual([{ where: { personId: 'p1' } }]);
  });

  it('and coming back does not silently restore what they held', async () => {
    const { service, grantDeletions } = leaving();
    await service.setActive('hafsah', true);
    expect(grantDeletions).toEqual([]);
  });

  it('and is not found at all if they were never here', async () => {
    const prisma = { opsPerson: { findUnique: async () => null } } as never;
    await expect(new OpsPeopleService(prisma).setActive('nobody', false)).rejects.toThrow(NotFoundException);
  });
});
