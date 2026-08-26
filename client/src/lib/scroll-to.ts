/**
 * SCROLL SOMETHING INTO VIEW, AND ACTUALLY ARRIVE.
 *
 * Every "jump to it" control in this app called `scrollIntoView({ behavior: 'smooth' })` directly,
 * and in at least one real Chrome that call moves the page by exactly nothing. I hit it pressing
 * "say something about this in the chat": the page did not move, and neither did it when I called
 * scrollIntoView by hand in the console. The same element scrolled instantly and correctly with
 * `behavior` left off. No error, nothing on screen - the control simply looked dead.
 *
 * I do not know every configuration that does this. `prefers-reduced-motion` was my first guess and
 * that browser reported it as false, so the honest position is that SMOOTH IS NOT GUARANTEED and a
 * control whose whole job is to take you somewhere must not depend on it.
 *
 * So the animation is a request and the arrival is a promise. Ask for smooth; if the page has not
 * begun moving shortly after, jump. A browser that animates properly is already moving by then and
 * the fallback sees the change and stays out of the way.
 */

/** Long enough for a real smooth scroll to have visibly started, short enough not to be seen. */
const GIVE_SMOOTH_THIS_LONG_MS = 120

function scrollerFor(el: Element): Element | Window {
  let p = el.parentElement
  while (p) {
    const oy = getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p
    p = p.parentElement
  }
  return window
}

function positionOf(s: Element | Window): number {
  return s === window ? (s as Window).scrollY : (s as Element).scrollTop
}

export function scrollTo(
  el: Element | null | undefined,
  opts: { block?: ScrollLogicalPosition; inline?: ScrollLogicalPosition } = {},
) {
  // One call site guarded this with `?.` and I dropped the guard when the call moved in here, which
  // threw out of a ref callback and took a whole page down with it. Not every environment that hands
  // you an element hands you a scrollable one; scrolling is a nicety and must never be fatal.
  if (!el || typeof el.scrollIntoView !== 'function') return
  const block = opts.block ?? 'center'
  const inline = opts.inline

  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const go = (behavior: ScrollBehavior) =>
    el.scrollIntoView({ behavior, block, ...(inline ? { inline } : {}) })

  // Somebody who has asked for less motion gets the jump, and gets it immediately.
  if (reduce) return go('auto')

  const scroller = scrollerFor(el)
  const before = positionOf(scroller)
  go('smooth')

  // Already where it needs to be. Nothing to fall back to, and no timer worth leaving running.
  if (el.getBoundingClientRect().top >= 0 && el.getBoundingClientRect().bottom <= window.innerHeight) return

  setTimeout(() => {
    if (positionOf(scroller) === before) go('auto')
  }, GIVE_SMOOTH_THIS_LONG_MS)
}

/** Same, for the id form, which is how most callers reach for it. */
export function scrollToId(id: string, block: ScrollLogicalPosition = 'center') {
  scrollTo(document.getElementById(id), { block })
}
