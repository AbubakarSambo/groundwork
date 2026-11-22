import type { ReactNode } from 'react'
import { useTheDesignPass } from '../../../lib/the-design-pass'

/**
 * THE DESIGN PASS (21 November 2026): with the pass on, the cards inside this wrapper are drawn as hairline sections, not boxes
 * inside the page's sections (`.dp-flat` in styles/the-design-pass.css). With it off, nothing wraps the page at all, so it draws
 * exactly as before. Used by You and one person's page.
 */
export function FlatWithThePass({ children }: { children: ReactNode }) {
  return useTheDesignPass() ? <div className="dp-flat">{children}</div> : <>{children}</>
}
