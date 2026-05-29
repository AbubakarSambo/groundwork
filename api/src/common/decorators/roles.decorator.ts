import { SetMetadata } from '@nestjs/common';

export enum Role {
  ADMIN = 'ADMIN', // manages grounds, billing activation, alignment feed
  MEMBER = 'MEMBER', // a regular person who checks in
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
