import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SoloReportBody } from './SoloReportBody'

/**
 * GROUP 3'S REVIEW, THE SCREEN'S OWN SENTENCES 9: A FIELD NAME IS NOT A HEADING.
 *
 * `whatToCarry.replace(/([A-Z])/g, ' $1')` reads "what To Carry" - every capital the schema's own
 * camelCase carries stays capital, so the heading read "What To Carry" rather than a sentence.
 * The report's two real fields (`summary`, `whatToCarry`) now read plain words a person would use:
 * "What you said" and "What to carry into next time".
 */
describe('the solo report\'s own headings', () => {
  it('reads "What you said" and "What to carry into next time", not "Summary" and "What To Carry"', () => {
    render(<SoloReportBody report={{ summary: 'You have finished the refund endpoint.', whatToCarry: 'Confirm the deposit with Westgate Deli.' }} />)
    expect(screen.getByText('What you said')).toBeTruthy()
    expect(screen.getByText('What to carry into next time')).toBeTruthy()
    expect(screen.queryByText('Summary')).toBeNull()
    expect(screen.queryByText('What To Carry')).toBeNull()
  })

  it('still reads an unknown field in sentence case, not title case', () => {
    render(<SoloReportBody report={{ somethingElseEntirely: 'A line.' }} />)
    expect(screen.getByText('Something else entirely')).toBeTruthy()
    expect(screen.queryByText('Something Else Entirely')).toBeNull()
  })
})
