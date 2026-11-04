/**
 * THE SERVER'S OWN SENTENCE WHEN IT REFUSES SOMETHING (a 4xx), read before any words of this page's own. A message longer than one
 * message can be is refused on every door with one plain sentence that asks for a document instead (the server's
 * A_MESSAGE_IS_TOO_LONG, Hafsah, 3 November 2026); a page that said "That did not send, try again" in its place told the person to
 * send it again as it was. The refusal's words are a string, or a list of them from a check on the request; the first is read.
 */
export function whatTheServerSaid(error: unknown, otherwise: string): string {
  const resp = (error as { response?: { status?: number; data?: { message?: unknown } } } | null)?.response
  if (!resp?.status || resp.status < 400 || resp.status >= 500) return otherwise
  const m = resp.data?.message
  const said = Array.isArray(m) ? m.find((x) => typeof x === 'string' && x.trim()) : m
  return typeof said === 'string' && said.trim() ? said : otherwise
}
