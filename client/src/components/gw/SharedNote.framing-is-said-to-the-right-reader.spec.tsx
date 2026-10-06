import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SharedNote } from './SharedNote'

/*
 * WALKTHROUGH PASS 2, ITEM 1: "Rukia Otieno's words" READ BY RUKIA HERSELF.
 *
 * The lead's framing is shown to everyone with its author attached, so a participant reads whose
 * words these are ("Rukia Otieno's words"). But to the lead, that same sentence read her own full
 * name back at her as if a third person had written it. It is her own note, so it reads "Your
 * words", the same rule the rest of the product follows for a person's own row.
 */
describe('how the lead’s framing is attributed', () => {
  it('to the lead herself, reads "Your words", not her own name', () => {
    render(<SharedNote text="We are deciding whether to renew." leadName="Rukia Otieno" isViewerTheLead />)
    expect(screen.getByText(/Your words, read by everyone here/)).toBeTruthy()
    expect(screen.queryByText(/Rukia Otieno/)).toBeNull()
  })

  it('to anybody else, names the lead, as the prototype does', () => {
    render(<SharedNote text="We are deciding whether to renew." leadName="Rukia Otieno" isViewerTheLead={false} />)
    expect(screen.getByText(/Rukia Otieno's words, read by everyone here/)).toBeTruthy()
  })
})
