/**
 * THE SHORT TOUR FOR SOMEBODY NEW (A1): what it says, what it points at, who is offered it, and
 * remembering that they started, skipped or finished it.
 *
 * IT POINTS ONLY AT REAL PARTS OF THE PAGE: the organisation card, "Start a check-in", the check-ins,
 * "Jump to" and the person's own menu, or on a phone the bottom bar. Never at a sample check-in, a
 * sample person or sample numbers (docs/prototype/not-to-build.md). A step whose part is not on this
 * person's screen (no "Start a check-in" for somebody who may not start one) is left out.
 *
 * No screen of the prototype shows the tour's words, so these are written plainly and listed in the
 * commit for review.
 */
export interface TourStep {
  /** Where it points, on a computer and on a phone. The first one on the screen is used. */
  targets: string[]
  says: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    targets: ['.gw-rl-org'],
    says: 'This is your organisation. Open it to see every organisation you belong to and move between them.',
  },
  {
    targets: ['.gw-rl-start .gw-b', '.gw-phone-bar-item.start'],
    says: 'Start a check-in here. You say what it is about and who is in it, and each person answers on their own.',
  },
  {
    targets: ['.gw-rl-h-link', '.gw-phone-bar-item[href="/grounds"]'],
    says: 'Your check-ins are here, with the ones that need you first. "Your turn" means a session is ready for you.',
  },
  {
    targets: ['.gw-rl-jump'],
    says: 'Choose "Jump to", or press Ctrl K, to find a check-in, a person or a page.',
  },
  {
    targets: ['.gw-rl-me', '.gw-phone-bar-item[href="/more"]'],
    says: 'Your settings, Help, "Talk to us" and signing out are here. You can take this tour again from here too.',
  },
]

/** The first of a step's targets that is actually on the screen, or none. */
export function whereItPoints(step: TourStep, doc: Document = document): HTMLElement | null {
  for (const sel of step.targets) {
    const el = doc.querySelector<HTMLElement>(sel)
    if (el && el.getClientRects().length > 0) return el
  }
  return null
}

/**
 * SOMEBODY NEW: they have not finished a single session of any check-in, and they lead none. Read
 * from the check-ins list the sidebar already has, so nothing is fetched to decide it.
 */
export function isSomebodyNew(
  list: { initiatorId?: string | null; participants?: { id: string; userId?: string | null }[]; checkIns?: { participantId: string; status: string }[] }[],
  me: string | null | undefined,
): boolean {
  if (!me) return false
  for (const g of list) {
    if (g.initiatorId === me) return false
    const mine = new Set((g.participants ?? []).filter(p => p.userId === me).map(p => p.id))
    if ((g.checkIns ?? []).some(c => c.status === 'COMPLETED' && mine.has(c.participantId))) return false
  }
  return true
}

/**
 * REMEMBERED IN THIS BROWSER, per person. There is no place in the backend for it outside the engine.
 * The key starts with `gw-`, so signing out sweeps it: somebody still new who signs in again on the
 * same computer is offered it once more, which is the kinder mistake.
 */
export type TourOutcome = 'started' | 'skipped' | 'finished'
const keyFor = (me: string) => `gw-tour-${me}`

export function tourOutcome(me: string | null | undefined): TourOutcome | null {
  if (!me) return null
  try {
    const v = window.localStorage.getItem(keyFor(me))
    return v === 'started' || v === 'skipped' || v === 'finished' ? v : null
  } catch {
    return null
  }
}

export function rememberTour(me: string | null | undefined, outcome: TourOutcome): void {
  if (!me) return
  try { window.localStorage.setItem(keyFor(me), outcome) } catch { /* shown again next time, no worse */ }
}
