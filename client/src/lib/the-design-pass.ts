import { useAuthStore } from '@/stores/auth'

/**
 * THE DESIGN PASS SWITCH (Hafsah, 21 November 2026: "put every change behind a switch I turn on in
 * my browser in the morning"; 22 November: a setting per organisation, on for every organisation).
 *
 * One source for whether this browser shows the design pass. It is off unless this browser has
 * `gw-design-pass` set to "on" in localStorage. Opening any page with `?design=on` turns it on, and
 * `?design=off` turns it off again.
 *
 * When it is on, `<html>` carries the class `design-pass`, and every style change of the pass is
 * written under `html.design-pass` in styles/the-design-pass.css. Markup or inline-style changes read
 * `theDesignPassAppliesHere()`.
 *
 * The boards are part of it (Hafsah, 21 November, afternoon: "ensure the boards and board content
 * match the prototype 100%", behind this switch). Until then the boards were kept out of it, which
 * is why the morning's pass could not reach them. With the switch off, every page, boards included,
 * is exactly as it was.
 */

const KEY = 'gw-design-pass'
const CLASS = 'design-pass'

/**
 * THE ORGANISATION DECIDES, AND A BROWSER MAY OVERRIDE IT FOR TESTING (Hafsah, 22 November 2026: "everything build should be switched
 * on"). The one reader of whether the design pass is on:
 *  1. `?design=on` or `?design=off`, remembered by this browser, wins, so a tester can see either;
 *  2. otherwise the organisation's setting, served with the session (`designPassOn`, on for every organisation unless staff turn it
 *     off in Admin);
 *  3. otherwise, with nobody signed in yet, WHEN_NOTHING_IS_KNOWN.
 */
export const WHEN_NOTHING_IS_KNOWN = false

/** What this browser was told by the address: 'on', 'off', or nothing. */
function thisBrowsersOverride(): 'on' | 'off' | null {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'on' || v === 'off' ? v : null
  } catch {
    return null
  }
}

/** The organisation's setting, from the signed-in session as this browser keeps it; null when nobody is signed in. */
function theOrganisationsSetting(): boolean | null {
  /* A part drawn on its own, with a store that only selects, has no session to read. */
  const served = useAuthStore.getState?.()?.user?.designPassOn
  return typeof served === 'boolean' ? served : null
}

/** True when the design pass is on for this browser, by the order above. */
export function isTheDesignPassOn(): boolean {
  const override = thisBrowsersOverride()
  if (override) return override === 'on'
  return theOrganisationsSetting() ?? WHEN_NOTHING_IS_KNOWN
}

/** True when the design pass is on. The page is still asked for, so a caller can say which page it means. */
export function theDesignPassAppliesHere(_pathname: string = window.location.pathname): boolean {
  return isTheDesignPassOn()
}

/** Reads `?design=on` or `?design=off` from the address and remembers it, as this browser's override. */
export function readTheSwitchFromTheAddress(search: string = window.location.search): void {
  const asked = new URLSearchParams(search).get('design')
  try {
    if (asked === 'on' || asked === 'off') window.localStorage.setItem(KEY, asked)
  } catch {
    /* storage may be unavailable; the organisation's setting stands */
  }
}

/** Puts the class on `<html>`, or takes it off, for the page that is open. */
export function applyTheDesignPass(pathname: string = window.location.pathname): void {
  document.documentElement.classList.toggle(CLASS, theDesignPassAppliesHere(pathname))
}

/** On start: read the address, then set the class. */
export function startTheDesignPass(): void {
  readTheSwitchFromTheAddress()
  applyTheDesignPass()
  /* The session arrives, changes or ends after the page starts: the class follows the organisation's setting as it is served. */
  useAuthStore.subscribe(() => applyTheDesignPass())
}

/**
 * For markup and inline-style changes: true when the pass is on. Read from the address at each render, so it needs no router around it (a part drawn in a
 * test, or outside the pages), and a page drawn after a change of page reads the new one.
 */
export function useTheDesignPass(): boolean {
  return theDesignPassAppliesHere(typeof window === 'undefined' ? '/' : window.location.pathname)
}
