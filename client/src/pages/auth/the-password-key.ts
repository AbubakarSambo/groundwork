/**
 * THE KEY FOR A PASSWORD CHOSEN AT SIGN-UP (U.3 review, a security fix).
 *
 * The server puts a password chosen at sign-up on the account only when the confirmation is opened
 * with the key it gave the browser that signed up. This browser keeps that key here, in its own
 * storage for this app, and hands it back when the link is opened. Opened in another browser, there
 * is no key, and the person chooses a password after confirming, as after a sign-up by link.
 *
 * Nothing here is shown on screen. A failed read or write keeps nothing, which is the safe direction:
 * the person is then asked to choose a password.
 */
const KEY = 'gw_password_key'

export function keepThePasswordKey(key: string | undefined | null) {
  try {
    if (key) localStorage.setItem(KEY, key)
  } catch { /* storage may be unavailable */ }
}

export function thePasswordKey(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function forgetThePasswordKey() {
  try { localStorage.removeItem(KEY) } catch { /* storage may be unavailable */ }
}
