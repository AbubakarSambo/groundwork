import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { IdempotencyService } from './idempotency.service';

/**
 * A RETRIED POST DOES NOT DO THE THING TWICE.
 *
 * Idempotency-Key was honoured on two of thirty-seven POST routes. The service's own reasoning - a
 * timeout on our side is indistinguishable from a refusal on theirs, so any integration worth
 * connecting retries - applied exactly as hard to opening a check-in, which on a retry created a
 * second one, spent a free one, and invited the same people twice (fix plan F14). Rather than a key
 * derivation per route, one interceptor: any POST under the published API that carries the header
 * runs through the same record-and-replay, keyed by organisation, method and path. The two routes
 * that derive a key from the body keep their own call and are skipped here.
 */
const HANDLES_ITS_OWN = [/^\/api\/org\/v1\/subjects(\/bulk)?$/];

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const key: string | undefined = req.headers?.['idempotency-key'];
    const path: string = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const organizationId: string | undefined = req.machine?.organizationId ?? req.panel?.organizationId;
    if (req.method !== 'POST' || !key?.trim() || !organizationId || HANDLES_ITS_OWN.some((p) => p.test(path))) {
      return next.handle();
    }
    const endpoint = `POST ${path.replace(/^\/api\/org\/v1/, '')}`;
    return from(
      this.idempotency.run(organizationId, key, endpoint, req.body, () => new Promise((resolve, reject) => {
        next.handle().subscribe({ next: resolve, error: reject });
      })),
    );
  }
}
