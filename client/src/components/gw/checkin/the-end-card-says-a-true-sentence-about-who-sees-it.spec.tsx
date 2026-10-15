import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheEndCard } from './TheEndCard'

/**
 * GROUP 3'S REVIEW, BATCH A FAULT 2: THE END CARD LEFT OUT THE PROTOTYPE'S LINE ENTIRELY.
 *
 * "Your team will see what you said today, and a short summary of what moved." was dropped with a
 * comment saying it was waiting on "item 11, conflict A" - but that was decided 29 September. The
 * line is back, built from `othersCanSeeWhatYouSay` (`ground.aTeamReportComes`, already on the page -
 * nothing new asked of the server): shown where somebody else answers this check-in too, and
 * replaced with the true sentence where nobody else does.
 */
const base = { engine: null, leadName: null, nextOpens: null, finishing: false, onFinish: () => {}, onChange: () => {} }

describe('the end card says a true sentence about who sees what you wrote', () => {
  it('shows the prototype\'s line where a team report comes from this check-in', () => {
    render(<TheEndCard {...base} othersCanSeeWhatYouSay={true} />)
    expect(screen.getByText('Your team will see what you said today, and a short summary of what moved.')).toBeTruthy()
  })

  it('shows the true sentence instead, where nobody else answers this check-in', () => {
    render(<TheEndCard {...base} othersCanSeeWhatYouSay={false} />)
    expect(screen.getByText('Nobody else answers this check-in, so what you said today stays yours alone.')).toBeTruthy()
    expect(screen.queryByText(/Your team will see what you said today/)).toBeNull()
  })

  it('says neither sentence while the setting is not yet known, rather than guessing', () => {
    render(<TheEndCard {...base} />)
    expect(screen.queryByText(/Your team will see what you said today/)).toBeNull()
    expect(screen.queryByText(/Nobody else answers this check-in/)).toBeNull()
  })
})
