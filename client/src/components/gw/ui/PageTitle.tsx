import React from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import './gw-ui.css'

/**
 * PAGE TITLE (prototype: .t-title, .crumb, .t-small, an avatar at 56px, app.css).
 *
 * An optional line above (14.5px, muted), an optional crumb (14px muted, its links navy and
 * underlined, "/" between with 6px either side), the title in Literata 30px (24 on a phone), an
 * optional avatar to its left (56px), an optional 16px line under it (muted by default; the
 * invitation's hand-off screens - "Almost in", "Out of time", "This link has expired" - read it in
 * ink instead, as the prototype has it: `subtitleTone="ink"`), and an optional primary button on
 * the right, lined up with the bottom of the title.
 */
export type Crumb = { label: string; to?: string }

export function PageTitle({ eyebrow, crumbs, title, avatarInitials, subtitle, subtitleTone = 'muted', action }: {
  /** The line above the title, e.g. the organisation's name. */
  eyebrow?: string
  /** e.g. [{ label: 'People', to: '/org/members' }, { label: 'Miriam Wanjiku' }]. */
  crumbs?: Crumb[]
  title: string
  /** Shows a 56px avatar to the left of the title when given. */
  avatarInitials?: string
  subtitle?: string
  /** 'ink' for the prototype's darker line under "Almost in", "Out of time" and expired-link. */
  subtitleTone?: 'muted' | 'ink'
  action?: React.ReactNode
}) {
  return (
    <div>
      {eyebrow && <p className="gwui-pt-eyebrow">{eyebrow}</p>}
      {crumbs && crumbs.length > 0 && (
        <nav className="gwui-pt-crumb" aria-label="Where you are">
          {crumbs.map((c, i) => (
            <React.Fragment key={c.label}>
              {i > 0 && <span className="gwui-pt-sep" aria-hidden>/</span>}
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="gwui-pt-row">
        <div className="gwui-pt-head">
          {avatarInitials && <Avatar initials={avatarInitials} size={56} />}
          <h1 className="gwui-pt-title">{title}</h1>
        </div>
        {action}
      </div>
      {subtitle && <p className={subtitleTone === 'ink' ? 'gwui-pt-sub gwui-pt-sub-ink' : 'gwui-pt-sub'}>{subtitle}</p>}
    </div>
  )
}
