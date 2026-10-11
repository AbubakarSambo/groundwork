import { UsersService } from './users.service';
import { ForbiddenException } from '@nestjs/common';

/**
 * THE RULE IS ENFORCED BY THE PATHS THAT REMOVE PEOPLE, not only stated by a function.
 *
 * Written because breaking it on purpose proved nothing was watching: deleting the check from
 * `update()` left every test in this module green. The pure rule had ten tests and its wiring had
 * none, which is the failure mode where a refactor quietly removes a protection and CI applauds.
 */
const OWNER = 'owner-id';
const ASSISTANT = 'assistant-id';

const svc = (over: { targetId?: string; targetRole?: string } = {}) => {
  const s = Object.create(UsersService.prototype) as any;
  s.logger = { log: () => {} };
  const target = {
    id: over.targetId ?? OWNER, role: over.targetRole ?? 'ADMIN',
    email: 'someone@x.test', isActive: true, organizationId: 'org1',
  };
  s.prisma = {
    user: {
      findFirst: async () => target,
      findUnique: async ({ where }: any) =>
        where.id === ASSISTANT ? { id: ASSISTANT, role: 'ADMIN' } : target,
      count: async () => 5,
      update: async () => { throw new Error('should not have been written'); },
    },
    /* Remove finds the person by their membership here (11 October 2026), so the stub has one. */
    organizationMembership: { findUnique: async () => ({ id: 'm-target', role: target.role }) },
    organization: { findUnique: async () => ({ ownerUserId: OWNER }) },
    $transaction: async () => { throw new Error('should not have opened a transaction'); },
  };
  return s;
};

describe('another admin cannot take the holder\'s role away', () => {
  it('through the update path', async () => {
    await expect(
      svc().update(OWNER, 'org1', { role: 'MEMBER' } as any, ASSISTANT),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('or by deactivating them through the update path', async () => {
    await expect(
      svc().update(OWNER, 'org1', { isActive: false } as any, ASSISTANT),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('or through the remove path, which is the one that anonymises them', async () => {
    await expect(svc().remove(OWNER, 'org1', ASSISTANT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('and nothing is written on the way to being refused', async () => {
    /* The stubs throw if anything writes. A refusal that has already changed a row is not one. */
    await expect(svc().update(OWNER, 'org1', { role: 'MEMBER' } as any, ASSISTANT)).rejects.toThrow(/holds this account/i);
  });
});

describe('and ordinary management still works', () => {
  it('an admin may change somebody who does not hold the account', async () => {
    const s = svc({ targetId: 'somebody-else', targetRole: 'MEMBER' });
    /* Gets past the ownership check and fails at the transaction stub, which is how we know. */
    await expect(s.update('somebody-else', 'org1', { role: 'LEAD' } as any, ASSISTANT))
      .rejects.toThrow(/should not have opened a transaction/);
  });
});
