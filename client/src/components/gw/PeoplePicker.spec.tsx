import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PeoplePicker } from './PeoplePicker'

/*
 * U.4: colleagues come with an id, a name, a role and a team, never an address. The old cases found
 * people by address and handed addresses back; they now do the same by name and team, and hand back
 * the people (by id), because the list no longer carries any address to find or hand back.
 */
const people = [
  { id: 'ada', name: 'Ada Obi', role: 'MEMBER', team: 'Sales' },
  { id: 'ben', name: 'Ben Kato', role: 'MEMBER', team: 'Sales' },
  { id: 'chi', name: 'Chi Eze', role: 'LEAD', team: 'Operations' },
]

describe('people are picked like a group chat picks them', () => {
  it('hides the ones already in, finds by name, and hands back the ticked ones', () => {
    const onAdd = vi.fn()
    render(<PeoplePicker people={people} alreadyIn={['ben']} onAdd={onAdd} />)
    expect(screen.queryByText('Ben Kato')).toBeNull()
    fireEvent.change(screen.getByLabelText('Find a colleague'), { target: { value: 'ada' } })
    fireEvent.click(screen.getByLabelText('Ada Obi'))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).toHaveBeenCalledWith([people[0]])
  })

  it('shows each person\'s team under their name, and no address anywhere', () => {
    const { container } = render(<PeoplePicker people={people} alreadyIn={[]} onAdd={vi.fn()} />)
    expect(screen.getByText('Operations')).toBeTruthy()
    expect(container.textContent).not.toMatch(/@/)
  })

  it('typing a team finds everyone in it, and one click adds the whole team', () => {
    const onAdd = vi.fn()
    render(<PeoplePicker people={people} alreadyIn={[]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Find a colleague'), { target: { value: 'sales' } })
    fireEvent.click(screen.getByRole('button', { name: 'Select these 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 people' }))
    expect(onAdd.mock.calls[0][0].map((p: any) => p.id)).toEqual(['ada', 'ben'])
  })

  it('selects everyone shown in one click and says how many', () => {
    const onAdd = vi.fn()
    render(<PeoplePicker people={people} alreadyIn={[]} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select everyone' }))
    expect(screen.getByText('3 selected')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add 3 people' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toHaveLength(3)
  })

  it('renders nothing when everyone is already in', () => {
    const { container } = render(<PeoplePicker people={people} alreadyIn={people.map((p) => p.id)} onAdd={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})
