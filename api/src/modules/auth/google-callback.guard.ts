import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { aPathInThisApp } from '../../common/a-path-in-this-app';

/**
 * THE WAY BACK FROM GOOGLE, WHICH MUST ALWAYS LAND ON A PAGE. U.2.
 *
 * The plain `AuthGuard('google')` throws when Passport cannot finish: somebody pressed Cancel at
 * Google (it comes back with `error=access_denied`), Google refused the code, or the strategy turned
 * the profile down (an address Google has not verified). A throw there never reaches the
 * controller, so the person was left on the API's own origin looking at a JSON "Unauthorized" body:
 * the product simply vanished.
 *
 * Here a failure is logged and handed to the controller as "no user", and the controller sends them
 * to the client's "Google sign-in didn't finish" page, like every other way this can fail. A success
 * is unchanged. Only the callback uses this; the route that starts the trip to Google keeps the
 * plain guard, because there is nothing to come back to yet.
 */
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleCallbackGuard.name);

  handleRequest<TUser = any>(err: any, user: any, info: any, _context: ExecutionContext): TUser {
    if (err || !user) {
      const why = err?.message ?? info?.message ?? 'no profile came back';
      this.logger.warn(`Google sign-in did not finish: ${why}`);
      return null as TUser;
    }
    return user as TUser;
  }
}

/**
 * THE TRIP TO GOOGLE CARRIES WHERE THEY WERE GOING (U.3 review). "Sign up with Google" on the sign-up
 * reached from an invite link sends `?next=/j/<code>`. It rides to Google and back as OAuth's `state`,
 * which Google returns untouched, and the callback checks it again. Only a path inside this app is
 * ever sent; anything else is dropped.
 */
@Injectable()
export class GoogleStartGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const next = aPathInThisApp(req?.query?.next);
    return next ? { state: next } : {};
  }
}
