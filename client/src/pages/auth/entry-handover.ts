/**
 * WHAT THE ENTRY FLOW HANDS TO WHICHEVER SIGN-IN THE PERSON PICKS. W14-11.
 *
 * The entry flow builds a whole ground before anybody has an account, so the finished thing lives in
 * this browser until a sign-in completes. There were two sign-ins and each read its own key:
 *
 *   magic link  -> `gw_commit_payload`, plus history merged from `gw_entry_session`
 *   Google      -> `gw_entry_pending_commit`, a snapshot taken at the moment they clicked Google
 *
 * `EntryChatPage` keeps `gw_commit_payload` in sync as the person keeps editing - adding people,
 * changing the date. It never updates the Google snapshot. So somebody who clicked Google, came back,
 * and had made any change since committed a ground missing those changes.
 *
 * And the Google path deleted its key BEFORE attempting the commit, so a failed request took the
 * setup with it. That is the ground going missing after sign-in: not lost on the server, deleted in
 * the browser by the code meant to save it.
 *
 * One loader now, preferring the key that is kept current, and nothing is cleared until a ground
 * actually exists.
 */
const COMMIT_KEY = 'gw_commit_payload'
const SESSION_KEY = 'gw_entry_session'
const GOOGLE_KEY = 'gw_entry_pending_commit'
/**
 * WHICH SETUP THIS IS (U.6 review). One key per setup, kept while it is being set up and saved, so a
 * retried save is known as the same setup; gone once its check-in exists, so the next setup has its
 * own. The server tells a replay from a second check-in by this, never by the name.
 */
export const SETUP_KEY = 'gw_setup_key'
export function theSetupKey(): string {
  try {
    const had = localStorage.getItem(SETUP_KEY)
    if (had) return had
    const made = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SETUP_KEY, made)
    return made
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export function loadEntryHandover(): any | null {
  try {
    /** The live one first. The Google snapshot is a fallback for the case where it is all there is. */
    const raw = localStorage.getItem(COMMIT_KEY)
    let payload: any = raw ? JSON.parse(raw) : null

    if (!payload) {
      const googleRaw = localStorage.getItem(GOOGLE_KEY)
      if (googleRaw) {
        const snap = JSON.parse(googleRaw)
        payload = snap?.payload ? { ...snap.payload, history: snap.history } : null
      }
    }
    if (!payload) return null

    /** History is stored apart from the payload, and merged only here. */
    if (!payload.history?.length) {
      const sessionRaw = localStorage.getItem(SESSION_KEY)
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw)
        if (session?.history?.length) {
          payload.history = session.history
          if (!payload.scenario && session.scenario) payload.scenario = session.scenario
        }
      }
    }
    /** The lead path legitimately has no session at all, and commit requires an array. */
    if (!Array.isArray(payload.history)) payload.history = []
    return payload
  } catch {
    return null
  }
}

/**
 * A SETUP STARTED ON THIS DEVICE AND NOT SAVED (Hafsah's blocker, 31 October 2026: "nothing anyone says in setup is ever lost").
 * Round 3's clinic, family business and field programme leads each told the setup about their team, left it before saving, and came
 * back to Today, which had nothing to finish: the setup was still here, under the key /start restores from, and nothing led back to
 * it. This reads the same record /start restores, so Today can lead back to it. `theirWords` is how they began it, in their words.
 */
export function anUnfinishedSetup(): { theirWords: string | null } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    const theySaid = (turns: unknown) => Array.isArray(turns) && turns.some((t: any) => t?.role === 'user' && String(t?.content ?? '').trim())
    const initial = typeof s?.onboardingSelections?.initial === 'string' ? s.onboardingSelections.initial.trim() : ''
    if (!theySaid(s?.onboardingHistory) && !theySaid(s?.history) && !initial) return null
    return { theirWords: initial ? initial.replace(/[.!?\s]+$/, '') : null }
  } catch {
    return null
  }
}

/** Called only once a ground exists. Before that, every one of these is the only copy. */
export function clearEntryHandover() {
  for (const k of [COMMIT_KEY, SESSION_KEY, GOOGLE_KEY, 'gw_draft_token', SETUP_KEY]) {
    localStorage.removeItem(k)
  }
}
