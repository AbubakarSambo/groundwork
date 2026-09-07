/**
 * A server error must never be reported as a missing record. That was the default, and it is the
 * worst of the three: it tells somebody their own record is gone when nothing is gone.
 */
import { describe, it, expect } from 'vitest'
import { whyYouCannotSeeThis, whatWentWrong } from './why-you-cannot-see-this'

const came = (status?: number, message?: unknown) => ({ status, message: message as any })

describe('why you cannot see this', () => {
  it('never says not found when the server broke, and offers a retry', () => {
    const why = whyYouCannotSeeThis(came(500))
    expect(why.say).not.toMatch(/not found|missing|does not exist/i)
    expect(why.say).toMatch(/still there/i)
    expect(why.canRetry).toBe(true)
  })

  it('prefers the sentence the server sent over any of its own', () => {
    const said = 'Everybody has answered and the report is being written.'
    expect(whyYouCannotSeeThis(came(404, said)).say).toBe(said)
  })

  it('ignores a validation array, which is not a sentence for a person', () => {
    const why = whyYouCannotSeeThis(came(404, ['id must be a UUID']))
    expect(why.say).not.toContain('must be')
    expect(why.say).toMatch(/out of date|nothing at this address/i)
  })

  it('says you are not on it for a refusal, and does not offer a pointless retry', () => {
    const why = whyYouCannotSeeThis(came(403))
    expect(why.say).toMatch(/not part of/i)
    expect(why.canRetry).toBe(false)
  })

  it('says sign in again when the session went, rather than blaming the record', () => {
    expect(whyYouCannotSeeThis(came(401)).say).toMatch(/signed out/i)
  })

  it('treats no response at all as a connection problem, retryable', () => {
    const why = whyYouCannotSeeThis(came(undefined))
    expect(why.canRetry).toBe(true)
    expect(why.say).toMatch(/connection/i)
  })

  it('reads a status and a message off a real axios-shaped error', () => {
    expect(whatWentWrong({ response: { status: 403, data: { message: 'no' } } })).toEqual({ status: 403, message: 'no' })
    expect(whatWentWrong(new Error('boom'))).toEqual({ status: undefined, message: undefined })
  })
})
