/**
 * FOR SPECS: WHETHER THE STREAMED ROUTE RUNS THE PLAIN ROUTE'S OWN CODE.
 *
 * Hafsah, 28 September 2026: the streamed route must have the same safety net as the plain route.
 * It used to be a copy of sendMessage with none of its second tries. Now sendMessageStream runs
 * sendMessage itself and only shows the first draft as it is written. Specs that used to check a
 * rule "on both paths" by finding it twice in the file check it once in sendMessage, and check
 * this: that the stream is sendMessage, and has nothing of its own that could drift from it.
 */
export function theStreamedRoute(src: string): string {
  const from = src.indexOf('async *sendMessageStream(');
  const to = src.indexOf('private async streamTheDraft(', from);
  return from > -1 && to > from ? src.slice(from, to) : '';
}

export function theStreamedRouteRunsThePlainRoute(src: string): boolean {
  const stream = theStreamedRoute(src);
  return !!stream
    && /this\.sendMessage\(checkInId, requestingUserId as any, message, \{\s*streamDraft:/.test(stream)
    && /reply: r\.reply/.test(stream)
    /* Nothing of its own that could drift: no model call, no write, no reply built here. */
    && !/this\.anthropic\./.test(stream)
    && !/conversationTurn\.(create|update)/.test(stream)
    && /how\.streamDraft\s*\?\s*await this\.streamTheDraft\(/.test(src);
}
