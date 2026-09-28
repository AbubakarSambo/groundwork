import { ParticipantsService } from './participants.service';
import { AuthService } from '../auth/auth.service';

/**
 * ACCEPTING AN INVITE NAMES THE ORGANISATION, THE SAME WAY EVERY OTHER SIGN-IN DOES (U.8 re-review).
 *
 * Neema came through /invite, not through JoinConfirmPage. The response `accept()` sent for
 * `setAuth` carried only `{ id, email, firstName, lastName, role, organizationId }` - no
 * `organizationName` - unlike every door inside AuthService (sign-in, verify-email, set-password,
 * switch-organisation), which all go through one shared builder (`theUserShape`, via
 * `userShapeFor`). The client's organisation switcher reads `organizationName` off the user it is
 * given; with it missing, the switcher had nothing to show until the app-wide `/auth/me` safety net
 * (`useWhoTheServerSaysYouAre`) landed a follow-up request - a real gap between accepting and that
 * request resolving, not the false "nothing else ever calls /auth/me again" the first pass claimed.
 *
 * This proves the fix end to end: a real AuthService, sharing the same fake database as
 * ParticipantsService, is asked for the shape `accept()` actually returns.
 */
function makeServices() {
  const groundParticipant = {
    id: 'p1', groundId: 'g1', email: 'neema@kilima-traders.test', userId: null, inviteToken: 'tok',
  };
  const prisma: any = {
    groundParticipant: {
      findUnique: jest.fn(async () => groundParticipant),
      findFirst: jest.fn(async () => groundParticipant),
      update: jest.fn(async (a: any) => a),
    },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org1', initiatorId: 'admin1' })) },
    organizationMembership: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({})),
      count: jest.fn(async () => 0),
    },
    membershipRequest: { upsert: jest.fn(async () => ({})) },
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where?.id === 'admin1') return { role: 'ADMIN', organizationId: 'org1' };
        if (where?.id === 'neema-1') {
          return {
            id: 'neema-1', email: 'neema@kilima-traders.test', firstName: 'Neema', lastName: 'Otieno',
            role: 'MEMBER', organizationId: 'org1', isPlatformAdmin: false,
            organization: {
              id: 'org1', name: 'Kilima Traders', slug: 'kilima-traders', careFeeStatus: null, email: null,
              companyStage: null, subscriptionPlan: null, whoMayOpenCheckIns: 'EVERYONE', checkInsNeedApproval: false,
            },
          };
        }
        return null;
      }),
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({
        id: 'neema-1', email: 'neema@kilima-traders.test', firstName: 'Neema', lastName: 'Otieno',
        role: 'MEMBER', organizationId: 'org1', passwordHash: 'x',
      })),
    },
    checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })) },
    emailVerificationToken: { create: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const auth = new AuthService(
    prisma, { sign: () => 'tok' } as any, { get: () => undefined } as any,
    {} as any, {} as any, {} as any, { emit: () => undefined } as any,
  );
  const participants = new ParticipantsService(
    prisma,
    { sign: () => 'jwt' } as any,
    { sendAddPasswordEmail: async () => undefined, sendMagicLinkEmail: async () => undefined } as any,
    auth,
  );
  return { participants };
}

describe('accepting an invite sends the same user shape /auth/me sends', () => {
  it('names the organisation, not only its id', async () => {
    const { participants } = makeServices();
    const res: any = await participants.accept('tok', { firstName: 'Neema', lastName: 'Otieno' });
    expect(res.user.organizationId).toBe('org1');
    expect(res.user.organizationName).toBe('Kilima Traders');
  });
});
