import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EntrySaveDto } from './dto/entry-save.dto';
import { IS_THEIR_EMAIL, NO_NUMBER_OR_SYMBOL } from './the-password-rules';

/**
 * SIGNING UP WITH A PASSWORD. U.2, Hafsah's decision of 26 September.
 *
 * Sign-up offers an email link or a password. A password chosen at sign-up is hashed onto the
 * waiting sign-up and nowhere else, because nothing may exist before the address is proved (GW-001);
 * `verifyEmail` copies it onto the account when the link opens. For an address that already has an
 * account the password is ignored and the answer is the same, so sign-up never says which addresses
 * are registered, and an existing account's password is never changed from here.
 */
function service(existingUser: any) {
  const pending: any[] = [];
  const prisma: any = {
    user: { findUnique: jest.fn(async () => existingUser), create: jest.fn(), update: jest.fn() },
    entryDraft: { upsert: jest.fn(), update: jest.fn(), create: jest.fn() },
    pendingSignup: { upsert: jest.fn(async (args: any) => { pending.push(args); return {}; }) },
    emailVerificationToken: { findFirst: jest.fn(async () => null), updateMany: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
  };
  const email: any = { sendMagicLinkEmail: jest.fn(async () => undefined) };
  const svc = new AuthService(prisma, {} as any, { get: () => undefined } as any, email, {} as any, {} as any, { emit: () => undefined } as any);
  return { svc, prisma, pending };
}

describe('a new address with a password', () => {
  it('holds the password as a hash on the waiting sign-up, and creates no account', async () => {
    const { svc, prisma, pending } = service(null);
    const res = await svc.entrySave('wairimu@baridi.test', { payload: { firstName: 'Wairimu' } }, 'harbour7lamp');
    expect(res.message).toBe('Check your email for your sign-in link.');
    const saved = pending[0].create.passwordHash;
    expect(saved).not.toBe('harbour7lamp');
    expect(await bcrypt.compare('harbour7lamp', saved)).toBe(true);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('asked again with a new password, replaces the old one; asked again without one, keeps it', async () => {
    const withOne = service(null);
    await withOne.svc.entrySave('wairimu@baridi.test', undefined, 'harbour7lamp');
    expect(withOne.pending[0].update.passwordHash).toEqual(expect.any(String));
    const without = service(null);
    await without.svc.entrySave('wairimu@baridi.test');
    expect(without.pending[0].update).not.toHaveProperty('passwordHash');
    expect(without.pending[0].create).not.toHaveProperty('passwordHash');
  });
});

describe('an address that already has an account', () => {
  const ada = { id: 'u-ada', email: 'ada@acme.test', firstName: 'Ada' };

  it('ignores the password: nothing about the account is changed, and the answer is the same as for a new address', async () => {
    const existing = service(ada);
    const fresh = service(null);
    const a = await existing.svc.entrySave('ada@acme.test', undefined, 'harbour7lamp');
    const b = await fresh.svc.entrySave('ada@acme.test', undefined, 'harbour7lamp');
    expect(existing.prisma.user.update).not.toHaveBeenCalled();
    expect(existing.pending).toHaveLength(0);
    /* U.3 review: both answers now carry a password key of the same shape (the security fix in
       the-password-stays-with-the-browser.spec.ts); the new address's is real, this one opens nothing. */
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect({ message: a.message, email: a.email }).toEqual({ message: b.message, email: b.email });
    expect(a.passwordKey).toMatch(/^[0-9a-f]{64}$/);
    expect(b.passwordKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a password that is the address is refused the same way whether or not there is an account', async () => {
    await expect(service(ada).svc.entrySave('ada@acme.test', undefined, 'Ada@Acme.test')).rejects.toThrow(new BadRequestException(IS_THEIR_EMAIL));
    await expect(service(null).svc.entrySave('ada@acme.test', undefined, 'Ada@Acme.test')).rejects.toThrow(new BadRequestException(IS_THEIR_EMAIL));
  });
});

describe('the request', () => {
  it('a password on entry-save meets the same rules as anywhere else', async () => {
    const errors = await validate(plainToInstance(EntrySaveDto, { email: 'a@b.test', password: 'harbourlamp' }));
    expect(errors.flatMap((e) => Object.values(e.constraints ?? {}))).toEqual([NO_NUMBER_OR_SYMBOL]);
    expect(await validate(plainToInstance(EntrySaveDto, { email: 'a@b.test' }))).toEqual([]);
  });
});
