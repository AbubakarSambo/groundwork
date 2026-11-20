import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonCell } from './PeopleTable'

/**
 * U.4 RE-REVIEW, ITEM 4: NEVER THE SAME EMAIL TWICE.
 *
 * Several pages now put a person's own address in the name slot itself, when there is no real name
 * on record, rather than a name guessed out of it (see `whereThisPersonIs` in WhosInItRoster.tsx, which PeopleAndSetupAsPictured.tsx reads).
 * `email` is still handed here too, for the row's usual "name, then address underneath" shape - so
 * without this check, somebody with no name read their own address twice on the same row: once as
 * the name, once again directly under it.
 */
describe('a person cell', () => {
  it('never repeats the address once it is already the name', () => {
    render(<PersonCell initials="ZU" name="zawadi.u8@example.test" email="zawadi.u8@example.test" />)
    expect(screen.getAllByText('zawadi.u8@example.test')).toHaveLength(1)
  })

  it('still shows the address underneath a real name', () => {
    render(<PersonCell initials="AN" name="Amani Njoroge" email="amani@baridi.co.ke" />)
    expect(screen.getByText('Amani Njoroge')).toBeTruthy()
    expect(screen.getByText('amani@baridi.co.ke')).toBeTruthy()
  })
})
