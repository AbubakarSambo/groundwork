import { useEffect, useRef, type ReactNode } from 'react'
import './gw-ui.css'

/**
 * A SMALL MENU BUTTON FOR GROUPED ACTIONS (light prototype, s71 and s72: "Share", "Views ▾",
 * "More ways to add"). The actions inside are the caller's own buttons and links, unchanged; the
 * menu only groups them. It closes when something outside it is pressed, or on Escape.
 */
export function SmallMenu({ label, ariaLabel, children, main, align = 'right' }: {
  label: string
  /** What a screen reader hears where the label is only a sign, such as "···". */
  ariaLabel?: string
  children: ReactNode
  main?: boolean
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current
      if (!el || !el.open) return
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) el.open = false
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [])
  return (
    <details ref={ref} className="gwui-menu">
      <summary aria-label={ariaLabel} className={main ? 'gwui-menu-btn gwui-menu-btn-main' : 'gwui-menu-btn'}>{label}</summary>
      <div className={align === 'left' ? 'gwui-menu-pop gwui-menu-pop-left' : 'gwui-menu-pop'}>{children}</div>
    </details>
  )
}
