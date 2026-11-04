import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ItsEvidence } from './ItsEvidence'

/**
 * AN ITEM'S OWN EVIDENCE, BESIDE IT ON THE BOARD (Release 1B, pull request 2 of 3). What the lead and a rep read under a deal,
 * from what the server serves on the row; nothing at all when the row carries none (the switch off, or no proof yet).
 */
describe('the evidence beside a deal', () => {
  it('Grace reads the signed order Mercy added, and that it counts as proof', () => {
    render(<ItsEvidence evidence={[{ id: 'e1', documentId: 'd1', readAs: 'A signed order', countsAsProof: true, shows: 'An order for 25 units, signed 13 October.', addedOn: '16 October', addedBy: 'Mercy Wairimu' }]} />)
    expect(screen.getByRole('heading', { name: 'Evidence' })).toBeTruthy()
    expect(screen.getByText('A signed order, added by Mercy Wairimu on 16 October.')).toBeTruthy()
    expect(screen.getByText('Counts as proof')).toBeTruthy()
    expect(screen.getByText('An order for 25 units, signed 13 October.')).toBeTruthy()
  })

  it('Mercy reads her own visit photo as hers, and that it is not proof', () => {
    render(<ItsEvidence evidence={[{ id: 'e2', documentId: 'd2', readAs: 'A photo', countsAsProof: false, shows: null, addedOn: '15 October', addedBy: 'You' }]} />)
    expect(screen.getByText('A photo, added by you on 15 October.')).toBeTruthy()
    expect(screen.getByText('Not proof')).toBeTruthy()
  })

  it('a row with no evidence draws nothing', () => {
    const { container } = render(<ItsEvidence evidence={undefined} />)
    expect(container.textContent).toBe('')
  })
})
