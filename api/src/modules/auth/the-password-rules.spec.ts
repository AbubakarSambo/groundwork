import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { SetPasswordDto } from './dto/set-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthService } from './auth.service';
import { IS_THEIR_EMAIL, NO_NUMBER_OR_SYMBOL, TOO_SHORT, isTheirEmail } from './the-password-rules';

/**
 * THE PROTOTYPE'S PASSWORD RULES, IN THE BACKEND. Hafsah's decision of 26 September.
 *
 * At least 8 characters, a number or a symbol, and not your email address. They replace "at least
 * 1 uppercase and 1 lowercase letter". They are checked when a password is chosen or changed, never
 * on sign-in, so a password somebody already has keeps working.
 */
async function refusals(Dto: any, password: string) {
  const errors = await validate(plainToInstance(Dto, { token: 't', password }));
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('the rules on the request, for setting and for resetting a password', () => {
  for (const Dto of [SetPasswordDto, ResetPasswordDto]) {
    it(`${Dto.name}: 8 characters with a number or a symbol is accepted, whatever the case`, async () => {
      expect(await refusals(Dto, 'harbour7lamp')).toEqual([]);
      expect(await refusals(Dto, 'harbour lamp')).toEqual([]);
      expect(await refusals(Dto, 'HARBOUR!LAMP')).toEqual([]);
    });

    it(`${Dto.name}: too short, or letters only, is refused in a sentence a person reads`, async () => {
      expect(await refusals(Dto, 'ab1!')).toContain(TOO_SHORT);
      expect(await refusals(Dto, 'HarbourLamp')).toEqual([NO_NUMBER_OR_SYMBOL]);
    });
  }

  it('the old rule is gone: all lower case with a number is fine now', async () => {
    expect(await refusals(SetPasswordDto, 'journey123')).toEqual([]);
  });
});

describe('not your email address, which only the service can check', () => {
  it('matches the address whatever the case or spaces', () => {
    expect(isTheirEmail(' Wairimu@Baridi.test ', 'wairimu@baridi.test')).toBe(true);
    expect(isTheirEmail('wairimu@baridi.test1', 'wairimu@baridi.test')).toBe(false);
    expect(isTheirEmail('anything', null)).toBe(false);
  });

  function service() {
    const row = {
      id: 't1', userId: 'u1', type: TokenType.PASSWORD_RESET as TokenType, usedAt: null, expiresAt: new Date(Date.now() + 3600_000),
      user: { id: 'u1', email: 'wairimu@baridi.test', organization: {} },
    };
    const prisma: any = {
      emailVerificationToken: { findUnique: jest.fn(async () => ({ ...row })) },
      $transaction: jest.fn(),
    };
    return { svc: new AuthService(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any), prisma, row };
  }

  it('a reset to your own address is refused, and nothing is saved', async () => {
    const { svc, prisma } = service();
    await expect(svc.resetPassword({ token: 't', password: 'Wairimu@baridi.test' } as any)).rejects.toThrow(new BadRequestException(IS_THEIR_EMAIL));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('and so is setting a first password to it', async () => {
    const { svc, prisma, row } = service();
    row.type = TokenType.PASSWORD_SETUP;
    await expect(svc.setPassword({ token: 't', password: 'wairimu@baridi.test' } as any)).rejects.toThrow(new BadRequestException(IS_THEIR_EMAIL));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('a password somebody already has keeps working', () => {
  /*
   * Checked by what happens, not by reading the source (U.2 re-review): a text match on login() also
   * matched words in its comments, which a-guard-that-a-comment-satisfies-is-not-a-guard forbids.
   */
  it('an account whose password breaks the new rules (short, letters only, even their address) still signs in', async () => {
    for (const old of ['abc', 'HarbourLamp', 'wairimu@baridi.test']) {
      const account = {
        id: 'u1', email: 'wairimu@baridi.test', firstName: 'Wairimu', lastName: '', role: 'MEMBER', organizationId: 'o1',
        isActive: true, deletedAt: null, isEmailVerified: true, googleId: null, tokenEpoch: 0,
        passwordHash: await bcrypt.hash(old, 4), organization: { id: 'o1', name: 'Baridi', slug: 'baridi' },
      };
      const prisma: any = {
        user: { findUnique: jest.fn(async () => account) },
        organizationMembership: { count: jest.fn(async () => 0) },
      };
      const svc = new AuthService(prisma, { sign: () => 'a-session' } as any, { get: () => undefined } as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
      const res = await svc.login({ email: 'wairimu@baridi.test', password: old } as any);
      expect(res.accessToken).toBe('a-session');
    }
  });
});
