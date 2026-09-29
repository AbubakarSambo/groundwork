import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatTheReportCanSayYet, type CoverageFacts } from './WhatTheReportCanSayYet'

/*
 * RE-REVIEW: THE FIVE BARS' OWN CAPTIONS WERE LOWER-CASE FRAGMENTS WITH NO PUNCTUATION -
 * "what you said", "differences", "what lines up", "backed up", "what's changed" - read as
 * clipped pieces of a sentence rather than short labels. They are capitalised on render now
 * (the underlying `short` field, which the tests in what-the-report-can-say-yet.spec.ts key rows
 * by, is unchanged).
 */
const facts = (o: Partial<CoverageFacts> = {}): CoverageFacts => ({
  iHaveCheckedIn: true,
  answered: 2,
  parties: 2,
  corroborated: { checked: 3, total: 5 },
  documentBackedPct: 40,
  roundsFinished: 2,
  ...o,
})

describe('the bars under "How much the report has to go on"', () => {
  it('capitalises each caption', () => {
    render(<WhatTheReportCanSayYet facts={facts()} />)
    expect(screen.getByText('What you said')).toBeTruthy()
    expect(screen.getByText('Differences')).toBeTruthy()
    expect(screen.getByText('What lines up')).toBeTruthy()
    expect(screen.getByText('Backed up')).toBeTruthy()
    expect(screen.getByText("What's changed")).toBeTruthy()
    expect(screen.queryByText('what you said')).toBeNull()
    expect(screen.queryByText('differences')).toBeNull()
  })
})
