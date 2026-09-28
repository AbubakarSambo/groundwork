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
  { key: 'context', label: 'Context' },
  { key: 'mywork', label: 'My work' },
  { key: 'people', label: 'People and setup' },
] as const

export type CheckInTabKey = typeof CHECK_IN_TABS[number]['key']

export function CheckInHeader({ crumbs, title, subtitle, action, active, tabHref }: {
  crumbs?: Crumb[]
  title: string
  subtitle?: string
  action?: React.ReactNode
  active: CheckInTabKey
  /** Builds the href for a tab, e.g. (key) => `/grounds/${id}/${key}`. */
  tabHref: (key: CheckInTabKey) => string
}) {
  return (
    <div>
      <PageTitle crumbs={crumbs} title={title} subtitle={subtitle} action={action} />
      <div className="gwui-cih-tabs">
        <Tabs
          active={active}
          items={CHECK_IN_TABS.map(t => ({ key: t.key, label: t.label, to: tabHref(t.key) }))}
        />
      </div>
    </div>
  )
}
