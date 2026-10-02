import { BadRequestException } from '@nestjs/common';
import { tidyANumber, formsOfTheSameNumber, callingCodeOf, WRITE_THE_FULL_NUMBER, NOT_A_FULL_NUMBER } from './a-number-whatsapp-can-reach';
import { theCountryCodeOf } from './the-organisations-country';
import { WhatsAppService } from './whatsapp.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

/**
 * EVERY NUMBER IS KEPT THE WAY WHATSAPP SENDS IT (survey item 6).
 *
 * Numbers typed by an admin or in Settings were kept as typed ("+234 801 234 5678") or as a local
 * number ("0801 234 5678"), and WhatsApp sends "2348012345678", so the person writing was told their
 * number was not recognised. One function tidies every number into one form, and every lookup
 * matches numbers already stored in either form.
 */
describe('one form for every number', () => {
  it.each([
    ['+234 801 234 5678', null, '+2348012345678'],
    ['+234-801-234-5678', null, '+2348012345678'],
    ['2348012345678', null, '+2348012345678'],
    ['00234 801 234 5678', null, '+2348012345678'],
    ['0801 234 5678', '234', '+2348012345678'],
    ['0712 345 678', '254', '+254712345678'],
    ['+44 (0)7700 900123', null, '+447700900123'],
  ])('"%s" is kept as %s', (typed, country, kept) => {
    expect(tidyANumber(typed, country as string | null)).toEqual({ number: kept });
  });

  it('a local number with no country known is refused with a plain sentence asking for the whole number', () => {
    expect(tidyANumber('0801 234 5678')).toEqual({ refused: WRITE_THE_FULL_NUMBER });
    expect(WRITE_THE_FULL_NUMBER).toBe('Please write the whole number with the country code at the start, for example +234 801 234 5678.');
  });

  it('something that is not a whole number is refused the same plain way', () => {
    expect(tidyANumber('12345')).toEqual({ refused: NOT_A_FULL_NUMBER });
    expect(tidyANumber('call me')).toEqual({ refused: NOT_A_FULL_NUMBER });
  });

  it('the country code is read from the start of a whole number', () => {
    expect(callingCodeOf('2348012345678')).toBe('234');
    expect(callingCodeOf('+254 709 000 111')).toBe('254');
    expect(callingCodeOf('+447700900123')).toBe('44');
    expect(callingCodeOf('+14155550100')).toBe('1');
  });

  it('a number is looked up in every form it may already be stored in', () => {
    expect(formsOfTheSameNumber('2348012345678')).toEqual(['+2348012345678', '2348012345678', '08012345678', '+08012345678']);
  });
});

describe("the organisation's country", () => {
  it('comes from its own WhatsApp number when it has one', async () => {
    const db = { whatsAppConnection: { findUnique: async () => ({ displayNumber: '+254 709 000 111' }) }, person: { findMany: async () => [] }, user: { findMany: async () => [] } };
    expect(await theCountryCodeOf(db, 'org-1')).toBe('254');
  });
  it('or from the numbers already kept for its people, when they all agree', async () => {
    const db = { whatsAppConnection: { findUnique: async () => null }, person: { findMany: async () => [{ phone: '+2348011111111' }] }, user: { findMany: async () => [{ phoneNumber: '+2348022222222' }] } };
    expect(await theCountryCodeOf(db, 'org-1')).toBe('234');
  });
  it('and is not guessed when they do not agree', async () => {
    const db = { whatsAppConnection: { findUnique: async () => null }, person: { findMany: async () => [{ phone: '+2348011111111' }] }, user: { findMany: async () => [{ phoneNumber: '+254712345678' }] } };
    expect(await theCountryCodeOf(db, 'org-1')).toBeNull();
  });
});

/* An organisation whose people's numbers are all Nigerian, with no number of its own connected. */
const nigerian = (extra: any = {}) => ({
  whatsAppConnection: { findUnique: jest.fn(async () => null) },
  person: { findMany: jest.fn(async () => [{ phone: '+2348011111111' }]) },
  ...extra,
});

describe('Settings', () => {
  const settings = (prisma: any) => {
    const auth = new AuthService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    jest.spyOn(auth, 'getProfile').mockResolvedValue({} as any);
    return auth;
  };

  it('keeps a number typed with spaces in the one form', async () => {
    const update = jest.fn(async () => ({}));
    const prisma: any = nigerian({ user: { findUniqueOrThrow: jest.fn(async () => ({ id: 'u-1', organizationId: 'org-1' })), update, findMany: jest.fn(async () => []) } });
    await settings(prisma).updateProfile('u-1', { phoneNumber: '+234 801 234 5678' } as any);
    expect(update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { phoneNumber: '+2348012345678' } });
  });

  it("gives a local number the organisation's country", async () => {
    const update = jest.fn(async () => ({}));
    const prisma: any = nigerian({ user: { findUniqueOrThrow: jest.fn(async () => ({ id: 'u-1', organizationId: 'org-1' })), update, findMany: jest.fn(async () => []) } });
    await settings(prisma).updateProfile('u-1', { phoneNumber: '0801 234 5678' } as any);
    expect(update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { phoneNumber: '+2348012345678' } });
  });

  it('refuses a local number when the country is not known, and says what to write', async () => {
    const update = jest.fn(async () => ({}));
    const prisma: any = {
      whatsAppConnection: { findUnique: jest.fn(async () => null) },
      person: { findMany: jest.fn(async () => []) },
      user: { findUniqueOrThrow: jest.fn(async () => ({ id: 'u-1', organizationId: 'org-1' })), update, findMany: jest.fn(async () => []) },
    };
    const p = settings(prisma).updateProfile('u-1', { phoneNumber: '0801 234 5678' } as any);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow(WRITE_THE_FULL_NUMBER);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("an admin's roster entry", () => {
  it('keeps the number in the one form', async () => {
    const tx: any = { user: { update: jest.fn(async (q: any) => ({ id: 'u-2', ...q.data })) } };
    const prisma: any = nigerian({
      user: {
        findFirst: jest.fn(async () => ({ id: 'u-2', email: 'kwame@example.com', role: 'MEMBER', isActive: true })),
        findUnique: jest.fn(async () => ({ id: 'admin-1', role: 'ADMIN' })),
        findMany: jest.fn(async () => []),
      },
      organization: { findUnique: jest.fn(async () => ({ ownerUserId: 'admin-1' })) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    });
    const users = new UsersService(prisma, {} as any, {} as any, {} as any, {} as any);
    await users.update('u-2', 'org-1', { phoneNumber: '0802 345 6789' } as any, 'admin-1');
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { phoneNumber: '+2348023456789' } }));
  });
});

describe('a number already stored in a local form', () => {
  it('is found when WhatsApp sends it in international form, in its own country only', async () => {
    const prisma: any = {
      person: {
        findFirst: jest.fn(async (q: any) => (q.where.phone.in.includes('08012345678') ? { id: 'person-1', externalId: 'ext-1', linkedUserId: 'u-1', email: null, phone: '08012345678' } : null)),
        findMany: jest.fn(async () => [{ phone: '+2348099999999' }]),
      },
      whatsAppConnection: { findUnique: jest.fn(async () => null) },
      user: { findMany: jest.fn(async () => []) },
    };
    const wa = new WhatsAppService({ get: () => undefined } as any, prisma);
    expect(await wa.whoIsWritingTo('org-1', '2348012345678')).toEqual({ personId: 'person-1', userId: 'u-1', externalId: 'ext-1' });
  });

  it('is not somebody else in another country who happens to share the local digits', async () => {
    const prisma: any = {
      person: {
        findFirst: jest.fn(async () => ({ id: 'person-9', externalId: null, linkedUserId: 'u-9', email: null, phone: '0712345678' })),
        findMany: jest.fn(async () => [{ phone: '+254700000000' }]),
      },
      whatsAppConnection: { findUnique: jest.fn(async () => null) },
      user: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    };
    const wa = new WhatsAppService({ get: () => undefined } as any, prisma);
    /* A Nigerian number whose national part is 712345678, against a Kenyan organisation's local entry. */
    expect((await wa.whoIsWritingTo('org-ke', '234712345678')).personId).toBeNull();
  });
});
