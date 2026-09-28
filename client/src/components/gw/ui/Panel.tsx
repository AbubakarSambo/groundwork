import React from 'react'
import './gw-ui.css'

/**
 * PANEL (prototype: .panel, .pad, app.css).
 *
 * White, 1px `--rule` line, 12px corners, 20px top/bottom and 22px sides inside, no shadow. Pass
 * `pad={false}` for a table or list that draws its own inside spacing.
 */
export function Panel({ pad = true, children, ...rest }: {
  pad?: boolean
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...divRest } = rest
  return (
    <div className={['gwui-panel', pad && 'gwui-panel-pad', className].filter(Boolean).join(' ')} {...divRest}>
      {children}
    </div>
  )
}
