/**
 * THE CHECK-INS A PERSON OPENED MOST RECENTLY, ON THIS DEVICE.
 *
 * HAFSAH'S FAULT 4: with a hundred check-ins, the sidebar listed every one of them, which nobody
 * can use. What belongs there instead is the ones that need the person now (the rail's own
 * `railAttention`, unchanged), then the ones they went looking at most recently - the two things a
 * person actually comes back for.
 *
 * KEPT IN THIS BROWSER, FOR NOW, THE SAME WAY A PIN IS (see pinned-check-ins.ts): there is no
 * per-person preferences place in the backend outside the engine, so this lives in browser storage
 * and does not follow a person to another device. Per person, so two people sharing a browser never
 * see each other's history; starts with `gw-`, so signing out sweeps it (what-signing-out-takes-
 * with-it). Only ids are stored, never a name or anything written in the check-in.
 *
 * Browser storage can be missing or refuse (a private window, blocked site data, a quota error):
 * every read and write below is wrapped, and a blocked store simply means nothing is remembered as
 * "recent" - the sidebar still shows whatever needs the person now.
 */
const MOST_REMEMBERED = 20
const keyFor = (userId: string) => `gw-recent-${userId}`

export function recentlyOpenedFor(userId: string | null | undefined): string[] {
  if (!userId) return []
  try {
    const raw = window.localStorage.getItem(keyFor(userId))
    const ids = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Records that this check-in was just opened, most recent first, with no repeats. */
export function rememberOpened(userId: string | null | undefined, groundId: string): string[] {
  const current = recentlyOpenedFor(userId)
  const next = [groundId, ...current.filter((id) => id !== groundId)].slice(0, MOST_REMEMBERED)
  if (!userId) return next
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(next))
  } catch {
    /* Storage refused: this visit is simply not remembered. */
  }
  return next
}
