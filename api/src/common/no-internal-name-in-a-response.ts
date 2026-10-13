import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPublished } from './published-surfaces';
import { withoutInternalNames } from './no-internal-name-reaches-a-person';

/**
 * NO INTERNAL NAME IN ANYTHING THE API SERVES (night quality run 2, Naomi's walk: "this new project,
 * NEW_PROJECT,"). The last line for screens: every sentence in a response passes the same check the mail,
 * WhatsApp and the saved turns pass.
 *
 * Only prose is read: a string with a space in it. A value that is only a key ("NEW_PROJECT",
 * "IN_PROGRESS") is data the screen reads, not a sentence a person reads, and is left alone. A person's own
 * words are never altered: a turn of theirs (role PERSON or user) and fields that hold their words are
 * passed through, and inside any sentence a quotation is left exactly as it is. The prompt editor and the
 * staff console show the engine's own text on purpose, and the published API is a contract, so those are
 * not read at all.
 */
const NOT_READ: readonly RegExp[] = [/\/prompts\b/, /^\/api(?:\/v\d+)?\/admin\b/, /^\/admin\b/];
const THEIR_OWN_ROLES = new Set(['PERSON', 'user']);
const THEIR_OWN_FIELDS = new Set(['quote', 'quotes', 'verbatim', 'theirWords', 'theirOwnWords', 'question', 'said', 'words', 'password', 'token', 'url', 'href', 'link']);

export function withNoInternalNameIn(value: unknown, caught: string[], depth = 0): unknown {
  if (depth > 14 || value == null) return value;
  if (typeof value === 'string') {
    if (!/\s/.test(value)) return value;
    const out = withoutInternalNames(value);
    caught.push(...out.caught);
    return out.text;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => { const n = withNoInternalNameIn(v, caught, depth + 1); if (n !== v) changed = true; return n; });
    return changed ? next : value;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const o = value as Record<string, unknown>;
    if (typeof o.role === 'string' && THEIR_OWN_ROLES.has(o.role)) return value;
    let next: Record<string, unknown> | null = null;
    for (const [k, v] of Object.entries(o)) {
      if (THEIR_OWN_FIELDS.has(k)) continue;
      const n = withNoInternalNameIn(v, caught, depth + 1);
      if (n !== v) (next ??= { ...o })[k] = n;
    }
    return next ?? value;
  }
  return value;
}

@Injectable()
export class NoInternalNameInAResponse implements NestInterceptor {
  private readonly logger = new Logger('NoInternalNameInAResponse');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const url: string = context.switchToHttp().getRequest()?.url ?? '';
    if (isPublished(url) || NOT_READ.some((r) => r.test(url))) return next.handle();
    return next.handle().pipe(
      map((data) => {
        const caught: string[] = [];
        const out = withNoInternalNameIn(data, caught);
        if (caught.length) this.logger.warn(`An internal name was about to reach a person (${url.split('?')[0]}): ${[...new Set(caught)].join(', ')}. It was taken out.`);
        return out;
      }),
    );
  }
}
