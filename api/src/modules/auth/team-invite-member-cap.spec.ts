import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * #5b: canInviteMember (per-plan member cap) had zero callers anywhere in the codebase - a dead
 * gate. teamInvite() is where a member seat is consumed, and this locks that it is blocked when
 * canInviteMember says no.
 *
 * THE EXISTING-USER CASE CHANGED, AND THE OLD EXPECTATION HERE WAS A DESCRIPTION OF A BUG. It read
 * "the existing-user branch just sends a sign-in link and never moves that user into the inviter's
 * org, so it correctly stays uncapped" - true, and the reason it consumed no seat was that the
 * invite had no effect at all. An admin invited a colleague who happened to have signed up
 * elsewhere, was told "Invite sent", and the person never appeared in People.
 *
 * They are added now, which is what an invite is, so the seat is real and the cap applies. Somebody
 * already in the inviting org still costs nothing, because they are already counted.
 */

function makeService(canInviteResult: { allowed: boolean; reason?: string }, existingUser: any = null) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => existingUser) },
    /* No membership yet, unless a test says otherwise. */
    organizationMembership: {
      findUnique: jest.fn(async () => existingUser?.membership ?? null),
      create: jest.fn(async () => ({})),
    },
    $transaction: jest.fn(async (fn: any) => fn({
      organization: { create: jest.fn(async () => ({ id: 'new-org' })) },
      user: { create: jest.fn(async () => ({ id: 'new-user' })) },
      /* teamInvite now writes the new user's own membership row inside this transaction (see
         auth.service.ts, "AND THE MEMBERSHIP ROW OF THE HOME ORGANISATION THIS JUST GAVE THEM") -
         the `tx` handed to the callback needs this table too, or the new-user path throws. */
      organizationMembership: { create: jest.fn(async () => ({})) },
      emailVerificationToken: { create: jest.fn(async () => ({})) },
    })),
    emailVerificationToken: { updateMany: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
  };
  const emailService: any = { sendUserInvite: jest.fn(async () => undefined), sendMagicLinkEmail: jest.fn(async () => undefined) };
  const billing: any = { canInviteMember: jest.fn(async () => canInviteResult) };
  const service = new AuthService(prisma, {} as any, {} as any, emailService, {} as any, billing, { emit: () => undefined } as any);
  return { service, billing, prisma };
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

  /*
   * U.8 REVIEW: A FRESHLY INVITED PERSON'S OWN ORGANISATION SWITCHER READ "YOUR ORGANISATION" AND
   * "TAKES PART" INSTEAD OF THE ORGANISATION'S NAME. `user.organizationId` was set at invite time,
   * but no `OrganizationMembership` row was ever written for it - `myOrganizations`'s self-healing
   * branch was papering over the gap on read, and a screen that reads the row directly (or reads it
   * before the self-heal query resolves) had nothing. This locks that the row is now written in the
   * same transaction as the user, with the role the admin chose.
   */
  it('gives a newly invited person their own membership row, not only the organizationId column', async () => {
    const { service, prisma } = makeService({ allowed: true });
    await service.teamInvite('Acme', 'newperson@test.com', 'org-1', { role: 'LEAD', name: 'New Person' });
    const call = prisma.$transaction.mock.calls[0][0];
    const tx = {
      organization: { create: jest.fn(async () => ({ id: 'new-org' })) },
      user: { create: jest.fn(async () => ({ id: 'new-user' })) },
      organizationMembership: { create: jest.fn(async () => ({})) },
      emailVerificationToken: { create: jest.fn(async () => ({})) },
    };
    await call(tx);
    expect(tx.organizationMembership.create).toHaveBeenCalledWith({
      data: { userId: 'new-user', organizationId: 'org-1', role: 'LEAD' },
    });
  });

  it('costs nothing for somebody already in the inviting org', async () => {
    /* They are already counted, and re-inviting them is a sign-in link and nothing else. */
    const { service, billing } = makeService({ allowed: true }, { id: 'u', firstName: 'Existing', organizationId: 'org-1' });
    await service.teamInvite('Acme', 'existing@test.com', 'org-1');
    expect(billing.canInviteMember).not.toHaveBeenCalled();
  });

  it('adds an existing account from another org, and that costs a seat', async () => {
    const { service, billing, prisma } = makeService({ allowed: true }, { id: 'u', firstName: 'Existing', organizationId: 'their-own-org' });
    await service.teamInvite('Acme', 'existing@test.com', 'org-1');
    expect(billing.canInviteMember).toHaveBeenCalled();
    expect(prisma.organizationMembership.create).toHaveBeenCalledWith({
      data: { userId: 'u', organizationId: 'org-1', role: 'MEMBER' },
    });
  });

  it('and never as whatever they are at home', async () => {
    /* Being an admin of their own company says nothing about somebody else's. */
    const { service, prisma } = makeService({ allowed: true }, { id: 'u', firstName: 'E', organizationId: 'their-own-org', role: 'ADMIN' });
    await service.teamInvite('Acme', 'existing@test.com', 'org-1');
    expect(prisma.organizationMembership.create.mock.calls[0][0].data.role).toBe('MEMBER');
  });

  it('refuses to add them when the inviting org is at its cap', async () => {
    const { service, prisma } = makeService({ allowed: false, reason: 'full' }, { id: 'u', firstName: 'E', organizationId: 'their-own-org' });
    await expect(service.teamInvite('Acme', 'existing@test.com', 'org-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organizationMembership.create).not.toHaveBeenCalled();
  });

  it('does not add them twice', async () => {
    const { service, billing, prisma } = makeService(
      { allowed: true },
      { id: 'u', firstName: 'E', organizationId: 'their-own-org', membership: { id: 'm1' } },
    );
    await service.teamInvite('Acme', 'existing@test.com', 'org-1');
    expect(prisma.organizationMembership.create).not.toHaveBeenCalled();
    expect(billing.canInviteMember).not.toHaveBeenCalled();
  });
});
