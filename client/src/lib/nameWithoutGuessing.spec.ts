import { describe, it, expect } from 'vitest'
import { nameWithoutGuessing } from './utils'

/*
 * WALKTHROUGH PASS 2, ITEM 1: ONE NAME FOR SOMEBODY WITH NO SEAT, EVERYWHERE THEY ARE SHOWN.
 *
 * The same person read as "Zawadi U8" (a name guessed out of their email's local part), "Somebody
 * invited by email" and "A colleague" on three different screens. `nameWithoutGuessing` is the one
 * rule WhosInItRoster.tsx and the lead's sessions roster (GroundAdminPage.tsx) now both use.
 */
describe('nameWithoutGuessing', () => {
  it('uses their real name when they have one', () => {
    expect(nameWithoutGuessing({ user: { firstName: 'Zawadi', lastName: 'Njoroge' } })).toEqual({
      name: 'Zawadi Njoroge', inASentence: 'Zawadi Njoroge', nameless: false,
    })
  })

  it('shows the plain address, never a name guessed out of it, when there is no real name', () => {
    expect(nameWithoutGuessing({ email: 'zawadi.u8@example.test' })).toEqual({
      name: 'zawadi.u8@example.test', inASentence: 'zawadi.u8@example.test', nameless: false,
    })
  })

  it('says "Somebody invited by email" with no name and no address to show either', () => {
    expect(nameWithoutGuessing({})).toEqual({
      name: 'Somebody invited by email', inASentence: 'this person', nameless: true,
    })
  })
})
