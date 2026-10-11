import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('We could not find that sign-in, so sign in again and try once more.');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException(whoMayDoThis(requiredRoles));
    }

    return true;
  }
}

const IN_WORDS: Record<string, string> = { ADMIN: 'an admin', LEAD: 'a lead', MEMBER: 'a member', GUEST: 'a guest' };

/** B-001: "Only an admin can do this." and never "This action requires one of the following roles: ADMIN". */
export function whoMayDoThis(roles: string[]): string {
  const said = roles.map((r) => IN_WORDS[String(r).toUpperCase()] ?? String(r).toLowerCase());
  const who = said.length < 2 ? said.join('') : `${said.slice(0, -1).join(', ')} or ${said[said.length - 1]}`;
  return `Only ${who} can do this.`;
}
