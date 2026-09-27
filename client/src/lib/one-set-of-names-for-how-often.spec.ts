import { describe, it, expect } from 'vitest'
import { SELECTABLE_CADENCES } from './cadence'
import { HOW_OFTEN } from '@/pages/enter/TheSetup'

/*
 * ONE SET OF NAMES FOR HOW OFTEN (U.6 review). The setup before saving said "Every day" and
 * "Every week"; the check-in's own Setup said "Daily" and "Weekly". Both read one list now, the
 * prototype's (setup.txt).
 */
describe('how often, named once', () => {
  it('the check-in’s Setup offers the prototype’s names', () => {
    expect(SELECTABLE_CADENCES.map((c) => c.label).sort()).toEqual(
      ['Once', 'Every day', 'Every week', 'Every 2 weeks', 'Every month', 'When I choose'].sort(),
    )
  })
  it('and the setup before saving offers exactly the same, in the prototype’s order', () => {
    expect(HOW_OFTEN.map(([, label]) => label)).toEqual(['Once', 'Every day', 'Every week', 'Every 2 weeks', 'Every month', 'When I choose'])
    expect(new Set(HOW_OFTEN.map(([c, label]) => `${c}:${label}`))).toEqual(new Set(SELECTABLE_CADENCES.map((c) => `${c.cadence}:${c.label}`)))
  })
})
