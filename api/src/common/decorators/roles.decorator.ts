import { SetMetadata } from '@nestjs/common';

/**
 * THE SAME FOUR THE DATABASE HAS, AND IT USED TO BE TWO.
 *
 * `UserRole` in the schema is ADMIN, LEAD, MEMBER, GUEST. This enum had ADMIN and MEMBER, so two of
 * the four were values the guard compared against and nobody could name — and `switchOrganization`
 * writes a membership's role straight onto `User.role`, which meant somebody switching into an
 * organisation they are a guest of ended up holding a role this file had never heard of.
 *
 * Nothing was exposed by that: every guarded route in the codebase asks for ADMIN specifically, so
 * an unknown role is refused everywhere, which is the safe direction. What it cost was the ability
 * to say what a LEAD may do without writing the string by hand — and a string written by hand is
 * how the two lists drift apart again.
 *
 * A guard holds them in step: `every-role-the-database-has.spec.ts`.
 */
export enum Role {
  ADMIN = 'ADMIN', // manages grounds, billing activation, alignment feed
  /** Sets up check-ins for their own team, and inherits no admin powers by not being a MEMBER. */
  LEAD = 'LEAD',
  MEMBER = 'MEMBER', // a regular person who checks in
  /** Somebody from another company, added to one of your check-ins and nothing else. */
  GUEST = 'GUEST',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
