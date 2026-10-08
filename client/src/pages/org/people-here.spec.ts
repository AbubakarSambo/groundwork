import { describe, it, expect } from 'vitest'
import { firstNameOf, nameOf, checkInsWordApart, checkInsPartsApart, initialsOf } from './people-here'

/**
 * U.4 RE-REVIEW, ITEM 7: THE ONE-PERSON PAGE USES THE FIRST NAME, EVERY TIME.
 *
 * Rukia's own owner account holds "Rukia Otieno" in its `firstName` field alone (`lastName` empty),
 * a record of how the account was created rather than of what her first name is. Reading the field
 * whole read "What Rukia Otieno can do..." and "Rukia Otieno owns this organisation...", where every
 * other person on the same page reads their first name alone ("What Faraji can do...").
 */
describe('firstNameOf', () => {
  it('reads a normal first name unchanged', () => {
    expect(firstNameOf({ firstName: 'Faraji', lastName: 'Odhiambo', email: 'faraji@example.test' })).toBe('Faraji')
  })

  it('takes only the first word, when the whole name landed in the firstName field alone', () => {
    expect(firstNameOf({ firstName: 'Rukia Otieno', lastName: '', email: 'rukia@example.test' })).toBe('Rukia')
  })

  it('falls back to the first word of the name built from the email, with no name on record', () => {
    expect(firstNameOf({ firstName: null, lastName: null, email: 'zawadi.u8@example.test' })).toBe('zawadi.u8@example.test')
  })
})

/**
 * DECISION 115 (8 October, night note item 1): A NAME FOR EVERY PERSON, NEVER AN ADDRESS IN ITS
 * PLACE. `GET /users` now carries `displayName` on every row, so `nameOf`/`firstNameOf` read it
 * first, rather than falling back to the raw email address - seven of twelve people at one real
 * organisation (Riverbank Trading) had no name, and used to read as their own address.
 */
describe('nameOf, with the server\'s displayName', () => {
  it('reads displayName over anything built from firstName/lastName/email', () => {
    expect(nameOf({ firstName: 'Faraji', lastName: 'Odhiambo', email: 'faraji@example.test', displayName: 'Faraji Odhiambo' })).toBe('Faraji Odhiambo')
  })

  it('reads the server\'s placeholder sentence for a person with no name, never their address', () => {
    expect(nameOf({ firstName: null, lastName: null, email: 'zawadi.u8@example.test', displayName: 'Someone who has not given a name yet' }))
      .toBe('Someone who has not given a name yet')
  })

  it('reads the name typed beside an address for somebody invited with no seat', () => {
    expect(nameOf({ firstName: null, lastName: null, email: 'p07@fieldnote.test', displayName: 'Дмитрий Иванов' })).toBe('Дмитрий Иванов')
  })

  it('falls back to the old rule when the server sends no displayName at all', () => {
    expect(nameOf({ firstName: 'Faraji', lastName: 'Odhiambo', email: 'faraji@example.test' })).toBe('Faraji Odhiambo')
    expect(nameOf({ firstName: null, lastName: null, email: 'zawadi.u8@example.test' })).toBe('zawadi.u8@example.test')
  })
})

describe('firstNameOf, with the server\'s displayName', () => {
  it('takes the first word of the placeholder sentence, never the raw address, with no name on record', () => {
    expect(firstNameOf({ firstName: null, lastName: null, email: 'zawadi.u8@example.test', displayName: 'Someone who has not given a name yet' }))
      .toBe('Someone')
  })
})

/**
 * WALKTHROUGH PASS 2, ITEM 5: A PERSON'S OWN CHECK-INS CELL, WITH REPEATED NAMES TOLD APART.
 *
 * `m.checkIns` carries no date of its own (users.service.ts sends only `id`, `label`, `runsIt`), so
 * this reads it from the grounds this reader already has, matched by id - the same join
 * YouPage.tsx makes for "Your work in each".
 */
describe('checkInsWordApart', () => {
  it('leaves a label alone when nothing else in the cell shares it', () => {
    const startOf = new Map([['g1', { startsAt: '2026-09-01' }], ['g2', { startsAt: '2026-09-10' }]])
    expect(checkInsWordApart({ checkIns: [{ id: 'g1', label: 'Sales team, Q3', runsIt: false }, { id: 'g2', label: 'Leadership, Q3', runsIt: false }] }, startOf))
      .toBe('Sales team, Q3, Leadership, Q3')
  })

  it('says when each one started when two in the same cell share a label', () => {
    const startOf = new Map([['g1', { startsAt: new Date(2026, 8, 20).toISOString() }], ['g2', { startsAt: new Date(2026, 8, 27).toISOString() }]])
    expect(checkInsWordApart({
      checkIns: [
        { id: 'g1', label: 'Help a new hire get started', runsIt: false },
        { id: 'g2', label: 'Help a new hire get started', runsIt: false },
      ],
    }, startOf)).toBe('Help a new hire get started, started 20 September, Help a new hire get started, started 27 September')
  })

  it('says "None" with no check-ins, same as checkInsWord', () => {
    expect(checkInsWordApart({ checkIns: [] }, new Map())).toBe('None')
  })
})

/**
 * HAFSAH'S FAULT 4: THE SAME READ, AS PIECES, FOR THE PEOPLE PAGE'S CAPPED CELL.
 * `checkInsWordApart` is `checkInsPartsApart(...).join(', ')` (or 'None'); the cell caps at the
 * first few of these pieces and offers "and N more" for the rest.
 */
describe('checkInsPartsApart', () => {
  it('is empty with no check-ins', () => {
    expect(checkInsPartsApart({ checkIns: [] }, new Map())).toEqual([])
  })

  it('is one piece per check-in, same words as checkInsWordApart', () => {
    const startOf = new Map([['g1', { startsAt: '2026-09-01' }], ['g2', { startsAt: '2026-09-10' }]])
    expect(checkInsPartsApart({ checkIns: [{ id: 'g1', label: 'Sales team, Q3', runsIt: false }, { id: 'g2', label: 'Leadership, Q3', runsIt: false }] }, startOf))
      .toEqual(['Sales team, Q3', 'Leadership, Q3'])
  })
})

/**
 * B-066: "SOMEONE WHO HAS NOT GIVEN A NAME YET" READ AS THE INITIALS "SW". E1 on Riverbank
 * Trading's old data found every person with no name on People reading "SW" in their avatar circle
 * - the first letters of "Someone" and "who", the start of the placeholder sentence decision 115
 * serves for them, never a name.
 */
describe('initialsOf', () => {
  it('reads a plain neutral mark, not "SW", for decision 115\'s placeholder sentence', () => {
    expect(initialsOf('Someone who has not given a name yet')).toBe('')
  })

  it('does the same for the no-seat placeholder', () => {
    expect(initialsOf('Somebody invited by email')).toBe('')
  })

  it('still reads initials from an actual name', () => {
    expect(initialsOf('Faraji Odhiambo')).toBe('FO')
  })
})
