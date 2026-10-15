import { AuthService } from './auth.service';

/**
 * A PARTICIPANT IN SOMEBODY ELSE'S CHECK-IN IS NOT AN ADMIN WITH SETUP TO FINISH.
 *
 * Signing up provisions an organisation and makes you its ADMIN. Being added to another company's
 * check-in creates a membership row there but does NOT change your active organisation - so you
 * stay ADMIN of your own untouched workspace while your real work is elsewhere.
 *
 * `RequireOrgSetup` asked "an admin whose organisation has no contact email?". Both halves were
 * true for that person and neither was the point, so a participant was sent to "Set up your
 * organization" for a company they never meant to create, with no way past it.
 *
 * These call `getProfile`, not a copy of the rule, because the first version of this spec restated
 * the condition and passed while the real one was broken.
 */
describe('GW-ORG-SETUP: who is actually told to set an organisation up', () => {
  function make(opts: { role: string; orgName?: string; orgEmail: string | null; otherMemberships: number }) {
    const prisma: any = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'u1',
          email: 'her@x.test',
          firstName: 'Her',
          lastName: 'Name',
          role: opts.role,
          organizationId: 'org-own',
          isPlatformAdmin: false,
          emailNotifications: true,
          organization: {
            id: 'org-own',
            name: opts.orgName ?? 'Her workspace',
            slug: 'her-workspace',
            email: opts.orgEmail,
            careFeeStatus: null,
            companyStage: null,
            subscriptionPlan: null,
            whoMayOpenCheckIns: 'EVERYONE',
            checkInsNeedApproval: false,
          },
        })),
      },
      /** The membership rows for organisations OTHER than the active one. */
      organizationMembership: { count: jest.fn(async () => opts.otherMemberships) },
    };
    const service = new AuthService(
      prisma, { sign: () => 'tok' } as any, { get: () => undefined } as any,
      {} as any, {} as any, {} as any, { emit: () => undefined } as any,
    );
    return { service, prisma };
  }

  /* U.3: the billing email is optional on "Create an organisation", so an empty one no longer means
     unfinished. What an organisation cannot be without is its name. */
  it('an admin whose only organisation has no name is told to finish it', async () => {
    const { service } = make({ role: 'ADMIN', orgName: '', orgEmail: null, otherMemberships: 0 });
    const me = await service.getProfile('u1');
    expect((me as any).mustSetUpOrganisation).toBe(true);
  });

  it('THE REPORTED BUG: an admin of an unfinished workspace who belongs elsewhere is not', async () => {
    // Added as a participant to another company's check-in. Still ADMIN of her own empty
    // workspace, so the old rule matched and sent her to /org/setup on every sign-in.
    const { service } = make({ role: 'ADMIN', orgName: '', orgEmail: null, otherMemberships: 1 });
    const me = await service.getProfile('u1');
    expect((me as any).mustSetUpOrganisation).toBe(false);
  });

  it('and it asks only about OTHER organisations, never the active one', async () => {
    const { service, prisma } = make({ role: 'ADMIN', orgEmail: null, otherMemberships: 1 });
    await service.getProfile('u1');
    expect(prisma.organizationMembership.count).toHaveBeenCalledWith({
      where: { userId: 'u1', organizationId: { not: 'org-own' } },
    });
  });

  it('an admin with a named organisation and no billing email is not asked (U.3)', async () => {
    const { service } = make({ role: 'ADMIN', orgEmail: null, otherMemberships: 0 });
    const me = await service.getProfile('u1');
    expect((me as any).mustSetUpOrganisation).toBe(false);
  });

  it('an admin whose organisation is already set up is never asked again', async () => {
    const { service } = make({ role: 'ADMIN', orgEmail: 'team@x.test', otherMemberships: 0 });
    const me = await service.getProfile('u1');
    expect((me as any).mustSetUpOrganisation).toBe(false);
  });

  it('a member is never asked, even with no name, no contact email and nowhere else to be', async () => {
    const { service } = make({ role: 'MEMBER', orgName: '', orgEmail: null, otherMemberships: 0 });
    const me = await service.getProfile('u1');
    expect((me as any).mustSetUpOrganisation).toBe(false);
  });
});
