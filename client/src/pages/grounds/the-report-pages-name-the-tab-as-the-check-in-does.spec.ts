import { describe, it, expect } from 'vitest'
import { checkInHeaderTabs } from './ground-tabs'

/**
 * THE REPORT PAGES NAME THE TAB AS THE CHECK-IN PAGE DOES (browser test, 20 October 2026). Achieng opened her session report
 * in Pesa Ndogo Lenders (test), where Release 1B is on: the check-in page's tab said "References and resources" and the
 * report page's said "Context and resources". Off, every page names it exactly as before.
 */
const at = (ground: { release1bTabsOn?: boolean } | null) =>
  checkInHeaderTabs({ id: 'g1', contextEnabled: true, canRunThisCheckIn: false, isAParty: true, ground }).find((t) => t.key === 'context')!.label

describe('the report pages name the context tab as the check-in page does', () => {
  it('says "References and resources" where Release 1B is on', () => {
    expect(at({ release1bTabsOn: true })).toBe('References and resources')
  })
  it('says what it said before where it is off', () => {
    expect(at({ release1bTabsOn: false })).toBe('Context and resources')
    expect(at(null)).toBe('Context and resources')
  })
})
