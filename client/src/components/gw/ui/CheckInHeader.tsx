import React from 'react'
import { PageTitle, type Crumb } from './PageTitle'
import { Tabs } from './Tabs'
import './gw-ui.css'

/**
 * CHECK-IN HEADER (prototype: PageTitle + .tabs, 18px below, app.css).
 *
 * Replaces `TheCheckInHeader`. The tab names come from one list here, never from the calling page
 * (design-audit.md item 3), so every check-in page shares one set of names and the underline bug
 * (every tab underlined, not just the chosen one - fixed in `Tabs`) cannot come back on just one of
 * them.
 */
export const CHECK_IN_TABS = [
  { key: 'board', label: 'Board' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'context', label: 'Context and resources' },
  { key: 'mywork', label: 'My work' },
  { key: 'people', label: 'People and setup' },
] as const

export type CheckInTabKey = typeof CHECK_IN_TABS[number]['key']

export function CheckInHeader({ crumbs, title, subtitle, action, active, tabHref, tabs, onSelectTab, trailing }: {
  crumbs?: Crumb[]
  title: string
  subtitle?: string
  action?: React.ReactNode
  active: string
  /** Builds the href for a tab, e.g. (key) => `/grounds/${id}/${key}`. Ignored when `tabs` is given. */
  tabHref?: (key: CheckInTabKey) => string
  /**
   * An override for the fixed five tabs, still in the SAME five, same order - used by a page that
   * groups its own tab-switching state (e.g. `?tab=` query keys) behind these five names, or that
   * folds other labels (Report, Sessions, What I shared) as sub-tabs inside "My work". Each entry's
   * own `to` makes it a real link (the only one that needs it is "Board", a different route);
   * without one it calls `onSelectTab(key)` instead.
   */
  tabs?: { key: string; label: string; to?: string }[]
  onSelectTab?: (key: string) => void
  /**
   * U.10 (b): drawn at the end of the tab row, in the same slot the prototype's own "Views ▾" sits
   * in - nothing in the product answers what that menu would offer, so nothing is built for it, but
   * the board's real check-in switcher (TheOtherBoardsYouAreIn, a genuine control with nowhere else
   * on the page to sit) uses this slot rather than being dropped.
   */
  trailing?: React.ReactNode
}) {
  const items = tabs ?? CHECK_IN_TABS.map(t => ({ key: t.key, label: t.label, to: tabHref ? tabHref(t.key) : undefined }))
  return (
    <div className="gwui-cih">
      <PageTitle crumbs={crumbs} title={title} subtitle={subtitle} action={action} />
      <div className={trailing ? 'gwui-cih-tabs gwui-cih-tabs-row' : 'gwui-cih-tabs'}>
        <Tabs active={active} items={items} onChange={onSelectTab} />
        {trailing && <div className="gwui-cih-trailing">{trailing}</div>}
      </div>
    </div>
  )
}
