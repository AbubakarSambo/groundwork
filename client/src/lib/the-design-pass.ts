/**
 * THE DESIGN PASS SWITCH (Hafsah, 21 November 2026: "put every change behind a switch I turn on in
 * my browser in the morning").
 *
 * One source for whether this browser shows the design pass. It is off unless this browser has
 * `gw-design-pass` set to "on" in localStorage. Opening any page with `?design=on` turns it on, and
 * `?design=off` turns it off again.
 *
 * When it is on, `<html>` carries the class `design-pass`, and every style change of the pass is
 * written under `html.design-pass` in styles/the-design-pass.css. Markup or inline-style changes read
 * `theDesignPassAppliesHere()`.
 *
 * The boards never change (rule 2 of the brief): on a board page the class is taken off and
 * `theDesignPassAppliesHere()` is false, so neither the stylesheet nor any markup change can reach
 * a board, whatever it shares with the other pages.
 */

const KEY = 'gw-design-pass'
const CLASS = 'design-pass'

/** True when this browser has the design pass switched on. */
export function isTheDesignPassOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

/** The board pages, which the design pass never touches: the boards list, a check-in's board, the example boards, and the pages that are part of a board (one person on it, where a blocker started). */
export function isABoardPage(pathname: string): boolean {
  return (
    pathname === '/boards' ||
    pathname.startsWith('/boards/') ||
    pathname.startsWith('/scenario-boards') ||
    /^\/grounds\/[^/]+\/(board|person|trace)(\/|$)/.test(pathname)
  )
}

/** True when the design pass is on and this page is not a board. */
export function theDesignPassAppliesHere(pathname: string = window.location.pathname): boolean {
  return isTheDesignPassOn() && !isABoardPage(pathname)
}

/** Reads `?design=on` or `?design=off` from the address and remembers it. */
export function readTheSwitchFromTheAddress(search: string = window.location.search): void {
  const asked = new URLSearchParams(search).get('design')
  try {
    if (asked === 'on') window.localStorage.setItem(KEY, 'on')
    else if (asked === 'off') window.localStorage.removeItem(KEY)
  } catch {
    /* storage may be unavailable; the pass stays off */
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
}

/**
 * For markup and inline-style changes: true when the pass is on and the page that is open is not a
 * board. Read from the address at each render, so it needs no router around it (a part drawn in a
 * test, or outside the pages), and a page drawn after a change of page reads the new one.
 */
export function useTheDesignPass(): boolean {
  return theDesignPassAppliesHere(typeof window === 'undefined' ? '/' : window.location.pathname)
}
