/**
 * ONE TEST FOR AN ADDRESS.
 *
 * Thirty places asked `includes('@')`, in three shapes - guard-then-message, a silent return, and a
 * disabled button paired with an opacity ternary - and "a@", "@" and "me@ @" passed at every one of
 * them. One rule, one regex, and nothing clever: no TLD list, no length caps. Stricter than the old
 * test on purpose, which is the point, so it must not grow.
 */
export function looksLikeAnAddress(value: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((value ?? '').trim())
}

/** Said beside the field when it does not. One sentence, the same everywhere. */
export const NOT_AN_ADDRESS = 'That address does not look right.'

/**
 * NEVER AN EMAIL ADDRESS WHERE A SCREEN PRINTS SOMEBODY'S NAME.
 *
 * Request 56 to the engine: the session report's own count left a person out of who is counted,
 * but still named her in "What to ask each person" by her email address rather than her name -
 * "Start with zawadi.u8@example.test." A screen this session owns never shows that, whatever the
 * server sends, so this is the one place every such read goes through, with a plain fallback
 * rather than the address.
 */
export function neverAnAddressAsAName(name: string | null | undefined, placeholder = 'a colleague'): string {
  if (!name) return placeholder
  return looksLikeAnAddress(name) ? placeholder : name
}
