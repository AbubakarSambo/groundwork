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

/**
 * What the ground says about itself once it is over. Null while it is live.
 *
 * B-020: this used to read "Ended · stop" - two pieces joined by a dot, the second being the
 * outcome's own internal key, lowercased. A full sentence instead, in the same shape the server's
 * own `howItEnded` (api/src/modules/grounds/a-ground-that-has-ended.ts) already writes: "This
 * check-in has ended." followed by the outcome in a sentence of its own. The outcome's REAL
 * wording is scenario-specific (api/src/modules/resolution/end-states.ts: "STOP" reads "The
 * project stops." for a project and "The work stops." for a drifting one) and is not served on the
 * ground yet, so `humanEndState` is a plain, generic stand-in until it is (see
 * docs/requests-to-engine.md).
 */
export function howItEnded(ground: { status?: string | null; endState?: string | null; endStateLabel?: string | null } | null | undefined): string | null {
  /* Out of time is its own badge, and it does not say "ended" - it is the one state somebody can
     still do something about, and calling it ended is why nobody tried. */
  if (hasStalled(ground?.status)) return 'Out of time'
  if (!hasEnded(ground?.status)) return null
  const label = ground?.endStateLabel ?? ground?.endState
  if (!label) return 'This check-in has ended.'
  const said = humanEndState(label)
  const sentence = said.charAt(0).toUpperCase() + said.slice(1)
  return `This check-in has ended. ${sentence.endsWith('.') ? sentence : `${sentence}.`}`
}

/**
 * END_STATE values are stored shouted, and nobody says "KEEP" out loud.
 *
 * The real, true-to-the-scenario sentence for each one lives server-side in
 * `api/src/modules/resolution/end-states.ts`, keyed by both the value and the ground's scenario
 * (the same value can mean different things - "STOP" is "The project stops." for a project and
 * "The work stops." for a drifting one). That is not served on the ground yet (request to engine),
 * so this is a plain, scenario-blind stand-in: good enough to read as a sentence, not yet as
 * precise as the server's own words for it.
 */
export function humanEndState(value: string): string {
  const said: Record<string, string> = {
    KEEP: 'the person stays in the role', RESTRUCTURE: 'the role is set up differently',
    EXIT: 'the role does not continue', EXTEND: 'the time to decide is made longer',
    RENEW: 'it is renewed', END: 'it ends', CONTINUE: 'it carries on', RESOLVED: 'it is resolved',
    AGREED: 'it is agreed', STOP: 'the work stops', COMPLETE: 'the work is complete',
    DESCOPE: 'it carries on with less in it', SEPARATE: 'the people involved go their separate ways',
    HANDED_OVER: 'the work has been handed over', SIGNED: 'it is signed', NOT_YET: 'it is not decided yet',
    ALIGNED: 'everyone now shares the same picture', ESCALATE: 'help is needed from outside the team',
  }
  return said[value] ?? value.toLowerCase().replace(/_/g, ' ')
}
