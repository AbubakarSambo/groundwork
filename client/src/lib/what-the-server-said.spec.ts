import { describe, it, expect } from 'vitest'
import { whatTheServerSaid } from './what-the-server-said'

const TOO_LONG = 'That message is too long for me to take in one go. Please attach it as a document instead, and I will read all of it.'
const OURS = 'That did not send. Your message is back in the box, try again.'

describe('what a person reads when a message is refused', () => {
  it('a message too long for one message reads the server\'s sentence, from a check on the request', () => {
    expect(whatTheServerSaid({ response: { status: 400, data: { message: [TOO_LONG] } } }, OURS)).toBe(TOO_LONG)
    expect(whatTheServerSaid({ response: { status: 400, data: { message: TOO_LONG } } }, OURS)).toBe(TOO_LONG)
  })

  it('a fault on the server or the network reads the page\'s own words', () => {
    expect(whatTheServerSaid({ response: { status: 500, data: { message: 'Internal server error' } } }, OURS)).toBe(OURS)
    expect(whatTheServerSaid(new Error('Network Error'), OURS)).toBe(OURS)
  })
})
