import { useEffect, useState } from 'react'

/**
 * WHETHER THIS IS BEING READ ON A PHONE, ASKED ONCE.
 *
 * Most of what a narrow screen needs is a media query, and a media query is the right tool: it
 * costs nothing, it cannot fall out of step with the render, and it changes as the window does.
 *
 * WHAT IT CANNOT DO IS CHANGE THE SHAPE OF THE DATA. A nine-column attendance grid on a 375px
 * screen is not a styling problem - there is no type size or gutter at which nine columns of
 * people-by-session fit, and the honest answer is a different arrangement of the same facts, one
 * row per person. That is a different tree, so something has to decide which tree to build.
 *
 * RENDERING BOTH AND HIDING ONE WOULD BE WORSE. Every name, every state and every heading would
 * exist twice in the document: a screen reader reads the hidden copy, a find-in-page matches it,
 * and the counts a person sees are the counts the other tree also drew.
 *
 * The breakpoint is the one number in AppShell's stylesheet. Kept in one place because two files
 * disagreeing about where a phone ends is the bug this is meant to avoid.
 */
export const A_PHONE_ENDS_AT = 640

export function useIsAPhone(): boolean {
  const [yes, setYes] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${A_PHONE_ENDS_AT}px)`).matches
      : false,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const q = window.matchMedia(`(max-width: ${A_PHONE_ENDS_AT}px)`)
    const on = () => setYes(q.matches)
    on()
    /* `addListener` is the old spelling; Safari only grew `addEventListener` here in 14. */
    if (q.addEventListener) { q.addEventListener('change', on); return () => q.removeEventListener('change', on) }
    q.addListener(on); return () => q.removeListener(on)
  }, [])
  return yes
}
