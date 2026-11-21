/**
 * WHAT SIGNING OUT TAKES WITH IT.
 *
 * `logout()` removed the token and left everything else the app had written: a live draft bearer
 * token accepted by PATCH /entry/draft, a commit payload and a new-ground draft both carrying
 * colleagues' addresses, an invite token, the address the magic link was sent to. On a shared
 * machine the next person inherited all of it (fix plan B15).
 *
 * The rule is the inverse of an allowlist: every key this app writes starts with `gw_` or `gw-`,
 * and signing out removes all of them from both storages except the few that are deliberately
 * about the browser rather than the person. A new key is swept without anybody registering it; a
 * key that should survive has to be named here, with its reason.
 */

/** Keys about this browser, not about whoever was signed in. */
export const WHAT_STAYS: ReadonlySet<string> = new Set([
  /* Where somebody dragged the feedback button to. Layout, not identity. */
  'gw-feedback-button-position',
  /* The home page's first-run walkthrough state. Seen once per browser, not per person. */
  'gw-ob-v2',
  /* Whether this browser shows the design pass (lib/the-design-pass.ts). A setting of the browser, not of a person. */
  'gw-design-pass',
])

/** The one key that is not prefixed: the bearer token itself. */
const THE_TOKEN = 'token'

export const OURS = /^gw[-_]/

function sweep(storage: Storage | undefined) {
  if (!storage) return
  const doomed: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key === null) continue
    if (key === THE_TOKEN || (OURS.test(key) && !WHAT_STAYS.has(key))) doomed.push(key)
  }
  for (const key of doomed) storage.removeItem(key)
}

export function takeItAllWithYou(): void {
  try { sweep(window.localStorage) } catch { /* storage may be unavailable */ }
  try { sweep(window.sessionStorage) } catch { /* storage may be unavailable */ }
}
