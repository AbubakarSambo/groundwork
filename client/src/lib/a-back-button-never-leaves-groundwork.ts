import { useLocation, useNavigate } from 'react-router-dom'

/**
 * B-126: "BACK" MUST NEVER LEAVE GROUNDWORK. `/talk-to-us`, `/billing/checkout` and the refused
 * session report's "Back" each called `navigate(-1)` (or `window.history.back()`) with no fallback.
 * Opened from a link in an email or a new tab, there is no history inside the app to go back to, and
 * the call falls through to the browser - the page before Groundwork ever loaded, which is often
 * `about:blank` (a fresh tab starts there, and loading a URL into it can still leave that as the one
 * entry behind the real page).
 *
 * `window.history.length` cannot tell the difference: a brand new tab's `about:blank` counts towards
 * it before the app has navigated anywhere of its own, so a tab opened once from an email link can
 * read `length > 1` and still have nowhere real to go back to - checked in the browser, not assumed.
 * React Router's own `location.key` is the honest signal instead: it is the literal string
 * `'default'` for the very first location the SPA renders in a session, and a real, router-generated
 * key for every location reached by navigating within the app after that - exactly "has this app, on
 * this tab, gone anywhere before this page", which is what "Back" is actually promising.
 *
 * This goes back within Groundwork when the SPA itself has somewhere to go back to, and otherwise to
 * a named fallback. The label changes with it, so the button never promises a "back" that cannot
 * happen: plain "Back" when real in-app history exists, the fallback's own name ("Back to Today",
 * "Back to your check-ins") when it does not.
 */
export function useBackOrFallback(fallbackTo: string, fallbackLabel: string): { onClick: () => void; label: string } {
  const navigate = useNavigate()
  const location = useLocation()
  const hasInAppHistory = location.key !== 'default'
  return {
    onClick: () => (hasInAppHistory ? navigate(-1) : navigate(fallbackTo)),
    label: hasInAppHistory ? 'Back' : fallbackLabel,
  }
}
