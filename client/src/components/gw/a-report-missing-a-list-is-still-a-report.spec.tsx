import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheReportYouSawAtTheEnd } from './TheReportYouSawAtTheEnd'
import type { EntryReport } from '@/api/entry'

/**
 * THE REPORT PAGE WENT WHITE THE MOMENT A SECOND PERSON CHECKED IN.
 *
 * Walked as a real lead. Report tab, Session 1, "2 of 2 answered, Final", click:
 *
 *   This page could not load. Cannot read properties of undefined (reading 'length')
 *
 * `report.areasRequiringAlignment.length` and `report.alignmentReached.length`, read straight off
 * a prop whose TYPE says they are required. They are required of a freshly written report. What
 * arrives here is JSON off the wire from more than one endpoint, and the shape a reader gets is
 * not a shape a reader can control.
 *
 * This is the whole point of the product and it could not be opened.
 *
 * WHY THIS FILE RENDERS RATHER THAN READS THE SOURCE. A source-level guard on the word
 * `?? []` would pass against a component that had grown a fourth list nobody guarded. What has to
 * hold is that a report arriving without its lists still draws, so the test hands it one.
 */
const bare = {
  whatGroundworkSaw: 'What was heard.',
  alignmentStatus: 'Emerging',
  alignmentBasis: 'One side so far.',
} as unknown as EntryReport

describe('a report arriving without its lists', () => {
  it('still renders, rather than taking the page down', () => {
    expect(() => render(<TheReportYouSawAtTheEnd report={bare} />)).not.toThrow()
    expect(screen.getByText('What was heard.')).toBeTruthy()
  })

  it('draws no section for a list it does not have', () => {
    render(<TheReportYouSawAtTheEnd report={bare} />)
    expect(screen.queryByText("What's still open")).toBeNull()
    expect(screen.queryByText('Clear on your side')).toBeNull()
    expect(screen.queryByText('People mentioned')).toBeNull()
  })

  it('and survives an honestClose with nothing in it, which was the next crash along', () => {
    /* One field deeper than the two that bit: `report.honestClose.aligned` on an absent object. */
    const noClose = { ...bare, areasRequiringAlignment: [], alignmentReached: [] } as unknown as EntryReport
    expect(() => render(<TheReportYouSawAtTheEnd report={noClose} />)).not.toThrow()
  })

  it('renders every list it does have', () => {
    const full = {
      ...bare,
      areasRequiringAlignment: [{ title: 'The rota', observation: 'o', whyItMatters: 'w', recommendedMove: 'm' }],
      alignmentReached: [{ title: 'The aim', note: 'n' }],
      honestClose: { aligned: 'a', open: 'o', revisit: 'r', risk: 'k' },
    } as unknown as EntryReport
    render(<TheReportYouSawAtTheEnd report={full} />)
    expect(screen.getByText('The rota')).toBeTruthy()
    expect(screen.getByText('The aim')).toBeTruthy()
  })
})
