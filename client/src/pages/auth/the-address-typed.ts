import { looksLikeAnAddress, NOT_AN_ADDRESS } from '@/components/gw/an-address-that-can-receive-mail'

/**
 * WHAT IS WRONG WITH THE ADDRESS TYPED, IN WORDS THAT SAY WHAT TO DO. U.2 review.
 *
 * With nothing typed, "That address does not look right." read as though something had been
 * typed wrong. It says "Type your email address first." instead. Anything typed that cannot be an
 * address still gets the shared sentence. Null means the address can be sent to.
 */
export const TYPE_YOUR_ADDRESS_FIRST = 'Type your email address first.'

export function whatIsWrongWithTheAddress(typed: string): string | null {
  const s = typed.trim()
  if (!s) return TYPE_YOUR_ADDRESS_FIRST
  if (!looksLikeAnAddress(s)) return NOT_AN_ADDRESS
  return null
}
