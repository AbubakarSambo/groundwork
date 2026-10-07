import { askNameFor } from './ask-name'

/**
 * WHAT A FAILED REQUEST SAYS (request 165, Hafsah 6 October; updated the same day once the engine
 * built the routes).
 *
 * The routes now exist and refuse in their own full sentences - "Give a first and a last day...",
 * "The leave suite is not switched on...". Those are read first, whatever the status code, because
 * they are more exact than anything this page could say on their behalf. "This request could not
 * be sent from here yet. You can ask for it in Ask <organisation name> instead." stays only as the
 * fallback for a bare 404 that carries no message of its own - a route that simply is not there,
 * which is how every 404 used to read before the engine answered this request.
 */
export function whatFilingARequestSays(error: unknown, organizationName?: string | null): string {
  const resp = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  if (resp?.data?.message) return resp.data.message
  if (resp?.status === 404) {
    return `This request could not be sent from here yet. You can ask for it in ${askNameFor(organizationName)} instead.`
  }
  return 'That did not go through, and nothing has changed. Try again.'
}
