/**
 * EVERY SURFACE SOMEBODY ELSE CONSUMES, IN ONE LIST.
 *
 * The success interceptor exempted these URL families from the `{success, data}` envelope, because
 * an envelope we add for our own convenience is a thing their parser has to be taught about and we
 * can never remove. The exception filter had no matching list, so a machine-API success came back
 * raw and a machine-API failure came back enveloped: two shapes for one audience (fix plan F14).
 * One list now, read by both. Review a change here twice: a mistake un-envelopes the whole app.
 */
export const PUBLISHED: readonly RegExp[] = [/^\/api\/org\/v1/, /^\/embed\.js/, /^\/embed\/panel/];

export const isPublished = (url: string | undefined): boolean => PUBLISHED.some((p) => p.test(url ?? ''));

/** What a streamed reply says when it fails. The internal message is logged, never sent (F14). */
export const A_STREAM_FAILED = 'The reply could not be finished. Send that again.';
