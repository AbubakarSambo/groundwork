import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatSuccessLooksLike, type AgainstSuccess } from './WhatSuccessLooksLike'

/*
 * RE-REVIEW: "Rukia Otieno: Twelve signed supply contracts..." (a name, a colon, then the
 * quoted line) reads as a transcript label, not a sentence a person reads. It is now "Rukia
 * Otieno said twelve signed supply contracts...", and the reader's own line keeps its own voice,
 * "You say...".
 */
const data = (definitions: AgainstSuccess['definitions']): AgainstSuccess => ({
  counting: 'everyone',
  stated: 'Sign 12 shops by December.',
  version: 1,
  conditions: [],
  spokenTo: { count: 1, of: 2 },
  definitions,
  sides: 'both',
  saying: null,
})

/** The name is its own bold `<span>`, so the whole sentence is split across sibling text nodes -
    matched here on the row's full `textContent` rather than a single node's own text. */
const fullTextOf = (whole: string) => (_content: string, el: Element | null) => el?.textContent === whole

describe('what each person says success is', () => {
  it('reads a colleague\'s definition as a sentence, not "Name: line"', () => {
    render(<WhatSuccessLooksLike data={data([{ who: 'Rukia Otieno', text: 'Twelve signed supply contracts by December.' }])} />)
    expect(screen.getAllByText(fullTextOf('Rukia Otieno said twelve signed supply contracts by December.')).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Rukia Otieno:/)).toBeNull()
  })

  it('keeps the reader\'s own line in their own voice', () => {
    render(<WhatSuccessLooksLike data={data([{ who: null, text: 'Twelve signed supply contracts by December.' }])} yourName="You" />)
    expect(screen.getAllByText(fullTextOf('You say twelve signed supply contracts by December.')).length).toBeGreaterThan(0)
  })
})
