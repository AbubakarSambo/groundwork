import type { ReactNode } from 'react'
import './gw-ui.css'

/**
 * "WHAT NEEDS YOU" ROWS (light prototype, s56): what it is, where it came from, an optional "Why"
 * that opens the quote, the main button filled and the others quiet. The buttons are the caller's
 * own, so what a button does never changes here; only how loud it is.
 */
export function NeedsYouRow({ what, from, why, main, others }: {
  what: string
  from?: string | null
  why?: string | null
  main?: ReactNode
  others?: ReactNode
}) {
  return (
    <div className="gwui-need">
      <div className="gwui-need-main">
        <div className="gwui-need-what">{what}</div>
        {from && <div className="gwui-need-from">{from}</div>}
        {why && (
          <details className="gwui-need-why">
            <summary>Why</summary>
            <div className="gwui-need-quote">{why}</div>
          </details>
        )}
      </div>
      {(main || others) && (
        <div className="gwui-need-btns">
          {main && <span className="gwui-need-btn-main">{main}</span>}
          {others && <span className="gwui-need-btn-quiet">{others}</span>}
        </div>
      )}
    </div>
  )
}

export function NeedsYouList({ children }: { children: ReactNode }) {
  return <div className="gwui-needs">{children}</div>
}
