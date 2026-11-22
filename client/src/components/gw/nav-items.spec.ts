import { describe, it, expect } from 'vitest'
import { navItemsFor } from './nav-items'

/**
 * "SUITES" IN A MEMBER'S OWN NAVIGATION (B-123, Hafsah's design, coordinator follow-up): a lead and
 * an admin already reach their own "Suites" by role; an ordinary member had no door to it at all
 * except Today's own link, which Today may not even draw that day. `navItemsFor`'s `memberSuiteOnly`
 * gate puts the same label in a member's own rail, to `/suite/mine` rather than `/settings/suites`
 * (the server refuses a member there), and only once a suite of theirs is actually on.
 */
describe('a member reaches their own Suites without Today', () => {
  const MEMBER = { role: 'MEMBER' }
  const LEAD = { role: 'LEAD' }
  const ADMIN = { role: 'ADMIN' }

  it('is offered once a suite is on for this member', () => {
    const items = navItemsFor(MEMBER, { suiteOnForMember: true })
    const suites = items.find(i => i.label === 'Suites')
    expect(suites).toBeTruthy()
    expect(suites!.to).toBe('/suite/mine')
  })

  it('is left out while no suite of theirs is on', () => {
    const items = navItemsFor(MEMBER, { suiteOnForMember: false })
    expect(items.some(i => i.label === 'Suites')).toBe(false)
  })

  it('is left out with no opts at all, the same as before this was added', () => {
    const items = navItemsFor(MEMBER)
    expect(items.some(i => i.label === 'Suites')).toBe(false)
  })

  it('never doubles up for a lead or an admin, who already have their own "Suites" by role', () => {
    const leadItems = navItemsFor(LEAD, { suiteOnForMember: true })
    expect(leadItems.filter(i => i.label === 'Suites')).toHaveLength(1)
    expect(leadItems.find(i => i.label === 'Suites')!.to).toBe('/settings/suites')

    const adminItems = navItemsFor(ADMIN, { suiteOnForMember: true })
    expect(adminItems.filter(i => i.label === 'Suites')).toHaveLength(1)
    expect(adminItems.find(i => i.label === 'Suites')!.to).toBe('/settings/suites')
  })
})

/* WHO CAN ADD PEOPLE (Hafsah, 21 November 2026): People is in a member's rail only when the server says they may add people. */
describe('People, for whoever may add people', () => {
  it('an admin always, a member only when the organisation lets anyone add people, a guest never', () => {
    const hasPeople = (u: any) => navItemsFor(u).some(i => i.label === 'People')
    expect(hasPeople({ role: 'ADMIN' })).toBe(true)
    expect(hasPeople({ role: 'MEMBER' })).toBe(false)
    expect(hasPeople({ role: 'MEMBER', mayAddPeople: false })).toBe(false)
    expect(hasPeople({ role: 'MEMBER', mayAddPeople: true })).toBe(true)
    expect(hasPeople({ role: 'GUEST' })).toBe(false)
  })
  it('Connections and Plan and billing stay an admin\'s, whatever the setting', () => {
    const labels = navItemsFor({ role: 'MEMBER', mayAddPeople: true }).map(i => i.to)
    expect(labels).not.toContain('/settings/connections')
    expect(labels).not.toContain('/billing')
  })
})
