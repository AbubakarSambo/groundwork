import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * REMOVING SOMEBODY'S MEMBERSHIP REMOVES THEIR ACCESS.
 *
 * switchOrganization checked the membership row on the way in; the strategy that runs on every
 * request read the user's organizationId and nothing else, so deleting a membership row left their
 * access exactly as it was until the token expired (fix plan B16, P2-025).
 */
const ROW = { id: 'u1', email: 'a@b.example', organizationId: 'o1', role: 'MEMBER', firstName: 'A', lastName: 'B', isActive: true, deletedAt: null, isPlatformAdmin: false, tokenEpoch: 0, organization: {} };
const aStrategy = (member: boolean) =>
  new JwtStrategy({ get: () => 'a-secret' } as any, {
    user: { findUnique: jest.fn(async () => ROW) },
    organizationMembership: { findUnique: jest.fn(async () => (member ? { id: 'm1' } : null)) },
  } as any);
const PAYLOAD = { sub: 'u1', email: 'a@b.example', organizationId: 'o1', role: 'MEMBER', epoch: 0 };

describe('a session token', () => {
  it('is refused once the membership row behind it is gone', async () => {
    await expect(aStrategy(false).validate(PAYLOAD)).rejects.toThrow(UnauthorizedException);
    await expect(aStrategy(false).validate(PAYLOAD)).rejects.toThrow(/no longer a member/);
  });

  it('and accepted while it stands', async () => {
    await expect(aStrategy(true).validate(PAYLOAD)).resolves.toMatchObject({ id: 'u1', organizationId: 'o1' });
  });
});
