import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhoIsInThis } from './WhoIsInThis'

/**
 * NAMES, NOT ROLES - AND NEVER SAID TO THE LEAD ABOUT HERSELF (U.8 third review).
 *
 * "On this check-in people check in without seeing each other. Your lead knows who is here; you
 * will not see the others or what they wrote, and they will not see you." was said, word for word,
 * to every reader alike: a participant read "your lead" rather than the lead's own name, and a
 * semicolon joined two sentences into one - and the SAME sentence was shown to the lead when she is
 * a party in her own check-in (a common case: a lead who also takes part), so she read a
 * description of her own role in the third person, about herself.
 *
 * ROUND 4, ITEM A STEP 2: MOVED FROM `GroundChat`'s Check-in tab TO `WhoIsInThis`, on People and
 * setup. The rule this file pins did not change; only which component draws it.
 */

function renderRoster(props: { leadName?: string | null; viewerIsTheLead?: boolean }) {
  return render(
    <WhoIsInThis
      parties={[{ name: 'You', done: false, isSelf: true }]}
      peersHidden
      {...props}
    />,
  )
}

describe('the sentence when peers are hidden from each other', () => {
  it('names the lead, and joins the two facts as two sentences, not one with a semicolon', () => {
    renderRoster({ leadName: 'Rukia' })
    expect(screen.getByText(
      'Rukia knows who is here. You will not see the others or what they wrote, and they will not see you.',
    )).toBeTruthy()
    expect(screen.queryByText(/Your lead knows/)).toBeNull()
    expect(screen.queryByText(/;/)).toBeNull()
  })

  it('gives the lead her own true sentence, never the participant one about herself', () => {
    renderRoster({ viewerIsTheLead: true, leadName: null })
    expect(screen.getByText(
      'People on this check-in answer without seeing each other. You can see who is here.',
    )).toBeTruthy()
    expect(screen.queryByText(/knows who is here/)).toBeNull()
  })
})
