/**
 * A GROUND THAT HAS ENDED, ON THE SCREENS.
 *
 * The server keeps this straight now (api: grounds/a-ground-that-has-ended.ts). The pages did not:
 * a resolved check-in still showed "Session 5 of 6", "89 days remaining" and "Nothing due", and
 * nowhere said what had been decided. What ends a check-in is the most consequential thing that
 * happens to it, and it was the one thing no page mentioned.
 */
const OVER = ['RESOLVED', 'CLOSED', 'STALLED']

export function hasEnded(status?: string | null): boolean {
  return !!status && OVER.includes(status)
}

/** What the ground says about itself once it is over. Null while it is live. */
export function howItEnded(ground: { status?: string | null; endState?: string | null; endStateLabel?: string | null } | null | undefined): string | null {
  if (!hasEnded(ground?.status)) return null
  if (ground?.status === 'STALLED') return 'Ended without an agreed outcome'
  const label = ground?.endStateLabel ?? ground?.endState
  return label ? `Ended · ${humanEndState(label)}` : 'Ended'
}

/** END_STATE values are stored shouted. Nobody says "KEEP" out loud. */
export function humanEndState(value: string): string {
  const said: Record<string, string> = {
    KEEP: 'keep the hire', RESTRUCTURE: 'restructure the role', EXIT: 'let them go', EXTEND: 'extend the evaluation',
    RENEW: 'renew', END: 'end it', CONTINUE: 'carry on', RESOLVED: 'resolved', AGREED: 'agreed',
  }
  return said[value] ?? value.toLowerCase().replace(/_/g, ' ')
}
