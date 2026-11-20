import React from 'react'
import { CheckInHeader, Button, Stack, UpdatedLine } from '@/components/gw/ui'

/**
 * THE PAGE FRAME OF A SCENARIO BOARD (the part every example board in docs/prototype/screens/G1-example-check-ins/ shares):
 * the breadcrumb, the title, the one-line subtitle, the "Your check-in" button, the five tabs with Board chosen, the
 * "Last updated" sentence and the lead's own aim line. A board supplies only its sections as `children`.
 * The prototype's sidebar is not part of the board and is not drawn here.
 */
export function ScenarioBoardFrame({ title, subtitle, updated, aim, leadName, children }: {
  title: string
  subtitle: string
  /** The prototype's full "Last updated on ..." sentence, said as it is. */
  updated: string
  /** The line under it that names the aim, where the prototype has one. */
  aim?: string
  /** Who the board is read as; the prototype's lead. */
  leadName: string
  children: React.ReactNode
}) {
  return (
    <div className="main" data-scenario-board>
      <p className="t-small mut" data-scenario-who>Sample data. Read as {leadName}, who leads this check-in.</p>
      <CheckInHeader
        crumbs={[{ label: 'Check-ins', to: '/scenario-boards' }, { label: title }]}
        title={title}
        subtitle={subtitle}
        action={<Button kind="primary">Your check-in</Button>}
        active="board"
        tabs={[
          { key: 'board', label: 'Board' },
          { key: 'checkin', label: 'Check-in' },
          { key: 'references', label: 'References and resources' },
          { key: 'mywork', label: 'My work' },
          { key: 'people', label: 'People and setup' },
        ]}
      />
      <Stack gap={30}>
        <UpdatedLine short={null} full={updated} />
        {aim && <p className="t-body">{aim}</p>}
        {children}
      </Stack>
    </div>
  )
}
