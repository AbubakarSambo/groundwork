import { AuthService } from './auth.service';
import { GUESTS_DO_NOT_OPEN, CANNOT_OPEN } from '../grounds/who-may-open-a-check-in';

/**
 * A GUEST IS TOLD WHY THEY CANNOT OPEN A CHECK-IN, IN THE RULE'S OWN SENTENCE (release test, 21 November 2026, bug 95). Olu, a guest,
 * opened /start and read the named-leads sentence the page kept its own copy of. The session now carries the rule's reason beside
 * its yes or no, so the door says what the server would say.
 */
async function theSessionOf(role: string, whoMayOpenCheckIns = 'NAMED_LEADS') {
  const svc = Object.create(AuthService.prototype) as any;
  svc.generateToken = () => 'tok';
  svc.prisma = { organizationMembership: { count: async () => 0 } };
  return (await svc.buildAuthResponse({
    id: 'u-olu', email: 'olu@elsewhere.test', firstName: 'Olu', lastName: 'Bankole',
    role, organizationId: 'o-msingi', isPlatformAdmin: false, passwordHash: 'x',
    organization: {
      id: 'o-msingi', name: 'Msingi Foods', slug: 'msingi', careFeeStatus: 'NONE', email: 'ops@msingi.test', companyStage: null,
      subscriptionPlan: 'STARTER', whoMayOpenCheckIns, checkInsNeedApproval: false,
    },
  })).user;
}

describe('what the session says about opening a check-in', () => {
  it('Olu, a guest, is told it is because he is a guest, whatever the setting', async () => {
    for (const setting of ['NAMED_LEADS', 'EVERYONE']) {
      const olu = await theSessionOf('GUEST', setting);
      expect(olu.mayOpenCheckIns).toBe(false);
      expect(olu.whyYouCannotOpenCheckIns).toBe(GUESTS_DO_NOT_OPEN);
      expect(olu.whyYouCannotOpenCheckIns).toBe('You are taking part here as a guest. You can check in on anything you are added to. Opening a new check-in is done by somebody here who is not a guest.');
    }
  });

  it('a member, where only named leads open them, reads the named-leads sentence', async () => {
    const amani = await theSessionOf('MEMBER');
    expect(amani.mayOpenCheckIns).toBe(false);
    expect(amani.whyYouCannotOpenCheckIns).toBe(CANNOT_OPEN);
  });

  it('a lead who may open one carries no reason at all', async () => {
    const wairimu = await theSessionOf('LEAD');
    expect(wairimu.mayOpenCheckIns).toBe(true);
    expect('whyYouCannotOpenCheckIns' in wairimu).toBe(false);
  });
});
