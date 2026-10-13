import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  private flag(key: string, context: ExecutionContext): boolean {
    return !!this.reflector.getAllAndOverride<boolean>(key, [context.getHandler(), context.getClass()]);
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.flag(IS_PUBLIC_KEY, context);
    /*
     * A public route that has asked to know who is signed in runs passport and swallows the failure
     * (see handleRequest); a plain public route does not run it at all. See optional-auth.decorator.ts.
     */
    if (isPublic && !this.flag(IS_OPTIONAL_AUTH_KEY, context)) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (context && this.flag(IS_PUBLIC_KEY, context) && this.flag(IS_OPTIONAL_AUTH_KEY, context)) return null;
      throw err || new UnauthorizedException('Your sign-in has run out, so sign in again.');
    }
    return user;
  }
}
