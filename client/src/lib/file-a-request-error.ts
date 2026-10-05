import { askNameFor } from './ask-name'

/**
 * WHAT A FAILED REQUEST SAYS (request 165, Hafsah 6 October).
 *
 * `POST /suites/leave/requests` and `POST /suites/spend/requests` do not exist on the server yet
 * (docs/requests-to-engine.md, request 165), so sending either form gets a 404 until the engine
 * adds the route. That is said plainly, by name, rather than as a generic failure: "This request
 * could not be sent from here yet. You can ask for it in Ask <organisation name> instead." Any
 * other failure shows the server's own message, or a plain fallback when it sends none.
 */
export function whatFilingARequestSays(error: unknown, organizationName?: string | null): string {
  const resp = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  if (resp?.status === 404) {
    return `This request could not be sent from here yet. You can ask for it in ${askNameFor(organizationName)} instead.`
  }
  return resp?.data?.message || 'That did not go through, and nothing has changed. Try again.'
}
