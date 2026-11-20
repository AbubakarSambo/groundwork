import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheEndCard } from './TheEndCard'

/**
 * WHAT THE END CARD SAYS ABOUT WHO SEES WHAT YOU WROTE, AFTER HAFSAH'S RULING OF 15 NOVEMBER.
 *
 * It used to carry three variants ("Your team will see what you said today...", "Nobody else answers this check-in, but X runs it...",
 * "Nobody else answers this check-in, so what you said today stays yours alone."). Who sees what is the backend's rule and is not
 * explained on this screen; the one sentence kept is the lone participant's, that the lead reads it (the lone-participant spec).
 * The false variant, "stays yours alone", is gone for good: a lead can read what a lone participant said.
 */
const base = { engine: null, nextOpens: null, finishing: false, onFinish: () => {}, onChange: () => {} }

describe('the end card says only the one sentence that would surprise a person', () => {
  it('says nothing about who sees what where a team report comes from this check-in', () => {
    render(<TheEndCard {...base} othersCanSeeWhatYouSay={true} whoCanReadWhatYouSay="You see your own report straight away. Wairimu shares a team report when it is ready. Nobody else reads your conversation." />)
    expect(screen.queryByText(/Your team will see what you said today/)).toBeNull()
    expect(screen.queryByText(/Nobody else reads your conversation/)).toBeNull()
  })

  it('never says a lone participant\'s words stay theirs alone', () => {
    render(<TheEndCard {...base} othersCanSeeWhatYouSay={false} />)
    expect(screen.queryByText(/stays yours alone/)).toBeNull()
  })

  it('says nothing while the setting is not yet known, rather than guessing', () => {
    render(<TheEndCard {...base} />)
    expect(screen.queryByText(/Nobody else reads your conversation/)).toBeNull()
  })
})
