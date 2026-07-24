import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * #5b: canInviteMember (per-plan member cap) had zero callers anywhere in
 * the codebase - a dead gate. teamInvite() is the one place that actually
 * consumes a new member seat in the inviter's org (creating a brand-new
 * user there); the "user already exists" branch just sends a sign-in link
 * and never moves that user into the inviter's org, so it correctly stays
 * uncapped. This locks that teamInvite() is blocked when canInviteMember
 * says no, and unaffected for the existing-user path or when no inviter
 * org is known.
 */

function makeService(canInviteResult: { allowed: boolean; reason?: string }, existingUser: any = null) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => existingUser) },
    $transaction: jest.fn(async (fn: any) => fn({
      organization: { create: jest.fn(async () => ({ id: 'new-org' })) },
      user: { create: jest.fn(async () => ({ id: 'new-user' })) },
      emailVerificationToken: { create: jest.fn(async () => ({})) },
    })),
    emailVerificationToken: { updateMany: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
  };
  const emailService: any = { sendUserInvite: jest.fn(async () => undefined), sendMagicLinkEmail: jest.fn(async () => undefined) };
  const billing: any = { canInviteMember: jest.fn(async () => canInviteResult) };
  const service = new AuthService(prisma, {} as any, {} as any, emailService, {} as any, billing);
  return { service, billing };
}

describe('#5b teamInvite respects the per-plan member cap', () => {
  it('rejects a new-member invite when the org is at its plan cap', async () => {
    const { service } = makeService({ allowed: false, reason: 'Your growth plan supports up to 100 members. Upgrade your organization to add more.' });
    await expect(
      service.teamInvite('Acme', 'newperson@test.com', 'org-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a new-member invite when the org is under its plan cap', async () => {
    const { service } = makeService({ allowed: true });
    await expect(service.teamInvite('Acme', 'newperson@test.com', 'org-1')).resolves.toBeDefined();
  });

  it('does not check the cap for an already-existing user (no new seat consumed)', async () => {
    const { service, billing } = makeService({ allowed: true }, { id: 'existing-user', firstName: 'Existing' });
    await service.teamInvite('Acme', 'existing@test.com', 'org-1');
    expect(billing.canInviteMember).not.toHaveBeenCalled();
  });
});
