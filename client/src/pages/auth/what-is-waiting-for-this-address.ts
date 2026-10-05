/**
 * WHAT IS WAITING FOR THIS ADDRESS.
 *
 * "We put in someone's email and their org gets free use for three months, when they sign-up, they
 * see it." She later decided one month (decision 78), so this reads it from the server, never
 * three. Seeing it is the half that is easy to skip and the half she asked for: a promise nobody
 * mentions at the moment of signing up is a discount they find out about on their first invoice.
 *
 * ASKED ONLY ONCE THE ADDRESS LOOKS LIKE ONE, and debounced, because this runs while somebody is
 * still typing. It says how long and on what, and nothing else - see the API's on-the-house route.
 */
export function aFreeRunLine(months: number, plan: string | null): string | null {
  if (!months || months < 1) return null
  /* One month is singular, and the sentence has to read as though a person wrote it. */
  const howLong = months === 1 ? 'Your first month is on us' : `Your first ${months} months are on us`
  const named = (plan ?? '').replace('_', ' ').toLowerCase()
  return `${howLong}${named ? `, on the ${named} plan` : ''}. It starts when you open your link.`
}

/** Whether this is worth asking about yet. The API answers nothing for anything else anyway. */
export function worthAsking(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((email ?? '').trim())
}
