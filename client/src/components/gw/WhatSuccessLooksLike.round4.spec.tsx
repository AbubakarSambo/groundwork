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

  /* Board review, 30 September, item 1: BoardPage.tsx never passed `yourName`, so Amani read
     "Amani Wekesa said i am aiming for 3 shops" - both the missing "You" and "I" lower-cased into
     "i", never a real word. Fixed in two places: BoardPage.tsx now passes `yourName`, and this
     component no longer lower-cases a leading "I" (or "I'm"/"I've"...). */
  it('never turns "I" into "i" when lower-casing a colleague\'s line', () => {
    render(<WhatSuccessLooksLike data={data([{ who: 'Amani Wekesa', text: 'I am aiming for 3 shops.' }])} />)
    expect(screen.getAllByText(fullTextOf('Amani Wekesa said I am aiming for 3 shops.')).length).toBeGreaterThan(0)
  })

  it('keeps "You" for the reader\'s own line, said with "I"', () => {
    render(<WhatSuccessLooksLike data={data([{ who: 'Rukia Otieno', text: 'I want us to sign 12 shops.' }])} yourName="Rukia Otieno" />)
    expect(screen.getAllByText(fullTextOf('You say I want us to sign 12 shops.')).length).toBeGreaterThan(0)
  })
})
