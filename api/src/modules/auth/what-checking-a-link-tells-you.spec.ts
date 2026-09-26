import { TokenType } from '@prisma/client';
import { AuthService } from './auth.service';
import { hashed } from './a-token-is-stored-as-its-hash';

/**
 * WHAT CHECKING A LINK TELLS YOU. U.2.
 *
 * `GET /auth/validate-token` is public: anybody can ask it about any string. So it answers only what
 * the holder of a real link already knows. A real, unused link of the right kind is valid, or it has
 * run out (`expired: true`, so the page can open on "That link has expired"). Everything else
 * (a string we do not know, a link already used, a link of another kind) gets exactly
 * `{ valid: false }`. No answer ever names the account behind the link.
 */
function service(row: any) {
  const findUnique = jest.fn(async () => row);
  const prisma: any = { emailVerificationToken: { findUnique } };
  const svc = new AuthService(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
  return { svc, findUnique };
}
const HOUR = 60 * 60 * 1000;
const row = (over: any = {}) => ({ usedAt: null, expiresAt: new Date(Date.now() + HOUR), type: TokenType.PASSWORD_RESET, ...over });

describe('checking a link', () => {
  it('looks it up by its hash, never by the secret itself', async () => {
    const { svc, findUnique } = service(row());
    await svc.validateToken('the-secret', 'PASSWORD_RESET');
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { token: hashed('the-secret') } }));
  });

  it('a real, unused link of the right kind is valid, and nothing more is said', async () => {
    const { svc } = service(row());
    expect(await svc.validateToken('t', 'PASSWORD_RESET')).toEqual({ valid: true });
  });

  it('one that has run out says so, and still names nobody', async () => {
    const { svc } = service(row({ expiresAt: new Date(Date.now() - HOUR) }));
    const answer = await svc.validateToken('t', 'PASSWORD_RESET');
    expect(answer).toEqual({ valid: false, expired: true });
    expect(JSON.stringify(answer)).not.toMatch(/@|email|firstName/);
  });

  it('the same for a set-up link', async () => {
    const { svc } = service(row({ type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() - HOUR) }));
    expect(await svc.validateToken('t', 'PASSWORD_SETUP')).toEqual({ valid: false, expired: true });
  });
});

describe('everything else gets only { valid: false }', () => {
  it('a string we do not know', async () => {
    const { svc } = service(null);
    expect(await svc.validateToken('made-up', 'PASSWORD_RESET')).toEqual({ valid: false });
  });

  it('a link already used, even one that has also run out', async () => {
    expect(await service(row({ usedAt: new Date() })).svc.validateToken('t', 'PASSWORD_RESET')).toEqual({ valid: false });
    expect(await service(row({ usedAt: new Date(), expiresAt: new Date(Date.now() - HOUR) })).svc.validateToken('t', 'PASSWORD_RESET')).toEqual({ valid: false });
  });

  it('a link of another kind, even an expired one', async () => {
    const { svc } = service(row({ type: TokenType.EMAIL_VERIFICATION, expiresAt: new Date(Date.now() - HOUR) }));
    expect(await svc.validateToken('t', 'PASSWORD_RESET')).toEqual({ valid: false });
  });
});

describe('a request that carries no link at all', () => {
  it('no token, or not a string, is { valid: false }, never a server error, and looks nothing up', async () => {
    const { svc, findUnique } = service(row());
    expect(await svc.validateToken(undefined as any, 'PASSWORD_RESET')).toEqual({ valid: false });
    expect(await svc.validateToken('', 'PASSWORD_RESET')).toEqual({ valid: false });
    expect(await svc.validateToken(['a', 'b'] as any, 'PASSWORD_RESET')).toEqual({ valid: false });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
