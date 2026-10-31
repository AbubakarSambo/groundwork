import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheReportYouSawAtTheEnd } from './TheReportYouSawAtTheEnd'
import type { EntryReport } from '@/api/entry'

/**
 * THE REPORT A LEAD READS AFTER HER FIRST CHECK-IN, IN THE PROTOTYPE'S OWN HEADINGS (Hafsah,
 * 30 October 2026, first-experience round 1). Impatient leads read "What we heard from you", "What
 * we noticed", "Why it matters" and "Where this leaves you" as a consultant's report. The
 * prototype's own report and end card (B4 own-report, B3 check-in-end-card) say "What you told us"
 * and "What happens next", with no caption over each sentence. Rendered, so this checks what she
 * reads, on the page EntryChatPage and SessionReportPage both draw.
 */
const first = {
  whatGroundworkSaw: 'You need the unpaid fee notes paid quickly.',
  alignmentStatus: 'Emerging',
  alignmentBasis: 'One side so far.',
  areasRequiringAlignment: [{
    title: 'The size of the backlog',
    observation: 'Nobody knows how many fee notes are outstanding.',
    whyItMatters: 'Without a list, nobody can say how big the problem is.',
    recommendedMove: 'Ask Aisha for the list by Friday.',
  }],
  alignmentReached: [],
} as unknown as EntryReport

describe('the report after a lead\'s first check-in', () => {
  it('reads in the prototype\'s headings, with each open item said as plain sentences', () => {
    const { container } = render(<TheReportYouSawAtTheEnd report={first} />)
    const text = container.textContent ?? ''
    expect(screen.getByText('What you told us')).toBeTruthy()
    expect(screen.getByText('What is still open')).toBeTruthy()
    expect(screen.getByText('What happens next')).toBeTruthy()
    expect(screen.getByText('Nobody knows how many fee notes are outstanding. Without a list, nobody can say how big the problem is.')).toBeTruthy()
    expect(screen.getByText('Once someone else checks in, you will see where you agree and where you see things differently.')).toBeTruthy()
    expect(text).not.toMatch(/What we heard|What we noticed|Why it matters|Where this leaves you|unsettled/)
  })
})
