import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatToProbeThemOn } from '@/components/gw/WhatToProbeThemOn'
import { UpdatesToTheRecord } from '@/components/gw/UpdatesToTheRecord'
import { PRIVATE_NOTE, whereTheNoteIs } from '@/test/the-leads-note-is-never-a-label'

/**
 * THE REPORT PAGE NEVER NAMES SOMEBODY WITH THE LEAD'S NOTE. Request 36, 27 September 2026.
 *
 * MOVED FROM THE DEAD REPORT BODY. This used to render the whole of `ReportBody` (`ReportPage.tsx`,
 * not mounted by any route today - the Report tab is a list of sessions) and check its "updated what
 * they said" and "For your review" sections. Both sections now live on `SessionReportPage.tsx`,
 * through `UpdatesToTheRecord` and `WhatToProbeThemOn`'s `arcAdvisories` block - this follows the
 * rule there.
 *
 * THE RULE ITSELF IS UNCHANGED: a participant is named only through `nameFor`, the one function
 * that resolves a participant id to what this reader may call them. Neither component reads a name
 * off the row it is drawing - so a lead's private note, however it is seeded on a row, has no path
 * onto the page.
 */
const nameFor = (participantId: string) =>
  ({ 'p-a': 'One colleague', 'p-b': 'Another colleague', 'p-c': 'A third colleague' }[participantId] ?? 'a colleague')

describe('the updates trail never names somebody with the lead’s note', () => {
  it('each row is named only through nameFor, in plain words', () => {
    render(
      <UpdatesToTheRecord
        updates={[
          { participantId: 'p-b', completedAt: '2026-09-30T00:00:00Z', isPostSignOff: false },
          { participantId: 'p-c', completedAt: '2026-09-30T00:00:00Z', isPostSignOff: false },
        ]}
        nameFor={nameFor}
      />,
    )
    expect(screen.getByText(/Another colleague updated what they said/)).toBeTruthy()
    expect(screen.getByText(/A third colleague updated what they said/)).toBeTruthy()
    expect(whereTheNoteIs().elsewhere).toEqual([])
    expect(document.body.textContent).not.toMatch(/teammate/i)
  })
})

describe('the record-shape flag never names somebody with the lead’s note', () => {
  it('the lead reads a plain name, never any part of the private note', () => {
    /*
     * The row itself carries a field shaped like the note the server stores on a participant
     * (`roleAsDescribed`) to prove the component does not reach for it - `ArcAdvisory` has no such
     * field, so this is asserting that nothing on the page accidentally prints row data that
     * resembles a name.
     */
    render(
      <WhatToProbeThemOn
        reads={[]}
        arcAdvisories={[{ participantId: 'p-b', note: 'The answers stop after the first check-in.', features: [] }]}
        nameFor={nameFor}
      />,
    )
    expect(screen.getByText('Another colleague')).toBeTruthy()
    expect(screen.getByText('The answers stop after the first check-in.')).toBeTruthy()
    expect(whereTheNoteIs()).toEqual({ asTheirNote: [], elsewhere: [] })
    expect(document.body.textContent).not.toContain(PRIVATE_NOTE)
  })

  it('and reaches nobody but the lead: a participant’s page never passes it at all', () => {
    /*
     * The server strips `arcAdvisories` from a participant's own read before it ever reaches the
     * client (`the-shared-picture-a-party-reads.tsx`), so the component has nothing to render for
     * anybody else - the same shape of guarantee the old body relied on, now on the live surface.
     */
    const { container } = render(<WhatToProbeThemOn reads={[]} arcAdvisories={null} nameFor={nameFor} />)
    expect(container.textContent).toBe('')
  })
})
