/**
 * A GROUND THAT HAS ENDED, ON THE SCREENS.
 *
 * The server keeps this straight now (api: grounds/a-ground-that-has-ended.ts). The pages did not:
 * a resolved check-in still showed "Session 5 of 6", "89 days remaining" and "Nothing due", and
 * nowhere said what had been decided. What ends a check-in is the most consequential thing that
 * happens to it, and it was the one thing no page mentioned.
 */
const OVER = ['RESOLVED', 'CLOSED']
/** Mirrors A_GROUND_IS_HELD on the server. A held check-in is not over, and it is not live either. */
const HELD = ['PAUSED']
/**
 * AND ONE THAT RAN OUT OF TIME, which is not the same as one that ended.
 *
 * RESOLVED and CLOSED are decisions somebody took. STALLED is what happens when the time runs out
 * while everybody is busy, and it was filed with the two decisions, so it read as final on every
 * screen and had no way back. Giving the check-in more time opens it again - see the server module.
 */
const STOPPED = ['STALLED']

export function hasEnded(status?: string | null): boolean {
  return !!status && OVER.includes(status)
}

export function isHeld(status?: string | null): boolean {
  return !!status && HELD.includes(status)
}

export function hasStalled(status?: string | null): boolean {
  return !!status && STOPPED.includes(status)
}

/**
 * Whether anything can be added right now: ended, held, or out of time.
 *
 * This is the question every screen actually has, and asking `hasEnded` instead is what put "Your
 * turn - 12 days late" on check-ins that refuse every answer.
 */
export function isShut(status?: string | null): boolean {
  return hasEnded(status) || isHeld(status) || hasStalled(status)
}

/** What a check-in that ran out of time says about itself, and what lifts it. */
export function itRanOutOfTime(canGiveItMoreTime: boolean): string {
  return canGiveItMoreTime
    ? 'This check-in ran past the time it was given. Nobody can add to it until you give it more time. Everything already in it is kept.'
    : 'This check-in ran past the time it was given. Nothing can be added until whoever runs it gives it more time. Everything already in it is kept.'
}

/** What the ground says about itself while it is held. Null otherwise. */
export function howItIsHeld(status?: string | null): string | null {
  return isHeld(status) ? 'On hold' : null
}

/** What the ground says about itself once it is over. Null while it is live. */
export function howItEnded(ground: { status?: string | null; endState?: string | null; endStateLabel?: string | null } | null | undefined): string | null {
  /* Out of time is its own badge, and it does not say "ended" - it is the one state somebody can
     still do something about, and calling it ended is why nobody tried. */
  if (hasStalled(ground?.status)) return 'Out of time'
  if (!hasEnded(ground?.status)) return null
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
