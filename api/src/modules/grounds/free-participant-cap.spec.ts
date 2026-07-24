import { BadRequestException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * #5a: freeParticipantCap was written on ground creation (4 normal, 100
 * broadcast) but never read anywhere - addParticipant() only checked
 * duplicate emails. This locks that a free ground at its cap is blocked,
 * a free ground under its cap is allowed, and a subscribed (non-free)
 * ground is never capped here at all (its own plan-level member cap is a
 * separate, already-enforced dimension via canInviteMember).
 */

function makeService(ground: any, existingParticipantCount: number) {
  const tx: any = {
    groundParticipant: { create: jest.fn(async (args: any) => ({ id: 'new-p', ...args.data })) },
    checkIn: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ground) },
    user: { findUnique: jest.fn(async () => ({ id: 'admin', firstName: 'Admin' })) },
    groundParticipant: {
      findFirst: jest.fn(async () => null), // no existing participant with this email
      count: jest.fn(async () => existingParticipantCount),
      update: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
    },
    checkIn: { findFirst: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const email: any = { sendParticipantInvite: jest.fn(async () => ({})) };
  const usage: any = { emit: () => Promise.resolve() };
  return new GroundsService(prisma, email, {} as any, { emit: () => Promise.resolve() } as any, usage, {} as any);
}

const FREE_GROUND = { id: 'g1', initiatorId: 'admin', label: 'Test', isFreeGround: true, freeParticipantCap: 4, cadence: 'FORTNIGHTLY' };
const PAID_GROUND = { ...FREE_GROUND, isFreeGround: false };

describe('#5a free-tier participant cap is enforced', () => {
  it('blocks adding a participant to a free ground already at its cap', async () => {
    const service = makeService(FREE_GROUND, 4);
    await expect(
      service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows adding a participant to a free ground under its cap', async () => {
    const service = makeService(FREE_GROUND, 2);
    await expect(
      service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
    ).resolves.toBeDefined();
  });

  it('does not cap a paid (non-free) ground at all', async () => {
    const service = makeService(PAID_GROUND, 999);
    await expect(
      service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
    ).resolves.toBeDefined();
  });
});
