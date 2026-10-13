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
    /* The inviting organisation's own name, which the invitation now reads from the record. */
    organization: { findUnique: jest.fn(async () => ({ name: 'Kito Foods' })) },
    /* No membership yet, unless a test says otherwise. */
    organizationMembership: {
      findUnique: jest.fn(async () => existingUser?.membership ?? null),
      create: jest.fn(async () => ({})),
    },
    $transaction: jest.fn(async (fn: any) => fn({
      organization: { create: jest.fn(async () => ({ id: 'new-org' })) },
      user: { create: jest.fn(async () => ({ id: 'new-user' })) },
      emailVerificationToken: { create: jest.fn(async () => ({})) },
    })),
    emailVerificationToken: { updateMany: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
  };
  /* sendAddedToAnotherOrganisation: somebody from elsewhere, added here, is now told so by name (Hafsah, 12 October). */
  const emailService: any = { sendUserInvite: jest.fn(async () => undefined), sendMagicLinkEmail: jest.fn(async () => undefined), sendAddedToAnotherOrganisation: jest.fn(async () => undefined) };
  const billing: any = { canInviteMember: jest.fn(async () => canInviteResult) };
  const service = new AuthService(prisma, {} as any, {} as any, emailService, {} as any, billing, { emit: () => undefined } as any);
  return { service, billing, prisma, emailService };
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

describe('the invitation names the organisation that sent it', () => {
  it('reads the name from the record, so a caller that only knows "Groundwork" still sends "Kito Foods"', async () => {
    /* Found walking the user journeys: the controller passed a name the signed-in user does not carry, so every
       invitation read "You've been added to Groundwork on Groundwork" and said nothing about who asked. */
    const { service, emailService } = makeService({ allowed: true });
    await service.teamInvite('Groundwork', 'newperson@test.com', 'org-1');
    expect(emailService.sendUserInvite).toHaveBeenCalledWith('newperson@test.com', expect.any(String), expect.any(String), 'Kito Foods');
  });
});
