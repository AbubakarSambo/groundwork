import { AuthService } from './auth.service';

/**
 * SIGNING IN RETURNED A DIFFERENT PERSON FROM THE ONE `/auth/me` RETURNS.
 *
 * `buildAuthResponse` is shared by all five doors into the app - password, magic link, verify
 * email, Google, entry handover - and it returned `organizationId` and `organizationName` and no
 * organisation object. `GET /auth/me` and `PATCH /auth/me` both return one.
 *
 * The client decides whether an admin still has to set up their organisation by reading
 * `user.organization?.email`. On a freshly signed-in user that is undefined whatever the
 * organisation holds, so every ADMIN was sent to /org/setup on every sign-in - including ones who
 * had filled it in months before. That page is deliberately bare, which is half of why the menu
 * was reported missing three times: you never landed on a page that has one.
 */
describe('every door returns the same person', () => {
  const built = () => {
    const svc = Object.create(AuthService.prototype) as any;
    svc.generateToken = () => 'tok';
    return svc.buildAuthResponse({
      id: 'u1', email: 'a@b.test', firstName: 'Ada', lastName: '',
      role: 'ADMIN', organizationId: 'o1', isPlatformAdmin: false, passwordHash: 'x',
      organization: {
        id: 'o1', name: 'Test Org', slug: 'test-org', careFeeStatus: 'NONE',
        email: 'ops@test.test', companyStage: null, subscriptionPlan: 'STARTER',
      },
    });
  };

  it('carries the organisation, not just its name', () => {
    const { user } = built();
    expect(user.organization).toBeDefined();
    expect(user.organization.email).toBe('ops@test.test');
    expect(user.organization.name).toBe('Test Org');
  });

  it('carries the field the org-setup gate actually reads', () => {
    /*
     * `isOrgSetupComplete` in the client is `!!user.organization?.email` and nothing else. This is
     * the single property that decides whether a signed-in admin sees their product or a form.
     */
    const { user } = built();
    expect(Boolean(user.organization?.email)).toBe(true);
  });

  it('carries the plan, so the product can say which one you are on', () => {
    /* The admin panel and the pricing page both read this to name the current plan. */
    expect(built().user.organization.subscriptionPlan).toBe('STARTER');
  });

  it('still carries what it always did, so nothing reading the old shape breaks', () => {
    const { user, accessToken } = built();
    expect(accessToken).toBe('tok');
    expect(user.organizationId).toBe('o1');
    expect(user.organizationName).toBe('Test Org');
    expect(user.isPlatformAdmin).toBe(false);
  });
});
