import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PeoplePicker } from './PeoplePicker'

const people = [
  { email: 'ada@x.test', name: 'Ada Obi' },
  { email: 'ben@x.test', name: 'Ben Kato' },
  { email: 'chi@x.test', name: null },
]

describe('people are picked like a group chat picks them', () => {
  it('hides the ones already in, finds by name or address, and hands back the ticked ones', () => {
    const onAdd = vi.fn()
    render(<PeoplePicker people={people} alreadyIn={['BEN@x.test']} onAdd={onAdd} />)
    expect(screen.queryByText('Ben Kato')).toBeNull()
    fireEvent.change(screen.getByLabelText('Find a colleague'), { target: { value: 'ada' } })
    fireEvent.click(screen.getByLabelText('Ada Obi'))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).toHaveBeenCalledWith([{ email: 'ada@x.test', name: 'Ada Obi' }])
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
    const { container } = render(<PeoplePicker people={people} alreadyIn={people.map((p) => p.email)} onAdd={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})
