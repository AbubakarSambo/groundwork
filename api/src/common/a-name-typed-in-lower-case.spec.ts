import { aNameTypedInLowerCase } from './a-name-typed-in-lower-case';
import { ParticipantsService } from '../modules/participants/participants.service';

/** Hafsah, 12 October 2026: "Names typed in lower case are capitalised per part; people can correct their own name when they join." */
describe('a name typed in lower case', () => {
  it('is capitalised part by part, and a part with a capital is left as typed', () => {
    expect(aNameTypedInLowerCase('pia alpha')).toBe('Pia Alpha');
    expect(aNameTypedInLowerCase("mary-jane o'neil")).toBe("Mary-Jane O'Neil");
    expect(aNameTypedInLowerCase('ronan McDonald')).toBe('Ronan McDonald');
    expect(aNameTypedInLowerCase('Amina Otieno')).toBe('Amina Otieno');
  });
});

describe('the person corrects their own name when they join', () => {
  function service(user: any) {
    const participant = { id: 'p1', groundId: 'g1', email: 'pia@x.test', userId: 'u-pia', inviteToken: 'tok', nameGiven: 'Pia Alpha' };
    const prisma: any = {
      groundParticipant: { findUnique: jest.fn(async () => participant), findFirst: jest.fn(async () => participant), update: jest.fn(async (a: any) => a) },
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org1', initiatorId: 'admin1' })) },
      user: { findUnique: jest.fn(async ({ where, select }: any) => (where.id === 'u-pia' && select?.passwordHash ? user : where.id === 'u-pia' ? { id: 'u-pia', email: 'pia@x.test', firstName: 'Pia' } : null)), update: jest.fn(async (a: any) => a) },
      checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })) },
      emailVerificationToken: { create: jest.fn(async () => ({})) },
    };
    const svc = new ParticipantsService(prisma, { sign: () => 'jwt' } as any, { sendMagicLinkEmail: async () => undefined } as any, {} as any);
    return { svc, prisma };
  }

  it('Pia, whose sign-in was made for her, types "Pia Alfa": that is her name now, as she typed it', async () => {
    const { svc, prisma } = service({ passwordHash: null, googleId: null, welcomeCardSeenAt: null });
    await svc.accept('tok', { firstName: 'Pia', lastName: 'Alfa' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u-pia' }, data: { firstName: 'Pia', lastName: 'Alfa' } });
    expect(prisma.groundParticipant.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { nameGiven: 'Pia Alfa' } });
  });

  it('somebody who already signs in is not renamed through an invitation link', async () => {
    const { svc, prisma } = service({ passwordHash: 'set', googleId: null, welcomeCardSeenAt: null });
    await svc.accept('tok', { firstName: 'Someone', lastName: 'Else' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
