import React from 'react'
import './gw-ui.css'

/**
 * TOAST (prototype: .toast, app.css). Ink fill, white 15px text, 12px top/bottom and 18px sides
 * inside, 10px corners, centred at the bottom, 90px up. The `sonner` library can stay in use where
 * it is already styled to these values; this is the part for anywhere that is not.
 */
export function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="gwui-toast" role="status" aria-live="polite">
      {children}
    </div>
  )
}
