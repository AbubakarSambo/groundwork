import { AuthService } from './auth.service';

/**
 * REVIEWER, 14 OCTOBER: KEVIN'S SETTINGS READ "WhatsApp Not set" WITH +254722000202 SAVED.
 *
 * `/auth/me` never sent the number, and the client test passed only because it mocked the reply. This calls the real
 * `getProfile` the route returns: the number is the person's own, served on their own read.
 */
function kevin(opts: { phoneNumber: string | null; rosterPhone: string | null }) {
  const prisma: any = {
    user: {
      findUnique: jest.fn(async () => ({
        id: 'u-kevin', email: 'kevin@kilima.test', firstName: 'Kevin', lastName: 'Omondi', role: 'MEMBER', organizationId: 'org-kilima',
        isPlatformAdmin: false, emailNotifications: true, phoneNumber: opts.phoneNumber,
        organization: { id: 'org-kilima', name: 'Kilima Water', slug: 'kilima', email: 'ops@kilima.test', careFeeStatus: null, companyStage: null, subscriptionPlan: null, whoMayOpenCheckIns: 'EVERYONE', checkInsNeedApproval: false },
      })),
    },
    organizationMembership: { count: jest.fn(async () => 0) },
    person: { findFirst: jest.fn(async ({ where }: any) => (opts.rosterPhone && where.organizationId === 'org-kilima' ? { phone: opts.rosterPhone } : null)) },
  };
  return new AuthService(prisma, { sign: () => 'tok' } as any, { get: () => undefined } as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
}

describe('who you are includes your own WhatsApp number', () => {
  it('the number on the sign-in', async () => {
    expect((await kevin({ phoneNumber: '+254722000202', rosterPhone: null }).getProfile('u-kevin') as any).phoneNumber).toBe('+254722000202');
  });
  it('else the number the company put on the roster for you', async () => {
    expect((await kevin({ phoneNumber: null, rosterPhone: '+254722000202' }).getProfile('u-kevin') as any).phoneNumber).toBe('+254722000202');
  });
  it('and null when there is none, so Settings says it is not set', async () => {
    expect((await kevin({ phoneNumber: null, rosterPhone: null }).getProfile('u-kevin') as any).phoneNumber).toBeNull();
  });
});
