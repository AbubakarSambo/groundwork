import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
afterEach(() => cleanup())
import { EachPerson } from './EachPerson'

/**
 * NIGHT QUALITY RUN 1, PROBLEM 7. Amina sent a photo of DN-1182 and a location pin on WhatsApp; both were kept
 * on the check-in and shared with everyone. Her Context tab still read "YOUR FILES ... Nothing attached yet.",
 * and so did Esther's view of her, because the list serves `name` and `mine`, and the card read `fileName` and
 * `participantId`. The files below are shaped exactly as GET /grounds/:id/documents serves them now.
 */
const people = [
  { id: 'p-amina', userId: 'u-amina', user: { firstName: 'Amina', lastName: 'Otieno' }, objective: { all: [] } },
  { id: 'p-collins', userId: 'u-collins', user: { firstName: 'Collins', lastName: 'Odhiambo' }, objective: { all: [] } },
]
const served = [
  { id: 'd1', name: 'image-wamid.in.369badb59f254f98.png', participantId: 'p-amina', visibility: 'OPEN' },
  { id: 'd2', name: 'Location pin shared at 11:30 on Monday 19 October', participantId: 'p-amina', visibility: 'OPEN' },
]

describe("Amina's WhatsApp files are listed under her", () => {
  it('as Amina reads her own card', () => {
    render(<EachPerson groundId="g1" people={people as any} targets={[]} toDos={[]} files={served.map((f) => ({ ...f, mine: true })) as any} asks={{}} viewerUserId="u-amina" isLead={false} />)
    expect(screen.getByText('Location pin shared at 11:30 on Monday 19 October')).toBeTruthy()
    expect(screen.queryByText('Nothing attached yet.')).toBeNull()
  })

  it('as Esther, who runs the check-in, reads Amina\'s card', () => {
    render(<EachPerson groundId="g1" people={people as any} targets={[]} toDos={[]} files={served.map((f) => ({ ...f, mine: false })) as any} asks={{}} viewerUserId="u-esther" isLead />)
    /* A lead's rows start closed; she opens Amina's. */
    fireEvent.click(screen.getAllByText(/Amina/)[0])
    expect(screen.getByText('image-wamid.in.369badb59f254f98.png')).toBeTruthy()
    expect(screen.getAllByText('Everyone in this check-in can read it.').length).toBe(2)
  })
})
