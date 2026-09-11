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
