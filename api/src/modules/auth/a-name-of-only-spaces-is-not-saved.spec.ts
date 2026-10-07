import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

/** B-130: a first name of only spaces was accepted and saved as an empty name. */
function service(current: string) {
  const prisma: any = { user: { findUniqueOrThrow: jest.fn(async () => ({ id: 'u1', email: 'a@x.test', organizationId: 'o', firstName: current })), update: jest.fn(async () => ({})) } };
  const s: any = Object.create(AuthService.prototype);
  s.prisma = prisma;
  s.getProfile = async () => ({});
  return { s, prisma };
}

describe('saving a profile', () => {
  it('refuses to wipe a name that is there, in a sentence', async () => {
    const { s, prisma } = service('Amani');
    await expect(s.updateProfile('u1', { firstName: '  ', lastName: '' })).rejects.toThrow(new BadRequestException('Please write your first name. It cannot be left empty.'));
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('lets somebody with no name yet save the rest, and saves a real name', async () => {
    const none = service('');
    await expect(none.s.updateProfile('u1', { firstName: '', jobTitle: 'Driver' })).resolves.toBeDefined();
    const some = service('Amani');
    await expect(some.s.updateProfile('u1', { firstName: ' Amina ' })).resolves.toBeDefined();
    expect(some.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { firstName: 'Amina' } }));
  });
});
