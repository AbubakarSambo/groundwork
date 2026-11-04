import { describe, it, expect } from 'vitest'
import { checkInHeaderTabs, groundTabs } from './ground-tabs'

/**
 * THE REPORT PAGES NAME THE TAB AS THE CHECK-IN PAGE DOES (browser test, 20 October 2026). Achieng opened her session report
 * and the check-in page's tab said "References and resources" while the report page's said "Context and resources". Since
 * release batch 1 (Hafsah, 4 November 2026) there is one name for everybody, with no switch.
 */
describe('the report pages name the tab as the check-in page does', () => {
  it('says "References and resources" on both, for the lead and for a team member', () => {
    for (const who of [{ canRunThisCheckIn: true, isAParty: false }, { canRunThisCheckIn: false, isAParty: true }]) {
      expect(checkInHeaderTabs({ id: 'g1', ...who }).find((t) => t.key === 'context')!.label).toBe('References and resources')
      expect(groundTabs(who).find((t) => t.key === 'context')!.label).toBe('References and resources')
    }
  })
})
