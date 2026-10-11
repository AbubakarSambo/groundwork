import { ForbiddenException } from '@nestjs/common';
import { BackOfficeDoorGuard } from './back-office-door.guard';

/**
 * B-008: an admin who is not Groundwork staff, opening the back office WhatsApp page, was told "The back office needs a code sent to your
 * email. It holds for a week." and asking for the code at the door answered "This part is for Groundwork staff." A person who can never
 * be sent a code is told the second thing everywhere.
 */
const context = (path: string): any => ({
  switchToHttp: () => ({ getRequest: () => ({ originalUrl: path, user: { id: 'u1', signedInVia: 'password' } }) }),
  getHandler: () => function handler() {},
  getClass: () => class Controller {},
});
const guard = (staff: { isPlatformAdmin?: boolean; person?: boolean }) => new BackOfficeDoorGuard({
  backOfficePass: { findUnique: async () => null },
  user: { findUnique: async () => ({ isPlatformAdmin: !!staff.isPlatformAdmin }) },
  opsPerson: { findFirst: async () => (staff.person ? { id: 'op1' } : null) },
  opsPersonAccount: { findFirst: async () => null },
} as any);

describe('the back office door', () => {
  it('tells somebody who is not staff the same thing everywhere', async () => {
    await expect(guard({}).canActivate(context('/api/v1/admin/whatsapp/settings'))).rejects.toThrow(new ForbiddenException('This part is for Groundwork staff.'));
  });
  it('still asks staff without a pass for the code', async () => {
    await expect(guard({ isPlatformAdmin: true }).canActivate(context('/api/v1/admin/whatsapp/settings'))).rejects.toMatchObject({ response: { message: 'The back office needs a code sent to your email. It holds for a week.' } });
    await expect(guard({ person: true }).canActivate(context('/api/v1/admin/whatsapp/settings'))).rejects.toMatchObject({ response: { code: 'BACK_OFFICE_CODE_REQUIRED' } });
  });
});
