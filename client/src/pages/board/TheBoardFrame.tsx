import type { ReactNode } from 'react'
import { Page, Tabs } from '@/components/gw/ui'

/** board-as-lead.txt, under the tab bar: the sentence that follows "Last updated on …". Kept for the boards not yet in the frame; the
    frame itself does not draw it (rule 6). */
export const THE_BOARD_ONLY_CHANGES = 'The board only changes when something new comes in, such as a check-in, a report, a decision or a number from another system.'

/**
 * THE BOARD'S FRAME, ON THE DESIGN SYSTEM (journey 3, Hafsah, 23 November 2026).
 *
 * One frame for every board a reader opens from the check-in's Board tab, whoever reads it and whatever kind of work it is: "Check-ins /
 * <name>" above the title, the cadence line under it, the reader's own actions at the top right, then the check-in's tabs with "Views"
 * beside them, and "Last updated on …" under the tabs (B5-the-board, board-as-lead.txt and board-as-participant.txt). It is a rebuilt
 * page (`Page` with a title), so every building block on the board below it draws the twelve rules' look.
 */
export function TheBoardFrame({ title, lede, action, tabs, views, updated, children }: {
  title: string
  /** The cadence line: "Daily on weekdays, from 4pm. Session 38 of 65. Runs until 30 September." */
  lede?: ReactNode
  /** "Your check-in" (or "Start my check-in"), "Add something" and "Ask". */
  action?: ReactNode
  tabs: { key: string; label: string; to?: string }[]
  /** "Views ▾", the other boards this reader is in, beside the tabs. */
  views?: ReactNode
  /** "Last updated on Wednesday 23 September at 6pm.", or the light board's short line with the full one behind its ⓘ. */
  updated?: ReactNode
  children: ReactNode
}) {
  return (
    <Page title={title} crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label: title }]} lede={lede} action={action}>
      <div className="ds-pair">
        <div className="ds-tabs-row">
          <Tabs label="This check-in" active="board" items={tabs} />
          {views}
        </div>
        {/* "Last updated on …" alone: the sentence after it in the prototype explains how the board works, which the screen does not
            do (design guide, rule 6; issue 40, batch 2). */}
        {updated && (typeof updated === 'string' ? <p className="ds-text-meta">{updated}</p> : updated)}
      </div>
      {children}
    </Page>
  )
}

/** The reader's actions at the top right of the board: one main button, then quiet links (rule 8). */
export function TheBoardActions({ children }: { children: ReactNode }) {
  return <div className="ds-actions">{children}</div>
}
