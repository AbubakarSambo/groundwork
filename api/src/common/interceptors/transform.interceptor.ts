import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * THE INTEGRATION API IS NOT OURS TO RESHAPE.
 *
 * This envelope is a convention our own client understands. A customer's server does not: an OAuth
 * client library reads `access_token` at the top level because RFC 6749 says it is there, and
 * wrapping it in `{ success, data }` makes every standard client fail against us with an error that
 * says nothing useful. Found by calling the endpoint with curl and reading the body - it typechecks
 * perfectly and is wrong.
 *
 * The same argument applies past the token endpoint. Every shape under /api/org/v1 is a published
 * contract, and an envelope we add for our own convenience is a thing their parser has to be taught
 * about and we can never remove.
 */
/**
 * EVERY SURFACE SOMEBODY ELSE CONSUMES, not just the JSON one.
 *
 * This was `/api/org/v1` alone, and `/embed.js` therefore came back as a JSON envelope with a
 * JavaScript content type. Chrome refused it outright - ERR_BLOCKED_BY_ORB - so the widget never
 * ran on a customer's page, and the loader's own "fail quietly" design meant there was nothing in
 * the console to say why. Exactly the OAuth envelope bug again: an envelope added for our own
 * convenience, breaking a contract somebody else parses.
 */
const PUBLISHED = [/^\/api\/org\/v1/, /^\/embed\.js/, /^\/embed\/panel/];

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    const url: string = context.switchToHttp().getRequest()?.url ?? '';
    if (PUBLISHED.some((p) => p.test(url))) return next.handle();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
