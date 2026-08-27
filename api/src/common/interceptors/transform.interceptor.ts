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
const PUBLISHED_CONTRACT = '/api/org/v1';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    const url: string = context.switchToHttp().getRequest()?.url ?? '';
    if (url.startsWith(PUBLISHED_CONTRACT)) return next.handle();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
