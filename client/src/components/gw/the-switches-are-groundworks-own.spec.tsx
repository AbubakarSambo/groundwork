import { describe, it, expect } from 'vitest'
import { navItemsFor } from './nav-items'

/*
 * THE SWITCHBOARD IS FOR GROUNDWORK'S OPS TEAM ONLY (Hafsah, 25 October 2026, night). The door to Groundwork's back office, where every
 * switch is read and set, is in the sidebar of Groundwork staff only. The server refuses everyone else as well
 * (api/src/modules/admin/the-switches-are-groundworks-own.spec.ts); this is the screen's half.
 */
describe('the switches are Groundwork\'s own, on screen', () => {
  const doors = (user: any) => navItemsFor(user).filter((i: any) => i.to === '/admin' || i.platformAdminOnly).map((i: any) => i.label)

  it('a client admin, a lead and a team member have no door to them', () => {
    expect(doors({ role: 'ADMIN', isPlatformAdmin: false })).toEqual([])
    expect(doors({ role: 'LEAD' })).toEqual([])
    expect(doors({ role: 'MEMBER' })).toEqual([])
    expect(doors(null)).toEqual([])
  })

  it('the ops team has it', () => {
    expect(doors({ role: 'ADMIN', isPlatformAdmin: true })).toEqual(['Platform ops'])
  })
})
