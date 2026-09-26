/**
 * THE CHECK-INS A PERSON PINNED TO THE TOP OF THEIR SIDEBAR.
 *
 * KEPT IN THIS BROWSER, FOR NOW. There is no per-person preferences place in the backend outside the
 * engine, and adding a table for this is a decision for Hafsah, so the pins live in browser storage:
 * they last between visits on this computer and do not follow the person to another one.
 *
 * Kept per person (the key carries their id), so two people sharing a browser do not see each
 * other's pins. The key starts with `gw-`, so signing out sweeps it with everything else this app
 * wrote (what-signing-out-takes-with-it): nothing about one person is left for the next.
 *
 * Only ids are stored, never a name. A pin for a check-in the person can no longer see is simply
 * never drawn, because the sidebar only draws check-ins the server returned to them.
 */
const keyFor = (userId: string) => `gw-pinned-${userId}`

export function pinnedFor(userId: string | null | undefined): string[] {
  if (!userId) return []
  try {
    const raw = window.localStorage.getItem(keyFor(userId))
    const ids = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Pins it at the very top, or unpins it. Returns the new order. */
export function togglePin(userId: string | null | undefined, groundId: string, current: string[]): string[] {
  const next = current.includes(groundId) ? current.filter(x => x !== groundId) : [groundId, ...current]
  if (!userId) return next
  try {
    if (next.length) window.localStorage.setItem(keyFor(userId), JSON.stringify(next))
    else window.localStorage.removeItem(keyFor(userId))
  } catch {
    /* Storage refused: the pin holds for this visit only. */
  }
  return next
}
