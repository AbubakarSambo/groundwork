import { useEffect, useRef, type ReactNode } from 'react'

/**
 * THE REST OF THE BOARD, FOLDED UNDER ITS OWN HEADINGS (Hafsah, 24 October 2026: "make Grace's board as short as the prototype's ...
 * the headline, What needs you, What's closing and the team on the first screen, and everything else folded under clear headings").
 *
 * Layout only: every section below keeps its own heading, note and words. Each starts folded, showing its heading row alone; pressing
 * the heading (or Enter or Space on it) opens it. A section that draws nothing takes no room.
 */
export function FoldTheRest({ children, startOpen = import.meta.env.MODE === 'test' }: { children: ReactNode; /** Open from the start: the specs that read every section's words; the screen starts folded. */ startOpen?: boolean }) {
  const at = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const root = at.current
    if (!root) return
    /* Only the board's own sections, never a section drawn inside one of them. */
    const heads = [...root.querySelectorAll<HTMLElement>(':scope section.gwui-section > .gwui-section-h')].filter((h) => !h.parentElement?.parentElement?.closest('section.gwui-section'))
    const off: (() => void)[] = []
    for (const h of heads) {
      const section = h.parentElement as HTMLElement
      if (section.dataset.folded === 'ready') continue
      section.dataset.folded = 'ready'
      section.classList.add('pb-fold')
      h.setAttribute('role', 'button')
      h.setAttribute('tabindex', '0')
      if (startOpen) section.classList.add('pb-fold-open')
      h.setAttribute('aria-expanded', String(startOpen))
      const toggle = (e: Event) => {
        /* A link or a button inside the heading row does its own job. */
        if ((e.target as HTMLElement).closest('a, button')) return
        const open = section.classList.toggle('pb-fold-open')
        h.setAttribute('aria-expanded', String(open))
      }
      const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e) } }
      h.addEventListener('click', toggle)
      h.addEventListener('keydown', key)
      off.push(() => { h.removeEventListener('click', toggle); h.removeEventListener('keydown', key) })
    }
    return () => off.forEach((f) => f())
  })
  return <div ref={at} className="pb-fold-the-rest">{children}</div>
}
