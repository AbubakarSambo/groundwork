import 'reflect-metadata';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MachineTokenGuard, REQUIRED_SCOPE } from './machine-token.guard';

/**
 * REVOKING A CREDENTIAL STOPS IT NOW.
 *
 * The guard verified the signature, the audience marker, the pace and the scope, and never read the
 * credential row - so a token minted before an admin pressed revoke kept working for the rest of its
 * life, with the leak that prompted the revoke already known (fix plan A10).
 */
function aGuard(credential: { revokedAt: Date | null } | null, scopes = ['findings:read']) {
  const jwt: any = { verifyAsync: jest.fn(async () => ({ typ: 'machine', sub: 'client-1', org: 'org-1', scopes })) };
  const reflector: any = { getAllAndOverride: jest.fn(() => 'findings:read') };
  const prisma: any = {
    apiCall: { count: jest.fn(async () => 0), create: jest.fn(() => ({ catch: () => undefined })) },
    apiCredential: { findUnique: jest.fn(async () => credential) },
  };
  const guard = new MachineTokenGuard(jwt, reflector as Reflector, prisma);
  const ctx: any = {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer t' }, method: 'GET', url: '/x' }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
  return { guard, ctx, prisma };
}

describe('a machine token', () => {
  it('is refused once its credential is revoked, however long it has left', async () => {
    const { guard, ctx } = aGuard({ revokedAt: new Date() });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('and when the credential no longer exists', async () => {
    const { guard, ctx } = aGuard(null);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('is let through while the credential stands', async () => {
    const { guard, ctx, prisma } = aGuard({ revokedAt: null });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.apiCredential.findUnique).toHaveBeenCalledWith({ where: { clientId: 'client-1' }, select: { revokedAt: true } });
  });

  it('the revocation check comes before the scope check, so a revoked token learns nothing about scopes', async () => {
    const { guard, ctx } = aGuard({ revokedAt: new Date() }, []);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.not.toThrow(ForbiddenException);
  });

  it('and the metadata key the routes declare is the one the guard reads', () => {
    expect(REQUIRED_SCOPE).toBe('required_scope');
  });
});
