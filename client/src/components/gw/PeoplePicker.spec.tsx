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

  /*
   * UPDATED (8 October, night note item 2): several colleagues can share a name - "Someone who has
   * not given a name yet" among them - so role now reads beside team under the name, not team
   * alone, to tell two same-named rows apart. This test used to check for "Operations" alone; it
   * now checks for the combined line.
   *
   * UPDATED AGAIN (B-054): the role used to read as the server's raw code - "MEMBER, Sales", "LEAD,
   * Operations" - which is not a word anybody reading the picker uses. It now reads the product's
   * own word for the same role, the one the People page already prints ("Takes part", "Can open
   * check-ins"), so this checks for that word instead of the code it replaced.
   */
  it('shows each person\'s role and team under their name, and no address anywhere', () => {
    const { container } = render(<PeoplePicker people={people} alreadyIn={[]} onAdd={vi.fn()} />)
    expect(screen.getAllByText('Takes part, Sales')).toHaveLength(2)
    expect(screen.getByText('Can open check-ins, Operations')).toBeTruthy()
    expect(container.textContent).not.toMatch(/@/)
    expect(container.textContent).not.toMatch(/MEMBER|LEAD/)
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

  /*
   * RESTORED (8 October, night note item 2, found by the old-against-new check on Riverbank
   * Trading). Several rows of `GET /users/colleagues` can read the same name, so role and team are
   * what tells a lead two "Someone who has not given a name yet" rows apart.
   */
  it('tells two same-named colleagues apart by role and team', () => {
    const sameName = [
      { id: 'u1', name: 'Someone who has not given a name yet', role: 'MEMBER', team: 'Sales' },
      { id: 'u2', name: 'Someone who has not given a name yet', role: 'LEAD', team: 'Operations' },
    ]
    render(<PeoplePicker people={sameName} alreadyIn={[]} onAdd={vi.fn()} />)
    expect(screen.getByText('Takes part, Sales')).toBeTruthy()
    expect(screen.getByText('Can open check-ins, Operations')).toBeTruthy()
  })

  /*
   * B-054: typing the server's raw code ("lead") used to be the only way to find somebody by role,
   * and typing the word a lead actually reads under the name ("can open check-ins", or "takes
   * part") found nobody - "Select these 0". Search now matches the same plain word the row shows.
   */
  it('typing the role word a person actually reads finds everyone with it', () => {
    const onAdd = vi.fn()
    render(<PeoplePicker people={people} alreadyIn={[]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Find a colleague'), { target: { value: 'can open check-ins' } })
    expect(screen.getByText('Chi Eze')).toBeTruthy()
    expect(screen.queryByText('Ada Obi')).toBeNull()
  })

  it('typing "takes part" finds the people who take part, not the ones who can open check-ins', () => {
    const onAdd = vi.fn()
    render(<PeoplePicker people={people} alreadyIn={[]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Find a colleague'), { target: { value: 'takes part' } })
    expect(screen.getByText('Ada Obi')).toBeTruthy()
    expect(screen.getByText('Ben Kato')).toBeTruthy()
    expect(screen.queryByText('Chi Eze')).toBeNull()
  })

  it('renders nothing when everyone is already in', () => {
    const { container } = render(<PeoplePicker people={people} alreadyIn={people.map((p) => p.id)} onAdd={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})
