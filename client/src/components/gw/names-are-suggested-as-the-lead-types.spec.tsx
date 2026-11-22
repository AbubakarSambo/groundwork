import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheTeamBox, whoItCouldBe } from './TheTeamBox'
import { AddPeopleForm } from './WhosInItRoster'

/**
 * NAMES ARE SUGGESTED AS THE LEAD TYPES (release test 22 November, bug 36: Wairimu typed "Ol" in "Add people to this check-in" and
 * nobody from the organisation was suggested). Two letters of a name now list the colleagues it could be, as a listbox the arrow keys
 * move through and Enter picks from; a pick puts them on the check-in by id. Read as the lead reads it.
 */
vi.mock('@/api/entry', () => ({ entryApi: { peopleOnLines: vi.fn() } }))
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => false }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const COLLEAGUES = [
  { id: 'u-olu', name: 'Olu Bankole', role: 'MEMBER', team: 'Sales' },
  { id: 'u-ola', name: 'Ola Adeyemi', role: 'LEAD', team: null },
  { id: 'u-tobi', name: 'Tobi Olatunji', role: 'MEMBER', team: 'Finance' },
  { id: 'u-grace', name: 'Grace Achieng', role: 'ADMIN', team: null },
]

function typeInto(box: HTMLTextAreaElement, value: string) {
  fireEvent.change(box, { target: { value, selectionStart: value.length } })
}

describe('who a typed name could be', () => {
  it('finds a name, or any word of it, that starts with what was typed', () => {
    expect(whoItCouldBe('Ol', COLLEAGUES).map((p) => p.name)).toEqual(['Olu Bankole', 'Ola Adeyemi', 'Tobi Olatunji'])
    expect(whoItCouldBe('olu b', COLLEAGUES).map((p) => p.name)).toEqual(['Olu Bankole'])
  })
  it('suggests nobody for one letter, an email, a number, or a name already typed in full', () => {
    expect(whoItCouldBe('O', COLLEAGUES)).toEqual([])
    expect(whoItCouldBe('olu@x.test', COLLEAGUES)).toEqual([])
    expect(whoItCouldBe('Olu, ', COLLEAGUES)).toEqual([])
    expect(whoItCouldBe('Olu Bankole', COLLEAGUES)).toEqual([])
  })
})

describe('the team box with suggestions', () => {
  it('lists who "Ol" could be, with their role and team, and Enter on the one picked adds them', async () => {
    const onPick = vi.fn()
    render(<TheTeamBox prefilled={[]} colleagues={COLLEAGUES} onPick={onPick} onAdd={async () => []} />)
    const box = screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement
    typeInto(box, 'Ol')
    const list = screen.getByRole('listbox', { name: 'People in your organisation' })
    const options = screen.getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['Olu BankoleTakes part, Sales', 'Ola AdeyemiCan open check-ins', 'Tobi OlatunjiTakes part, Finance'])
    expect(box.getAttribute('role')).toBe('combobox')
    expect(box.getAttribute('aria-expanded')).toBe('true')
    expect(box.getAttribute('aria-controls')).toBe(list.id)

    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1].id)
    expect(options[1].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(box, { key: 'ArrowUp' })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(COLLEAGUES[0]))
    expect(box.value).toBe('')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('a click picks too, Escape closes the list, and Enter with nothing chosen is a new line', () => {
    const onPick = vi.fn()
    render(<TheTeamBox prefilled={[]} colleagues={COLLEAGUES} onPick={onPick} />)
    const box = screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement
    typeInto(box, 'Gr')
    expect(fireEvent.keyDown(box, { key: 'Enter' })).toBe(true)
    expect(onPick).not.toHaveBeenCalled()
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    typeInto(box, 'Gra')
    fireEvent.mouseDown(screen.getByRole('option', { name: /Grace Achieng/ }))
    expect(onPick).toHaveBeenCalledWith(COLLEAGUES[3])
  })

  it('offers nothing without a way to pick, as on the setup card', () => {
    render(<TheTeamBox prefilled={[]} colleagues={COLLEAGUES} />)
    typeInto(screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement, 'Ol')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

describe('Add people to this check-in, as the lead reads it', () => {
  it('suggests only colleagues not on the check-in yet, and adds the one picked by id', async () => {
    const addManyParticipants = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/grounds/g1']}>
          <Routes>
            <Route path="/grounds/:id" element={
              <AddPeopleForm
                isOrgAdmin={false} colleagues={COLLEAGUES}
                participants={[{ id: 'p1', userId: 'u-olu' }]}
                seats={{ cap: 10 }} seatsFull={false} addManyParticipants={addManyParticipants}
              />
            } />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('Add people to this check-in')).toBeTruthy()
    const box = screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement
    typeInto(box, 'Ol')
    expect(screen.getAllByRole('option').map((o) => o.querySelector('span')?.textContent)).toEqual(['Ola Adeyemi', 'Tobi Olatunji'])
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(addManyParticipants).toHaveBeenCalledWith([COLLEAGUES[1]]))
  })
})
