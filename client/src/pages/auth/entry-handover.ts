import { useQuery } from '@tanstack/react-query'
import { entryApi } from '@/api/entry'
import { useAuthStore } from '@/stores/auth'
import { queryClient } from '@/lib/queryClient'

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
 * A SETUP NOT SAVED YET, KEPT ON THIS DEVICE AND, FOR A SIGNED-IN LEAD, ON THE SERVER (Hafsah's blocker, 31 October 2026: "nothing
 * anyone says in setup is ever lost").
 *
 * The setup page writes its whole record here every time it keeps it. It lived only on the device, so a lead who came back on a phone,
 * or after signing out, or on a device somebody else had used, started again with nothing they had said (round 5: the field lead's
 * "Carry on" opened a setup with only its first question). For a signed-in lead the same record now goes to the server as well, in
 * order, and the server's copy is the one Today and Check-ins read.
 */
let theServerCopy: Promise<unknown> = Promise.resolve()

function signedIn(): boolean {
  try { return !!useAuthStore.getState?.()?.isAuthenticated } catch { return false }
}

export function keepTheSetup(record: Record<string, unknown>) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(record)) } catch { /* the server copy still keeps it */ }
  if (!signedIn()) return
  theServerCopy = theServerCopy.then(() => entryApi.keepUnfinished(record)).catch(() => undefined)
}

/** Settles once every copy sent to the server has landed, so a save never races a copy of the setup it is saving. */
export function theSetupIsKept(): Promise<unknown> {
  return theServerCopy
}

/** "Start over" and "Start a new one": the setup is thrown away here and on the server, on purpose. */
export function throwTheSetupAway() {
  try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(SETUP_KEY) } catch { /* */ }
  if (!signedIn()) return
  theServerCopy = theServerCopy.then(() => entryApi.keepUnfinished(null)).catch(() => undefined)
}

/**
 * WHAT TODAY AND CHECK-INS SAY ABOUT IT: a setup with something said in it, and the words it began with. `theirWords` is how they
 * began it, in their words.
 */
export function anUnfinishedSetup(s: any): { theirWords: string | null } | null {
  if (!s || typeof s !== 'object') return null
  const theySaid = (turns: unknown) => Array.isArray(turns) && turns.some((t: any) => t?.role === 'user' && String(t?.content ?? '').trim())
  const initial = typeof s?.onboardingSelections?.initial === 'string' ? s.onboardingSelections.initial.trim() : ''
  if (!theySaid(s?.onboardingHistory) && !theySaid(s?.history) && !initial) return null
  return { theirWords: initial ? initial.replace(/[.!?\s]+$/, '') : null }
}

/**
 * THE ONE READER FOR TODAY AND CHECK-INS (round 5: Today said "Finish setting up" while Check-ins said "No check-ins yet", and the field
 * lead went round the two for twenty steps). The server's copy, put back on this device so "Carry on" opens it on /start as it was left;
 * this device's own copy only when the server cannot be reached.
 */
export function useAnUnfinishedSetup(): { theirWords: string | null } | null {
  const isSignedIn = useAuthStore((st: any) => !!st?.isAuthenticated)
  const { data } = useQuery({
    queryKey: ['unfinished-setup'],
    enabled: isSignedIn,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const setup = await entryApi.unfinished()
        if (setup) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(setup)) } catch { /* */ } }
        return setup ?? null
      } catch {
        try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
      }
    },
  })
  return anUnfinishedSetup(data)
}

/** What Today and Check-ins say, in one place. */
export const finishSettingUp = (u: { theirWords: string | null }) =>
  u.theirWords ? `Finish setting up “${u.theirWords}”` : 'Finish setting up your check-in'
export const EVERYTHING_YOU_SAID_IS_KEPT = 'Everything you said is kept, and it opens where you left off.'

/** Called only once a ground exists. Before that, every one of these is the only copy. */
export function clearEntryHandover() {
  for (const k of [COMMIT_KEY, SESSION_KEY, GOOGLE_KEY, 'gw_draft_token', SETUP_KEY]) {
    localStorage.removeItem(k)
  }
  /* The server emptied its copy when the check-in was made; what Today and Check-ins read is read again. */
  queryClient.invalidateQueries({ queryKey: ['unfinished-setup'] })
}
