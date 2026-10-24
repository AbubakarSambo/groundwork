import React from 'react'
import './gw-ui.css'

/**
 * GREETING (prototype: .t-greet, app.css line 12) - Today's own heading, bigger than `PageTitle`'s
 * `.t-title` (Today, C1, U.5 group 2): "Morning, Wairimu", then the day and what needs saying today
 * as one plain line under it. Literata, clamp(30px, 4vw, 38px), 500 weight.
 */
export function Greeting({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h1 className="t-greet">{title}</h1>
      <p className="t-body mut" style={{ fontSize: 18 }}>{subtitle}</p>
    </header>
  )
}
