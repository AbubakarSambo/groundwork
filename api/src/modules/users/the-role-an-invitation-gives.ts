import { BadRequestException } from '@nestjs/common';

/**
 * THE ROLE AN INVITATION GIVES (U.4): "Admin", "Can open check-ins" or "Takes part". Anything else is
 * refused rather than read as a member, so a typo never quietly invites someone as the wrong thing.
 * A guest is not offered: a guest is somebody from another organisation added to one check-in.
 */
export function aRoleToInviteAs(role: string | undefined | null): 'ADMIN' | 'LEAD' | 'MEMBER' {
  if (role == null || role === '') return 'MEMBER';
  if (role === 'ADMIN' || role === 'LEAD' || role === 'MEMBER') return role;
  throw new BadRequestException('Choose Admin, Can open check-ins, or Takes part.');
}
