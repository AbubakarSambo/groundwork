import React from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import { useTheDesignPass } from '../../../lib/the-design-pass'
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
 *
 * THE SUBTITLE SITS IN THE SAME COLUMN AS THE TITLE, BESIDE THE AVATAR (one-person.txt, a picture
 * check at 1440px against one-proto-0.png): "miriam@baridi.co.ke" sits directly under "Miriam
 * Wanjiku", both to the right of her avatar - not as a full-width line starting at the page's own
 * left edge, under the avatar. So the subtitle is nested inside the same head block as the title,
 * next to the avatar, rather than sitting after the whole title row.
 */
export type Crumb = { label: string; to?: string }

export function PageTitle({ eyebrow, crumbs, title, avatarInitials, subtitle: givenSubtitle, explains, subtitleTone = 'muted', subtitleRole, meta, action, center, updated }: {
  /** The line above the title, e.g. the organisation's name. */
  eyebrow?: string
  /** e.g. [{ label: 'People', to: '/org/members' }, { label: 'Miriam Wanjiku' }]. */
  crumbs?: Crumb[]
  /**
   * Left out entirely (group 3 drift list, piece 1) for the one status line shown alone while
   * something loads - MagicVerifyPage's "Confirming your email…", JoinPage's "Loading…" - which has
   * no heading at all, only the subtitle's own muted sentence.
   */
  title?: string
  /** Shows a 56px avatar to the left of the title when given. */
  avatarInitials?: string
  /**
   * A plain string in nearly every caller; `React.ReactNode` too (group 3, piece 1, sign-in and
   * joining) for the few screens that name an address inside the sentence - "We'll send sign-in
   * links and reports to **wairimu@baridi.co.ke**." - and need the address itself bold.
   */
  subtitle?: React.ReactNode
  /**
   * The subtitle explains the page or the tool rather than saying a fact ("Ready-made tools for other kinds of team work..."). With
   * the design pass on, such a line is not drawn (guide, section 3: "No explaining the tool").
   */
  explains?: boolean
  /** 'ink' for the prototype's darker line under "Almost in", "Out of time" and expired-link. */
  subtitleTone?: 'muted' | 'ink'
  /** `'status'` so a screen reader announces the subtitle as it arrives, for a title-less loading line. */
  subtitleRole?: 'status'
  /**
   * THE ONE LINE THAT DESCRIBES THIS PAGE'S HEADER (a status, how far along it is): small, muted, in the title's own column, 6px under
   * the subtitle. It is part of the header, so it is never a child of the page's stack and never gets a section's gap above it.
   */
  meta?: React.ReactNode
  action?: React.ReactNode
  /** Centred, with no title and no avatar - the same title-less loading line above. */
  center?: boolean
  /** A board's "Last updated on …" line: small, muted, on the title's own row (beside it, or directly under it on a phone with no gap). */
  updated?: string
}) {
  const designPass = useTheDesignPass()
  const subtitle = explains && designPass ? undefined : givenSubtitle
  /* The prototype's page head: the crumb (.crumb), then the title (.t-title) with its lines under it and the page's
     actions at the right, as on the reports and the board. */
  return (
    <div className={center ? 'gwui-title-centre' : undefined}>
      {eyebrow && <p className="t-small mut gw-pt-eyebrow">{eyebrow}</p>}
      {crumbs && crumbs.length > 0 && (
        <nav className="crumb" aria-label="Where you are">
          {crumbs.map((c, i) => (
            <React.Fragment key={c.label}>
              {i > 0 && <span aria-hidden>/</span>}
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="gw-pt-row">
        <div className="gw-pt-head">
          {avatarInitials !== undefined && <Avatar initials={avatarInitials} size={56} />}
          <div className="gw-min0">
            {title && (updated
              ? <div className="gw-pt-titleline"><h1 className="t-title">{title}</h1><p className="gw-pt-updated">{updated}</p></div>
              : <h1 className="t-title">{title}</h1>)}
            {subtitle && (
              <p className={subtitleTone === 'ink' ? 't-body gw-pt-sub' : 't-body mut gw-pt-sub'} role={subtitleRole}>
                {subtitle}
              </p>
            )}
            {meta && <p className="t-small mut gw-pt-meta gw-line">{meta}</p>}
          </div>
        </div>
        {action}
      </div>
    </div>
  )
}
