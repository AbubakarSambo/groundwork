import { describe, it, expect } from 'vitest'
import { aPersonsSentenceForAServerError } from './a-persons-sentence-for-a-server-error'

describe('a plain sentence stands in for a configuration name (screen fault 4a)', () => {
  it('replaces a message that names a setting', () => {
    expect(aPersonsSentenceForAServerError(
      'Billing is not set up on this deployment. STRIPE_SECRET_KEY is not configured, so nothing can be charged. Nothing was attempted and no card was touched.',
      'Could not start checkout. Try again.',
    )).toBe('Paying is not set up yet. Nothing was charged.')
  })

  it('replaces a different setting\'s name just as readily', () => {
    expect(aPersonsSentenceForAServerError('WHATSAPP_ACCESS_TOKEN is missing.', 'WhatsApp did not change. Try again.'))
      .toBe('Paying is not set up yet. Nothing was charged.')
  })

  it('leaves an ordinary message exactly as the server sent it', () => {
    expect(aPersonsSentenceForAServerError('Your card was declined. Nothing was charged.', 'Could not start checkout. Try again.'))
      .toBe('Your card was declined. Nothing was charged.')
  })

  it('falls back to the given sentence when there is no server message', () => {
    expect(aPersonsSentenceForAServerError(undefined, 'Could not start checkout. Try again.'))
      .toBe('Could not start checkout. Try again.')
    expect(aPersonsSentenceForAServerError(null, 'Could not start checkout. Try again.'))
      .toBe('Could not start checkout. Try again.')
  })

  it('does not mistake an ordinary capitalised word for a setting name', () => {
    expect(aPersonsSentenceForAServerError('OK, that is done.', 'fallback')).toBe('OK, that is done.')
  })
})
