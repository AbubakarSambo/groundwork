import React from 'react'
import './gw-ui.css'

/**
 * GREETING (prototype: .t-greet, app.css line 12) - Today's own heading, bigger than `PageTitle`'s
 * `.t-title` (Today, C1, U.5 group 2): "Morning, Wairimu", then the day and what needs saying today
 * as one plain line under it. Literata, clamp(30px, 4vw, 38px), 500 weight.
 */
export function Greeting({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div className="gwui-greet-block">
      <h1 className="gwui-greet">{title}</h1>
      <p className="gwui-greet-sub">{subtitle}</p>
    </div>
  )
}
