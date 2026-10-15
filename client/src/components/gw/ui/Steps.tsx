import type { ReactNode } from 'react'
import './gw-ui.css'

/**
 * STEPS (join-waiting.jpg, "Almost in"): a bordered list of what has happened and what has not -
 * a tick for each done step, a circle for the one still to come, 15px text. No prototype CSS
 * class matches this exactly (app.css has no `.steps`), so the values are read off the picture:
 * a white, bordered, 10px-corner panel, rows 15px, ticks in the "recommended" green.
 */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="gwui-steps">{children}</ol>
}

export function Step({ done, children }: { done?: boolean; children: ReactNode }) {
  return (
    <li className={done ? 'gwui-step gwui-step-done' : 'gwui-step'}>
      <span className="gwui-step-mark" aria-hidden>{done ? '✓' : '○'}</span>
      <span className="gwui-sr-only">{done ? 'Done. ' : 'Still to happen. '}</span>
      {children}
    </li>
  )
}
