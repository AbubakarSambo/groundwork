import { describe, it, expect } from 'vitest'
import { firstNameOf, checkInsWordApart } from './people-here'

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
