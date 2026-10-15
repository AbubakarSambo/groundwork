import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatSuccessLooksLike, type AgainstSuccess } from './WhatSuccessLooksLike'

/*
 * RE-REVIEW: "Rukia Otieno: Twelve signed supply contracts..." (a name, a colon, then the
 * quoted line) reads as a transcript label, not a sentence a person reads. It is now
 * "Rukia Otieno said, "Twelve signed supply contracts..."" - a plain sentence, past tense,
 * with the person's own words kept exactly as said, in quotation marks. This applies to the
 * reader's own line too: "You said, "..."", never "You say ..." mixed into the middle of their
 * own words with no quotation marks (board review, 30 September, second pass).
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
  it('reads a colleague\'s definition as a sentence, not "Name: line", their words kept exactly as said', () => {
    render(<WhatSuccessLooksLike data={data([{ who: 'Rukia Otieno', text: 'Twelve signed supply contracts by December.' }])} />)
    expect(screen.getAllByText(fullTextOf('Rukia Otieno said, “Twelve signed supply contracts by December.”')).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Rukia Otieno:/)).toBeNull()
  })

  it('keeps the reader\'s own line in quotation marks too, past tense like everybody else', () => {
    render(<WhatSuccessLooksLike data={data([{ who: null, text: 'Twelve signed supply contracts by December.' }])} yourName="You" />)
    expect(screen.getAllByText(fullTextOf('You said, “Twelve signed supply contracts by December.”')).length).toBeGreaterThan(0)
  })

  /* Board review, 30 September, item 1 then second pass: BoardPage.tsx never passed `yourName`,
     so Amani read "Amani Wekesa said i am aiming for 3 shops" - missing "You", "I" lower-cased
     into "i", and no quotation marks around what he actually said. Fixed by: BoardPage.tsx now
     passes `yourName`; a person's words are never rewritten, not even by one letter, and are
     always shown in quotation marks. */
  it('keeps "I" capitalised and the words exactly as said, in quotation marks', () => {
    render(<WhatSuccessLooksLike data={data([{ who: 'Amani Wekesa', text: 'I am aiming for 3 shops in Kilimani.' }])} />)
    expect(screen.getAllByText(fullTextOf('Amani Wekesa said, “I am aiming for 3 shops in Kilimani.”')).length).toBeGreaterThan(0)
  })

  it('reads "You said, ..." for the reader\'s own line, said with "I"', () => {
    render(<WhatSuccessLooksLike data={data([{ who: 'Rukia Otieno', text: 'I want us to sign 12 shops.' }])} yourName="Rukia Otieno" />)
    expect(screen.getAllByText(fullTextOf('You said, “I want us to sign 12 shops.”')).length).toBeGreaterThan(0)
  })

  /**
   * B-141: an aim typed in lower case ("forty more shops in Nairobi order every week by 15
   * December") still read in lower case here too - this is the same component the board, the
   * report and My work all share for "What success looks like", so the stated aim itself (not a
   * colleague's definition, which is never rewritten at all) gets its first letter capitalised,
   * the rest kept exactly as typed.
   */
  it('reads the stated aim as a sentence, lower case and all, with only its first letter touched', () => {
    render(<WhatSuccessLooksLike data={{ ...data([]), stated: 'forty more shops in Nairobi order every week by 15 December' }} />)
    expect(screen.getByText('Forty more shops in Nairobi order every week by 15 December')).toBeTruthy()
    expect(screen.queryByText(/^forty more shops/)).toBeNull()
  })

  it('does the same for the dense, one-line form used elsewhere', () => {
    render(<WhatSuccessLooksLike data={{ ...data([]), stated: 'forty more shops by December' }} dense />)
    expect(screen.getByText(/Forty more shops by December/)).toBeTruthy()
  })
})
