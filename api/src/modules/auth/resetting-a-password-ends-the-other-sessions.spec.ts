import { UnauthorizedException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { JwtStrategy } from './strategies/jwt.strategy';
import { sessionClaims } from './a-session-token';

/**
 * RESETTING A PASSWORD ENDS THE OTHER SESSIONS.
 *
 * A reset wrote the new hash and nothing else, so every token minted before it stayed valid for its
 * full seven days - including whichever one prompted the reset. The user row carries an epoch now;
 * it is minted into every session token by one builder and compared on every request (A10, B16).
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const aStrategy = (row: any) =>
  new JwtStrategy({ get: () => 'a-secret' } as any, { user: { findUnique: jest.fn(async () => row) }, organizationMembership: { findUnique: jest.fn(async () => ({ id: 'm1' })) } } as any);
const ROW = { id: 'u1', email: 'a@b.example', organizationId: 'o1', role: 'MEMBER', firstName: 'A', lastName: 'B', isActive: true, deletedAt: null, isPlatformAdmin: false, tokenEpoch: 1, organization: {} };

describe('a session token', () => {
  it('carries the epoch of the row it was minted from', () => {
    expect(sessionClaims({ ...ROW, tokenEpoch: 3 }, 'password').epoch).toBe(3);
    /* A row read without the column mints 0, which is what a token from before the column reads as. */
    expect(sessionClaims({ id: 'u', email: 'e', organizationId: 'o', role: 'r' }, 'link').epoch).toBe(0);
  });

  it('minted before the reset is refused after it', async () => {
    await expect(aStrategy(ROW).validate({ sub: 'u1', email: 'a@b.example', organizationId: 'o1', role: 'MEMBER', epoch: 0 })).rejects.toThrow(UnauthorizedException);
  });

  it('minted from the reset row is the one that survives', async () => {
    await expect(aStrategy(ROW).validate({ sub: 'u1', email: 'a@b.example', organizationId: 'o1', role: 'MEMBER', epoch: 1 })).resolves.toMatchObject({ id: 'u1' });
  });

  it('from before the column exists reads as epoch 0 and still works for a row that was never reset', async () => {
    await expect(aStrategy({ ...ROW, tokenEpoch: 0 }).validate({ sub: 'u1', email: 'a@b.example', organizationId: 'o1', role: 'MEMBER' })).resolves.toMatchObject({ id: 'u1' });
  });
});

describe('the three mint sites', () => {
  it('all sign the one builder\'s claims, and resetPassword bumps the epoch on the row it mints from', () => {
    const auth = strip(readFileSync(join(__dirname, 'auth.service.ts'), 'utf8'));
    expect(auth).toContain('this.jwtService.sign(sessionClaims(user, via))');
    expect(auth).not.toMatch(/jwtService\.sign\(\{/);
    const reset = auth.slice(auth.indexOf('async resetPassword('), auth.indexOf('async resetPassword(') + 1200);
    expect(reset).toContain('tokenEpoch: { increment: 1 }');
    expect(reset).toContain('return { ...tokenRecord.user, ...updated };');
    for (const rel of ['../participants/participants.service.ts', '../entry/entry.service.ts']) {
      const code = strip(readFileSync(join(__dirname, rel), 'utf8'));
      expect(code).toContain("this.jwt.sign(sessionClaims(user, 'link'))");
      expect(code).not.toMatch(/this\.jwt\.sign\(\{/);
    }
  });
});
